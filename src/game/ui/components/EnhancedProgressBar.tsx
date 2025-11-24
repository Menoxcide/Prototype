import '../styles/enhancedModals.css'

interface EnhancedProgressBarProps {
  value: number
  max: number
  label?: string
  showValue?: boolean
  color?: string
  className?: string
}

export default function EnhancedProgressBar({
  value,
  max,
  label,
  showValue = true,
  color,
  className = ''
}: EnhancedProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-300">{label}</span>
          {showValue && (
            <span className="text-sm text-cyan-400 font-bold">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="enhanced-progress-bar">
        <div
          className="enhanced-progress-fill"
          style={{
            width: `${percentage}%`,
            ...(color ? { background: color } : {})
          }}
        />
      </div>
    </div>
  )
}

