import { useGameStore } from '../store/useGameStore'
import { ITEMS } from '../data/items'
import { useTranslation } from '../hooks/useTranslation'

export default function MarketModal() {
  const { t } = useTranslation()
  const { isMarketOpen, toggleMarket, player, addItem, removeItem, addCredits } = useGameStore()

  if (!isMarketOpen || !player) return null

  const handleBuy = (itemId: string, price: number) => {
    if (player.credits >= price) {
      addCredits(-price)
      addItem(itemId, 1)
    }
  }

  const handleSell = (itemId: string, price: number) => {
    // Check if player has item
    const hasItem = useGameStore.getState().getInventoryItem(itemId)
    if (hasItem && hasItem.quantity > 0) {
      removeItem(itemId, 1)
      addCredits(price)
    }
  }

  const buyableItems = ITEMS.filter(item => item.type !== 'resource' && item.type !== 'material')
  const sellableItems = ITEMS.filter(item => item.type === 'resource' || item.type === 'material')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">{t('market.title')}</h2>
          <button
            onClick={toggleMarket}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="text-cyan-300 font-bold">💰 {t('common.credits')}: {player.credits}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Buy Section */}
          <div>
            <h3 className="text-lg font-bold text-green-400 mb-3">{t('market.buy')}</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {buyableItems.map(item => (
                <div
                  key={item.id}
                  className="bg-gray-800 border border-cyan-500 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-cyan-300">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-bold">💰 {item.value}</span>
                    <button
                      onClick={() => handleBuy(item.id, item.value)}
                      disabled={player.credits < item.value}
                      className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                        player.credits >= item.value
                          ? 'bg-green-600 hover:bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {t('market.buy')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sell Section */}
          <div>
            <h3 className="text-lg font-bold text-red-400 mb-3">{t('market.sell')}</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sellableItems.map(item => {
                const sellPrice = Math.floor(item.value * 0.5) // 50% of value
                const hasItem = useGameStore.getState().getInventoryItem(item.id)

                return (
                  <div
                    key={item.id}
                    className={`bg-gray-800 border rounded-lg p-3 ${
                      hasItem && hasItem.quantity > 0
                        ? 'border-cyan-500'
                        : 'border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{item.icon}</span>
                      <div className="flex-1">
                        <div className="font-bold text-cyan-300">{item.name}</div>
                        {hasItem && (
                          <div className="text-xs text-gray-400">
                            {t('crafting.youHave', { count: hasItem.quantity })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-400 font-bold">💰 {sellPrice}</span>
                      <button
                        onClick={() => handleSell(item.id, sellPrice)}
                        disabled={!hasItem || hasItem.quantity === 0}
                        className={`px-3 py-1 rounded text-sm font-bold transition-all ${
                          hasItem && hasItem.quantity > 0
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {t('market.sell')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

