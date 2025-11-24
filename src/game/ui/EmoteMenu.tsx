import { useState } from 'react'
import { sendEmote } from '../network/colyseus'
import { useGameStore } from '../store/useGameStore'
import DraggableResizable from '../components/DraggableResizable'

const EMOTES = [
  { id: 'wave', icon: '👋', name: 'Wave' },
  { id: 'dance', icon: '💃', name: 'Dance' },
  { id: 'flex', icon: '💪', name: 'Flex' },
  { id: 'bow', icon: '🙇', name: 'Bow' },
  { id: 'laugh', icon: '😂', name: 'Laugh' }
]

export default function EmoteMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { isConnected } = useGameStore()

  const handleEmote = (emoteId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    // Send emote first
    if (isConnected) {
      sendEmote(emoteId)
    }
    
    // Close window after a brief delay to ensure emote is sent
    setTimeout(() => {
      setIsOpen(false)
    }, 100)
  }

  if (!isOpen) {
    return (
      <DraggableResizable
        id="emote-button"
        storageKey="emoteButton"
        defaultPosition={{ 
          x: typeof window !== 'undefined' ? 16 : 16, 
          y: typeof window !== 'undefined' ? window.innerHeight - 128 : 400 
        }}
        defaultSize={{ width: 200, height: 150 }}
        resizable={false}
        draggable={true}
        className="pointer-events-auto z-30"
        header={
          <button
            onClick={() => setIsOpen(true)}
            className="w-full bg-gray-900/90 border-2 border-cyan-500 rounded-lg px-4 py-2 text-cyan-400 font-bold hover:bg-gray-800 transition-all"
          >
            😊 Emote
          </button>
        }
      >
        <div style={{ display: 'none' }} />
      </DraggableResizable>
    )
  }

  const emoteHeader = (
    <div className="flex justify-between items-center p-2 border-b border-cyan-500 bg-gray-900 rounded-t-lg">
      <h3 className="text-cyan-400 font-bold">Emotes</h3>
      <button
        onClick={() => setIsOpen(false)}
        className="text-gray-400 hover:text-cyan-400"
      >
        ×
      </button>
    </div>
  )

  return (
    <DraggableResizable
      id="emote-menu"
      storageKey="emoteMenu"
      defaultPosition={{ 
        x: typeof window !== 'undefined' ? 16 : 16, 
        y: typeof window !== 'undefined' ? window.innerHeight - 200 : 400 
      }}
      defaultSize={{ width: 200, height: 180 }}
      minWidth={180}
      minHeight={150}
      maxWidth={300}
      className="pointer-events-auto z-30 bg-gray-900 border-2 border-cyan-500 rounded-lg neon-border"
      header={emoteHeader}
      resizable={false}
    >
      <div className="p-3" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
        <div className="grid grid-cols-2 gap-2">
          {EMOTES.map((emote) => (
            <button
              key={emote.id}
              onClick={(e) => handleEmote(emote.id, e)}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
              className="bg-gray-800 border border-cyan-500 rounded-lg p-2 hover:border-cyan-400 transition-all text-left cursor-pointer"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
            >
              <div className="text-2xl mb-1">{emote.icon}</div>
              <div className="text-xs text-cyan-300">{emote.name}</div>
            </button>
          ))}
        </div>
      </div>
    </DraggableResizable>
  )
}

