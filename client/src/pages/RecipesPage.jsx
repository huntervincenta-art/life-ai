import { useState } from 'react';
import { getPantryItems, analyzeRecipes } from '../api';

function RecipeCard({ recipe }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="recipe-card">
      <div className="recipe-header">
        <div>
          <p className="recipe-name">{recipe.name}</p>
          <p className="recipe-meta">{recipe.prepTimeMinutes} min prep</p>
        </div>
        <button className="btn-sm btn-ghost" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Hide steps' : 'Show steps'}
        </button>
      </div>

      <div className="recipe-ingredients">
        {recipe.ingredients.map((ing, i) => {
          const isExpiring = recipe.expiringIngredients?.some((e) =>
            e.toLowerCase().includes(ing.toLowerCase()) ||
            ing.toLowerCase().includes(e.toLowerCase())
          );
          return (
            <span key={i} className={`ingredient-tag ${isExpiring ? 'expiring' : ''}`}>
              {isExpiring && '⚡ '}{ing}
            </span>
          );
        })}
      </div>

      {expanded && (
        <ol className="recipe-steps">
          {recipe.instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const itemsRes = await getPantryItems();
      const items = itemsRes.data;
      if (items.length === 0) {
        setError('Your pantry is empty — add some items first.');
        return;
      }
      const res = await analyzeRecipes(items);
      setRecipes(res.data);
      setHasSearched(true);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Recipes</h1>
      </div>

      <div className="analyze-cta">
        <p className="muted">Claude will suggest recipes using what you have, prioritizing items expiring soonest.</p>
        <button className="btn-primary btn-lg" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Thinking...' : 'What can I make?'}
        </button>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {hasSearched && !loading && recipes.length === 0 && (
        <p className="center-msg muted">No recipes returned — try adding more items to your pantry.</p>
      )}

      <div className="recipe-list">
        {recipes.map((r, i) => (
          <RecipeCard key={i} recipe={r} />
        ))}
      </div>
    </div>
  );
}
