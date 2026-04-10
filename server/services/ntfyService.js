// ─── ntfy Push Notification Service ───

const NTFY_SERVER = process.env.NTFY_SERVER || 'https://ntfy.sh';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'life-ai-hunter';

export async function sendNotification({ title, message, priority = 3, tags = [], click, actions }) {
  const url = `${NTFY_SERVER}/${NTFY_TOPIC}`;

  const headers = {
    'Title': title,
    'Priority': String(priority),
    'Content-Type': 'text/plain'
  };

  if (tags.length > 0) headers['Tags'] = tags.join(',');
  if (click) headers['Click'] = click;
  if (actions) headers['Actions'] = actions;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: message
    });

    if (!res.ok) {
      console.error(`[ntfy] Failed: ${res.status} ${res.statusText}`);
      return false;
    }

    console.log(`[ntfy] Sent: ${title}`);
    return true;
  } catch (err) {
    console.error(`[ntfy] Error: ${err.message}`);
    return false;
  }
}

const ADHD_STRATEGIES = [
  'Just do 5 minutes',
  'Put on a podcast first',
  "You don't have to finish — just START",
  'Race yourself',
  'Future you will be so relieved',
  'Pair it with something else',
  'The hardest part is standing up'
];

const CHECKIN_PROMPTS = [
  "What are you up to right now?",
  "Quick check — how's your energy?",
  "Just a sec — log what you're doing!",
  "Time for a quick life snapshot!",
  "What's happening in your world?",
  "Pause and check in with yourself",
  "How are you feeling right now?"
];

export async function notifyExpiringItem(item, daysLeft) {
  const emoji = daysLeft <= 1 ? 'warning' : 'ice_cube';
  return sendNotification({
    title: `${daysLeft <= 1 ? '!' : ''} ${item.name} expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    message: `Use it up! Check recipes for ideas.`,
    priority: daysLeft <= 1 ? 4 : 3,
    tags: [emoji],
    click: `${process.env.CLIENT_URL || 'http://localhost:5173'}/recipes`
  });
}

export async function notifyChoreReminder(task) {
  const strategy = ADHD_STRATEGIES[Math.floor(Math.random() * ADHD_STRATEGIES.length)];
  return sendNotification({
    title: `Time for: ${task.name}`,
    message: `Strategy: ${strategy}\n${task.estimatedMinutes ? `Estimated: ${task.estimatedMinutes} min` : ''}`,
    priority: 3,
    tags: ['white_check_mark']
  });
}

export async function notifyDataCheckin(checkinUrl) {
  const prompt = CHECKIN_PROMPTS[Math.floor(Math.random() * CHECKIN_PROMPTS.length)];
  return sendNotification({
    title: 'Life AI Check-In',
    message: prompt,
    priority: 3,
    tags: ['bar_chart'],
    click: checkinUrl || `${process.env.CLIENT_URL || 'http://localhost:5173'}/checkin`
  });
}

export async function notifyRecipeSuggestion(recipe, expiringItems) {
  const expList = expiringItems.map(i => i.name).join(', ');
  return sendNotification({
    title: `Recipe idea: ${recipe.title}`,
    message: `Uses expiring: ${expList}\nPrep: ${recipe.prepTime || '?'} min`,
    priority: 2,
    tags: ['cook'],
    click: `${process.env.CLIENT_URL || 'http://localhost:5173'}/recipes`
  });
}

export async function notifyKidActivity(activity, context) {
  return sendNotification({
    title: `Kid activity: ${activity.title}`,
    message: `${activity.description}\nDuration: ~${activity.duration}\nSupplies: ${activity.supplies?.join(', ') || 'None needed'}`,
    priority: 2,
    tags: ['child']
  });
}
