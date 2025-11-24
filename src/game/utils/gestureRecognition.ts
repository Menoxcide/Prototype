/**
 * Gesture Recognition System
 * Supports swipe, pinch, and long-press gestures for mobile touch controls
 */

export type GestureType = 'swipe' | 'pinch' | 'longpress' | 'tap' | 'none'

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

export interface GestureEvent {
  type: GestureType
  direction?: SwipeDirection
  distance?: number
  velocity?: number
  scale?: number
  duration?: number
  position?: { x: number; y: number }
}

export interface GestureCallbacks {
  onSwipe?: (direction: SwipeDirection, distance: number, velocity: number) => void
  onPinch?: (scale: number, center: { x: number; y: number }) => void
  onLongPress?: (position: { x: number; y: number }) => void
  onTap?: (position: { x: number; y: number }) => void
}

interface TouchState {
  startX: number
  startY: number
  startTime: number
  currentX: number
  currentY: number
  touches: Touch[]
  longPressTimer?: number
}

const SWIPE_THRESHOLD = 50 // Minimum distance in pixels for swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3 // Minimum velocity for swipe
const LONG_PRESS_DURATION = 500 // Milliseconds
const PINCH_THRESHOLD = 10 // Minimum distance change for pinch

export class GestureRecognizer {
  private element: HTMLElement
  private callbacks: GestureCallbacks
  private touchState: TouchState | null = null
  private isEnabled: boolean = true
  private debounceTime: number = 20 // 20ms debounce to reduce input lag

  constructor(element: HTMLElement, callbacks: GestureCallbacks) {
    this.element = element
    this.callbacks = callbacks
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false })
  }

  private handleTouchStart(event: TouchEvent): void {
    if (!this.isEnabled || event.touches.length === 0) return

    const touch = event.touches[0]
    const rect = this.element.getBoundingClientRect()
    
    this.touchState = {
      startX: touch.clientX - rect.left,
      startY: touch.clientY - rect.top,
      startTime: Date.now(),
      currentX: touch.clientX - rect.left,
      currentY: touch.clientY - rect.top,
      touches: Array.from(event.touches)
    }

    // Set up long press timer
    this.touchState.longPressTimer = window.setTimeout(() => {
      if (this.touchState && this.callbacks.onLongPress) {
        const position = {
          x: this.touchState.startX,
          y: this.touchState.startY
        }
        this.debounceCallback(() => {
          this.callbacks.onLongPress?.(position)
        })
      }
    }, LONG_PRESS_DURATION)
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.touchState || !this.isEnabled) return

    event.preventDefault() // Prevent scrolling during gestures

    const touch = event.touches[0]
    const rect = this.element.getBoundingClientRect()
    
    this.touchState.currentX = touch.clientX - rect.left
    this.touchState.currentY = touch.clientY - rect.top
    this.touchState.touches = Array.from(event.touches)

    // Cancel long press if moved too much
    if (this.touchState.longPressTimer) {
      const moveDistance = Math.sqrt(
        Math.pow(this.touchState.currentX - this.touchState.startX, 2) +
        Math.pow(this.touchState.currentY - this.touchState.startY, 2)
      )
      
      if (moveDistance > 10) {
        // Moved more than 10px, cancel long press
        clearTimeout(this.touchState.longPressTimer)
        this.touchState.longPressTimer = undefined
      }
    }

    // Handle pinch gesture (two touches)
    if (event.touches.length === 2 && this.callbacks.onPinch) {
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )

      // Find initial distance from touch state
      if (this.touchState.touches.length === 2) {
        const initialTouch1 = this.touchState.touches[0]
        const initialTouch2 = this.touchState.touches[1]
        const initialDistance = Math.sqrt(
          Math.pow(initialTouch2.clientX - initialTouch1.clientX, 2) +
          Math.pow(initialTouch2.clientY - initialTouch1.clientY, 2)
        )

        if (Math.abs(currentDistance - initialDistance) > PINCH_THRESHOLD) {
          const scale = currentDistance / initialDistance
          const center = {
            x: (touch1.clientX + touch2.clientX) / 2 - rect.left,
            y: (touch1.clientY + touch2.clientY) / 2 - rect.top
          }
          
          this.debounceCallback(() => {
            this.callbacks.onPinch?.(scale, center)
          })
        }
      }
    }
  }

  private handleTouchEnd(_event: TouchEvent): void {
    if (!this.touchState || !this.isEnabled) return

    // Clear long press timer
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer)
      this.touchState.longPressTimer = undefined
    }

    const duration = Date.now() - this.touchState.startTime
    const deltaX = this.touchState.currentX - this.touchState.startX
    const deltaY = this.touchState.currentY - this.touchState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / duration

    // Determine gesture type
    if (distance < 10 && duration < 300) {
      // Tap gesture
      if (this.callbacks.onTap) {
        const position = {
          x: this.touchState.startX,
          y: this.touchState.startY
        }
        this.debounceCallback(() => {
          this.callbacks.onTap?.(position)
        })
      }
    } else if (distance > SWIPE_THRESHOLD && velocity > SWIPE_VELOCITY_THRESHOLD && this.callbacks.onSwipe) {
      // Swipe gesture
      let direction: SwipeDirection
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      this.debounceCallback(() => {
        this.callbacks.onSwipe?.(direction, distance, velocity)
      })
    }

    this.touchState = null
  }

  private handleTouchCancel(_event: TouchEvent): void {
    if (this.touchState?.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer)
    }
    this.touchState = null
  }

  private debounceCallback(callback: () => void): void {
    // Debounce to reduce input lag by 20ms
    setTimeout(callback, this.debounceTime)
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  public destroy(): void {
    if (this.touchState?.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer)
    }
    
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this))
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this))
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this))
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this))
    
    this.touchState = null
  }
}

/**
 * Create a gesture recognizer for an element
 */
export function createGestureRecognizer(
  element: HTMLElement,
  callbacks: GestureCallbacks
): GestureRecognizer {
  return new GestureRecognizer(element, callbacks)
}

/**
 * React hook for gesture recognition
 * Note: This is a utility function. For React components, use createGestureRecognizer directly in useEffect
 */

