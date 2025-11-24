import { useState, useEffect } from 'react'
import { useGameStore } from './game/store/useGameStore'
import { ErrorBoundary } from './game/utils/errorBoundary'
import LoginScreen from './game/ui/LoginScreen'
import CharacterCreation from './game/ui/CharacterCreation'
import HUD from './game/ui/HUD'
import { AuthUser } from './firebase/auth'
import EnhancedInventoryModal from './game/ui/EnhancedInventoryModal'
import CraftingModal from './game/ui/CraftingModal'
import MarketModal from './game/ui/MarketModal'
import SpellbookModal from './game/ui/SpellbookModal'
import GuildModal from './game/ui/GuildModal'
import QuestModal from './game/ui/QuestModal'
import TradeModal from './game/ui/TradeModal'
import BattlePassModal from './game/ui/BattlePassModal'
import AchievementModal from './game/ui/AchievementModal'
import CosmeticShop from './game/ui/CosmeticShop'
import Chat from './game/ui/Chat'
import KillFeed from './game/ui/KillFeed'
import ProximityVoice from './game/components/ProximityVoice'
import EmoteMenu from './game/ui/EmoteMenu'
import PerformanceMonitor from './game/components/PerformanceMonitor'
import Game from './game/Game'

function App() {
  const { player } = useGameStore()
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Log state changes
  useEffect(() => {
    console.log('App: State changed', { 
      hasAuthUser: !!authenticatedUser,
      hasPlayer: !!player, 
      isInitialized,
      playerId: player?.id,
      playerName: player?.name 
    })
  }, [player?.id, player?.name, isInitialized, authenticatedUser])

  // Show login screen if not authenticated
  if (!authenticatedUser) {
    return (
      <ErrorBoundary>
        <LoginScreen onAuthSuccess={(user) => {
          console.log('App: User authenticated', { uid: user.uid, email: user.email })
          setAuthenticatedUser(user)
          // Store Firebase UID in game store for later use
          useGameStore.setState({ firebaseUid: user.uid })
        }} />
      </ErrorBoundary>
    )
  }

  // Show character creation if player not initialized (but user is authenticated)
  if (!player || !isInitialized) {
    console.log('App: Showing CharacterCreation', { hasPlayer: !!player, isInitialized, uid: authenticatedUser.uid })
    return (
      <ErrorBoundary>
        <CharacterCreation 
          firebaseUid={authenticatedUser.uid}
          onComplete={() => {
            console.log('App: CharacterCreation onComplete called')
            setIsInitialized(true)
            // Double-check player is set
            const currentPlayer = useGameStore.getState().player
            console.log('App: Player after onComplete', { hasPlayer: !!currentPlayer, playerId: currentPlayer?.id })
          }} 
        />
      </ErrorBoundary>
    )
  }

  // Show main game with HUD and modals
  return (
    <ErrorBoundary>
      <Game />
      <HUD />
      <EnhancedInventoryModal />
      {/* Fallback to original if needed: <InventoryModal /> */}
      <CraftingModal />
      <MarketModal />
      <SpellbookModal />
      <GuildModal />
      <QuestModal />
      <TradeModal />
      <BattlePassModal />
      <AchievementModal />
      <CosmeticShop />
      <Chat />
      <KillFeed />
      <ProximityVoice />
      <EmoteMenu />
      <PerformanceMonitor />
    </ErrorBoundary>
  )
}

export default App

