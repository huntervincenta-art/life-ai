// ─── ADHD Chore Strategies & Kid Activities ───

export const CHORE_STRATEGIES = {
  dishes: [
    { name: 'Podcast Power', tip: 'Put on a podcast or playlist — dishes are done before the episode ends.' },
    { name: 'The 5-Minute Blitz', tip: 'Set a 5-minute timer. Just 5 minutes. You can stop after.' },
    { name: 'One-In-One-Out', tip: 'Wash one dish every time you walk into the kitchen.' },
    { name: 'Stack Attack', tip: 'Just stack everything by the sink first. Sorting is half the battle.' },
    { name: 'Reward Sandwich', tip: 'Pick a reward you get ONLY after the dishes. No cheating.' },
    { name: 'Body Double', tip: 'Call someone and chat while you wash. Social energy = dish energy.' },
    { name: 'Rage Clean', tip: 'Put on angry music and channel it into scrubbing power.' }
  ],
  laundry: [
    { name: 'Timer Relay', tip: 'Set a phone timer for each stage. When it dings, you move clothes. Simple.' },
    { name: 'Basket System', tip: "Don't fold — sort into baskets by person. Done is better than perfect." },
    { name: 'TV Fold', tip: 'Fold during a show. One episode = one load. Easy math.' },
    { name: 'The Pile Trick', tip: 'Dump it all on your bed. Now you HAVE to deal with it before sleep.' },
    { name: 'Music Sprint', tip: 'Race to fold everything before 3 songs finish.' }
  ],
  general_cleaning: [
    { name: 'Room Roulette', tip: 'Spin a random number — that room gets 10 minutes of attention.' },
    { name: 'The Trash Bag Walk', tip: 'Walk through each room with a trash bag. Only throw stuff away. Nothing else.' },
    { name: '20/10 Method', tip: '20 minutes of cleaning, 10 minutes of break. Repeat as needed.' },
    { name: 'Before & After Photo', tip: 'Take a photo first. Clean. Take another. Dopamine from the comparison.' },
    { name: 'Zone Defense', tip: 'One zone per day. Monday = kitchen. Tuesday = bathroom. Keep it simple.' }
  ],
  cooking: [
    { name: 'Prep Day Power', tip: 'Spend 1 hour on Sunday prepping. Future you eats like a king.' },
    { name: 'The 3-Ingredient Rule', tip: "If it needs more than 3 ingredients, it's a weekend project." },
    { name: 'Clean As You Go', tip: 'While stuff cooks, wash what you used. End with a clean kitchen AND food.' },
    { name: 'Recipe Simplifier', tip: 'Find the easiest version of what you want. Sheet pan everything.' }
  ]
};

