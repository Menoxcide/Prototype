import { useGameStore } from '../store/useGameStore'

export default function InventoryModal() {
  const { isInventoryOpen, toggleInventory, inventory } = useGameStore()

  if (!isInventoryOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Inventory</h2>
          <button
            onClick={toggleInventory}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        {inventory.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            Your inventory is empty
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {inventory.map((invItem, index) => (
              <div
                key={`${invItem.item.id}-${index}`}
                className="bg-gray-800 border border-cyan-500 rounded-lg p-3 hover:border-cyan-400 transition-all"
              >
                <div className="text-3xl mb-2">{invItem.item.icon}</div>
                <div className="text-sm font-bold text-cyan-300 mb-1">
                  {invItem.item.name}
                </div>
                {invItem.item.stackable && (
                  <div className="text-xs text-gray-400">x{invItem.quantity}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {invItem.item.rarity}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Items: {inventory.length} / 50
          </div>
        </div>
      </div>
    </div>
  )
}

