import React from 'react'
import '../styles/enhancedModals.css'

interface EnhancedBadgeProps {
  children: React.ReactNode
  variant?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  className?: string
}

export default function EnhancedBadge({
  children,
  variant = 'common',
  className = ''
}: EnhancedBadgeProps) {
  return (
    <span className={`enhanced-badge enhanced-badge-${variant} ${className}`}>
      {children}
    </span>
  )
}

