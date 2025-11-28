import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getNPC } from '../data/npcs'
import { getItem } from '../data/items'
import { endNPCInteraction, getNPCDialogue, useNPCService, getNPCQuests, getNPCShopItems, getNPCServices } from '../systems/npcSystem'
import { acceptQuest } from '../network/quests'
import { useTranslation } from '../hooks/useTranslation'
import { windowManager } from '../utils/windowManager'

const WINDOW_ID = 'npc-dialogue-modal'

export default function NPCDialogueModal() {
  const { t } = useTranslation()
  const { interactingWithNPC, setInteractingWithNPC, player, toggleMarket, toggleQuest } = useGameStore()
  const [dialogueIndex, setDialogueIndex] = useState(0)
  const [view, setView] = useState<'dialogue' | 'quests' | 'shop' | 'services'>('dialogue')
  const [windowState, setWindowState] = useState<{ zIndex: number; position: { x: number; y: number } } | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Register window and get position/z-index
  useEffect(() => {
    if (interactingWithNPC && player) {
      const state = windowManager.registerWindow(WINDOW_ID, undefined, { width: 500, height: 400 })
      setWindowState(state)
      
      // Bring to front when clicked
      const handleClick = () => {
        const newZIndex = windowManager.bringToFront(WINDOW_ID)
        setWindowState(prev => prev ? { ...prev, zIndex: newZIndex } : null)
      }
      
      const modal = modalRef.current
      if (modal) {
        modal.addEventListener('mousedown', handleClick)
        return () => {
          modal.removeEventListener('mousedown', handleClick)
        }
      }
    } else {
      windowManager.unregisterWindow(WINDOW_ID)
      setWindowState(null)
    }
  }, [interactingWithNPC, player])

  // Focus the modal when it opens
  useEffect(() => {
    if (windowState && modalRef.current) {
      const focusableElement = modalRef.current.querySelector('button, input, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement
      if (focusableElement) {
        focusableElement.focus()
      }
    }
  }, [windowState])

  if (!interactingWithNPC || !player || !windowState) return null

  const npc = getNPC(interactingWithNPC)
  if (!npc) {
    setInteractingWithNPC(null)
    return null
  }

  const handleClose = () => {
    windowManager.unregisterWindow(WINDOW_ID)
    endNPCInteraction()
    setDialogueIndex(0)
    setView('dialogue')
  }

  const handleNextDialogue = () => {
    if (npc.dialogue && dialogueIndex < npc.dialogue.length - 1) {
      setDialogueIndex(dialogueIndex + 1)
    } else {
      // Show options after dialogue
      if (npc.quests && npc.quests.length > 0) {
        setView('quests')
      } else if (npc.shopItems && npc.shopItems.length > 0) {
        setView('shop')
      } else if (npc.services && npc.services.length > 0) {
        setView('services')
      } else {
        handleClose()
      }
    }
  }

  const handleUseService = (service: string) => {
    useNPCService(interactingWithNPC, service)
    handleClose()
  }

  const handleBuyItem = (itemId: string, price: number) => {
    // TODO: Implement item purchase
    console.log(`Buying ${itemId} for ${price} credits`)
    // This would need to integrate with the market system
    toggleMarket()
    handleClose()
  }

  const handleAcceptQuest = (questId: string) => {
    acceptQuest(questId)
    toggleQuest()
    handleClose()
  }

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50"
      style={{ 
        zIndex: windowState.zIndex,
        pointerEvents: 'auto'
      }}
      onMouseDown={(e) => {
        // Bring to front when clicking on backdrop
        if (e.target === e.currentTarget) {
          const newZIndex = windowManager.bringToFront(WINDOW_ID)
          setWindowState(prev => prev ? { ...prev, zIndex: newZIndex } : null)
        }
      }}
      onClick={(e) => {
        // Prevent click-through to game world
        e.stopPropagation()
        if (e.target === e.currentTarget) {
          // Close on backdrop click (optional - you may want to remove this)
          // handleClose()
        }
      }}
    >
      <div 
        className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-md w-full mx-4"
        style={{
          position: 'absolute',
          left: `${windowState.position.x}px`,
          top: `${windowState.position.y}px`,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => {
          // Bring to front when clicking on modal
          e.stopPropagation()
          const newZIndex = windowManager.bringToFront(WINDOW_ID)
          setWindowState(prev => prev ? { ...prev, zIndex: newZIndex } : null)
        }}
      >
        {/* NPC Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{npc.icon}</div>
            <div>
              <h2 className="text-cyan-300 font-bold text-xl">{npc.name}</h2>
              <p className="text-gray-400 text-sm">{npc.description}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Dialogue View */}
        {view === 'dialogue' && (
          <div className="mb-4">
            <div className="bg-gray-800 rounded-lg p-4 mb-4 min-h-[100px]">
              <p className="text-white text-lg">
                {getNPCDialogue(interactingWithNPC, dialogueIndex)}
              </p>
            </div>
            <div className="flex justify-between">
              <button
                onClick={handleClose}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                {npc.farewell}
              </button>
              <button
                onClick={handleNextDialogue}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded"
              >
                {dialogueIndex < (npc.dialogue?.length || 0) - 1 ? t('npc.next') : t('npc.continue')}
              </button>
            </div>
          </div>
        )}

        {/* Quests View */}
        {view === 'quests' && (
          <div className="mb-4">
            <h3 className="text-cyan-300 font-bold text-lg mb-3">{t('npc.availableQuests')}</h3>
            {getNPCQuests(interactingWithNPC).length > 0 ? (
              <div className="space-y-2">
                {getNPCQuests(interactingWithNPC).map(questId => (
                  <div
                    key={questId}
                    className="bg-gray-800 border border-cyan-500 rounded-lg p-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white">{questId}</span>
                      <button
                        onClick={() => handleAcceptQuest(questId)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                      >
                        {t('common.accept')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">{t('npc.noQuestsAvailable')}</p>
            )}
            <button
              onClick={() => setView('dialogue')}
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
            >
              {t('common.back')}
            </button>
          </div>
        )}

        {/* Shop View */}
        {view === 'shop' && (
          <div className="mb-4">
            <h3 className="text-cyan-300 font-bold text-lg mb-3">{t('npc.shop')}</h3>
            {getNPCShopItems(interactingWithNPC).length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {getNPCShopItems(interactingWithNPC).map((shopItem, index) => {
                  const item = getItem(shopItem.itemId)
                  if (!item) return null
                  
                  return (
                    <div
                      key={index}
                      className="bg-gray-800 border border-cyan-500 rounded-lg p-3 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <div className="text-white font-semibold">{item.name}</div>
                          <div className="text-gray-400 text-sm">{item.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-400 font-bold">{shopItem.price} {t('npc.credits')}</span>
                        <button
                          onClick={() => handleBuyItem(shopItem.itemId, shopItem.price)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          disabled={player.credits < shopItem.price}
                        >
                          {t('npc.buy')}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-400">{t('npc.noItemsForSale')}</p>
            )}
            <button
              onClick={() => setView('dialogue')}
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
            >
              {t('common.back')}
            </button>
          </div>
        )}

        {/* Services View */}
        {view === 'services' && (
          <div className="mb-4">
            <h3 className="text-cyan-300 font-bold text-lg mb-3">{t('npc.services')}</h3>
            {getNPCServices(interactingWithNPC).length > 0 ? (
              <div className="space-y-2">
                {getNPCServices(interactingWithNPC).map(service => (
                  <button
                    key={service}
                    onClick={() => handleUseService(service)}
                    className="w-full bg-gray-800 border border-cyan-500 rounded-lg p-3 text-left hover:bg-gray-700 transition-colors"
                  >
                    <div className="text-white font-semibold capitalize">{service}</div>
                    <div className="text-gray-400 text-sm">
                      {service === 'heal' && t('npc.serviceHeal')}
                      {service === 'repair' && t('npc.serviceRepair')}
                      {service === 'teleport' && t('npc.serviceTeleport')}
                      {service === 'enchant' && t('npc.serviceEnchant')}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">{t('npc.noServicesAvailable')}</p>
            )}
            <button
              onClick={() => setView('dialogue')}
              className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded w-full"
            >
              {t('common.back')}
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
          {npc.quests && npc.quests.length > 0 && (
            <button
              onClick={() => setView('quests')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
            >
              {t('common.quests')}
            </button>
          )}
          {npc.shopItems && npc.shopItems.length > 0 && (
            <button
              onClick={() => setView('shop')}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
            >
              {t('npc.shop')}
            </button>
          )}
          {npc.services && npc.services.length > 0 && (
            <button
              onClick={() => setView('services')}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm"
            >
              {t('npc.services')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

