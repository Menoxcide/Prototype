// Handle offline/online state changes
import { useGameStore } from '../store/useGameStore'
import { joinRoom } from '../network/colyseus'
import { startMovementSync } from '../network/syncSystem'
import { getIdToken } from '../../firebase/auth'

export function setupOfflineHandler() {
  const handleOnline = async () => {
    console.log('Connection restored')
    const store = useGameStore.getState()
    if (store.setConnected) {
      store.setConnected(true)
    }
    
    // Reconnect to server if player exists and not already connected
    const { player, isConnected } = store
    if (player && !isConnected) {
      try {
        // Get Firebase token for reconnection
        const firebaseToken = await getIdToken()
        
        await joinRoom(player.name, player.race, true, firebaseToken || undefined)
        startMovementSync()
        console.log('Reconnected to server after going online')
      } catch (error) {
        console.error('Failed to reconnect after going online:', error)
      }
    }
  }

  const handleOffline = () => {
    console.log('Connection lost')
    const store = useGameStore.getState()
    if (store.setConnected) {
      store.setConnected(false)
    }
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Check initial state
  if (!navigator.onLine) {
    handleOffline()
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

