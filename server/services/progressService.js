import UserProgress from '../models/UserProgress.js';
import BillTransaction from '../models/BillTransaction.js';
import Vendor from '../models/Vendor.js';

const XP_MAP = {
  app_open: 5,
  bill_added: 25,
  bill_paid: 15,
  scan_triggered: 10,
  chat_completed: 50,
  vendor_cancelled: 40,
};

const BADGE_DEFS = [
  { id: 'first_bill', name: 'First Bill', description: 'Tracked your first bill', icon: 'receipt' },
  { id: 'five_bills', name: 'Getting Organized', description: 'Tracking 5 bills', icon: 'list-checks' },
  { id: 'ten_bills', name: 'Bill Master', description: 'Tracking 10 bills', icon: 'trophy' },
  { id: 'first_cancel', name: 'Tax Fighter', description: 'Cancelled your first subscription', icon: 'scissors' },
  { id: 'hundred_saved', name: '$100 Saved', description: 'Saved over $100 from ADHD tax', icon: 'piggy-bank' },
  { id: 'five_hundred_saved', name: '$500 Saved', description: 'Saved over $500 from ADHD tax', icon: 'wallet' },
  { id: 'first_chat', name: 'Getting Started', description: 'Completed your first bill chat', icon: 'message-circle' },
  { id: 'week_warrior', name: 'Week Warrior', description: 'Checked in 5+ days in a week', icon: 'flame' },
  { id: 'consistent', name: 'Consistent', description: '30-day consistency rate above 60%', icon: 'target' },
];

function getMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setHours(0, 0, 0, 0));
  monday.setDate(diff);
  return monday;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

async function getOrCreateProgress(userId) {
  let progress = await UserProgress.findOne({ userId });
  if (!progress) {
    progress = await UserProgress.create({ userId, currentWeekStart: getMonday() });
  }
  return progress;
}

function get30DayConsistency(checkIns) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCheckIns = checkIns.filter(c => new Date(c.date) >= thirtyDaysAgo);
  const uniqueDays = new Set();
  for (const c of recentCheckIns) {
    const d = new Date(c.date);
    uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return Math.round((uniqueDays.size / 30) * 100);
}

function checkBadges(progress) {
  const earned = new Set(progress.badges.map(b => b.id));
  const newBadges = [];
  const now = new Date();

  const checks = [
    { id: 'first_bill', condition: progress.totalBillsTracked >= 1 },
    { id: 'five_bills', condition: progress.totalBillsTracked >= 5 },
    { id: 'ten_bills', condition: progress.totalBillsTracked >= 10 },
    { id: 'first_cancel', condition: progress.cancelledSubscriptions >= 1 },
    { id: 'hundred_saved', condition: progress.estimatedTaxSaved >= 100 },
    { id: 'five_hundred_saved', condition: progress.estimatedTaxSaved >= 500 },
    { id: 'first_chat', condition: progress.checkIns.some(c => c.type === 'chat_completed') },
    { id: 'week_warrior', condition: progress.weeklyCheckIns >= 5 },
    { id: 'consistent', condition: get30DayConsistency(progress.checkIns) >= 60 },
  ];

  for (const { id, condition } of checks) {
    if (!earned.has(id) && condition) {
      const def = BADGE_DEFS.find(b => b.id === id);
      if (def) {
        const badge = { ...def, earnedAt: now };
        progress.badges.push(badge);
        newBadges.push(badge);
      }
    }
  }

  return newBadges;
}

