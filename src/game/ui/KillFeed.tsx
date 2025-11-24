import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'

interface KillFeedEntry {
  id: string
  killerName: string
  enemyType: string
  timestamp: number
}

export default function KillFeed() {
  const { chatMessages } = useGameStore()
  const [killFeedEntries, setKillFeedEntries] = useState<KillFeedEntry[]>([])

  useEffect(() => {
    // Extract kill messages from chat
    const kills = chatMessages
      .filter(msg => msg.type === 'system' && msg.message.includes('defeated'))
      .map(msg => {
        const match = msg.message.match(/(.+) defeated (.+)/)
        return match ? {
          id: msg.id,
          killerName: match[1],
          enemyType: match[2],
          timestamp: msg.timestamp
        } : null
      })
      .filter((entry): entry is KillFeedEntry => entry !== null)
      .slice(-5) // Keep last 5 kills

    setKillFeedEntries(kills)
  }, [chatMessages])

  if (killFeedEntries.length === 0) return null

  return (
    <div className="fixed top-20 right-4 w-64 pointer-events-none z-30">
      <div className="space-y-2">
        {killFeedEntries.map(entry => {
          const age = Date.now() - entry.timestamp
          const opacity = Math.max(0, 1 - age / 5000) // Fade out over 5 seconds

          if (opacity <= 0) return null

          return (
            <div
              key={entry.id}
              className="bg-gray-900/90 border border-cyan-500 rounded-lg px-3 py-2 text-sm neon-border"
              style={{ opacity }}
            >
              <span className="text-cyan-400 font-bold">{entry.killerName}</span>
              <span className="text-gray-400"> defeated </span>
              <span className="text-red-400">{entry.enemyType}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

