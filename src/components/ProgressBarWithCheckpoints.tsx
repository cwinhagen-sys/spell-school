'use client'

interface ProgressBarWithCheckpointsProps {
  completed: number
  total: number
  checkpoints?: Array<{ label: string; completed: boolean }>
  showLabels?: boolean
  height?: 'sm' | 'md' | 'lg'
}

export default function ProgressBarWithCheckpoints({
  completed,
  total,
  checkpoints,
  showLabels = false,
  height = 'md'
}: ProgressBarWithCheckpointsProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  // Create segments for visual effect (like in the image)
  const segments = 20 // Number of segments in the progress bar
  const filledSegments = Math.floor((percentage / 100) * segments)

  // Color coding based on percentage - 10 different colors for each 10% interval
  const getProgressColor = (percent: number) => {
    // Determine which 10% interval we're in
    const interval = Math.floor(percent / 10)
    
    // Color palette from red to green (10 colors)
    const colors = [
      { color: '#dc2626', border: 'border-red-500/50', segment: 'border-red-400/30' },      // 0-10%: Dark red
      { color: '#ef4444', border: 'border-red-400/50', segment: 'border-red-300/30' },      // 10-20%: Red
      { color: '#f97316', border: 'border-orange-400/50', segment: 'border-orange-300/30' }, // 20-30%: Orange
      { color: '#fb923c', border: 'border-orange-400/50', segment: 'border-orange-300/30' }, // 30-40%: Light orange
      { color: '#f59e0b', border: 'border-amber-400/50', segment: 'border-amber-300/30' },   // 40-50%: Amber
      { color: '#eab308', border: 'border-yellow-400/50', segment: 'border-yellow-300/30' }, // 50-60%: Yellow
      { color: '#84cc16', border: 'border-lime-400/50', segment: 'border-lime-300/30' },     // 60-70%: Lime
      { color: '#22c55e', border: 'border-green-400/50', segment: 'border-green-300/30' },   // 70-80%: Green
      { color: '#10b981', border: 'border-emerald-400/50', segment: 'border-emerald-300/30' }, // 80-90%: Emerald
      { color: '#14b8a6', border: 'border-teal-400/50', segment: 'border-teal-300/30' }      // 90-100%: Teal
    ]
    
    // Handle edge case for exactly 100%
    const index = percent === 100 ? 9 : Math.min(interval, 9)
    
    return colors[index]
  }

  const colorScheme = getProgressColor(percentage)

  return (
    <div className="w-full">
      {/* Progress Bar Container */}
      <div className="relative">
        {/* Background Track with border */}
        <div className={`w-full ${heightClasses[height]} bg-gray-100 rounded-full overflow-hidden border ${colorScheme.border}`}>
          {/* Progress Fill with solid color and segments */}
          <div
            className={`${heightClasses[height]} rounded-full transition-all duration-500 ease-out relative overflow-hidden`}
            style={{
              width: `${percentage}%`,
              backgroundColor: colorScheme.color
            }}
          >
            {/* Segmented lines effect */}
            <div className="absolute inset-0 flex">
              {Array.from({ length: filledSegments }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 border-r ${colorScheme.segment} last:border-r-0`}
                  style={{ width: `${100 / segments}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Text */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm font-medium text-gray-600">Progress</span>
        <span className="text-sm font-semibold text-gray-900">
          {percentage}%
        </span>
      </div>

    </div>
  )
}

