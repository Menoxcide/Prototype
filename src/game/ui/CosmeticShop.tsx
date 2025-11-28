import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { COSMETICS, getCosmeticsByType, Cosmetic } from '../data/cosmetics'
import { useTranslation } from '../hooks/useTranslation'

export default function CosmeticShop() {
  const { t } = useTranslation()
  const { isShopOpen, toggleShop, player } = useGameStore()
  const [selectedType, setSelectedType] = useState<Cosmetic['type'] | 'all'>('all')
  const [ownedCosmetics, setOwnedCosmetics] = useState<Set<string>>(new Set())

  if (!isShopOpen || !player) return null

  const handlePurchase = (cosmetic: Cosmetic) => {
    if (player.credits < cosmetic.price) {
      alert(t('cosmeticShop.notEnoughCredits'))
      return
    }

    if (cosmetic.premiumOnly) {
      // Premium cosmetics require Stripe payment integration
      // 
      // Backend Implementation Required:
      // 1. Create a server endpoint (e.g., POST /api/create-checkout-session) to create Stripe Checkout sessions
      // 2. Handle Stripe webhooks for payment confirmation (e.g., POST /api/stripe-webhook)
      // 3. Update player's premium currency/items in database after successful payment
      // 4. Send confirmation message to client via Colyseus room message
      //
      // Client Implementation:
      // 1. Call backend endpoint to create checkout session
      // 2. Redirect to Stripe Checkout or use Stripe Elements for embedded payment
      // 3. Listen for payment confirmation from server
      // 4. Update local state and show success message
      //
      // For now, show a message directing users to contact support
      alert(t('cosmeticShop.premiumRequiresPayment'))
      return
    }

    // Purchase with credits
    useGameStore.getState().addCredits(-cosmetic.price)
    setOwnedCosmetics(new Set([...ownedCosmetics, cosmetic.id]))
    alert(t('cosmeticShop.purchased', { name: cosmetic.name }))
  }

  const displayedCosmetics = selectedType === 'all' 
    ? COSMETICS 
    : getCosmeticsByType(selectedType)

  const typeColors: Record<Cosmetic['type'], string> = {
    skin: 'text-pink-400',
    weapon_trail: 'text-blue-400',
    death_effect: 'text-red-400',
    name_glow: 'text-purple-400',
    aura: 'text-yellow-400',
    pet: 'text-green-400'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">{t('cosmeticShop.title')}</h2>
          <div className="flex items-center gap-4">
            <div className="text-yellow-400 font-bold">💰 {player.credits}</div>
            <button
              onClick={toggleShop}
              className="text-gray-400 hover:text-cyan-400 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              selectedType === 'all'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {(['skin', 'weapon_trail', 'death_effect', 'name_glow', 'aura', 'pet'] as Cosmetic['type'][]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-bold transition-all capitalize ${
                selectedType === type
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Cosmetics Grid */}
        <div className="grid grid-cols-3 gap-4">
          {displayedCosmetics.map(cosmetic => {
            const isOwned = ownedCosmetics.has(cosmetic.id)
            const canAfford = player.credits >= cosmetic.price

            return (
              <div
                key={cosmetic.id}
                className={`bg-gray-800 border-2 rounded-lg p-4 ${
                  isOwned
                    ? 'border-green-500'
                    : canAfford
                    ? 'border-cyan-500 hover:border-cyan-400'
                    : 'border-gray-700 opacity-60'
                }`}
              >
                <div className="text-4xl mb-2 text-center">{cosmetic.icon}</div>
                <div className="text-cyan-300 font-bold mb-1">{cosmetic.name}</div>
                <div className="text-xs text-gray-400 mb-2">{cosmetic.description}</div>
                <div className={`text-xs mb-2 ${typeColors[cosmetic.type]}`}>
                  {cosmetic.type.replace('_', ' ').toUpperCase()}
                </div>
                <div className="text-xs text-gray-500 mb-3">{cosmetic.rarity}</div>
                
                {isOwned ? (
                  <div className="text-center text-green-400 font-bold">✓ Owned</div>
                ) : (
                  <button
                    onClick={() => handlePurchase(cosmetic)}
                    disabled={!canAfford || cosmetic.premiumOnly}
                    className={`w-full py-2 px-4 rounded font-bold transition-all ${
                      canAfford && !cosmetic.premiumOnly
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : cosmetic.premiumOnly
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {cosmetic.premiumOnly ? '💳 Premium' : `💰 ${cosmetic.price}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