export const KID_ACTIVITIES = {
  indoor: [
    { title: 'Build a blanket fort', description: 'Use couch cushions, blankets, and chairs for an epic fort. Bring in flashlights and books.', ageRange: '3-10', duration: '30-60 min', supplies: ['blankets', 'pillows', 'chairs'] },
    { title: 'Kitchen science lab', description: 'Baking soda volcanoes, color mixing, ice melting experiments.', ageRange: '4-10', duration: '20-40 min', supplies: ['baking soda', 'vinegar', 'food coloring'] },
    { title: 'Indoor scavenger hunt', description: 'Make a list of things to find around the house. Color, shape, or texture based.', ageRange: '3-8', duration: '15-30 min', supplies: ['paper', 'pencil'] },
    { title: 'Cardboard box city', description: 'Save boxes and build a whole city. Cars, buildings, roads with tape.', ageRange: '3-8', duration: '30-60 min', supplies: ['cardboard boxes', 'tape', 'markers'] },
    { title: 'Dance party', description: 'Put on their favorite music and have a dance-off. No rules, just vibes.', ageRange: '2-12', duration: '15-30 min', supplies: [] },
    { title: 'Art station', description: 'Set up paper, crayons, paint, stickers. Let them go wild.', ageRange: '2-10', duration: '20-45 min', supplies: ['paper', 'crayons', 'paint'] },
    { title: 'Obstacle course', description: 'Use pillows, chairs, and tape lines on the floor. Time each attempt.', ageRange: '3-8', duration: '20-40 min', supplies: ['pillows', 'tape'] },
    { title: 'Story time theater', description: 'Read a story, then act it out together with simple costumes/props.', ageRange: '3-8', duration: '20-40 min', supplies: ['books', 'dress-up clothes'] },
    { title: 'Puzzle challenge', description: 'Age-appropriate puzzles. Race the clock or work together.', ageRange: '3-12', duration: '15-45 min', supplies: ['puzzles'] },
    { title: 'Cooking together', description: 'Simple recipes like smoothies, no-bake cookies, or sandwiches.', ageRange: '4-12', duration: '20-40 min', supplies: ['ingredients'] }
  ],
  outdoor: [
    { title: 'Nature walk explorer', description: 'Collect leaves, rocks, bugs in a container. Identify them when you get home.', ageRange: '3-10', duration: '30-60 min', supplies: ['container', 'magnifying glass'] },
    { title: 'Sidewalk chalk art', description: 'Draw a whole world on the driveway. Hopscotch, portraits, maps.', ageRange: '3-10', duration: '20-45 min', supplies: ['chalk'] },
    { title: 'Water play', description: 'Sprinklers, water balloons, cups and buckets. Perfect for hot days.', ageRange: '2-10', duration: '20-60 min', supplies: ['water toys'] },
    { title: 'Bike/scooter time', description: 'Ride around the block or to a nearby park. Fresh air and exercise.', ageRange: '3-12', duration: '20-45 min', supplies: ['bike/scooter', 'helmet'] },
    { title: 'Garden helpers', description: 'Dig holes, water plants, pull weeds. Kids love dirt.', ageRange: '3-10', duration: '15-30 min', supplies: ['garden tools', 'gloves'] }
  ],
  low_energy: [
    { title: 'Movie + snack basket', description: 'Pick a movie, make a special snack basket. Cozy blankets required.', ageRange: '2-12', duration: '90-120 min', supplies: ['snacks', 'blankets'] },
    { title: 'Audiobook adventure', description: 'Listen to an audiobook together while doing a quiet activity like coloring.', ageRange: '4-12', duration: '30-60 min', supplies: ['audiobook', 'coloring supplies'] },
    { title: 'Sticker books / activity books', description: 'Sticker scenes, dot-to-dot, mazes. Quiet and focused.', ageRange: '3-8', duration: '20-45 min', supplies: ['activity books'] },
    { title: 'Building blocks / LEGOs', description: 'Free build or follow instructions. Great for parallel play.', ageRange: '3-12', duration: '30-60 min', supplies: ['blocks/LEGOs'] },
    { title: 'Tablet time (structured)', description: 'Educational apps or games with a clear time limit. Use a visual timer.', ageRange: '3-12', duration: '20-30 min', supplies: ['tablet', 'timer'] }
  ]
};

export const DAILY_TIPS = [
  "Set your top 3 tasks for today — just 3. Anything else is a bonus.",
  "Drink a glass of water right now. Your brain needs it.",
  "Put your phone in another room for 30 minutes. See what happens.",
  "If a task takes less than 2 minutes, do it NOW.",
  "Feeling stuck? Change your environment — even moving to a different chair helps.",
  "Write down what's in your head. Offload it. Your brain isn't a filing cabinet.",
  "Movement creates motivation, not the other way around. Just stand up first.",
  "Set a timer for your current task. External deadlines help ADHD brains focus.",
  "Eaten today? Actually eaten? Go do that.",
  "Forgive yourself for yesterday. Start fresh right now."
];

export function getChoreStrategy(choreType) {
  const strategies = CHORE_STRATEGIES[choreType] || CHORE_STRATEGIES.general_cleaning;
  return strategies[Math.floor(Math.random() * strategies.length)];
}

export function getKidActivities({ energy = 'indoor', weather = 'any', count = 3 } = {}) {
  let pool;
  if (energy === 'low' || energy === 'low_energy') {
    pool = KID_ACTIVITIES.low_energy;
  } else if (weather === 'good' || energy === 'outdoor') {
    pool = [...KID_ACTIVITIES.outdoor, ...KID_ACTIVITIES.indoor];
  } else {
    pool = KID_ACTIVITIES[energy] || KID_ACTIVITIES.indoor;
  }

  // Shuffle and take count
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
