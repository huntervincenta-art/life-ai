// ─── Shelf Life Database & Product Classifier ───

export const SHELF_LIFE_DB = {
  produce: {
    default: 7,
    items: {
      banana: 5, bananas: 5, apple: 14, apples: 14, orange: 14, oranges: 14,
      lemon: 21, lemons: 21, lime: 21, limes: 21, avocado: 5, avocados: 5,
      tomato: 7, tomatoes: 7, potato: 21, potatoes: 21, onion: 30, onions: 30,
      garlic: 30, ginger: 21, carrot: 21, carrots: 21, celery: 14,
      broccoli: 5, cauliflower: 7, spinach: 5, lettuce: 7, kale: 7,
      cucumber: 7, 'bell pepper': 7, pepper: 7, peppers: 7, zucchini: 7,
      mushroom: 7, mushrooms: 7, corn: 5, 'green beans': 7, asparagus: 5,
      strawberry: 5, strawberries: 5, blueberry: 7, blueberries: 7,
      raspberry: 3, raspberries: 3, grape: 7, grapes: 7, watermelon: 7,
      cantaloupe: 7, pineapple: 5, mango: 5, peach: 5, pear: 7,
      cilantro: 7, parsley: 10, basil: 7, mint: 7, 'green onion': 7,
      jalapeno: 14, habanero: 14, serrano: 14, 'sweet potato': 30,
      cabbage: 14, radish: 14, beet: 21, turnip: 21, eggplant: 7
    }
  },
  dairy: {
    default: 10,
    items: {
      milk: 10, 'whole milk': 10, '2% milk': 10, 'skim milk': 10,
      'almond milk': 10, 'oat milk': 10, cream: 14, 'heavy cream': 14,
      'half and half': 14, 'sour cream': 21, yogurt: 14, 'greek yogurt': 14,
      cheese: 21, 'shredded cheese': 14, 'cream cheese': 21, 'cottage cheese': 14,
      butter: 30, 'whipped cream': 14, egg: 28, eggs: 28, 'string cheese': 21,
      'american cheese': 21, 'cheddar cheese': 28, 'mozzarella': 21,
      parmesan: 42, 'velveeta': 30, creamer: 21
    }
  },
  meat: {
    default: 3,
    items: {
      chicken: 2, 'chicken breast': 2, 'chicken thigh': 2, 'chicken wing': 2,
      'ground beef': 2, 'ground turkey': 2, steak: 3, 'beef roast': 3,
      'pork chop': 3, 'pork loin': 3, bacon: 7, sausage: 3, 'hot dog': 14,
      'hot dogs': 14, 'lunch meat': 5, 'deli meat': 5, turkey: 3,
      ham: 5, 'ground pork': 2, ribs: 3, brisket: 3, 'beef jerky': 90,
      shrimp: 2, salmon: 2, tilapia: 2, fish: 2, tuna: 2, crab: 2,
      lobster: 2, 'fish sticks': 2, pepperoni: 21
    }
  },
  frozen: {
    default: 180,
    items: {
      'ice cream': 60, 'frozen pizza': 180, 'frozen vegetables': 240,
      'frozen fruit': 240, 'frozen dinner': 180, 'frozen burrito': 180,
      'frozen waffles': 180, 'frozen fries': 240, 'french fries': 240,
      'pizza rolls': 180, 'hot pockets': 180, 'frozen chicken': 270,
      'frozen shrimp': 180, 'frozen fish': 180, popsicle: 180, popsicles: 180,
      'ice cream sandwich': 60, 'frozen corn': 240, 'frozen peas': 240,
      'frozen broccoli': 240, 'tater tots': 240, 'chicken nuggets': 180,
      'fish sticks': 180, 'frozen berries': 240, 'eggo': 180
    }
  },
  pantry: {
    default: 365,
    items: {
      rice: 730, pasta: 730, noodles: 730, flour: 365, sugar: 730,
      'brown sugar': 365, salt: 1825, 'baking soda': 730, 'baking powder': 365,
      'olive oil': 540, 'vegetable oil': 540, 'cooking spray': 730,
      vinegar: 730, 'soy sauce': 730, ketchup: 365, mustard: 365,
      mayonnaise: 90, 'hot sauce': 365, 'bbq sauce': 365, 'ranch dressing': 60,
      'salad dressing': 60, 'peanut butter': 180, jelly: 180, jam: 180,
      honey: 1825, 'maple syrup': 365, bread: 7, tortillas: 14,
      'hamburger buns': 7, 'hot dog buns': 7, bagels: 7,
      cereal: 180, oatmeal: 365, 'granola bar': 180, 'granola bars': 180,
      crackers: 180, chips: 60, 'tortilla chips': 60, popcorn: 180,
      'canned beans': 730, 'canned tomatoes': 730, 'canned corn': 730,
      'canned soup': 730, 'canned tuna': 730, 'canned chicken': 730,
      'tomato sauce': 730, 'tomato paste': 730, broth: 730, stock: 730,
      'chicken broth': 730, 'beef broth': 730, 'coconut milk': 730,
      'mac and cheese': 730, ramen: 365, 'instant noodles': 365,
      'pancake mix': 365, 'cake mix': 365, 'brownie mix': 365,
      coffee: 180, tea: 365, 'coffee creamer': 21, cocoa: 730
    }
  },
  beverage: {
    default: 180,
    items: {
      water: 730, 'bottled water': 730, 'sparkling water': 365,
      soda: 270, 'coca cola': 270, coke: 270, pepsi: 270, 'dr pepper': 270,
      sprite: 270, 'mountain dew': 270, 'ginger ale': 270,
      juice: 14, 'orange juice': 14, 'apple juice': 60, 'grape juice': 60,
      'cranberry juice': 60, lemonade: 14, 'iced tea': 14,
      beer: 180, wine: 365, 'energy drink': 270, 'red bull': 270,
      gatorade: 270, 'sports drink': 270, 'coconut water': 14,
      'almond milk': 10, 'oat milk': 10, kombucha: 60
    }
  },
  snack: {
    default: 90,
    items: {
      cookies: 60, candy: 180, chocolate: 180, 'fruit snacks': 180,
      'goldfish': 90, pretzels: 180, nuts: 180, almonds: 180, cashews: 180,
      peanuts: 180, 'trail mix': 90, 'dried fruit': 180, 'beef jerky': 90,
      'protein bar': 180, 'rice cakes': 180, 'animal crackers': 180,
      gummies: 180, 'cheese crackers': 90, 'graham crackers': 180,
      'pop tarts': 180, 'fruit roll up': 180, pudding: 30
    }
  }
};

