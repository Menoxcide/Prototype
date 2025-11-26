import { useState, useRef, useEffect, ReactNode } from 'react'

interface UILayout {
  x: number
  y: number
  width: number
  height: number
  isMinimized?: boolean
}

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

  // Get bounds based on bounds prop
  const getBounds = () => {
    if (bounds === 'window') {
      return {
        minX: 0,
        minY: 0,
        maxX: window.innerWidth,
        maxY: window.innerHeight
      }
    }
    // parent bounds
    const parent = componentRef.current?.parentElement
    if (parent) {
      const rect = parent.getBoundingClientRect()
      return {
        minX: 0,
        minY: 0,
        maxX: rect.width,
        maxY: rect.height
      }
    }
    return {
      minX: 0,
      minY: 0,
      maxX: window.innerWidth,
      maxY: window.innerHeight
    }
  }

  // Handle drag start - check if click is on interactive element
  const handleDragStart = (e: React.MouseEvent) => {
    if (!draggable || isResizingRef.current) return
    
    // Check if click is on an interactive element (button, input, etc.)
    const target = e.target as HTMLElement
    const interactiveElement = target.closest('button, input, textarea, select, a, [role="button"], [role="textbox"]')
    
    // If clicking on interactive element, don't start drag
    if (interactiveElement) {
      return
    }
    
    // Initialize drag threshold tracking
    dragThresholdRef.current = {
      x: e.clientX,
      y: e.clientY,
      started: false
    }
    
    const rect = componentRef.current?.getBoundingClientRect()
    if (rect) {
      dragStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
    
    // Add listeners to track movement and determine if drag should start
    document.addEventListener('mousemove', handleDragMoveWithThreshold)
    document.addEventListener('mouseup', handleDragEnd)
  }
  
  // Handle drag move with threshold - only start dragging after movement threshold
  const handleDragMoveWithThreshold = (e: MouseEvent) => {
    if (!dragThresholdRef.current.started) {
      // Check if movement exceeds threshold
      const deltaX = Math.abs(e.clientX - dragThresholdRef.current.x)
      const deltaY = Math.abs(e.clientY - dragThresholdRef.current.y)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > DRAG_THRESHOLD) {
        // Movement threshold exceeded, start dragging
        dragThresholdRef.current.started = true
        isDraggingRef.current = true
        // Switch to normal drag handler
        document.removeEventListener('mousemove', handleDragMoveWithThreshold)
        document.addEventListener('mousemove', handleDragMove)
      } else {
        // Not enough movement yet, don't start drag
        return
      }
    }
    
    // If drag has started, use normal drag handler
    if (isDraggingRef.current) {
      handleDragMove(e)
    }
  }

  // Handle drag move
  const handleDragMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !componentRef.current) return

    const bounds = getBounds()
    const newX = e.clientX - dragStartRef.current.x
    const newY = e.clientY - dragStartRef.current.y

    const rect = componentRef.current.getBoundingClientRect()
    const constrainedX = Math.max(
      bounds.minX,
      Math.min(newX, bounds.maxX - (rect.width || 0))
    )
    const constrainedY = Math.max(
      bounds.minY,
      Math.min(newY, bounds.maxY - (rect.height || 0))
    )

    const newLayout = {
      ...layout,
      x: constrainedX,
      y: constrainedY
    }
    setLayout(newLayout)
    saveLayout(newLayout)
  }

  // Handle drag end
  const handleDragEnd = () => {
    isDraggingRef.current = false
    dragThresholdRef.current.started = false
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mousemove', handleDragMoveWithThreshold)
    document.removeEventListener('mouseup', handleDragEnd)
  }

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, edge: string) => {
    if (!resizable || isDraggingRef.current) return
    
    e.preventDefault()
    e.stopPropagation()
    isResizingRef.current = true
    const rect = componentRef.current?.getBoundingClientRect()
    if (rect) {
      resizeStartRef.current = {
        width: rect.width,
        height: rect.height,
        x: e.clientX,
        y: e.clientY,
        edge
      }
    }
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  }

  // Handle resize move
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizingRef.current || !componentRef.current) return

    const bounds = getBounds()
    const { edge, width: startWidth, height: startHeight, x: startX, y: startY } = resizeStartRef.current

    let newWidth = startWidth
    let newHeight = startHeight
    let newX = layout.x
    let newY = layout.y

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

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

    const newLayout = {
      ...layout,
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    }
    setLayout(newLayout)
    saveLayout(newLayout)
  }

  // Handle resize end
  const handleResizeEnd = () => {
    isResizingRef.current = false
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
  }

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
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [])

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${layout.x}px`,
    top: `${layout.y}px`,
    ...(layout.width && { width: `${layout.width}px` }),
    ...(layout.height && { height: `${layout.height}px` }),
    ...(layout.isMinimized && { height: 'auto' })
  }

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={draggable ? handleDragStart : undefined}
      onMouseDownCapture={(e) => {
        // Prevent click-through to game world
        e.stopPropagation()
      }}
    >
      {/* Invisible drag area - entire component is draggable */}
      {draggable && header && (
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
          paddingTop: draggable && header ? `${headerHeight}px` : '0',
          height: layout.isMinimized ? 0 : layout.height ? `${layout.height - (draggable && header ? headerHeight : 0)}px` : 'auto',
          overflow: layout.isMinimized ? 'hidden' : 'hidden',
          position: 'relative',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => {
          // Allow buttons and inputs to work normally
          const target = e.target as HTMLElement
          const interactiveElement = target.closest('button, input, textarea, select, a, [role="button"], [role="textbox"]')
          if (interactiveElement) {
            e.stopPropagation()
          }
        }}
      >
        {children}
      </div>

      {/* Resize handles - only render when resizable is true */}
      {resizable && !layout.isMinimized && (
        <>
          {/* Corner handles */}
          <div
            className="resize-handle resize-handle-nw"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
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

