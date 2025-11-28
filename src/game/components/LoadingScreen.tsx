/**
 * Loading Screen Component
 * Wrapper that uses rotating engaging loading screens
 */

import LoadingScreens from './LoadingScreens'

interface LoadingScreenProps {
  progress?: number // 0-100
  message?: string
  onComplete?: () => void
}

export default function LoadingScreen({ progress = 0, message, onComplete }: LoadingScreenProps) {
  return (
    <LoadingScreens
      progress={progress}
      message={message}
      onComplete={onComplete}
    />
  )
}

