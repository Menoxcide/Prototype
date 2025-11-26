import { useState, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { RECIPES, getRecipesByLevel } from '../data/recipes'
import { getItem } from '../data/items'

export default function CraftingModal() {
  const { isCraftingOpen, toggleCrafting, player, inventory, addItem, removeItem } = useGameStore()
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null)
  const [crafting, setCrafting] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [showMaterialTracker, setShowMaterialTracker] = useState(false)
  const [craftingQueue, setCraftingQueue] = useState<Array<{ recipeId: string; count: number; progress: number }>>([])

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

  // Calculate how many times a recipe can be crafted
  const calculateCraftableCount = (recipeId: string): number => {
    const recipe = RECIPES.find(r => r.id === recipeId)
    if (!recipe) return 0

    let minCount = Infinity
    recipe.ingredients.forEach(ing => {
      const invItem = inventory.find(inv => inv.item.id === ing.itemId)
      const available = invItem ? invItem.quantity : 0
      const craftable = Math.floor(available / ing.quantity)
      minCount = Math.min(minCount, craftable)
    })
    return minCount === Infinity ? 0 : minCount
  }

  // Get all materials needed across all recipes
  const getAllRequiredMaterials = useMemo(() => {
    const materials = new Map<string, { needed: number; have: number; recipes: string[] }>()
    
    availableRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ing => {
        const invItem = inventory.find(inv => inv.item.id === ing.itemId)
        const have = invItem ? invItem.quantity : 0
        
        if (!materials.has(ing.itemId)) {
          materials.set(ing.itemId, { needed: 0, have, recipes: [] })
        }
        
        const material = materials.get(ing.itemId)!
        material.needed += ing.quantity
        if (!material.recipes.includes(recipe.id)) {
          material.recipes.push(recipe.id)
        }
      })
    })
    
    return Array.from(materials.entries()).map(([itemId, data]) => ({
      itemId,
      item: getItem(itemId),
      ...data
    }))
  }, [availableRecipes, inventory])

  const handleCraft = async (count: number = 1) => {
    if (!selectedRecipe || !recipe) return
    if (!canCraft(selectedRecipe)) return

    const craftableCount = Math.min(count, calculateCraftableCount(selectedRecipe))
    if (craftableCount <= 0) return

    setCrafting(true)

    // Add to queue
    const queueItem = { recipeId: selectedRecipe, count: craftableCount, progress: 0 }
    setCraftingQueue(prev => [...prev, queueItem])

    // Process crafting queue
    for (let i = 0; i < craftableCount; i++) {
      // Remove ingredients for this craft
      recipe.ingredients.forEach(ing => {
        removeItem(ing.itemId, ing.quantity)
      })

      // Update progress
      setCraftingQueue(prev => prev.map(item => 
        item.recipeId === selectedRecipe 
          ? { ...item, progress: ((i + 1) / craftableCount) * 100 }
          : item
      ))

      // Wait for crafting time
      await new Promise(resolve => setTimeout(resolve, recipe.craftingTime))

      // Add result
      addItem(recipe.result.itemId, recipe.result.quantity)
    }

    // Remove from queue
    setCraftingQueue(prev => prev.filter(item => item.recipeId !== selectedRecipe))
    setCrafting(false)
  }

  const handleCraftAll = () => {
    if (!selectedRecipe) return
    const count = calculateCraftableCount(selectedRecipe)
    if (count > 0) {
      handleCraft(count)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Crafting</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                showCalculator
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => setShowMaterialTracker(!showMaterialTracker)}
              className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                showMaterialTracker
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              Materials
            </button>
            <button
              onClick={toggleCrafting}
              className="text-gray-400 hover:text-cyan-400 text-2xl"
            >
              ×
            </button>
          </div>
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

                  {/* Crafting Calculator */}
                  {showCalculator && (
                    <div className="bg-gray-700 rounded-lg p-3 mb-4">
                      <div className="text-sm font-bold text-yellow-400 mb-2">Crafting Calculator</div>
                      <div className="text-sm text-gray-300">
                        You can craft this recipe <span className="text-cyan-400 font-bold">{calculateCraftableCount(recipe.id)}</span> time(s)
                      </div>
                      {calculateCraftableCount(recipe.id) > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Total time: {((recipe.craftingTime * calculateCraftableCount(recipe.id)) / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCraft(1)}
                      disabled={!canCraft(recipe.id) || crafting}
                      className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                        canCraft(recipe.id) && !crafting
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {crafting ? 'Crafting...' : 'Craft'}
                    </button>
                    {calculateCraftableCount(recipe.id) > 1 && (
                      <button
                        onClick={handleCraftAll}
                        disabled={!canCraft(recipe.id) || crafting}
                        className={`py-2 px-4 rounded-lg font-bold transition-all ${
                          canCraft(recipe.id) && !crafting
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                        title={`Craft all (${calculateCraftableCount(recipe.id)})`}
                      >
                        Craft All ({calculateCraftableCount(recipe.id)})
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-8">
                Select a recipe to view details
              </div>
            )}
          </div>
        </div>

        {/* Crafting Queue */}
        {craftingQueue.length > 0 && (
          <div className="mt-4 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-bold text-cyan-300 mb-3">Crafting Queue</h3>
            <div className="space-y-2">
              {craftingQueue.map((item, idx) => {
                const queueRecipe = RECIPES.find(r => r.id === item.recipeId)
                return (
                  <div key={idx} className="bg-gray-800 rounded-lg p-3 border-2 border-cyan-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getItem(queueRecipe?.result.itemId || '')?.icon}
                        <span className="text-cyan-300 font-bold">
                          {queueRecipe?.name} x{item.count}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {Math.round(item.progress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Material Tracker */}
        {showMaterialTracker && (
          <div className="mt-4 border-t border-gray-700 pt-4">
            <h3 className="text-lg font-bold text-cyan-300 mb-3">Material Tracker</h3>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {getAllRequiredMaterials.map(({ itemId, item, needed, have, recipes }) => (
                <div
                  key={itemId}
                  className={`bg-gray-800 rounded-lg p-2 border-2 ${
                    have >= needed ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {item && <span className="text-xl">{item.icon}</span>}
                    <span className="text-sm font-bold text-cyan-300">{item?.name || itemId}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Have: <span className={have >= needed ? 'text-green-400' : 'text-red-400'}>{have}</span> / Need: {needed}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Used in {recipes.length} recipe(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

