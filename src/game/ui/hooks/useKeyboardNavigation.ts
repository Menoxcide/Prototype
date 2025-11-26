/**
 * Keyboard Navigation Hook
 * Provides keyboard navigation support for modals and UI components
 * 
 * @example
 * ```tsx
 * const { focusableRefs, handleKeyDown } = useKeyboardNavigation({
 *   onEscape: () => closeModal(),
 *   onEnter: () => submitForm()
 * })
 * ```
 */

import { useEffect, useRef, RefObject } from 'react'

export interface KeyboardNavigationOptions {
  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void
  
  /**
   * Callback when Enter key is pressed
   */
  onEnter?: () => void
  
  /**
   * Callback when Tab key is pressed (for custom tab handling)
   */
  onTab?: (e: KeyboardEvent) => void
  
  /**
   * Whether to trap focus within the component
   */
  trapFocus?: boolean
  
  /**
   * Whether keyboard navigation is enabled
   */
  enabled?: boolean
}

export interface KeyboardNavigationReturn {
  /**
   * Ref to attach to the container element
   */
  containerRef: RefObject<HTMLElement>
  
  /**
   * Handler for keydown events
   */
  handleKeyDown: (e: React.KeyboardEvent) => void
  
  /**
   * Get all focusable elements within the container
   */
  getFocusableElements: () => HTMLElement[]
  
  /**
   * Focus the first focusable element
   */
  focusFirst: () => void
  
  /**
   * Focus the last focusable element
   */
  focusLast: () => void
}

/**
 * Hook for keyboard navigation in modals and UI components
 * 
 * @param options - Configuration options for keyboard navigation
 * @returns Object with refs and handlers for keyboard navigation
 */
export function useKeyboardNavigation(
  options: KeyboardNavigationOptions = {}
): KeyboardNavigationReturn {
  const {
    onEscape,
    onEnter,
    onTab,
    trapFocus = true,
    enabled = true
  } = options

  const containerRef = useRef<HTMLElement>(null)

  /**
   * Get all focusable elements within the container
   */
  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.current) return []

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector))
      .filter(el => {
        // Filter out hidden elements
        const style = window.getComputedStyle(el)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
  }

  /**
   * Focus the first focusable element
   */
  const focusFirst = (): void => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[0].focus()
    }
  }

  /**
   * Focus the last focusable element
   */
  const focusLast = (): void => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[elements.length - 1].focus()
    }
  }

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!enabled) return

    switch (e.key) {
      case 'Escape':
        if (onEscape) {
          e.preventDefault()
          e.stopPropagation()
          onEscape()
        }
        break

      case 'Enter':
        if (onEnter && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
          // Don't trigger on Enter in textareas
          if (!(e.target as HTMLElement).closest('textarea')) {
            e.preventDefault()
            onEnter()
          }
        }
        break

      case 'Tab':
        if (trapFocus && containerRef.current) {
          const elements = getFocusableElements()
          if (elements.length === 0) {
            e.preventDefault()
            return
          }

          const firstElement = elements[0]
          const lastElement = elements[elements.length - 1]
          const activeElement = document.activeElement as HTMLElement

          // If Shift+Tab on first element, focus last
          if (e.shiftKey && activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
            return
          }

          // If Tab on last element, focus first
          if (!e.shiftKey && activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
            return
          }

          // Custom tab handling
          if (onTab) {
            onTab(e.nativeEvent)
          }
        }
        break

      case 'ArrowDown':
      case 'ArrowUp':
        // Arrow key navigation for lists
        if (containerRef.current) {
          const elements = getFocusableElements()
          const currentIndex = elements.findIndex(el => el === document.activeElement)

          if (currentIndex >= 0) {
            e.preventDefault()
            let nextIndex: number

            if (e.key === 'ArrowDown') {
              nextIndex = (currentIndex + 1) % elements.length
            } else {
              nextIndex = (currentIndex - 1 + elements.length) % elements.length
            }

            elements[nextIndex].focus()
          }
        }
        break
    }
  }

  // Set up focus trap and initial focus
  useEffect(() => {
    if (!enabled || !trapFocus || !containerRef.current) return

    // Focus first element when modal opens
    const timeout = setTimeout(() => {
      focusFirst()
    }, 100)

    return () => {
      clearTimeout(timeout)
    }
  }, [enabled, trapFocus])

  return {
    containerRef: containerRef as React.RefObject<HTMLElement>,
    handleKeyDown,
    getFocusableElements,
    focusFirst,
    focusLast
  }
}

