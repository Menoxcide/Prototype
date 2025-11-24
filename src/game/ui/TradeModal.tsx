import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { removeTradeItem, setTradeCredits, confirmTrade, cancelTrade } from '../network/trading'
import { getItem } from '../data/items'

export default function TradeModal() {
  const { isTradeOpen, currentTrade, player, setCurrentTrade } = useGameStore()
  const [creditsInput, setCreditsInput] = useState('0')

  useEffect(() => {
    if (currentTrade) {
      const isPlayer1 = currentTrade.player1Id === player?.id
      setCreditsInput(isPlayer1 ? currentTrade.player1Offer.credits.toString() : currentTrade.player2Offer.credits.toString())
    }
  }, [currentTrade, player])

  if (!isTradeOpen || !currentTrade || !player) return null

  const isPlayer1 = currentTrade.player1Id === player.id
  const myOffer = isPlayer1 ? currentTrade.player1Offer : currentTrade.player2Offer
  const theirOffer = isPlayer1 ? currentTrade.player2Offer : currentTrade.player1Offer
  const myConfirmed = isPlayer1 ? currentTrade.player1Confirmed : currentTrade.player2Confirmed
  const theirConfirmed = isPlayer1 ? currentTrade.player2Confirmed : currentTrade.player1Confirmed

  const handleRemoveItem = (itemId: string) => {
    removeTradeItem(currentTrade.id, itemId)
  }

  const handleSetCredits = () => {
    const credits = parseInt(creditsInput) || 0
    setTradeCredits(currentTrade.id, credits)
  }

  const handleConfirm = () => {
    confirmTrade(currentTrade.id)
  }

  const handleCancel = () => {
    cancelTrade(currentTrade.id)
    setCurrentTrade(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-4xl w-full neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Trade</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* My Offer */}
          <div className="border-2 border-cyan-500 rounded-lg p-4">
            <h3 className="text-lg font-bold text-cyan-400 mb-2">Your Offer</h3>
            
            {/* Items */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Items:</div>
              <div className="space-y-2">
                {myOffer.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-800 p-2 rounded">
                    <span>{getItem(item.itemId)?.name || item.itemId} x{item.quantity}</span>
                    <button
                      onClick={() => handleRemoveItem(item.itemId)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Credits */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Credits:</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={creditsInput}
                  onChange={(e) => setCreditsInput(e.target.value)}
                  className="bg-gray-800 text-white px-2 py-1 rounded flex-1"
                />
                <button
                  onClick={handleSetCredits}
                  className="bg-cyan-600 hover:bg-cyan-500 px-4 py-1 rounded"
                >
                  Set
                </button>
              </div>
            </div>

            {/* Confirmation Status */}
            {myConfirmed && (
              <div className="text-green-400 text-sm mb-2">✓ You confirmed</div>
            )}
          </div>

          {/* Their Offer */}
          <div className="border-2 border-purple-500 rounded-lg p-4">
            <h3 className="text-lg font-bold text-purple-400 mb-2">Their Offer</h3>
            
            {/* Items */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Items:</div>
              <div className="space-y-2">
                {theirOffer.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-gray-800 p-2 rounded">
                    {getItem(item.itemId)?.name || item.itemId} x{item.quantity}
                  </div>
                ))}
                {theirOffer.items.length === 0 && (
                  <div className="text-gray-500 text-sm">No items</div>
                )}
              </div>
            </div>

            {/* Credits */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-2">Credits:</div>
              <div className="text-white">{theirOffer.credits}</div>
            </div>

            {/* Confirmation Status */}
            {theirConfirmed && (
              <div className="text-green-400 text-sm mb-2">✓ They confirmed</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={handleConfirm}
            disabled={myConfirmed || currentTrade.status !== 'pending'}
            className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed px-4 py-2 rounded font-bold"
          >
            {myConfirmed ? 'Confirmed' : 'Confirm Trade'}
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

