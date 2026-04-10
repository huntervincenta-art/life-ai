import mongoose from 'mongoose';

// ─── PANTRY ITEM ───
const pantryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['produce', 'dairy', 'meat', 'frozen', 'pantry', 'beverage', 'snack', 'household', 'pet', 'personal_care', 'other'],
    default: 'other'
  },
  quantity: { type: Number, default: 1 },
  unit: { type: String, default: 'item' },
  purchaseDate: { type: Date, default: Date.now },
  estimatedExpiry: { type: Date },
  daysUntilExpiry: { type: Number },
  isConsumed: { type: Boolean, default: false },
  consumedDate: { type: Date },
  isExpired: { type: Boolean, default: false },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  pricePerUnit: { type: Number },
  rawProductName: { type: String },
  isFood: { type: Boolean, default: true },
  tags: [String]
}, { timestamps: true });

pantryItemSchema.index({ isConsumed: 1, estimatedExpiry: 1 });
pantryItemSchema.index({ category: 1 });

export const PantryItem = mongoose.model('PantryItem', pantryItemSchema);

// ─── WALMART ORDER ───
const orderSchema = new mongoose.Schema({
  gmailMessageId: { type: String, required: true, unique: true },
  gmailThreadId: { type: String },
  orderNumber: { type: String },
  orderDate: { type: Date },
  deliveryDate: { type: Date },
  totalAmount: { type: Number },
  paymentLast4: { type: String },
  items: [{
    rawName: String,
    cleanName: String,
    quantity: Number,
    price: Number,
    category: String,
    pantryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PantryItem' }
  }],
  emailType: { type: String, enum: ['order_confirmation', 'delivery', 'substitution'] },
  parsed: { type: Boolean, default: false },
  parseErrors: [String]
}, { timestamps: true });

orderSchema.index({ gmailMessageId: 1 });
orderSchema.index({ orderDate: -1 });

export const Order = mongoose.model('Order', orderSchema);

// ─── LIFE LOG (hourly check-ins during data gathering) ───
const lifeLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  dayOfWeek: { type: Number },
  hour: { type: Number },
  activity: { type: String },
  location: { type: String, enum: ['home', 'work', 'out', 'commuting', 'other'], default: 'home' },
  people: [{ type: String }],
  energy: { type: Number, min: 1, max: 5 },
  mood: { type: Number, min: 1, max: 5 },
  hadMeal: { type: Boolean, default: false },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', null] },
  choresCompleted: [String],
  notes: { type: String },
  isRoutine: { type: Boolean, default: false },
  routineFrequency: { type: String, enum: ['daily', 'weekdays', 'weekends', 'weekly', 'biweekly', null] },
  kidsPresent: { type: Boolean, default: false }
}, { timestamps: true });

lifeLogSchema.index({ timestamp: -1 });
lifeLogSchema.index({ dayOfWeek: 1, hour: 1 });

export const LifeLog = mongoose.model('LifeLog', lifeLogSchema);

// ─── PATTERN (derived from life logs after data gathering) ───
const patternSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['custody', 'work', 'sleep', 'energy', 'meal', 'chore', 'custom'] },
  schedule: {
    daysOfWeek: [Number],
    startHour: Number,
    endHour: Number,
    frequency: { type: String, enum: ['daily', 'weekdays', 'weekends', 'weekly', 'biweekly', 'custom'] }
  },
  isActive: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  confidenceScore: { type: Number, min: 0, max: 1 },
  source: { type: String, enum: ['user_input', 'auto_detected', 'hybrid'], default: 'user_input' }
}, { timestamps: true });

export const Pattern = mongoose.model('Pattern', patternSchema);

// ─── ROUTINE TASK ───
const routineTaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['chore', 'self_care', 'kid_activity', 'meal_prep', 'errand', 'custom'] },
  description: { type: String },
  adhdStrategy: { type: String },
  estimatedMinutes: { type: Number },
  preferredTime: {
    daysOfWeek: [Number],
    hour: Number,
    flexibility: { type: String, enum: ['exact', 'morning', 'afternoon', 'evening', 'anytime'] }
  },
  ntfyEnabled: { type: Boolean, default: true },
  timerEnabled: { type: Boolean, default: false },
  timerMinutes: { type: Number },
  streak: { type: Number, default: 0 },
  lastCompleted: { type: Date },
  completionHistory: [{
    date: Date,
    durationMinutes: Number,
    skipped: Boolean,
    notes: String
  }],
  isActive: { type: Boolean, default: true },
  requiresKids: { type: Boolean, default: false },
  excludeKids: { type: Boolean, default: false }
}, { timestamps: true });

export const RoutineTask = mongoose.model('RoutineTask', routineTaskSchema);

// ─── RECIPE ───
const recipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  ingredients: [{
    name: String,
    amount: String,
    unit: String,
    pantryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PantryItem' },
    inPantry: Boolean
  }],
  instructions: [String],
  prepTime: { type: Number },
  cookTime: { type: Number },
  servings: { type: Number },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  tags: [String],
  kidFriendly: { type: Boolean, default: false },
  pantryMatchScore: { type: Number, min: 0, max: 100 },
  expiringItemsUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PantryItem' }],
  isSaved: { type: Boolean, default: false },
  generatedAt: { type: Date, default: Date.now },
  source: { type: String, enum: ['ai_generated', 'manual', 'web'], default: 'ai_generated' }
}, { timestamps: true });

export const Recipe = mongoose.model('Recipe', recipeSchema);

// ─── NOTIFICATION LOG ───
const notificationSchema = new mongoose.Schema({
  type: { type: String, enum: ['expiry_warning', 'chore_reminder', 'recipe_suggestion', 'data_checkin', 'kid_activity', 'custom'] },
  title: { type: String },
  message: { type: String },
  sentAt: { type: Date, default: Date.now },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date },
  actionUrl: { type: String },
  priority: { type: Number, min: 1, max: 5, default: 3 },
  relatedModel: { type: String },
  relatedId: { type: mongoose.Schema.Types.ObjectId }
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);

// ─── ONBOARDING STATE ───
const onboardingSchema = new mongoose.Schema({
  phase: { type: String, enum: ['not_started', 'data_gathering', 'pattern_review', 'active'], default: 'not_started' },
  startedAt: { type: Date },
  endsAt: { type: Date },
  totalCheckins: { type: Number, default: 0 },
  targetCheckins: { type: Number, default: 112 },
  lastCheckinAt: { type: Date },
  patternsGenerated: { type: Boolean, default: false },
  gmailConnected: { type: Boolean, default: false },
  ntfyConfigured: { type: Boolean, default: false }
}, { timestamps: true });

export const Onboarding = mongoose.model('Onboarding', onboardingSchema);
