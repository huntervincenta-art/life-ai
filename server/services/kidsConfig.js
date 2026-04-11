// ─── Kids Data & Personalized Activities ───

export const KIDS = {
  rose: {
    name: 'Rose',
    emoji: '🎨',
    age: 7,
    birthday: '03-02',
    interests: ['drawing', 'movies', 'mysteries', 'riddles', 'dolls', 'pretend doctor', 'scavenger hunts', 'Roblox', 'sidewalk chalk', 'trampoline', 'media analysis', 'learning']
  },
  will: {
    name: 'Will',
    emoji: '🏎️',
    age: 5,
    birthday: null,
    interests: ['Roblox', 'Asphalt Legends', 'toys', 'marble runs', 'Jeep', 't-ball', 'Minecraft', 'wrestling', 'air hockey', 'watching dad play games']
  }
};

export const ACTIVITIES = {
  rose: [
    { title: 'Mystery scavenger hunt', desc: 'Write clues and hide them around the house. Let her solve the trail.' },
    { title: 'Movie analysis night', desc: 'Watch a movie together, pause to discuss what characters are feeling and why.' },
    { title: 'Drawing challenge', desc: 'Both draw the same thing, then compare results. No erasing allowed!' },
    { title: 'Riddle time', desc: 'Take turns with age-appropriate riddles. Keep score on a whiteboard.' },
    { title: 'Stuffed animal clinic', desc: 'Set up a pretend vet or doctor clinic for stuffed animals with bandages and checkups.' },
    { title: 'Sidewalk chalk art contest', desc: 'Each person gets a square of sidewalk. Theme: underwater world, space, etc.' },
    { title: 'Trampoline challenge', desc: 'How many jumps in 60 seconds? Try different moves — spin, touch toes, etc.' },
    { title: 'Roblox co-op session', desc: 'Let her pick the game. Ask her to show you how it works.' },
    { title: 'Doll fashion show', desc: 'Create outfits and stories for dolls. Put on a runway show.' },
    { title: 'Science experiment', desc: 'Baking soda volcano, make slime, grow crystals, or color-mixing with water.' },
    { title: 'Comic book creator', desc: 'Fold paper into panels. Each person draws a page of the same story.' },
    { title: 'Mystery bag game', desc: 'Put objects in a bag, she reaches in and guesses what they are by feel.' },
  ],
  will: [
    { title: 'Roblox together', desc: 'Let him lead and show you his favorite games. Ask questions about what he is doing.' },
    { title: 'Asphalt Legends tournament', desc: 'Take turns racing, keep a scoreboard on paper. Best of 5 races.' },
    { title: 'Marble run challenge', desc: 'Build a marble run together, time the marbles, add obstacles and jumps.' },
    { title: 'Backyard t-ball', desc: 'Set up a tee and practice hitting. Count how far each hit goes.' },
    { title: 'Jeep adventure', desc: 'Ride the kids Jeep around the yard or neighborhood. Make up a mission.' },
    { title: 'Watch dad play + narrate', desc: 'Play a game while Will watches. Ask him what he thinks will happen next.' },
    { title: 'Will teaches you', desc: 'Pick a game Will knows and ask him to teach you the rules from scratch.' },
    { title: 'Minecraft build challenge', desc: 'Both build something in 10 minutes. Theme: castle, spaceship, house, etc.' },
    { title: 'Living room wrestling', desc: 'Clear some space, set rules first (no hitting, tap out = stop), gentle and fun.' },
    { title: 'Air hockey tournament', desc: 'Best of 5 games. Keep a bracket if Rose wants to join.' },
    { title: 'Toy parade', desc: 'Line up all his favorite toys, name them, give them backstories.' },
    { title: 'Obstacle course', desc: 'Build a course with pillows, chairs, tape lines. Time each attempt.' },
  ],
  together: [
    { title: 'Roblox co-op (all three)', desc: 'Find a game all three of you can play together.' },
    { title: 'Movie night with popcorn', desc: 'Let them take turns picking. Make a special snack basket.' },
    { title: 'Board game night', desc: 'Pick something both ages can play: Uno, Candy Land, Connect 4, Guess Who.' },
    { title: 'Park adventure', desc: 'Walk or bike to a nearby park. Bring a ball or frisbee.' },
    { title: 'Cook together', desc: 'Simple recipe they can help with: smoothies, nachos, pizza bagels.' },
    { title: 'Dance party', desc: 'Put on their favorite music and dance. No rules, just vibes.' },
    { title: 'Blanket fort', desc: 'Build an epic fort in the living room. Bring in flashlights, snacks, and a movie.' },
    { title: 'Nature walk', desc: 'Collect leaves, rocks, cool sticks. Bring a bag and magnifying glass.' },
    { title: 'Art station', desc: 'Set up paper, crayons, paint, stickers. Everyone makes something for someone else.' },
    { title: 'Backyard water play', desc: 'Sprinklers, water balloons, cups and buckets. Towels ready.' },
  ]
};

export function getKidSuggestions() {
  const roseIdx = Math.floor(Math.random() * ACTIVITIES.rose.length);
  const willIdx = Math.floor(Math.random() * ACTIVITIES.will.length);
  return {
    rose: ACTIVITIES.rose[roseIdx],
    will: ACTIVITIES.will[willIdx]
  };
}

export function getTogetherSuggestion() {
  return ACTIVITIES.together[Math.floor(Math.random() * ACTIVITIES.together.length)];
}

export function shuffleActivities(who = 'rose', count = 3) {
  const pool = ACTIVITIES[who] || ACTIVITIES.together;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
