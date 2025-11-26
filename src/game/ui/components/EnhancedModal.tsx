import React, { useEffect } from 'react'
import '../styles/enhancedModals.css'
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation'

interface EnhancedModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * Enhanced Modal Component with keyboard navigation support
 * 
 * Features:
 * - Keyboard navigation (Tab, Shift+Tab, Escape, Arrow keys)
 * - Focus trapping within modal
 * - ARIA attributes for accessibility
 * - Body scroll prevention when open
 * 
 * @param isOpen - Whether the modal is open
 * @param onClose - Callback when modal should close (called on Escape or outside click)
 * @param title - Modal title (used for aria-labelledby)
 * @param children - Modal content
 * @param size - Modal size preset ('sm', 'md', 'lg', 'xl')
 * @param className - Additional CSS classes
 * 
 * @example
 * ```tsx
 * <EnhancedModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Settings"
 *   size="lg"
 * >
 *   <SettingsContent />
 * </EnhancedModal>
 * ```
 */
export default function EnhancedModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = ''
}: EnhancedModalProps) {
  const { containerRef, handleKeyDown } = useKeyboardNavigation({
    onEscape: onClose,
    trapFocus: true,
    enabled: isOpen
  })

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return (
    <div 
      className="enhanced-modal" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`enhanced-modal-content ${sizeClasses[size]} ${className}`}
        tabIndex={-1}
      >
        <div className="enhanced-modal-header">
          <h2 id="modal-title" className="enhanced-modal-title">{title}</h2>
          <button
            className="enhanced-modal-close"
            onClick={onClose}
            aria-label="Close modal"
            tabIndex={0}
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
