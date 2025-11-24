import React from 'react'
import '../styles/enhancedModals.css'

interface EnhancedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function EnhancedButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  type = 'button'
}: EnhancedButtonProps) {
  const variantClass = `enhanced-button-${variant}`
  
  return (
    <button
      type={type}
      className={`enhanced-button ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

