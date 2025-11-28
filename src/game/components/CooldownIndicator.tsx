/**
 * Cooldown Indicator Component
 * Displays cooldown overlays for actions (spells, grapple, jump, etc.)
 * Can be used as a reusable component for any action
 */

import { useGameStore } from '../store/useGameStore'

interface CooldownIndicatorProps {
  actionId: string
  totalDuration: number // Total cooldown duration in milliseconds
  size?: 'small' | 'medium' | 'large'
  showTimer?: boolean
  className?: string
}

export default function CooldownIndicator({
  actionId,
  totalDuration,
  size = 'medium',
  showTimer = true,
  className = ''
}: CooldownIndicatorProps) {
  const { getRemainingCooldown, getCooldownProgress } = useGameStore()
  
  const remaining = getRemainingCooldown(actionId)
  const progress = getCooldownProgress(actionId, totalDuration)
  const isOnCooldown = remaining > 0

  if (!isOnCooldown) return null

  const sizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  }

  const sizeStyles = {
    small: { fontSize: '10px' },
    medium: { fontSize: '12px' },
    large: { fontSize: '14px' }
  }

  return (
    <div className={`absolute inset-0 bg-black/70 flex items-center justify-center ${className}`} style={{ opacity: 0.8 }}>
      {showTimer && (
        <span className={`text-white font-bold ${sizeClasses[size]}`} style={sizeStyles[size]}>
          {(remaining / 1000).toFixed(1)}s
        </span>
      )}
      {/* Progress bar overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-cyan-500/50 transition-all"
        style={{ height: `${(1 - progress) * 100}%` }}
      />
    </div>
  )
}

