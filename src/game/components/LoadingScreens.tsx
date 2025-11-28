/**
 * Multiple Engaging Loading Screens
 * Rotates between different cyberpunk/Mars-themed loading screens
 * to keep players engaged during 1-2 minute loading times
 */

import { useState, useEffect } from 'react'
import { useLoadingPhase } from '../hooks/useLoadingPhase'
import { loadingOrchestrator, type LoadingFeature } from '../utils/loadingOrchestrator'
import { useTranslation } from '../hooks/useTranslation'

interface LoadingScreenProps {
  progress?: number // 0-100
  message?: string
  onComplete?: () => void
}

type LoadingScreenVariant = 'neon-grid' | 'mars-surface' | 'cyber-city' | 'data-stream'

interface ScreenConfig {
  variant: LoadingScreenVariant
  subtitle: string
  tips: string[]
  phaseMessages: {
    phase1: string
    phase2: string
    phase3: string
    complete: string
  }
}

const SCREEN_CONFIGS: ScreenConfig[] = [
  {
    variant: 'neon-grid',
    subtitle: 'Initializing Neural Interface',
    tips: [
      'Tip: Use WASD to move, Space to jump',
      'Tip: Hold Shift to sprint',
      'Tip: Press E to interact with objects',
      'Tip: Press Tab to open inventory'
    ],
    phaseMessages: {
      phase1: 'Loading core systems...',
      phase2: 'Building city infrastructure...',
      phase3: 'Finalizing world generation...',
      complete: 'Ready to enter the Nexus'
    }
  },
  {
    variant: 'mars-surface',
    subtitle: 'Establishing Surface Connection',
    tips: [
      'Tip: Explore the city to find quests',
      'Tip: Collect resources to craft items',
      'Tip: Join a guild for multiplayer content',
      'Tip: Complete daily challenges for rewards'
    ],
    phaseMessages: {
      phase1: 'Loading terrain data...',
      phase2: 'Generating city blocks...',
      phase3: 'Optimizing render pipeline...',
      complete: 'Surface connection established'
    }
  },
  {
    variant: 'cyber-city',
    subtitle: 'Syncing with Cyberpunk Network',
    tips: [
      'Tip: Use grappling hooks to traverse buildings',
      'Tip: Different biomes have unique resources',
      'Tip: Upgrade your gear at crafting stations',
      'Tip: Watch for enemy patrols in the city'
    ],
    phaseMessages: {
      phase1: 'Connecting to network...',
      phase2: 'Loading city assets...',
      phase3: 'Applying post-processing effects...',
      complete: 'Network sync complete'
    }
  },
  {
    variant: 'data-stream',
    subtitle: 'Processing Data Streams',
    tips: [
      'Tip: Complete quests to level up',
      'Tip: Trade items with other players',
      'Tip: Customize your character appearance',
      'Tip: Visit dungeons for rare loot'
    ],
    phaseMessages: {
      phase1: 'Processing critical data...',
      phase2: 'Streaming world assets...',
      phase3: 'Compiling shader programs...',
      complete: 'Data processing complete'
    }
  }
]

// Screen rotation interval (12 seconds)
const SCREEN_ROTATION_INTERVAL = 12000
// Tip rotation interval (4 seconds)
const TIP_ROTATION_INTERVAL = 4000

/**
 * Get phase-specific message based on current loading phase
 */
function getPhaseMessage(phase: string, config: ScreenConfig): string {
  switch (phase) {
    case 'phase1':
      return config.phaseMessages.phase1
    case 'phase2':
      return config.phaseMessages.phase2
    case 'phase3':
      return config.phaseMessages.phase3
    case 'complete':
      return config.phaseMessages.complete
    default:
      return 'Loading...'
  }
}

/**
 * Feature Status Display Component
 * Shows loading features with status (Loading.../LOADED)
 */
