import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getLODLevel, getPerformanceSettings } from '../systems/performanceSystem'
import { getQualitySettings } from '../utils/qualitySettings'
import { getMobileOptimizationFlags } from '../utils/mobileOptimizations'

interface LODMeshProps {
  position: { x: number; y: number; z: number }
  highDetail: React.ReactNode
  mediumDetail?: React.ReactNode
  lowDetail?: React.ReactNode
}

export default function LODMesh({ position, highDetail, mediumDetail, lowDetail }: LODMeshProps) {
  const { player } = useGameStore()
  const performanceSettings = getPerformanceSettings()
  const qualitySettings = getQualitySettings()
  const mobileFlags = getMobileOptimizationFlags()

  const distance = useMemo(() => {
    if (!player) return 0
    return Math.sqrt(
      Math.pow(player.position.x - position.x, 2) +
      Math.pow(player.position.y - position.y, 2) +
      Math.pow(player.position.z - position.z, 2)
    )
  }, [player, position])

  // Use quality settings render distance, adjusted for mobile
  const effectiveRenderDistance = mobileFlags.isMobile
    ? qualitySettings.renderDistance * mobileFlags.renderDistanceMultiplier
    : qualitySettings.renderDistance

  const lodLevel = getLODLevel(distance, effectiveRenderDistance)

  // Cull if too far (use effective render distance)
  if (distance > effectiveRenderDistance) {
    return null
  }

  // On mobile, prefer lower LOD if available
  if (mobileFlags.isMobile) {
    if (lodLevel === 'low' && lowDetail) {
      return <>{lowDetail}</>
    } else if (lodLevel === 'medium' && mediumDetail) {
      return <>{mediumDetail}</>
    }
  }

  // Render appropriate LOD
  if (lodLevel === 'high' || !mediumDetail) {
    return <>{highDetail}</>
  } else if (lodLevel === 'medium' || !lowDetail) {
    return <>{mediumDetail}</>
  } else {
    return <>{lowDetail}</>
  }
}

