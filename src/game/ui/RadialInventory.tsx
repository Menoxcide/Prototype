/**
 * Radial Inventory System
 * Touch-friendly radial menu for quick gear swaps
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getItem } from '../data/items'

const RADIUS = 120 // Radius of radial menu in pixels
const ITEM_COUNT = 9 // Number of slots (1-9)

interface RadialInventoryProps {
  visible: boolean
  onClose: () => void
  onSelect: (slot: number) => void
}

export default function RadialInventory({ visible, onClose, onSelect }: RadialInventoryProps) {
  const inventory = useGameStore((s) => s.inventory)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Get items for quick slots (first 9 items in inventory)
  const quickSlots = inventory.slice(0, ITEM_COUNT).map((item, index) => ({
    slot: index + 1,
    item: getItem(item.item.id),
    quantity: item.quantity
  }))

  // Calculate position for each slot
  const getSlotPosition = (slot: number) => {
    const angle = ((slot - 1) * (360 / ITEM_COUNT) - 90) * (Math.PI / 180) // Start at top
    return {
      x: Math.cos(angle) * RADIUS,
      y: Math.sin(angle) * RADIUS
    }
  }

  // Handle touch/mouse events
  useEffect(() => {
    if (!visible || !containerRef.current) return

    const handleStart = (clientX: number, clientY: number) => {
      const rect = containerRef.current!.getBoundingClientRect()
      touchStartRef.current = {
        x: clientX - rect.left - rect.width / 2,
        y: clientY - rect.top - rect.height / 2
      }
    }

    const handleMove = (clientX: number, clientY: number) => {
      if (!touchStartRef.current) return
      const rect = containerRef.current!.getBoundingClientRect()
      const x = clientX - rect.left - rect.width / 2
      const y = clientY - rect.top - rect.height / 2
      
      // Calculate angle and distance
      const angle = Math.atan2(y, x) * (180 / Math.PI) + 90 // Adjust to start at top
      const normalizedAngle = ((angle % 360) + 360) % 360
      const distance = Math.sqrt(x * x + y * y)
      
      // Select slot if within radius
      if (distance < RADIUS + 30) {
        const slot = Math.floor((normalizedAngle / 360) * ITEM_COUNT) + 1
        if (slot >= 1 && slot <= ITEM_COUNT) {
          setSelectedSlot(slot)
        }
      } else {
        setSelectedSlot(null)
      }
    }

    const handleEnd = () => {
      if (selectedSlot !== null) {
        onSelect(selectedSlot)
        onClose()
      } else {
        onClose()
      }
      touchStartRef.current = null
      setSelectedSlot(null)
    }

    const container = containerRef.current

    // Touch events
    const touchStart = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    }

    const touchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    }

    const touchEnd = (e: TouchEvent) => {
      e.preventDefault()
      handleEnd()
    }

    // Mouse events (for desktop)
    const mouseDown = (e: MouseEvent) => {
      e.preventDefault()
      handleStart(e.clientX, e.clientY)
    }

    const mouseMove = (e: MouseEvent) => {
      e.preventDefault()
      handleMove(e.clientX, e.clientY)
    }

    const mouseUp = (e: MouseEvent) => {
      e.preventDefault()
      handleEnd()
    }

    container.addEventListener('touchstart', touchStart)
    container.addEventListener('touchmove', touchMove)
    container.addEventListener('touchend', touchEnd)
    container.addEventListener('mousedown', mouseDown)
    container.addEventListener('mousemove', mouseMove)
    container.addEventListener('mouseup', mouseUp)

    return () => {
      container.removeEventListener('touchstart', touchStart)
      container.removeEventListener('touchmove', touchMove)
      container.removeEventListener('touchend', touchEnd)
      container.removeEventListener('mousedown', mouseDown)
      container.removeEventListener('mousemove', mouseMove)
      container.removeEventListener('mouseup', mouseUp)
    }
  }, [visible, selectedSlot, onSelect, onClose])

  // Keyboard shortcuts (1-9 keys)
  useEffect(() => {
    if (!visible) return

    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key
      if (key >= '1' && key <= '9') {
        const slot = parseInt(key)
        onSelect(slot)
        onClose()
        e.preventDefault()
      } else if (key === 'Escape') {
        onClose()
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [visible, onSelect, onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={containerRef}
        className="relative w-64 h-64 flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        {/* Center circle */}
        <div className="absolute w-16 h-16 bg-gray-900/90 border-2 border-cyan-500 rounded-full flex items-center justify-center">
          <span className="text-cyan-400 text-xs">Quick</span>
        </div>

        {/* Slot items */}
        {quickSlots.map(({ slot, item, quantity }) => {
          const pos = getSlotPosition(slot)
          const isSelected = selectedSlot === slot
          
          return (
            <div
              key={slot}
              className={`absolute w-12 h-12 bg-gray-900/90 border-2 rounded-lg flex items-center justify-center transition-all ${
                isSelected
                  ? 'border-cyan-400 scale-125 bg-cyan-900/50'
                  : 'border-gray-600'
              }`}
              style={{
                left: `calc(50% + ${pos.x}px - 24px)`,
                top: `calc(50% + ${pos.y}px - 24px)`
              }}
            >
              {item ? (
                <div className="flex flex-col items-center">
                  <span className="text-xs">{item.icon || '📦'}</span>
                  {quantity > 1 && (
                    <span className="text-[10px] text-cyan-400">{quantity}</span>
                  )}
                </div>
              ) : (
                <span className="text-gray-600 text-xs">{slot}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

