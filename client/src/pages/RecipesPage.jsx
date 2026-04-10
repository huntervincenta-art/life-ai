import { useState, useEffect } from 'react';
import { pantry } from '../utils/api';
import { daysUntil, getExpiryClass, getExpiryLabel } from '../utils/helpers';

// Mock recipe templates until Claude API integration
const RECIPE_TEMPLATES = [
  {
    title: 'Quick Stir Fry',
    description: 'Toss whatever veggies you have with protein and sauce.',
    ingredients: [
      { name: 'Any protein', amount: '1', unit: 'lb', inPantry: false },
      { name: 'Mixed vegetables', amount: '2', unit: 'cups', inPantry: false },
      { name: 'Soy sauce', amount: '2', unit: 'tbsp', inPantry: false },
      { name: 'Rice', amount: '1', unit: 'cup', inPantry: false },
      { name: 'Oil', amount: '1', unit: 'tbsp', inPantry: false }
    ],
    instructions: [
      'Cook rice according to package directions.',
      'Heat oil in a large pan or wok over high heat.',
      'Cook protein until done, about 5-7 minutes. Remove.',
      'Add vegetables, stir fry 3-4 minutes.',
      'Return protein, add soy sauce, toss to combine.',
      'Serve over rice.'
    ],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'easy',
    kidFriendly: true,
    tags: ['quick', 'versatile']
  },
  {
    title: 'One-Pot Pasta',
    description: 'Everything goes in one pot. Minimal cleanup.',
    ingredients: [
      { name: 'Pasta', amount: '12', unit: 'oz', inPantry: false },
      { name: 'Canned tomatoes', amount: '1', unit: 'can', inPantry: false },
      { name: 'Garlic', amount: '3', unit: 'cloves', inPantry: false },
      { name: 'Onion', amount: '1', unit: 'medium', inPantry: false },
      { name: 'Olive oil', amount: '2', unit: 'tbsp', inPantry: false },
      { name: 'Cheese', amount: '1/2', unit: 'cup', inPantry: false }
    ],
    instructions: [
      'Dice onion and garlic.',
      'Add pasta, tomatoes, onion, garlic, oil, and 3 cups water to a large pot.',
      'Bring to a boil, then reduce heat.',
      'Cook 10-12 minutes, stirring occasionally, until pasta is done and sauce thickens.',
      'Top with cheese and serve.'
    ],
    prepTime: 5,
    cookTime: 15,
    servings: 4,
    difficulty: 'easy',
    kidFriendly: true,
    tags: ['one-pot', 'quick']
  },
  {
    title: 'Sheet Pan Dinner',
    description: 'Chop, season, roast. Done.',
    ingredients: [
      { name: 'Chicken or sausage', amount: '1', unit: 'lb', inPantry: false },
      { name: 'Potatoes', amount: '3', unit: 'medium', inPantry: false },
      { name: 'Broccoli', amount: '2', unit: 'cups', inPantry: false },
      { name: 'Olive oil', amount: '2', unit: 'tbsp', inPantry: false },
      { name: 'Seasoning', amount: '1', unit: 'tbsp', inPantry: false }
    ],
    instructions: [
      'Preheat oven to 425F.',
      'Cut protein and vegetables into even pieces.',
      'Toss everything with oil and seasoning on a sheet pan.',
      'Roast 25-30 minutes, flipping halfway.',
      'Let cool 5 minutes and serve.'
    ],
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    difficulty: 'easy',
    kidFriendly: true,
    tags: ['sheet-pan', 'hands-off']
  }
];

function RecipeCard({ recipe, expiringItems }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card slide-up">
      <div className="flex-between mb-8">
        <div>
          <p style={{ fontWeight: 700, fontSize: 16 }}>{recipe.title}</p>
          <p className="muted" style={{ fontSize: 12 }}>
            {recipe.prepTime + recipe.cookTime} min | {recipe.difficulty} | {recipe.servings} servings
            {recipe.kidFriendly ? ' | Kid-friendly' : ''}
          </p>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Less' : 'More'}
        </button>
      </div>

      {recipe.description && <p className="muted mb-8" style={{ fontSize: 13 }}>{recipe.description}</p>}

      {/* Ingredients */}
      <div className="chip-group">
        {recipe.ingredients.map((ing, i) => (
          <span key={i} className="chip" style={{ cursor: 'default', minHeight: 'auto', padding: '4px 10px', fontSize: 12, background: ing.inPantry ? 'rgba(61,214,140,0.15)' : undefined, color: ing.inPantry ? 'var(--accent-success)' : undefined }}>
            {ing.inPantry ? '✓ ' : ''}{ing.amount} {ing.unit} {ing.name}
          </span>
        ))}
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <p className="section-title">Instructions</p>
          <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.6 }}>
            {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function RecipesPage() {
  const [expiring, setExpiring] = useState([]);
  const [recipes, setRecipes] = useState(RECIPE_TEMPLATES);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pantry.expiringIngredients()
      .then(data => setExpiring(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function togglePref(pref) {
    setPreferences(prev => prev.includes(pref) ? prev.filter(p => p !== pref) : [...prev, pref]);
  }

  function handleGenerate() {
    // For now use templates; will integrate Claude API later
    let filtered = [...RECIPE_TEMPLATES];
    if (preferences.includes('kid-friendly')) {
      filtered = filtered.filter(r => r.kidFriendly);
    }
    if (preferences.includes('quick')) {
      filtered = filtered.filter(r => (r.prepTime + r.cookTime) <= 30);
    }
    setRecipes(filtered);
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Recipes</h1>
      </div>

      {/* Expiring highlight */}
      {expiring.length > 0 && (
        <div className="card mb-16" style={{ borderColor: 'var(--accent-warning)' }}>
          <p className="section-title" style={{ color: 'var(--accent-warning)' }}>Use these up!</p>
          <div className="chip-group">
            {expiring.map(item => {
              const days = daysUntil(item.estimatedExpiry);
              return (
                <span key={item._id} className={`chip`} style={{ cursor: 'default', minHeight: 'auto', padding: '4px 10px', fontSize: 12 }}>
                  {item.name}
                  <span className={`expiry-badge ${getExpiryClass(days)}`} style={{ marginLeft: 6, fontSize: 10 }}>
                    {getExpiryLabel(days)}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="section">
        <p className="section-title">Preferences</p>
        <div className="chip-group">
          {['use expiring', 'kid-friendly', 'quick'].map(p => (
            <button key={p} className={`chip${preferences.includes(p) ? ' active' : ''}`} onClick={() => togglePref(p)}>
              {p}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
          Generate Recipes
        </button>
      </div>

      {/* Recipe List */}
      <div className="section">
        {recipes.map((r, i) => (
          <RecipeCard key={i} recipe={r} expiringItems={expiring} />
        ))}
      </div>

      <p className="muted text-center" style={{ fontSize: 12, marginTop: 8 }}>
        Claude API recipe generation coming soon
      </p>
    </div>
  );
}
