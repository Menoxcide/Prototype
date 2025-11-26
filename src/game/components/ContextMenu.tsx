/**
 * Context Menu Component
 * Right-click context menu for UI elements
 */

import { useState, useEffect, useRef } from 'react'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: string
  onClick: () => void
  disabled?: boolean
  divider?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  position: { x: number; y: number }
  onClose: () => void
}

export default function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Keep menu within viewport
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      let x = position.x
      let y = position.y

      if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 8
      }
      if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 8
      }
      if (x < 8) x = 8
      if (y < 8) y = 8

      setAdjustedPosition({ x, y })
    }
  }, [position])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-900 border-2 border-cyan-500 rounded-lg shadow-lg min-w-[200px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`
      }}
    >
      {items.map((item, index) => (
        <div key={item.id}>
          {item.divider && index > 0 && (
            <div className="border-t border-gray-700 my-1" />
          )}
          <button
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
            className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${
              item.disabled
                ? 'text-gray-600 cursor-not-allowed'
                : item.danger
                ? 'text-red-400 hover:bg-red-900/30'
                : 'text-cyan-300 hover:bg-cyan-900/30'
            }`}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  )
}

