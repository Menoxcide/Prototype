import { useGameStore } from '../store/useGameStore'
import EnhancedModal from './components/EnhancedModal'
import EnhancedCard from './components/EnhancedCard'
import EnhancedBadge from './components/EnhancedBadge'
import { getItemIcon } from '../assets'

export default function EnhancedInventoryModal() {
  const { isInventoryOpen, toggleInventory, inventory } = useGameStore()

  return (
    <EnhancedModal
      isOpen={isInventoryOpen}
      onClose={toggleInventory}
      title="Inventory"
      size="md"
    >
      {inventory.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-xl">Your inventory is empty</div>
          <div className="text-sm text-gray-500 mt-2">Collect items from enemies and quests</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
            {inventory.map((invItem, index) => {
              const IconComponent = getItemIcon(invItem.item.id)
              
              return (
                <EnhancedCard
                  key={`${invItem.item.id}-${index}`}
                  className="relative group"
                >
                  <div className="flex flex-col items-center">
                    {/* Item Icon */}
                    <div className="text-4xl mb-2 relative">
                      {IconComponent ? (
                        <IconComponent size={32} color="#00ffff" />
                      ) : (
                        <span>{invItem.item.icon}</span>
                      )}
                      {/* Rarity glow effect */}
                      <div 
                        className="absolute inset-0 rounded-full blur-md opacity-50"
                        style={{
                          backgroundColor: {
                            common: '#c8c8c8',
                            uncommon: '#00ff00',
                            rare: '#0099ff',
                            epic: '#9d00ff',
                            legendary: '#ffa500'
                          }[invItem.item.rarity] || '#c8c8c8'
                        }}
                      />
                    </div>
                    
                    {/* Item Name */}
                    <div className="text-xs font-bold text-cyan-300 mb-1 text-center line-clamp-2">
                      {invItem.item.name}
                    </div>
                    
                    {/* Quantity */}
                    {invItem.item.stackable && (
                      <div className="text-xs text-gray-400 font-bold">
                        x{invItem.quantity}
                      </div>
                    )}
                    
                    {/* Rarity Badge */}
                    <div className="mt-1">
                      <EnhancedBadge variant={invItem.item.rarity as any}>
                        {invItem.item.rarity}
                      </EnhancedBadge>
                    </div>
                  </div>
                  
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-black/90 border border-cyan-500 rounded-lg p-2 text-xs text-cyan-300 whitespace-nowrap">
                      {invItem.item.description}
                    </div>
                  </div>
                </EnhancedCard>
              )
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-cyan-500/30">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Items: <span className="text-cyan-400 font-bold">{inventory.length}</span> / <span className="text-gray-500">50</span>
              </div>
              <div className="text-xs text-gray-500">
                {50 - inventory.length} slots available
              </div>
            </div>
          </div>
        </>
      )}
    </EnhancedModal>
  )
}

