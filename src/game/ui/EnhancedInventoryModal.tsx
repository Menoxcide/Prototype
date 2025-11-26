import { useState, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import EnhancedModal from './components/EnhancedModal'
import EnhancedCard from './components/EnhancedCard'
import EnhancedBadge from './components/EnhancedBadge'
import { getItemIcon } from '../assets'
import type { InventoryItem } from '../types'
import { useTranslation } from '../hooks/useTranslation'

export default function EnhancedInventoryModal() {
  const { t } = useTranslation()
  const { isInventoryOpen, toggleInventory, inventory } = useGameStore()
  const [sortBy, setSortBy] = useState<'name' | 'rarity' | 'type' | 'none'>('none')
  const [filterBy, setFilterBy] = useState<string>('all')
  const [draggedItem, setDraggedItem] = useState<{ index: number; item: InventoryItem } | null>(null)
  const dragOverIndex = useRef<number | null>(null)

  return (
    <EnhancedModal
      isOpen={isInventoryOpen}
      onClose={toggleInventory}
      title={t('inventory.title')}
      size="md"
    >
      {inventory.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-xl">{t('inventory.emptyMessage')}</div>
          <div className="text-sm text-gray-500 mt-2">{t('inventory.emptySubtext')}</div>
        </div>
      ) : (
        <>
          {/* Sort and Filter Controls */}
          <div className="flex gap-2 mb-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-400 text-sm"
            >
              <option value="none">{t('inventory.noSort')}</option>
              <option value="name">{t('inventory.sortByName')}</option>
              <option value="rarity">{t('inventory.sortByRarity')}</option>
              <option value="type">{t('inventory.sortByType')}</option>
            </select>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-400 text-sm"
            >
              <option value="all">{t('inventory.allItems')}</option>
              <option value="weapon">{t('inventory.weapons')}</option>
              <option value="armor">{t('inventory.armor')}</option>
              <option value="consumable">{t('inventory.consumables')}</option>
              <option value="resource">{t('inventory.resources')}</option>
            </select>
            <button
              onClick={() => {
                // Quick stack - stack similar items together
                // const _sorted = [...inventory].sort((a, b) => {
                //   if (a.item.id === b.item.id) return 0
                //   return a.item.id.localeCompare(b.item.id)
                // })
                // This would need a reorder function in the store
                console.log('Quick stack clicked')
              }}
              className="bg-gray-800 hover:bg-gray-700 border border-cyan-500 rounded px-3 py-2 text-cyan-400 text-sm"
            >
              {t('inventory.quickStack')}
            </button>
          </div>

          {/* Processed inventory with sorting and filtering */}
          {(() => {
            let processed = [...inventory]
            
            // Filter
            if (filterBy !== 'all') {
              processed = processed.filter(item => item.item.type === filterBy)
            }
            
            // Sort
            if (sortBy !== 'none') {
              processed.sort((a, b) => {
                switch (sortBy) {
                  case 'name':
                    return a.item.name.localeCompare(b.item.name)
                  case 'rarity':
                    const rarityOrder: Record<string, number> = {
                      common: 1,
                      uncommon: 2,
                      rare: 3,
                      epic: 4,
                      legendary: 5
                    }
                    return (rarityOrder[b.item.rarity] || 0) - (rarityOrder[a.item.rarity] || 0)
                  case 'type':
                    return a.item.type.localeCompare(b.item.type)
                  default:
                    return 0
                }
              })
            }
            
            return processed
          })()}

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
            {(() => {
              let processed = [...inventory]
              
              // Filter
              if (filterBy !== 'all') {
                processed = processed.filter(item => item.item.type === filterBy)
              }
              
              // Sort
              if (sortBy !== 'none') {
                processed.sort((a, b) => {
                  switch (sortBy) {
                    case 'name':
                      return a.item.name.localeCompare(b.item.name)
                    case 'rarity':
                      const rarityOrder: Record<string, number> = {
                        common: 1,
                        uncommon: 2,
                        rare: 3,
                        epic: 4,
                        legendary: 5
                      }
                      return (rarityOrder[b.item.rarity] || 0) - (rarityOrder[a.item.rarity] || 0)
                    case 'type':
                      return a.item.type.localeCompare(b.item.type)
                    default:
                      return 0
                  }
                })
              }
              
              return processed
            })().map((invItem, index) => {
              const originalIndex = inventory.findIndex(item => 
                item.item.id === invItem.item.id && item.quantity === invItem.quantity
              )
              const IconComponent = getItemIcon(invItem.item.id)
              
              return (
                <div
                  key={`${invItem.item.id}-${originalIndex >= 0 ? originalIndex : index}`}
                  className="relative group cursor-move"
                  draggable
                  onDragStart={(e: React.DragEvent) => {
                    setDraggedItem({ index: originalIndex >= 0 ? originalIndex : index, item: invItem })
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e: React.DragEvent) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    dragOverIndex.current = originalIndex >= 0 ? originalIndex : index
                  }}
                  onDrop={(e: React.DragEvent) => {
                    e.preventDefault()
                    if (draggedItem && dragOverIndex.current !== null) {
                      // Reorder items - would need a reorder function in store
                      console.log('Drop item', draggedItem.index, 'to', dragOverIndex.current)
                      setDraggedItem(null)
                      dragOverIndex.current = null
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedItem(null)
                    dragOverIndex.current = null
                  }}
                >
                  <EnhancedCard className="relative group">
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
                </div>
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

