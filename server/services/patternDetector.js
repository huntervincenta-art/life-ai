// ─── Pattern Detector — Analyzes LifeLog entries ───

import { LifeLog } from '../models/index.js';

function detectCustodyPattern(logs) {
  const dayMap = {};
  for (const log of logs) {
    const day = log.dayOfWeek;
    if (!dayMap[day]) dayMap[day] = { total: 0, withKids: 0, hours: [] };
    dayMap[day].total++;
    if (log.kidsPresent) {
      dayMap[day].withKids++;
      dayMap[day].hours.push(log.hour);
    }
  }

  const custodyDays = [];
  for (const [day, data] of Object.entries(dayMap)) {
    if (data.total > 0 && data.withKids / data.total > 0.4) {
      const hours = data.hours.sort((a, b) => a - b);
      custodyDays.push({
        day: parseInt(day),
        startHour: hours[0],
        endHour: hours[hours.length - 1],
        confidence: data.withKids / data.total
      });
    }
  }

  if (custodyDays.length === 0) return null;

  return {
    name: 'Custody Schedule',
    type: 'custody',
    schedule: {
      daysOfWeek: custodyDays.map(d => d.day),
      startHour: Math.min(...custodyDays.map(d => d.startHour)),
      endHour: Math.max(...custodyDays.map(d => d.endHour)),
      frequency: 'weekly'
    },
    confidenceScore: custodyDays.reduce((sum, d) => sum + d.confidence, 0) / custodyDays.length,
    source: 'auto_detected',
    metadata: { custodyDays }
  };
}

function detectWorkPattern(logs) {
  const workLogs = logs.filter(l =>
    l.activity?.toLowerCase().includes('work') || l.location === 'work'
  );
  if (workLogs.length < 5) return null;

  const dayMap = {};
  for (const log of workLogs) {
    const day = log.dayOfWeek;
    if (!dayMap[day]) dayMap[day] = [];
    dayMap[day].push(log.hour);
  }

  const workDays = Object.entries(dayMap)
    .filter(([, hours]) => hours.length >= 2)
    .map(([day, hours]) => ({
      day: parseInt(day),
      hours: hours.sort((a, b) => a - b)
    }));

  if (workDays.length === 0) return null;

  const allHours = workDays.flatMap(d => d.hours);
  return {
    name: 'Work Schedule',
    type: 'work',
    schedule: {
      daysOfWeek: workDays.map(d => d.day),
      startHour: Math.min(...allHours),
      endHour: Math.max(...allHours),
      frequency: workDays.length >= 5 ? 'weekdays' : 'custom'
    },
    confidenceScore: Math.min(workLogs.length / 20, 1),
    source: 'auto_detected',
    metadata: { totalWorkLogs: workLogs.length }
  };
}

function detectSleepPattern(logs) {
  // Find 5+ hour gaps in logging as sleep windows
  const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const gaps = [];

  for (let i = 1; i < sortedLogs.length; i++) {
    const prev = new Date(sortedLogs[i - 1].timestamp);
    const curr = new Date(sortedLogs[i].timestamp);
    const gapHours = (curr - prev) / (1000 * 60 * 60);

    if (gapHours >= 5) {
      gaps.push({
        startHour: prev.getHours(),
        endHour: curr.getHours(),
        duration: gapHours
      });
    }
  }

  if (gaps.length < 3) return null;

  const avgStart = Math.round(gaps.reduce((s, g) => s + g.startHour, 0) / gaps.length);
  const avgEnd = Math.round(gaps.reduce((s, g) => s + g.endHour, 0) / gaps.length);

  return {
    name: 'Sleep Schedule',
    type: 'sleep',
    schedule: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startHour: avgStart,
      endHour: avgEnd,
      frequency: 'daily'
    },
    confidenceScore: Math.min(gaps.length / 7, 1),
    source: 'auto_detected',
    metadata: { avgDuration: gaps.reduce((s, g) => s + g.duration, 0) / gaps.length }
  };
}

function detectEnergyCycles(logs) {
  const hourMap = {};
  for (const log of logs) {
    if (log.energy == null) continue;
    if (!hourMap[log.hour]) hourMap[log.hour] = [];
    hourMap[log.hour].push(log.energy);
  }

  const avgByHour = {};
  for (const [hour, energies] of Object.entries(hourMap)) {
    avgByHour[hour] = energies.reduce((s, e) => s + e, 0) / energies.length;
  }

  const hours = Object.entries(avgByHour).sort((a, b) => b[1] - a[1]);
  if (hours.length < 4) return null;

  const peakHours = hours.slice(0, 3).map(h => parseInt(h[0]));
  const lowHours = hours.slice(-3).map(h => parseInt(h[0]));

  return {
    name: 'Energy Cycles',
    type: 'energy',
    schedule: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      frequency: 'daily'
    },
    confidenceScore: Math.min(Object.keys(hourMap).length / 12, 1),
    source: 'auto_detected',
    metadata: { peakHours, lowHours, avgByHour }
  };
}

function detectMealPatterns(logs) {
  const mealLogs = logs.filter(l => l.hadMeal && l.mealType);
  if (mealLogs.length < 5) return null;

  const mealTimes = {};
  for (const log of mealLogs) {
    if (!mealTimes[log.mealType]) mealTimes[log.mealType] = [];
    mealTimes[log.mealType].push(log.hour);
  }

  const avgMealTimes = {};
  for (const [meal, hours] of Object.entries(mealTimes)) {
    avgMealTimes[meal] = Math.round(hours.reduce((s, h) => s + h, 0) / hours.length);
  }

  return {
    name: 'Meal Schedule',
    type: 'meal',
    schedule: {
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      frequency: 'daily'
    },
    confidenceScore: Math.min(mealLogs.length / 15, 1),
    source: 'auto_detected',
    metadata: { avgMealTimes, totalMealLogs: mealLogs.length }
  };
}

function detectUserMarkedRoutines(logs) {
  const routineLogs = logs.filter(l => l.isRoutine);
  if (routineLogs.length === 0) return [];

  const grouped = {};
  for (const log of routineLogs) {
    const key = log.activity?.toLowerCase() || 'unknown';
    if (!grouped[key]) grouped[key] = { logs: [], frequency: log.routineFrequency };
    grouped[key].logs.push(log);
  }

  return Object.entries(grouped).map(([activity, data]) => ({
    name: `Routine: ${activity}`,
    type: 'custom',
    schedule: {
      daysOfWeek: [...new Set(data.logs.map(l => l.dayOfWeek))],
      startHour: Math.min(...data.logs.map(l => l.hour)),
      frequency: data.frequency || 'custom'
    },
    confidenceScore: 1,
    source: 'user_input',
    metadata: { activity, logCount: data.logs.length }
  }));
}

export async function generatePatterns() {
  const logs = await LifeLog.find().sort({ timestamp: -1 });

  if (logs.length === 0) {
    return { patterns: [], totalLogs: 0 };
  }

  const patterns = [];

  const custody = detectCustodyPattern(logs);
  if (custody) patterns.push(custody);

  const work = detectWorkPattern(logs);
  if (work) patterns.push(work);

  const sleep = detectSleepPattern(logs);
  if (sleep) patterns.push(sleep);

  const energy = detectEnergyCycles(logs);
  if (energy) patterns.push(energy);

  const meals = detectMealPatterns(logs);
  if (meals) patterns.push(meals);

  const userRoutines = detectUserMarkedRoutines(logs);
  patterns.push(...userRoutines);

  return { patterns, totalLogs: logs.length };
}
