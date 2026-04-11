import { useState, useEffect } from 'react';
import { pantry } from '../utils/api';
import { daysUntil, getExpiryClass, getExpiryLabel } from '../utils/helpers';
import BionicText from '../components/BionicText';

const RECIPE_TEMPLATES = [
  {
    title: 'Quick Stir Fry',
    description: 'Toss whatever veggies you have with protein and sauce.',
    ingredients: [
      { name: 'Any protein', amount: '1 lb', inPantry: false },
      { name: 'Mixed vegetables', amount: '2 cups', inPantry: false },
      { name: 'Soy sauce', amount: '2 tbsp', inPantry: false },
      { name: 'Rice', amount: '1 cup', inPantry: false },
    ],
    instructions: ['Cook rice.', 'Cook protein 5-7 min.', 'Add veggies, stir fry 3-4 min.', 'Add soy sauce, serve over rice.'],
    prepTime: 10, cookTime: 20, difficulty: 'easy', kidFriendly: true
  },
  {
    title: 'One-Pot Pasta',
    description: 'Everything in one pot. Minimal cleanup.',
    ingredients: [
      { name: 'Pasta', amount: '12 oz', inPantry: false },
      { name: 'Canned tomatoes', amount: '1 can', inPantry: false },
      { name: 'Garlic', amount: '3 cloves', inPantry: false },
      { name: 'Cheese', amount: '1/2 cup', inPantry: false },
    ],
    instructions: ['Add everything + 3 cups water to pot.', 'Boil then simmer 10-12 min.', 'Top with cheese.'],
    prepTime: 5, cookTime: 15, difficulty: 'easy', kidFriendly: true
  },
  {
    title: 'Sheet Pan Dinner',
    description: 'Chop, season, roast. Done.',
    ingredients: [
      { name: 'Chicken or sausage', amount: '1 lb', inPantry: false },
      { name: 'Potatoes', amount: '3 medium', inPantry: false },
      { name: 'Broccoli', amount: '2 cups', inPantry: false },
      { name: 'Olive oil + seasoning', amount: '', inPantry: false },
    ],
    instructions: ['Preheat 425F.', 'Cut everything, toss with oil.', 'Roast 25-30 min, flip halfway.'],
    prepTime: 10, cookTime: 30, difficulty: 'easy', kidFriendly: true
  }
];

export default function RecipesPage() {
  const [expiring, setExpiring] = useState([]);
  const [showIngredients, setShowIngredients] = useState(false);
  const [recipes, setRecipes] = useState(RECIPE_TEMPLATES);
  const [expandedRecipe, setExpandedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pantry.expiringIngredients()
      .then(setExpiring)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleGenerate() {
    setRecipes([...RECIPE_TEMPLATES]);
    setExpandedRecipe(0);
  }

  if (loading) return <div className="center-msg">Loading...</div>;

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Recipes</h1>
      </div>

      {/* Expiring highlight */}
      {expiring.length > 0 && (
        <div className="card mb-16" style={{ borderLeftColor: 'var(--accent-warning)', borderLeftWidth: 3 }}>
          <div className="section-title" style={{ color: 'var(--accent-warning)', borderLeftColor: 'var(--accent-warning)' }}>Use these up</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {expiring.slice(0, 5).map(item => {
              const days = daysUntil(item.estimatedExpiry);
              return (
                <span key={item._id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {item.name} <span className={`expiry-badge ${getExpiryClass(days)}`} style={{ fontSize: 10 }}>{getExpiryLabel(days)}</span>
                </span>
              );
            })}
          </div>
          {expiring.length > 5 && (
            <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => setShowIngredients(!showIngredients)}>
              {showIngredients ? 'Hide' : `+${expiring.length - 5} more`}
            </button>
          )}
        </div>
      )}

      {/* Generate */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>
          Get recipe ideas based on what you have
        </p>
        <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
          Generate Recipes
        </button>
      </div>

      {/* Recipe results */}
      {recipes.map((r, i) => (
        <div key={i} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}>
          <div className="flex-between">
            <div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {r.prepTime + r.cookTime} min | {r.difficulty}{r.kidFriendly ? ' | kid-friendly' : ''}
              </p>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{expandedRecipe === i ? '▲' : '▼'}</span>
          </div>

          {expandedRecipe === i && (
            <div style={{ marginTop: 14 }}>
              <BionicText as="p" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{r.description}</BionicText>

              <div className="recipe-desktop-layout">
                <div>
                  <div className="section-title">Ingredients</div>
                  {r.ingredients.map((ing, j) => (
                    <div key={j} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0' }}>
                      {ing.inPantry ? '✓ ' : '• '}{ing.amount} {ing.name}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="section-title">Steps</div>
                  <ol style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    {r.instructions.map((step, j) => <li key={j}>{step}</li>)}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
        Claude API recipe generation coming soon
      </p>
    </div>
  );
}