export async function recordCheckIn(userId, type) {
  const progress = await getOrCreateProgress(userId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Dedupe app_open to once per day
  if (type === 'app_open') {
    const alreadyToday = progress.checkIns.some(
      c => c.type === 'app_open' && isSameDay(new Date(c.date), now)
    );
    if (alreadyToday) return { xpGained: 0 };
  }

  // Add check-in
  progress.checkIns.push({ date: now, type });

  // Update weekly tracking
  const monday = getMonday();
  if (!progress.currentWeekStart || new Date(progress.currentWeekStart) < monday) {
    progress.currentWeekStart = monday;
    progress.weeklyCheckIns = 0;
  }
  // Count unique days this week
  const weekDays = new Set();
  for (const c of progress.checkIns) {
    const d = new Date(c.date);
    if (d >= monday) {
      weekDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }
  progress.weeklyCheckIns = weekDays.size;

  // Award XP
  const xpGained = XP_MAP[type] || 0;
  progress.xp += xpGained;

  // Update bill counts for bill_added
  if (type === 'bill_added') {
    progress.totalBillsTracked += 1;
  }

  // Level calculation
  const oldLevel = progress.level;
  progress.level = Math.floor(progress.xp / 100) + 1;
  const newLevel = progress.level > oldLevel ? progress.level : null;

  // Check badges
  const newBadges = checkBadges(progress);

  await progress.save();

  return {
    xpGained,
    newLevel,
    newBadge: newBadges.length > 0 ? newBadges[0] : null,
    weeklyProgress: progress.weeklyCheckIns,
  };
}

export async function calculateTaxSaved(userId) {
  const progress = await getOrCreateProgress(userId);

  // Count transactions (each on-time bill saves ~$35 in potential late fees)
  const transactions = await BillTransaction.find({ userId });
  const onTimeCount = transactions.length; // Assume tracked = on-time
  const lateFeesSaved = onTimeCount * 35;

  // Calculate cancelled subscription savings
  let cancelSavings = 0;
  const cancelledVendors = await Vendor.find({ userId, isActive: false });
  for (const v of cancelledVendors) {
    if (v.lastAmount > 0) {
      const monthsSinceCancelled = Math.max(1, Math.ceil(
        (Date.now() - new Date(v.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000)
      ));
      cancelSavings += v.lastAmount * monthsSinceCancelled;
    }
  }

  progress.estimatedTaxSaved = lateFeesSaved + cancelSavings;

  // Recalculate cancelled counts
  progress.cancelledSubscriptions = cancelledVendors.length;
  progress.cancelledSavingsMonthly = cancelledVendors.reduce((sum, v) => sum + (v.lastAmount || 0), 0);

  // Check for savings badges
  checkBadges(progress);
  await progress.save();

  return progress.estimatedTaxSaved;
}

export async function getWeeklyProgress(userId) {
  const progress = await getOrCreateProgress(userId);
  const monday = getMonday();

  // Reset if stale week
  if (!progress.currentWeekStart || new Date(progress.currentWeekStart) < monday) {
    progress.currentWeekStart = monday;
    progress.weeklyCheckIns = 0;
    await progress.save();
  }

  const days = progress.weeklyCheckIns;
  const goal = 5;
  const percent = Math.round((days / 7) * 100);

  let message;
  if (days === 0) message = "Fresh week — check in to get started!";
  else if (days <= 2) message = "Good start! Keep the momentum going";
  else if (days <= 4) message = "You're crushing it this week";
  else message = "Incredible week! You're on fire";

  return { daysThisWeek: days, percentThisWeek: percent, weekGoal: goal, message };
}

export async function getProgressSummary(userId) {
  const progress = await getOrCreateProgress(userId);

  // Recalculate tax saved
  await calculateTaxSaved(userId);
  // Re-read after calculation
  const updated = await UserProgress.findOne({ userId });

  const weekly = await getWeeklyProgress(userId);
  const consistency = get30DayConsistency(updated.checkIns);

  // Update total bills tracked from actual DB count
  const billCount = await BillTransaction.countDocuments({ userId });
  if (updated.totalBillsTracked !== billCount) {
    updated.totalBillsTracked = billCount;
    await updated.save();
  }

  return {
    level: updated.level,
    xp: updated.xp,
    xpToNextLevel: 100 - (updated.xp % 100),
    xpInCurrentLevel: updated.xp % 100,
    badges: updated.badges,
    allBadges: BADGE_DEFS,
    weeklyProgress: weekly,
    estimatedTaxSaved: updated.estimatedTaxSaved,
    totalBillsTracked: updated.totalBillsTracked,
    totalAmountTracked: updated.totalAmountTracked,
    cancelledSubscriptions: updated.cancelledSubscriptions,
    cancelledSavingsMonthly: updated.cancelledSavingsMonthly,
    consistencyRate: consistency,
  };
}
