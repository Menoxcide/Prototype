import { useState, useRef, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { isMobileDevice } from '../utils/mobileOptimizations'

interface UILayout {
  x: number
  y: number
  width: number
  height: number
  isMinimized?: boolean
}

// Global registry to track all draggable components for collision detection
interface ComponentBounds {
  id: string
  x: number
  y: number
  width: number
  height: number
}

const componentRegistry = new Map<string, ComponentBounds>()

// Collision detection padding (minimum gap between components)
const COLLISION_PADDING = 4

interface DraggableResizableProps {
  id: string
  children: ReactNode
  defaultPosition?: { x: number; y: number }
  defaultSize?: { width: number; height: number }
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  resizable?: boolean
  draggable?: boolean
  bounds?: 'parent' | 'window'
  storageKey?: string
  className?: string
  header?: ReactNode
  onLayoutChange?: (layout: UILayout) => void
}

export default function DraggableResizable({
  id,
  children,
  defaultPosition = { x: 0, y: 0 },
  defaultSize,
  minWidth = 100,
  minHeight = 100,
  maxWidth,
  maxHeight,
  resizable = true,
  draggable = true,
  bounds = 'window',
  storageKey,
  className = '',
  header,
  onLayoutChange
}: DraggableResizableProps) {
  const isMobile = isMobileDevice()
  
  // Enable dragging and resizing on mobile by default
  const effectiveDraggable = draggable
  const effectiveResizable = resizable
  const componentRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0, edge: '' })
  const [headerHeight, setHeaderHeight] = useState(0)
  const dragThresholdRef = useRef({ x: 0, y: 0, started: false })
  const DRAG_THRESHOLD = 5 // pixels of movement before drag starts

  // Load saved layout or use defaults
  const loadLayout = (): UILayout => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`ui_layout_${storageKey}`)
        if (saved) {
          const parsed = JSON.parse(saved)
          return {
            x: parsed.x ?? defaultPosition.x,
            y: parsed.y ?? defaultPosition.y,
            width: parsed.width ?? defaultSize?.width ?? undefined,
            height: parsed.height ?? defaultSize?.height ?? undefined,
            isMinimized: parsed.isMinimized ?? false
          }
        }
      } catch (e) {
        console.warn('Failed to load UI layout:', e)
      }
    }
    return {
      x: defaultPosition.x,
      y: defaultPosition.y,
      width: defaultSize?.width ?? 400,
      height: defaultSize?.height ?? 300,
      isMinimized: false
    }
  }

  const [layout, setLayout] = useState<UILayout>(loadLayout)
  const [isHovered, setIsHovered] = useState(false)
  const touchStartRef = useRef({ x: 0, y: 0, clientX: 0, clientY: 0 })
  
  // Refs for handlers that need to reference each other
  const handleDragMoveRef = useRef<((e: MouseEvent | TouchEvent) => void) | undefined>(undefined)
  const handleDragMoveWithThresholdRef = useRef<((e: MouseEvent | TouchEvent) => void) | undefined>(undefined)
  const handleDragEndRef = useRef<(() => void) | undefined>(undefined)

  // Save layout to localStorage
  const saveLayout = (newLayout: UILayout) => {
    if (storageKey) {
      try {
        localStorage.setItem(`ui_layout_${storageKey}`, JSON.stringify(newLayout))
      } catch (e) {
        console.warn('Failed to save UI layout:', e)
      }
    }
    if (onLayoutChange) {
      onLayoutChange(newLayout)
    }
  }

  // Check for collisions with other components
  const checkCollision = (x: number, y: number, width: number, height: number): ComponentBounds | null => {
    for (const [otherId, otherBounds] of componentRegistry.entries()) {
      if (otherId === id) continue // Skip self
      
      // AABB collision detection with padding
      if (
        x < otherBounds.x + otherBounds.width + COLLISION_PADDING &&
        x + width + COLLISION_PADDING > otherBounds.x &&
        y < otherBounds.y + otherBounds.height + COLLISION_PADDING &&
        y + height + COLLISION_PADDING > otherBounds.y
      ) {
        return otherBounds
      }
    }
    return null
  }

  // Resolve collision by finding nearest non-overlapping position
  const resolveCollision = (x: number, y: number, width: number, height: number): { x: number; y: number } => {
    const bounds = getBounds()
    let resolvedX = x
    let resolvedY = y
    
    // Try to resolve horizontally first
    const collision = checkCollision(resolvedX, resolvedY, width, height)
    if (collision) {
      // Try moving right
      const rightX = collision.x + collision.width + COLLISION_PADDING
      if (rightX + width <= bounds.maxX && !checkCollision(rightX, resolvedY, width, height)) {
        resolvedX = rightX
      } else {
        // Try moving left
        const leftX = collision.x - width - COLLISION_PADDING
        if (leftX >= bounds.minX && !checkCollision(leftX, resolvedY, width, height)) {
          resolvedX = leftX
        } else {
          // Try moving down
          const downY = collision.y + collision.height + COLLISION_PADDING
          if (downY + height <= bounds.maxY && !checkCollision(resolvedX, downY, width, height)) {
            resolvedY = downY
          } else {
            // Try moving up
            const upY = collision.y - height - COLLISION_PADDING
            if (upY >= bounds.minY && !checkCollision(resolvedX, upY, width, height)) {
              resolvedY = upY
            }
          }
        }
      }
    }
    
    return { x: resolvedX, y: resolvedY }
  }

  // Update component registry
  useEffect(() => {
    const rect = componentRef.current?.getBoundingClientRect()
    if (rect) {
      componentRegistry.set(id, {
        id,
        x: layout.x,
        y: layout.y,
        width: rect.width,
        height: rect.height
      })
    }
    
    return () => {
      componentRegistry.delete(id)
    }
  }, [id, layout.x, layout.y, layout.width, layout.height])

  // Get bounds based on bounds prop
  const getBounds = () => {
    if (bounds === 'window') {
      // On mobile, ensure bounds account for safe areas
      const safePadding = isMobile ? 8 : 0
      return {
        minX: safePadding,
        minY: safePadding,
        maxX: window.innerWidth - safePadding,
        maxY: window.innerHeight - safePadding
      }
    }
    // parent bounds
    const parent = componentRef.current?.parentElement
    if (parent) {
      const rect = parent.getBoundingClientRect()
      const safePadding = isMobile ? 8 : 0
      return {
        minX: safePadding,
        minY: safePadding,
        maxX: rect.width - safePadding,
        maxY: rect.height - safePadding
      }
    }
    const safePadding = isMobile ? 8 : 0
    return {
      minX: safePadding,
      minY: safePadding,
      maxX: window.innerWidth - safePadding,
      maxY: window.innerHeight - safePadding
    }
  }

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !componentRef.current) return

    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? touchStartRef.current.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? touchStartRef.current.clientY : e.clientY

    const bounds = getBounds()
    const newX = clientX - dragStartRef.current.x
    const newY = clientY - dragStartRef.current.y

    const rect = componentRef.current.getBoundingClientRect()
    let constrainedX = Math.max(
      bounds.minX,
      Math.min(newX, bounds.maxX - (rect.width || 0))
    )
    let constrainedY = Math.max(
      bounds.minY,
      Math.min(newY, bounds.maxY - (rect.height || 0))
    )

    // Check for collisions and resolve
    const resolved = resolveCollision(constrainedX, constrainedY, rect.width, rect.height)
    constrainedX = resolved.x
    constrainedY = resolved.y

    // Ensure still within bounds after collision resolution
    constrainedX = Math.max(
      bounds.minX,
      Math.min(constrainedX, bounds.maxX - (rect.width || 0))
    )
    constrainedY = Math.max(
      bounds.minY,
      Math.min(constrainedY, bounds.maxY - (rect.height || 0))
    )

    const newLayout = {
      ...layout,
      x: constrainedX,
      y: constrainedY
    }
    setLayout(newLayout)
    saveLayout(newLayout)
  }, [layout])
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false
    dragThresholdRef.current.started = false
    if (handleDragMoveRef.current) {
      document.removeEventListener('mousemove', handleDragMoveRef.current)
      document.removeEventListener('touchmove', handleDragMoveRef.current)
    }
    if (handleDragMoveWithThresholdRef.current) {
      document.removeEventListener('mousemove', handleDragMoveWithThresholdRef.current)
      document.removeEventListener('touchmove', handleDragMoveWithThresholdRef.current)
    }
    if (handleDragEndRef.current) {
      document.removeEventListener('mouseup', handleDragEndRef.current)
      document.removeEventListener('touchend', handleDragEndRef.current)
    }
  }, [])
  
  // Handle drag move with threshold - only start dragging after movement threshold
  const handleDragMoveWithThreshold = useCallback((e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? touchStartRef.current.clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? touchStartRef.current.clientY : e.clientY
    
    if (!dragThresholdRef.current.started) {
      // Check if movement exceeds threshold
      const deltaX = Math.abs(clientX - dragThresholdRef.current.x)
      const deltaY = Math.abs(clientY - dragThresholdRef.current.y)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > DRAG_THRESHOLD) {
        // Movement threshold exceeded, start dragging
        dragThresholdRef.current.started = true
        isDraggingRef.current = true
        // Switch to normal drag handler
        if ('touches' in e) {
          if (handleDragMoveWithThresholdRef.current) {
            document.removeEventListener('touchmove', handleDragMoveWithThresholdRef.current)
          }
          if (handleDragMoveRef.current) {
            document.addEventListener('touchmove', handleDragMoveRef.current)
          }
        } else {
          if (handleDragMoveWithThresholdRef.current) {
            document.removeEventListener('mousemove', handleDragMoveWithThresholdRef.current)
          }
          if (handleDragMoveRef.current) {
            document.addEventListener('mousemove', handleDragMoveRef.current)
          }
        }
      } else {
        // Not enough movement yet, don't start drag
        return
      }
    }
    
    // If drag has started, use normal drag handler
    if (isDraggingRef.current && handleDragMoveRef.current) {
      handleDragMoveRef.current(e)
    }
  }, [])
  
  // Handle drag start - check if click is on interactive element
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!draggable || isResizingRef.current) return
    
    // Check if click is on an interactive element (button, input, etc.)
    const target = e.target as HTMLElement
    const interactiveElement = target.closest('button, input, textarea, select, a, [role="button"], [role="textbox"]')
    
    // If clicking on interactive element, don't start drag
    if (interactiveElement) {
      return
    }
    
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY
    
    // Initialize drag threshold tracking
    dragThresholdRef.current = {
      x: clientX,
      y: clientY,
      started: false
    }
    
    touchStartRef.current = {
      x: clientX,
      y: clientY,
      clientX,
      clientY
    }
    
    const rect = componentRef.current?.getBoundingClientRect()
    if (rect) {
      dragStartRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top
      }
    }
    
    // Add listeners to track movement and determine if drag should start
    if ('touches' in e) {
      if (handleDragMoveWithThresholdRef.current) {
        document.addEventListener('touchmove', handleDragMoveWithThresholdRef.current)
      }
      if (handleDragEndRef.current) {
        document.addEventListener('touchend', handleDragEndRef.current)
      }
    } else {
      if (handleDragMoveWithThresholdRef.current) {
        document.addEventListener('mousemove', handleDragMoveWithThresholdRef.current)
      }
      if (handleDragEndRef.current) {
        document.addEventListener('mouseup', handleDragEndRef.current)
      }
    }
  }, [draggable])
  
  // Update refs when handlers change
  useEffect(() => {
    handleDragMoveRef.current = handleDragMove as (e: MouseEvent | TouchEvent) => void
    handleDragMoveWithThresholdRef.current = handleDragMoveWithThreshold as (e: MouseEvent | TouchEvent) => void
    handleDragEndRef.current = handleDragEnd as () => void
  }, [handleDragMove, handleDragMoveWithThreshold, handleDragEnd])
  
  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, edge: string) => {
    if (!resizable || isDraggingRef.current) return
    
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current = true
    
    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY
    
    const rect = componentRef.current?.getBoundingClientRect()
    if (rect) {
      resizeStartRef.current = {
        width: rect.width,
        height: rect.height,
        x: clientX,
        y: clientY,
        edge
      }
    }
    
    if ('touches' in e) {
      document.addEventListener('touchmove', handleResizeMove)
      document.addEventListener('touchend', handleResizeEnd)
    } else {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
    }
  }, [resizable])
  
  // Handle resize move
  const handleResizeMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isResizingRef.current || !componentRef.current) return

    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? resizeStartRef.current.x : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? resizeStartRef.current.y : e.clientY

    const bounds = getBounds()
    const { edge, width: startWidth, height: startHeight, x: startX, y: startY } = resizeStartRef.current

    let newWidth = startWidth
    let newHeight = startHeight
    let newX = layout.x
    let newY = layout.y

    const deltaX = clientX - startX
    const deltaY = clientY - startY

    // Handle horizontal resizing
    if (edge.includes('e')) {
      // East (right)
      newWidth = Math.max(minWidth, Math.min(startWidth + deltaX, maxWidth || bounds.maxX))
    } else if (edge.includes('w')) {
      // West (left)
      const widthDelta = startWidth - deltaX
      if (widthDelta >= minWidth && (maxWidth ? widthDelta <= maxWidth : true)) {
        newWidth = widthDelta
        newX = layout.x + (startWidth - newWidth)
      }
    }

    // Handle vertical resizing
    if (edge.includes('s')) {
      // South (bottom)
      newHeight = Math.max(minHeight, Math.min(startHeight + deltaY, maxHeight || bounds.maxY))
    } else if (edge.includes('n')) {
      // North (top)
      const heightDelta = startHeight - deltaY
      if (heightDelta >= minHeight && (maxHeight ? heightDelta <= maxHeight : true)) {
        newHeight = heightDelta
        newY = layout.y + (startHeight - newHeight)
      }
    }

    // Constrain to bounds
    if (newX < bounds.minX) {
      newWidth = startWidth - (bounds.minX - layout.x)
      newX = bounds.minX
    }
    if (newY < bounds.minY) {
      newHeight = startHeight - (bounds.minY - layout.y)
      newY = bounds.minY
    }
    if (newX + newWidth > bounds.maxX) {
      newWidth = bounds.maxX - newX
    }
    if (newY + newHeight > bounds.maxY) {
      newHeight = bounds.maxY - newY
    }

    // Ensure minimum size
    newWidth = Math.max(minWidth, newWidth)
    newHeight = Math.max(minHeight, newHeight)

    // Apply max constraints
    if (maxWidth) newWidth = Math.min(maxWidth, newWidth)
    if (maxHeight) newHeight = Math.min(maxHeight, newHeight)

    // Check for collisions and resolve position if needed
    const resolved = resolveCollision(newX, newY, newWidth, newHeight)
    newX = resolved.x
    newY = resolved.y

    // Ensure still within bounds after collision resolution
    if (newX < bounds.minX) {
      newWidth = startWidth - (bounds.minX - layout.x)
      newX = bounds.minX
    }
    if (newY < bounds.minY) {
      newHeight = startHeight - (bounds.minY - layout.y)
      newY = bounds.minY
    }
    if (newX + newWidth > bounds.maxX) {
      newWidth = bounds.maxX - newX
    }
    if (newY + newHeight > bounds.maxY) {
      newHeight = bounds.maxY - newY
    }

    const newLayout = {
      ...layout,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    }
    setLayout(newLayout)
    saveLayout(newLayout)
  }, [layout, minWidth, minHeight, maxWidth, maxHeight])
  
  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
    document.removeEventListener('touchmove', handleResizeMove)
    document.removeEventListener('touchend', handleResizeEnd)
  }, [])

  // Measure header height when it changes
  useEffect(() => {
    if (dragHandleRef.current && header) {
      const updateHeaderHeight = () => {
        const height = dragHandleRef.current?.offsetHeight || 0
        setHeaderHeight(height)
      }
      updateHeaderHeight()
      // Use ResizeObserver to track header height changes
      const resizeObserver = new ResizeObserver(updateHeaderHeight)
      resizeObserver.observe(dragHandleRef.current)
      return () => resizeObserver.disconnect()
    } else {
      setHeaderHeight(0)
    }
  }, [header, draggable])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mousemove', handleDragMoveWithThreshold)
      document.removeEventListener('mouseup', handleDragEnd)
      document.removeEventListener('touchmove', handleDragMove)
      document.removeEventListener('touchmove', handleDragMoveWithThreshold)
      document.removeEventListener('touchend', handleDragEnd)
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.removeEventListener('touchmove', handleResizeMove)
      document.removeEventListener('touchend', handleResizeEnd)
    }
  }, [])

  const style: React.CSSProperties = useMemo(() => ({
    position: 'fixed',
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    ...(layout.width && { width: `${layout.width}px` }),
    ...(layout.height && { height: `${layout.height}px` }),
    ...(layout.isMinimized && { height: 'auto' })
  }), [layout.x, layout.y, layout.width, layout.height, layout.isMinimized])

  return (
    <div
      ref={componentRef}
      id={id}
      className={`draggable-resizable ${className} ${isHovered ? 'hovered' : ''}`}
      style={{
        ...style,
        overflow: 'hidden',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
      onMouseEnter={useCallback(() => setIsHovered(true), [])}
      onMouseLeave={useCallback(() => setIsHovered(false), [])}
      onMouseDown={effectiveDraggable ? handleDragStart : undefined}
      onTouchStart={effectiveDraggable ? handleDragStart : undefined}
      onMouseDownCapture={(e) => {
        // Prevent click-through to game world
        e.stopPropagation()
      }}
      onTouchStartCapture={(e) => {
        // Prevent touch-through to game world
        e.stopPropagation()
      }}
    >
      {/* Invisible drag area - entire component is draggable */}
      {effectiveDraggable && header && (
        <div
          ref={dragHandleRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 'auto',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        >
          {header}
        </div>
      )}

      {/* Content */}
      <div
        className="h-full flex flex-col"
        style={{
          paddingTop: effectiveDraggable && header ? `${headerHeight}px` : '0',
          height: layout.isMinimized ? 0 : layout.height ? `${layout.height - (effectiveDraggable && header ? headerHeight : 0)}px` : 'auto',
          overflow: layout.isMinimized ? 'hidden' : 'hidden',
          position: 'relative',
          pointerEvents: 'auto'
        }}
        onMouseDown={useCallback((e: React.MouseEvent) => {
          // Allow buttons and inputs to work normally
          const target = e.target as HTMLElement
          const interactiveElement = target.closest('button, input, textarea, select, a, [role="button"], [role="textbox"]')
          if (interactiveElement) {
            e.stopPropagation()
          }
        }, [])}
      >
        {children}
      </div>

      {/* Resize handles - only render when resizable is true */}
      {effectiveResizable && !layout.isMinimized && (
        <>
          {/* Corner handles */}
          <div
            className="resize-handle resize-handle-nw"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            onTouchStart={(e) => handleResizeStart(e, 'nw')}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '8px',
              height: '8px',
              cursor: 'nwse-resize',
              zIndex: 20,
              pointerEvents: 'auto'
            }}
          />
          <div
            className="resize-handle resize-handle-ne"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            onTouchStart={(e) => handleResizeStart(e, 'ne')}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '8px',
              height: '8px',
              cursor: 'nesw-resize',
              zIndex: 20,
              pointerEvents: 'auto'
            }}
          />
          <div
            className="resize-handle resize-handle-sw"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            onTouchStart={(e) => handleResizeStart(e, 'sw')}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '8px',
              height: '8px',
              cursor: 'nesw-resize',
              zIndex: 20,
              pointerEvents: 'auto'
            }}
          />
          <div
            className="resize-handle resize-handle-se"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            onTouchStart={(e) => handleResizeStart(e, 'se')}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '8px',
              height: '8px',
              cursor: 'nwse-resize',
              zIndex: 20,
              backgroundColor: isHovered ? 'rgba(0, 255, 255, 0.5)' : 'transparent',
              pointerEvents: 'auto'
            }}
          />
          
          {/* Edge handles */}
          <div
            className="resize-handle resize-handle-n"
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            onTouchStart={(e) => handleResizeStart(e, 'n')}
            style={{
              position: 'absolute',
              top: 0,
              left: '8px',
              right: '8px',
              height: '4px',
              cursor: 'ns-resize',
              zIndex: 20,
              pointerEvents: 'auto'
            }}
          />
          <div
            className="resize-handle resize-handle-s"
            onMouseDown={(e) => handleResizeStart(e, 's')}
            onTouchStart={(e) => handleResizeStart(e, 's')}
            style={{
              position: 'absolute',
              bottom: 0,
              left: '8px',
              right: '8px',
              height: '4px',
              cursor: 'ns-resize',
              zIndex: 20,
              pointerEvents: 'auto'
            }}
          />
          <div
            className="resize-handle resize-handle-w"
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            onTouchStart={(e) => handleResizeStart(e, 'w')}
            style={{
              position: 'absolute',
              left: 0,
              top: '8px',
              bottom: '8px',
              width: '4px',
              cursor: 'ew-resize',
              zIndex: 20,
              pointerEvents: 'auto'
            }}
          />
          <div
            className="resize-handle resize-handle-e"
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            onTouchStart={(e) => handleResizeStart(e, 'e')}
            style={{
              position: 'absolute',
              right: 0,
              top: '8px',
              bottom: '8px',
              width: '4px',
              cursor: 'ew-resize',
              zIndex: 20,
              pointerEvents: 'auto'
            }}
          />
        </>
      )}
    </div>
  )
}

