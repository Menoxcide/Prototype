import React from 'react'
import '../styles/enhancedModals.css'

interface EnhancedModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function EnhancedModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = ''
}: EnhancedModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return (
    <div className="enhanced-modal" onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div className={`enhanced-modal-content ${sizeClasses[size]} ${className}`}>
        <div className="enhanced-modal-header">
          <h2 className="enhanced-modal-title">{title}</h2>
          <button
            className="enhanced-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="enhanced-modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

