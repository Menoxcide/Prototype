import React from 'react'
import '../styles/enhancedModals.css'

interface EnhancedCardProps {
  children: React.ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}

export default function EnhancedCard({
  children,
  selected = false,
  onClick,
  className = ''
}: EnhancedCardProps) {
  return (
    <div
      className={`enhanced-card ${selected ? 'enhanced-card-selected' : ''} ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </div>
  )
}