function FeatureStatusDisplay({ featureStatus }: { featureStatus: Map<LoadingFeature, 'loading' | 'loaded' | 'pending'> }) {
  const featureOrder: LoadingFeature[] = [
    'Initialization',
    'Textures',
    'Player',
    'Lighting',
    'Game Systems',
    'Road Network',
    'Buildings',
    'Shadows',
    'Weather',
    'Post Processing',
    'Rendering Verification'
  ]

  const getFeatureDisplayName = (feature: LoadingFeature): string => {
    const names: Record<LoadingFeature, string> = {
      'Initialization': 'Initialization',
      'Textures': 'Textures',
      'Player': 'Player Model',
      'Lighting': 'Lighting',
      'Game Systems': 'Game Systems',
      'Road Network': 'Road Network',
      'Buildings': 'Buildings',
      'Shadows': 'Shadows',
      'Weather': 'Weather',
      'Post Processing': 'Post Processing',
      'Rendering Verification': 'Rendering',
      'Complete': 'Complete'
    }
    return names[feature] || feature
  }

  return (
    <div className="mt-6 space-y-2 max-w-md mx-auto">
      {featureOrder.map((feature) => {
        const status = featureStatus.get(feature) || 'pending'
        if (status === 'pending') return null // Don't show pending features
        
        const displayName = getFeatureDisplayName(feature)
        const dots = status === 'loading' ? '...' : ''
        const statusText = status === 'loaded' ? 'LOADED' : `Loading${dots}`
        
        return (
          <div 
            key={feature} 
            className={`text-sm font-mono transition-all duration-300 ${
              status === 'loaded' 
                ? 'text-green-400' 
                : status === 'loading'
                ? 'text-cyan-300'
                : 'text-gray-500'
            }`}
          >
            <span className="inline-block w-32 text-left">{displayName}</span>
            <span className="ml-4">{statusText}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Hook to manage rotating tips at regular intervals
 */
function useRotatingTip(tips: string[]) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  
  useEffect(() => {
    if (tips.length === 0) return
    
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % tips.length)
    }, TIP_ROTATION_INTERVAL)
    
    return () => clearInterval(interval)
  }, [tips.length])
  
  return tips[currentTipIndex] || tips[0] || ''
}

/**
 * Neon Grid Loading Screen
 */
function NeonGridScreen({ progress, message, config, featureStatus }: LoadingScreenProps & { config: ScreenConfig; featureStatus?: Map<LoadingFeature, 'loading' | 'loaded' | 'pending'> }) {
  const { t } = useTranslation()
  const [dots, setDots] = useState('')
  const currentTip = useRotatingTip(config.tips)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(cyan 1px, transparent 1px),
            linear-gradient(90deg, cyan 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>
      
      {/* Content */}
      <div className="text-center relative z-10">
        <h1 className="text-7xl font-bold text-cyan-400 mb-4 neon-glow animate-pulse">
          {t('app.title')}
        </h1>
        <p className="text-cyan-300 text-xl mb-2">{config.subtitle}{dots}</p>
        <p className="text-gray-400 text-sm mb-4">{message || getPhaseMessage('phase1', config)}</p>
        
        {/* Feature Status Display */}
        {featureStatus && <FeatureStatusDisplay featureStatus={featureStatus} />}
        
        {/* Progress Bar */}
        <div className="w-96 mx-auto bg-gray-900 border-2 border-cyan-500 rounded-full h-3 overflow-hidden shadow-lg shadow-cyan-500/50">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
        
        <div className="mt-4 text-cyan-300 font-mono text-lg">
          {Math.round(progress || 0)}%
        </div>
        
        {/* Rotating Tip */}
        <div className="mt-8 text-gray-500 text-xs max-w-md mx-auto">
          {currentTip}
        </div>
      </div>
      
      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  )
}

/**
 * Mars Surface Loading Screen
 */
function MarsSurfaceScreen({ progress, message, config, featureStatus }: LoadingScreenProps & { config: ScreenConfig; featureStatus?: Map<LoadingFeature, 'loading' | 'loaded' | 'pending'> }) {
  const { t } = useTranslation()
  const [dots, setDots] = useState('')
  const currentTip = useRotatingTip(config.tips)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-orange-900 via-red-900 to-black z-50 flex items-center justify-center overflow-hidden">
      {/* Mars Surface Effect */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-amber-900/50 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-red-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      {/* Content */}
      <div className="text-center relative z-10">
        <h1 className="text-7xl font-bold text-orange-400 mb-4 drop-shadow-lg">
          {t('app.title')}
        </h1>
        <p className="text-orange-300 text-xl mb-2">{config.subtitle}{dots}</p>
        <p className="text-gray-300 text-sm mb-4">{message || getPhaseMessage('phase1', config)}</p>
        
        {/* Feature Status Display */}
        {featureStatus && <FeatureStatusDisplay featureStatus={featureStatus} />}
        
        {/* Progress Bar */}
        <div className="w-96 mx-auto bg-gray-900/80 border-2 border-orange-500 rounded-full h-3 overflow-hidden shadow-lg shadow-orange-500/50">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
        
        <div className="mt-4 text-orange-300 font-mono text-lg">
          {Math.round(progress || 0)}%
        </div>
        
        {/* Rotating Tip */}
        <div className="mt-8 text-gray-400 text-xs max-w-md mx-auto">
          {currentTip}
        </div>
      </div>
    </div>
  )
}

/**
 * Cyber City Loading Screen
 */
function CyberCityScreen({ progress, message, config, featureStatus }: LoadingScreenProps & { config: ScreenConfig; featureStatus?: Map<LoadingFeature, 'loading' | 'loaded' | 'pending'> }) {
  const { t } = useTranslation()
  const [dots, setDots] = useState('')
  const currentTip = useRotatingTip(config.tips)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900 via-indigo-900 to-black z-50 flex items-center justify-center overflow-hidden">
      {/* Cyber City Skyline Effect */}
      <div className="absolute inset-0">
        <div className="absolute bottom-0 w-full h-1/2 opacity-30">
          <div className="absolute left-1/4 bottom-0 w-8 h-32 bg-purple-500 blur-sm" />
          <div className="absolute left-1/3 bottom-0 w-12 h-48 bg-indigo-500 blur-sm" />
          <div className="absolute left-1/2 bottom-0 w-10 h-40 bg-blue-500 blur-sm" />
          <div className="absolute right-1/3 bottom-0 w-14 h-56 bg-cyan-500 blur-sm" />
          <div className="absolute right-1/4 bottom-0 w-8 h-36 bg-purple-500 blur-sm" />
        </div>
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>
      
      {/* Content */}
      <div className="text-center relative z-10">
        <h1 className="text-7xl font-bold text-purple-400 mb-4 neon-glow">
          {t('app.title')}
        </h1>
        <p className="text-purple-300 text-xl mb-2">{config.subtitle}{dots}</p>
        <p className="text-gray-300 text-sm mb-4">{message || getPhaseMessage('phase1', config)}</p>
        
        {/* Feature Status Display */}
        {featureStatus && <FeatureStatusDisplay featureStatus={featureStatus} />}
        
        {/* Progress Bar */}
        <div className="w-96 mx-auto bg-gray-900/80 border-2 border-purple-500 rounded-full h-3 overflow-hidden shadow-lg shadow-purple-500/50">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
        
        <div className="mt-4 text-purple-300 font-mono text-lg">
          {Math.round(progress || 0)}%
        </div>
        
        {/* Rotating Tip */}
        <div className="mt-8 text-gray-400 text-xs max-w-md mx-auto">
          {currentTip}
        </div>
      </div>
    </div>
  )
}

/**
 * Data Stream Loading Screen
 */
function DataStreamScreen({ progress, message, config, featureStatus }: LoadingScreenProps & { config: ScreenConfig; featureStatus?: Map<LoadingFeature, 'loading' | 'loaded' | 'pending'> }) {
  const { t } = useTranslation()
  const [dots, setDots] = useState('')
  const [streamChars, setStreamChars] = useState<string[]>([])
  const currentTip = useRotatingTip(config.tips)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    // Generate random data stream characters
    const chars = '01'
    const newStream: string[] = []
    for (let i = 0; i < 20; i++) {
      newStream.push(chars[Math.floor(Math.random() * chars.length)])
    }
    setStreamChars(newStream)
    
    const interval = setInterval(() => {
      setStreamChars(prev => {
        const updated = [...prev]
        const randomIndex = Math.floor(Math.random() * updated.length)
        updated[randomIndex] = chars[Math.floor(Math.random() * chars.length)]
        return updated
      })
    }, 100)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden">
      {/* Data Stream Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full font-mono text-green-400 text-xs">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${(i * 2) % 100}%`,
                top: `${(i * 3) % 100}%`,
                animation: `streamDown ${3 + (i % 3)}s linear infinite`,
                animationDelay: `${i * 0.1}s`
              }}
            >
              {streamChars.join(' ')}
            </div>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="text-center relative z-10">
        <h1 className="text-7xl font-bold text-green-400 mb-4 font-mono">
          {t('app.title')}
        </h1>
        <p className="text-green-300 text-xl mb-2 font-mono">{config.subtitle}{dots}</p>
        <p className="text-gray-400 text-sm mb-4">{message || getPhaseMessage('phase1', config)}</p>
        
        {/* Feature Status Display */}
        {featureStatus && <FeatureStatusDisplay featureStatus={featureStatus} />}
        
        {/* Progress Bar */}
        <div className="w-96 mx-auto bg-gray-900 border-2 border-green-500 rounded-full h-3 overflow-hidden shadow-lg shadow-green-500/50">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progress || 0}%` }}
          />
        </div>
        
        <div className="mt-4 text-green-300 font-mono text-lg">
          {Math.round(progress || 0)}%
        </div>
        
        {/* Rotating Tip */}
        <div className="mt-8 text-gray-500 text-xs max-w-md mx-auto">
          {currentTip}
        </div>
      </div>
      
      <style>{`
        @keyframes streamDown {
          0% { transform: translateY(-100vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/**
 * Main Loading Screens Component
 * Rotates between different screen variants
 */
export default function LoadingScreens({ progress = 0, message, onComplete }: LoadingScreenProps) {
  const { phase } = useLoadingPhase()
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [featureStatus, setFeatureStatus] = useState<Map<LoadingFeature, 'loading' | 'loaded' | 'pending'>>(new Map())
  
  // Rotate screens every SCREEN_ROTATION_INTERVAL
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScreenIndex(prev => (prev + 1) % SCREEN_CONFIGS.length)
    }, SCREEN_ROTATION_INTERVAL)
    
    return () => clearInterval(interval)
  }, [])
  
  // Animate progress bar smoothly
  useEffect(() => {
    let animationFrameId: number | null = null
    let lastUpdate = Date.now()
    let cancelled = false
    
    const animate = () => {
      if (cancelled) return
      
      const now = Date.now()
      const delta = now - lastUpdate
      lastUpdate = now
      
      setDisplayProgress(prev => {
        if (prev < progress) {
          const increment = (delta / 50) * 2
          const newProgress = Math.min(prev + increment, progress)
          
          if (newProgress < progress) {
            animationFrameId = requestAnimationFrame(animate)
          }
          
          return newProgress
        }
        return prev
      })
    }
    
    animationFrameId = requestAnimationFrame(animate)
    
    return () => {
      cancelled = true
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [progress])
  
  // Subscribe to orchestrator for feature status
  useEffect(() => {
    const unsubscribe = loadingOrchestrator.subscribe((status) => {
      setFeatureStatus(status.featureStatus)
    })
    
    return unsubscribe
  }, [])
  
  // Call onComplete when progress reaches 100
  useEffect(() => {
    if (displayProgress >= 100 && onComplete) {
      setTimeout(onComplete, 500)
    }
  }, [displayProgress, onComplete])
  
  const currentConfig = SCREEN_CONFIGS[currentScreenIndex]
  const phaseMessage = getPhaseMessage(phase, currentConfig)
  const displayMessage = message || phaseMessage
  
  // Render appropriate screen based on variant
  const screenProps = {
    progress: displayProgress,
    message: displayMessage,
    config: currentConfig,
    featureStatus
  }
  
  switch (currentConfig.variant) {
    case 'neon-grid':
      return <NeonGridScreen {...screenProps} />
    case 'mars-surface':
      return <MarsSurfaceScreen {...screenProps} />
    case 'cyber-city':
      return <CyberCityScreen {...screenProps} />
    case 'data-stream':
      return <DataStreamScreen {...screenProps} />
    default:
      return <NeonGridScreen {...screenProps} />
  }
}