const NON_FOOD_KEYWORDS = [
  'paper towel', 'toilet paper', 'trash bag', 'garbage bag', 'detergent',
  'soap', 'dish soap', 'hand soap', 'body wash', 'shampoo', 'conditioner',
  'cleaner', 'cleaning', 'disinfectant', 'bleach', 'wipe', 'wipes',
  'isopropyl', 'alcohol', 'rubbing alcohol', 'hand sanitizer',
  'dog', 'cat', 'pet', 'rawhide', 'kibble', 'litter',
  'tamagotchi', 'toy', 'game', 'battery', 'batteries',
  'diaper', 'diapers', 'baby wipe', 'feminine', 'tampon', 'pad',
  'toothpaste', 'toothbrush', 'floss', 'mouthwash', 'deodorant',
  'lotion', 'sunscreen', 'razor', 'cotton ball', 'cotton swab',
  'aluminum foil', 'plastic wrap', 'sandwich bag', 'ziplock',
  'sponge', 'steel wool', 'light bulb', 'air freshener',
  'laundry', 'fabric softener', 'dryer sheet'
];

const CATEGORY_KEYWORDS = {
  produce: ['apple', 'banana', 'orange', 'lemon', 'lime', 'avocado', 'tomato', 'potato', 'onion',
    'garlic', 'ginger', 'carrot', 'celery', 'broccoli', 'cauliflower', 'spinach', 'lettuce', 'kale',
    'cucumber', 'pepper', 'zucchini', 'mushroom', 'corn', 'bean', 'asparagus', 'strawberry',
    'blueberry', 'raspberry', 'grape', 'watermelon', 'cantaloupe', 'pineapple', 'mango', 'peach',
    'pear', 'cilantro', 'parsley', 'basil', 'mint', 'cabbage', 'radish', 'beet', 'eggplant',
    'sweet potato', 'squash', 'fruit', 'vegetable', 'salad', 'herb'],
  dairy: ['milk', 'cream', 'yogurt', 'cheese', 'butter', 'egg', 'creamer', 'cottage', 'sour cream',
    'mozzarella', 'parmesan', 'cheddar', 'velveeta', 'whipped'],
  meat: ['chicken', 'beef', 'pork', 'turkey', 'bacon', 'sausage', 'steak', 'ham', 'hot dog',
    'lunch meat', 'deli', 'shrimp', 'salmon', 'tilapia', 'fish', 'tuna', 'crab', 'lobster',
    'ribs', 'brisket', 'jerky', 'pepperoni', 'ground'],
  frozen: ['frozen', 'ice cream', 'popsicle', 'pizza roll', 'hot pocket', 'eggo', 'tater tot',
    'chicken nugget', 'fish stick'],
  beverage: ['water', 'soda', 'juice', 'cola', 'coke', 'pepsi', 'sprite', 'gatorade', 'tea',
    'coffee', 'beer', 'wine', 'energy drink', 'red bull', 'lemonade', 'kombucha', 'drink'],
  snack: ['cookie', 'candy', 'chocolate', 'chip', 'pretzel', 'nut', 'cracker', 'popcorn',
    'goldfish', 'gummies', 'pop tart', 'fruit snack', 'granola bar', 'protein bar']
};

