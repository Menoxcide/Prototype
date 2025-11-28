/**
 * Character API Client
 * Handles HTTP requests to the character management endpoints
 */

import { getIdToken } from '../../firebase/auth'
import { getServerUrl } from './serverConfig'

// Cache the API base URL to avoid fetching config on every request
let cachedApiBaseUrl: string | null = null

/**
 * Normalize URL to HTTPS if the page is served over HTTPS
 * Prevents mixed content errors
 */
function normalizeToHttps(url: string): string {
  // If we're running on HTTPS, ensure all URLs use HTTPS
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    url = url.replace(/^http:\/\//, 'https://')
  }
  return url
}

/**
 * Get the API base URL, fetching from server config if needed
 */
async function getApiBaseUrl(): Promise<string> {
  if (cachedApiBaseUrl) {
    return cachedApiBaseUrl
  }
  
  try {
    const serverUrl = await getServerUrl()
    // Normalize to HTTPS if needed
    const normalizedUrl = normalizeToHttps(serverUrl)
    cachedApiBaseUrl = normalizedUrl
    return normalizedUrl
  } catch (error) {
    console.warn('Failed to fetch server URL, using fallback:', error)
    // In development, always use localhost, even if VITE_SERVER_URL is set to production
    let fallbackUrl: string
    if (import.meta.env.DEV) {
      fallbackUrl = 'http://localhost:2567'
    } else {
      fallbackUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:2567'
    }
    const normalizedFallback = normalizeToHttps(fallbackUrl)
    cachedApiBaseUrl = normalizedFallback
    return normalizedFallback
  }
}

export interface CharacterSummary {
  id: string
  name: string
  race: string
  level: number
  lastLogin: Date
  createdAt: Date
}

export interface CharacterCountResponse {
  success: boolean
  count: number
  maxCharacters: number
  canCreateMore: boolean
}

export interface CharactersResponse {
  success: boolean
  characters: CharacterSummary[]
}

/**
 * Get Firebase auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
  try {
    return await getIdToken()
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

/**
 * List all characters for the current user
 */
export async function listCharacters(): Promise<CharacterSummary[]> {
  try {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const apiBaseUrl = await getApiBaseUrl()
    const response = await fetch(`${apiBaseUrl}/api/characters`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required')
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data: CharactersResponse = await response.json()
    if (!data.success) {
      throw new Error('Failed to list characters')
    }

    // Convert date strings to Date objects
    return data.characters.map(char => ({
      ...char,
      lastLogin: new Date(char.lastLogin),
      createdAt: new Date(char.createdAt)
    }))
  } catch (error) {
    console.error('Error listing characters:', error)
    throw error
  }
}

/**
 * Load a specific character by ID
 */
export async function loadCharacter(characterId: string): Promise<CharacterSummary> {
  try {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const apiBaseUrl = await getApiBaseUrl()
    const response = await fetch(`${apiBaseUrl}/api/characters/${characterId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required')
      }
      if (response.status === 404) {
        throw new Error('Character not found')
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    if (!data.success || !data.character) {
      throw new Error('Failed to load character')
    }

    // Note: This returns CharacterSummary, but we may need full character data
    // For now, we'll return the summary and the server will provide full data when joining
    return {
      id: data.character.id,
      name: data.character.name,
      race: data.character.race,
      level: data.character.level,
      lastLogin: new Date(data.character.lastLogin),
      createdAt: new Date(data.character.createdAt)
    }
  } catch (error) {
    console.error('Error loading character:', error)
    throw error
  }
}

/**
 * Get character count for the current user
 */
export async function getCharacterCount(): Promise<CharacterCountResponse> {
  try {
    const token = await getAuthToken()
    if (!token) {
      throw new Error('Not authenticated')
    }

    const apiBaseUrl = await getApiBaseUrl()
    const response = await fetch(`${apiBaseUrl}/api/characters/count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required')
      }
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data: CharacterCountResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error getting character count:', error)
    throw error
  }
}

