/**
 * Utility functions for detecting UI focus state
 * Used to block game world keyboard interactions when UI inputs are focused
 */

/**
 * Checks if any UI input element is currently focused
 * @returns true if an input, textarea, select, or contenteditable element is focused
 */
export const isUIFocused = (): boolean => {
  const activeElement = document.activeElement
  if (!activeElement) return false
  
  const tagName = activeElement.tagName.toLowerCase()
  
  // Check for standard input elements
  if (['input', 'textarea', 'select'].includes(tagName)) {
    return true
  }
  
  // Check for contenteditable elements
  if (activeElement.hasAttribute('contenteditable') && 
      activeElement.getAttribute('contenteditable') !== 'false') {
    return true
  }
  
  // Check for elements with textbox role
  const role = activeElement.getAttribute('role')
  if (role === 'textbox' || role === 'combobox') {
    return true
  }
  
  return false
}