export function classifyProduct(productName) {
  const lower = productName.toLowerCase();

  // Check frozen first (overrides other categories)
  if (lower.includes('frozen')) return 'frozen';

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return 'other';
}

export function isFood(productName) {
  const lower = productName.toLowerCase();
  return !NON_FOOD_KEYWORDS.some(keyword => lower.includes(keyword));
}

export function estimateShelfLife(productName, category) {
  const lower = productName.toLowerCase();
  const cat = category || classifyProduct(productName);
  const db = SHELF_LIFE_DB[cat];
  if (!db) return 14; // fallback

  // Check specific items first
  for (const [itemName, days] of Object.entries(db.items)) {
    if (lower.includes(itemName)) return days;
  }

  return db.default;
}

export function cleanProductName(rawName) {
  let name = rawName;

  // Strip "quantity N item" prefix from Walmart alt text
  name = name.replace(/^quantity\s+\d+\s+item\s+/i, '');

  // Strip size/unit suffixes like "1 Gallon", "16 oz", "12 ct"
  name = name.replace(/\s+\d+(\.\d+)?\s*(oz|fl\s*oz|lb|lbs|ct|count|pk|pack|gallon|gal|liter|l|ml|kg|g|quart|qt|pint|pt|each|ea)\b.*$/i, '');

  // Strip trailing size in parentheses
  name = name.replace(/\s*\([^)]*\)\s*$/, '');

  return name.trim();
}

export function parseProduct(rawString) {
  const rawName = rawString.trim();
  const cleanName = cleanProductName(rawName);
  const category = classifyProduct(cleanName);
  const foodCheck = isFood(cleanName);
  const shelfLifeDays = foodCheck ? estimateShelfLife(cleanName, category) : null;

  // Extract quantity from "quantity N item" prefix
  const qtyMatch = rawName.match(/^quantity\s+(\d+)\s+item/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  const estimatedExpiry = shelfLifeDays
    ? new Date(Date.now() + shelfLifeDays * 24 * 60 * 60 * 1000)
    : null;

  return {
    rawName,
    cleanName,
    quantity,
    unit: 'item',
    category,
    isFood: foodCheck,
    shelfLifeDays,
    estimatedExpiry
  };
}
