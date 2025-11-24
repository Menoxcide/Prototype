import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getLODLevel, getPerformanceSettings } from '../systems/performanceSystem'

interface LODMeshProps {
  position: { x: number; y: number; z: number }
  highDetail: React.ReactNode
  mediumDetail?: React.ReactNode
  lowDetail?: React.ReactNode
}

export default function LODMesh({ position, highDetail, mediumDetail, lowDetail }: LODMeshProps) {
  const { player } = useGameStore()
  const settings = getPerformanceSettings()

  const distance = useMemo(() => {
    if (!player) return 0
    return Math.sqrt(
      Math.pow(player.position.x - position.x, 2) +
      Math.pow(player.position.y - position.y, 2) +
      Math.pow(player.position.z - position.z, 2)
    )
  }, [player, position])

  const lodLevel = getLODLevel(distance, settings.renderDistance)

  // Cull if too far
  if (distance > settings.renderDistance) {
    return null
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

