// Handle offline/online state changes
import { useGameStore } from '../store/useGameStore'

export function setupOfflineHandler() {
  const handleOnline = () => {
    console.log('Connection restored')
    const store = useGameStore.getState()
    if (store.setConnected) {
      store.setConnected(true)
    }
    // TODO: Reconnect to server
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

