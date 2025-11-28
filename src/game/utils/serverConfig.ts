/**
 * Server Configuration Utility
 * Fetches server configuration at runtime to ensure clients always use
 * the current server URL, even after server restarts or redeployments
 */

export interface ServerConfig {
  serverUrl: string
  wsUrl: string
  environment: string
  timestamp: string
}

let cachedConfig: ServerConfig | null = null
let configFetchPromise: Promise<ServerConfig> | null = null

/**
 * Get the server config URL to fetch from
 * Uses build-time env var as fallback, but will be overridden by runtime config
 */
function getConfigUrl(): string {
  // In development, always try localhost first (even if VITE_SERVER_URL is set)
  // This allows local development while keeping production URLs in .env
  if (import.meta.env.DEV) {
    // Check if we're explicitly overriding with a local dev server URL
    const devServerUrl = import.meta.env.VITE_SERVER_URL
    if (devServerUrl && (devServerUrl.includes('localhost') || devServerUrl.includes('127.0.0.1'))) {
      return `${devServerUrl}/api/config`
    }
    // Default to localhost for local development
    return 'http://localhost:2567/api/config'
  }
  
  // In production, use the configured server URL
  if (import.meta.env.VITE_SERVER_URL) {
    return `${import.meta.env.VITE_SERVER_URL}/api/config`
  }
  
  // Last resort: try to construct from current origin
  // This works if the client is served from the same domain as the API
  const origin = window.location.origin
  return `${origin}/api/config`
}

/**
 * Normalize URLs to use HTTPS when the page is served over HTTPS
 * This prevents mixed content errors when the server returns HTTP URLs
 */
function normalizeUrl(url: string, defaultProtocol: 'http' | 'https' | 'ws' | 'wss' = 'https'): string {
  // If we're running on HTTPS, ensure all URLs use HTTPS/WSS
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
  
  if (isHttps) {
    // Replace http:// with https:// and ws:// with wss://
    url = url.replace(/^http:\/\//, 'https://')
    url = url.replace(/^ws:\/\//, 'wss://')
  } else {
    // In development (HTTP), preserve the original protocol
    // But if no protocol is specified, use the default
    if (!/^https?:\/\//.test(url) && !/^wss?:\/\//.test(url)) {
      url = `${defaultProtocol}://${url}`
    }
  }
  
  return url
}

/**
 * Fetch server configuration from the server
 */
async function fetchServerConfig(): Promise<ServerConfig> {
  const configUrl = getConfigUrl()
  
  try {
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Don't cache this request - we want fresh config
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch server config: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success || !data.config) {
      throw new Error('Invalid server config response')
    }

    // Normalize URLs to HTTPS if we're on HTTPS
    const config = data.config as ServerConfig
    config.serverUrl = normalizeUrl(config.serverUrl)
    config.wsUrl = normalizeUrl(config.wsUrl, 'wss')

    return config
  } catch (error) {
    console.error('Failed to fetch server config:', error)
    
    // In development, always fallback to localhost, even if VITE_SERVER_URL is set to production
    let fallbackServerUrl: string
    let fallbackWsUrl: string
    
    if (import.meta.env.DEV) {
      // Force localhost in development
      fallbackServerUrl = 'http://localhost:2567'
      fallbackWsUrl = 'ws://localhost:2567'
      console.warn('Using localhost for local development')
    } else {
      // In production, use environment variables
      fallbackServerUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:2567'
      fallbackWsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:2567'
      console.warn('Using fallback server config from environment variables')
    }
    
    // Normalize fallback URLs too
    fallbackServerUrl = normalizeUrl(fallbackServerUrl)
    fallbackWsUrl = normalizeUrl(fallbackWsUrl, 'wss')
    
    const fallbackConfig: ServerConfig = {
      serverUrl: fallbackServerUrl,
      wsUrl: fallbackWsUrl,
      environment: import.meta.env.MODE || 'development',
      timestamp: new Date().toISOString()
    }
    
    return fallbackConfig
  }
}

/**
 * Get server configuration, with caching
 * Fetches from server if not cached, or if cache is older than 5 minutes
 */
export async function getServerConfig(forceRefresh = false): Promise<ServerConfig> {
  // Return cached config if available and not forcing refresh
  if (cachedConfig && !forceRefresh) {
    const cacheAge = Date.now() - new Date(cachedConfig.timestamp).getTime()
    const maxCacheAge = 5 * 60 * 1000 // 5 minutes
    
    if (cacheAge < maxCacheAge) {
      return cachedConfig
    }
  }

  // If there's already a fetch in progress, wait for it
  if (configFetchPromise) {
    return configFetchPromise
  }

  // Start a new fetch
  configFetchPromise = fetchServerConfig()
  
  try {
    cachedConfig = await configFetchPromise
    return cachedConfig
  } finally {
    configFetchPromise = null
  }
}

/**
 * Get the WebSocket URL for the server
 */
export async function getServerWsUrl(): Promise<string> {
  const config = await getServerConfig()
  return config.wsUrl
}

/**
 * Get the HTTP URL for the server
 */
export async function getServerUrl(): Promise<string> {
  const config = await getServerConfig()
  return config.serverUrl
}

/**
 * Clear the cached config (useful for testing or manual refresh)
 */
export function clearServerConfigCache(): void {
  cachedConfig = null
  configFetchPromise = null
}

/**
 * Reset config cache on error to force re-fetch
 * This helps when switching between local and production servers
 */
export function resetConfigOnError(): void {
  cachedConfig = null
  configFetchPromise = null
}

