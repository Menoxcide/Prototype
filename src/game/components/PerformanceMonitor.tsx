import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { inputLagProfiler } from '../utils/inputLagProfiler'
import { onLCP, onINP, onCLS } from 'web-vitals'
import { analytics } from '../utils/analytics'
import DraggableResizable from './DraggableResizable'
import { isMobileDevice } from '../utils/mobileOptimizations'

export interface WebVitals {
  lcp: number | null
  fid: number | null
  cls: number | null
}

export default function PerformanceMonitor() {
  const fps = useGameStore((state) => state.fps)
  const [show, setShow] = useState(false)
  const [inputLag, setInputLag] = useState(0)
  const [webVitals, setWebVitals] = useState<WebVitals>({
    lcp: null,
    fid: null,
    cls: null
  })

  // Toggle with Ctrl+Shift+P
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShow(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Update input lag display
  useEffect(() => {
    if (!show) return

    const interval = setInterval(() => {
      const avgLatency = inputLagProfiler.getAverageLatency()
      setInputLag(avgLatency)
    }, 100) // Update 10 times per second

    return () => clearInterval(interval)
  }, [show])

  // Web Vitals monitoring
  useEffect(() => {
    // Track LCP (Largest Contentful Paint)
    onLCP((metric) => {
      setWebVitals(prev => ({ ...prev, lcp: metric.value }))
      // Report to analytics
      analytics.track('web_vital_lcp', { value: metric.value })
    })

    // Track INP (Interaction to Next Paint) - replaces FID
    onINP((metric) => {
      setWebVitals(prev => ({ ...prev, fid: metric.value }))
      // Report to analytics
      analytics.track('web_vital_inp', { value: metric.value })
    })

    // Track CLS (Cumulative Layout Shift)
    onCLS((metric) => {
      setWebVitals(prev => ({ ...prev, cls: metric.value }))
      // Report to analytics
      analytics.track('web_vital_cls', { value: metric.value })
    })
  }, [])

  if (!show) return null

  const isMobile = isMobileDevice()
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const monitorWidth = isMobile ? Math.min(screenWidth * 0.9, 200) : 200
  const monitorPosition = isMobile
    ? { x: (screenWidth - monitorWidth) / 2, y: 80 }
    : { x: 16, y: 80 }

  const color = fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'
  const inputLagColor = inputLag < 16 ? 'text-green-400' : inputLag < 33 ? 'text-yellow-400' : 'text-red-400'
  
  const lcpColor = webVitals.lcp === null ? 'text-gray-400' : webVitals.lcp < 2500 ? 'text-green-400' : webVitals.lcp < 4000 ? 'text-yellow-400' : 'text-red-400'
  const fidColor = webVitals.fid === null ? 'text-gray-400' : webVitals.fid < 100 ? 'text-green-400' : webVitals.fid < 300 ? 'text-yellow-400' : 'text-red-400'
  const clsColor = webVitals.cls === null ? 'text-gray-400' : webVitals.cls < 0.1 ? 'text-green-400' : webVitals.cls < 0.25 ? 'text-yellow-400' : 'text-red-400'

  return (
    <DraggableResizable
      id="performance-monitor"
      storageKey="performanceMonitor"
      defaultPosition={monitorPosition}
      defaultSize={{ width: monitorWidth, height: 200 }}
      minWidth={isMobile ? 150 : 150}
      minHeight={150}
      maxWidth={isMobile ? screenWidth - 16 : 300}
      resizable={false}
      draggable={true}
      className="pointer-events-auto z-50"
    >
      <div className="bg-gray-900/90 border-2 border-cyan-500 rounded-lg p-3 neon-border">
        <div className="text-sm">
          <div className="text-cyan-400 font-bold mb-1">Performance</div>
          <div className={color}>FPS: {fps}</div>
          <div className={inputLagColor}>Input Lag: {inputLag.toFixed(1)}ms</div>
          {webVitals.lcp !== null && (
            <div className={lcpColor}>LCP: {webVitals.lcp.toFixed(0)}ms</div>
          )}
          {webVitals.fid !== null && (
            <div className={fidColor}>FID: {webVitals.fid.toFixed(0)}ms</div>
          )}
          {webVitals.cls !== null && (
            <div className={clsColor}>CLS: {webVitals.cls.toFixed(3)}</div>
          )}
          <div className="text-gray-400 text-xs mt-1">
            Press Ctrl+Shift+P to toggle
          </div>
        </div>
      </div>
    </DraggableResizable>
  )
}

