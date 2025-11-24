import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { RECIPES, getRecipesByLevel } from '../data/recipes'
import { getItem } from '../data/items'

export default function CraftingModal() {
  const { isCraftingOpen, toggleCrafting, player, inventory, addItem, removeItem } = useGameStore()
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [crafting, setCrafting] = useState(false)

  if (!isCraftingOpen || !player) return null

  const availableRecipes = getRecipesByLevel(player.level)
  const recipe = selectedRecipe ? RECIPES.find(r => r.id === selectedRecipe) : null

  const canCraft = (recipeId: string) => {
    const recipe = RECIPES.find(r => r.id === recipeId)
    if (!recipe) return false

    return recipe.ingredients.every(ing => {
      const invItem = inventory.find(inv => inv.item.id === ing.itemId)
      return invItem && invItem.quantity >= ing.quantity
    })
  }

  const handleCraft = async () => {
    if (!selectedRecipe || !recipe) return
    if (!canCraft(selectedRecipe)) return

    setCrafting(true)

    // Remove ingredients
    recipe.ingredients.forEach(ing => {
      removeItem(ing.itemId, ing.quantity)
    })

    // Wait for crafting time
    await new Promise(resolve => setTimeout(resolve, recipe.craftingTime))

    // Add result
    addItem(recipe.result.itemId, recipe.result.quantity)

    setCrafting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Crafting</h2>
          <button
            onClick={toggleCrafting}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Recipe List */}
          <div>
            <h3 className="text-lg font-bold text-cyan-300 mb-3">Recipes</h3>
            <div className="space-y-2">
              {availableRecipes.map(recipe => {
                const canCraftRecipe = canCraft(recipe.id)
                const resultItem = getItem(recipe.result.itemId)

                return (
                  <button
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedRecipe === recipe.id
                        ? 'border-cyan-500 bg-gray-800'
                        : canCraftRecipe
                        ? 'border-gray-700 bg-gray-800 hover:border-cyan-600'
                        : 'border-gray-800 bg-gray-900 opacity-50'
                    }`}
                    disabled={!canCraftRecipe}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {resultItem && <span className="text-2xl">{resultItem.icon}</span>}
                      <span className="font-bold text-cyan-300">{recipe.name}</span>
                    </div>
                    <div className="text-xs text-gray-400">Lv. {recipe.level}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recipe Details */}
          <div>
            {recipe ? (
              <>
                <h3 className="text-lg font-bold text-cyan-300 mb-3">Details</h3>
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <div className="text-xl font-bold text-cyan-300 mb-2">{recipe.name}</div>
                  <div className="text-sm text-gray-400 mb-4">{recipe.description}</div>

                  <div className="mb-4">
                    <div className="text-sm font-bold text-cyan-400 mb-2">Ingredients:</div>
                    <div className="space-y-1">
                      {recipe.ingredients.map((ing, idx) => {
                        const item = getItem(ing.itemId)
                        const invItem = inventory.find(inv => inv.item.id === ing.itemId)
                        const hasEnough = invItem && invItem.quantity >= ing.quantity

                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 text-sm ${
                              hasEnough ? 'text-gray-300' : 'text-red-400'
                            }`}
                          >
                            {item && <span>{item.icon}</span>}
                            <span>
                              {ing.quantity}x {item?.name || ing.itemId}
                            </span>
                            {invItem && (
                              <span className="text-xs text-gray-500">
                                (You have: {invItem.quantity})
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm font-bold text-cyan-400 mb-2">Result:</div>
                    <div className="flex items-center gap-2">
                      {getItem(recipe.result.itemId)?.icon}
                      <span className="text-cyan-300">
                        {recipe.result.quantity}x {getItem(recipe.result.itemId)?.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 mb-4">
                    Crafting Time: {(recipe.craftingTime / 1000).toFixed(1)}s
                  </div>

                  <button
                    onClick={handleCraft}
                    disabled={!canCraft(recipe.id) || crafting}
                    className={`w-full py-2 px-4 rounded-lg font-bold transition-all ${
                      canCraft(recipe.id) && !crafting
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {crafting ? 'Crafting...' : 'Craft'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-8">
                Select a recipe to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

