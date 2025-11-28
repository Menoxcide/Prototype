/**
 * Window Management System
 * Tracks open windows, manages z-index ordering, and positions windows next to each other
 */

interface WindowInfo {
  id: string
  zIndex: number
  position: { x: number; y: number }
  size?: { width: number; height: number }
}

class WindowManager {
  private windows: Map<string, WindowInfo> = new Map()
  private baseZIndex = 50
  private currentZIndex = 50
  private offsetX = 30 // Horizontal offset between windows
  private offsetY = 30 // Vertical offset between windows

  /**
   * Register a new window and return its z-index and position
   */
  registerWindow(id: string, defaultPosition?: { x: number; y: number }, defaultSize?: { width: number; height: number }): { zIndex: number; position: { x: number; y: number } } {
    // Calculate position next to existing windows
    let position: { x: number; y: number }
    
    if (defaultPosition) {
      position = { ...defaultPosition }
    } else {
      // Position next to the last window, or center if first window
      const windowCount = this.windows.size
      if (windowCount === 0) {
        // Center first window
        position = {
          x: typeof window !== 'undefined' ? (window.innerWidth - (defaultSize?.width || 500)) / 2 : 200,
          y: typeof window !== 'undefined' ? (window.innerHeight - (defaultSize?.height || 400)) / 2 : 200
        }
      } else {
        // Position next to the last window
        const lastWindow = Array.from(this.windows.values())[this.windows.size - 1]
        position = {
          x: lastWindow.position.x + this.offsetX,
          y: lastWindow.position.y + this.offsetY
        }
        
        // Ensure window stays within viewport
        const windowWidth = defaultSize?.width || 500
        const windowHeight = defaultSize?.height || 400
        if (position.x + windowWidth > (typeof window !== 'undefined' ? window.innerWidth : 1920)) {
          position.x = typeof window !== 'undefined' ? window.innerWidth - windowWidth - 20 : 200
        }
        if (position.y + windowHeight > (typeof window !== 'undefined' ? window.innerHeight : 1080)) {
          position.y = typeof window !== 'undefined' ? window.innerHeight - windowHeight - 20 : 200
        }
      }
    }

    // Increment z-index for new window (brings it to front)
    this.currentZIndex += 1
    const zIndex = this.currentZIndex

    this.windows.set(id, {
      id,
      zIndex,
      position,
      size: defaultSize
    })

    return { zIndex, position }
  }

  /**
   * Update window position
   */
  updateWindowPosition(id: string, position: { x: number; y: number }): void {
    const window = this.windows.get(id)
    if (window) {
      window.position = position
      this.windows.set(id, window)
    }
  }

  /**
   * Bring window to front (highest z-index)
   */
  bringToFront(id: string): number {
    const window = this.windows.get(id)
    if (window) {
      this.currentZIndex += 1
      window.zIndex = this.currentZIndex
      this.windows.set(id, window)
      return this.currentZIndex
    }
    return this.baseZIndex
  }

  /**
   * Get window z-index
   */
  getZIndex(id: string): number {
    return this.windows.get(id)?.zIndex || this.baseZIndex
  }

  /**
   * Unregister a window
   */
  unregisterWindow(id: string): void {
    this.windows.delete(id)
  }

  /**
   * Check if any windows are open
   */
  hasOpenWindows(): boolean {
    return this.windows.size > 0
  }

  /**
   * Get all open window IDs
   */
  getOpenWindowIds(): string[] {
    return Array.from(this.windows.keys())
  }

  /**
   * Clear all windows
   */
  clear(): void {
    this.windows.clear()
    this.currentZIndex = this.baseZIndex
  }
}

// Singleton instance
export const windowManager = new WindowManager()

