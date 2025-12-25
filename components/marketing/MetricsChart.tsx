'use client'

import { useMemo } from 'react'

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface MetricsChartProps {
  data: DataPoint[]
  title?: string
  type?: 'bar' | 'line' | 'pie' | 'donut'
  height?: number
  showLegend?: boolean
  showValues?: boolean
  animate?: boolean
}

/**
 * Simple SVG-based chart component
 * No external dependencies - pure React + SVG
 */
export function MetricsChart({
  data,
  title,
  type = 'bar',
  height = 200,
  showLegend = true,
  showValues = true,
  animate = true
}: MetricsChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data])
  
  const defaultColors = [
    '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6',
    '#EF4444', '#6366F1', '#14B8A6', '#F97316', '#8B5CF6'
  ]

  const getColor = (index: number, customColor?: string) => 
    customColor || defaultColors[index % defaultColors.length]

  if (type === 'bar') {
    const barWidth = Math.min(40, (300 - (data.length - 1) * 8) / data.length)
    const chartWidth = data.length * (barWidth + 8)

    return (
      <div className="w-full">
        {title && <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>}
        <svg width="100%" height={height} viewBox={`0 0 ${chartWidth + 40} ${height + 30}`} preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <g key={i}>
              <line
                x1={30}
                y1={height - pct * (height - 20)}
                x2={chartWidth + 30}
                y2={height - pct * (height - 20)}
                stroke="#E5E7EB"
                strokeDasharray={i === 0 ? 'none' : '4'}
              />
              <text
                x={25}
                y={height - pct * (height - 20) + 4}
                textAnchor="end"
                fontSize={10}
                fill="#9CA3AF"
              >
                {Math.round(maxValue * pct)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const barHeight = (d.value / maxValue) * (height - 20)
            const x = 35 + i * (barWidth + 8)
            const y = height - barHeight

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={animate ? height : y}
                  width={barWidth}
                  height={animate ? 0 : barHeight}
                  fill={getColor(i, d.color)}
                  rx={4}
                  className={animate ? 'animate-[grow_0.5s_ease-out_forwards]' : ''}
                  style={animate ? {
                    animation: `grow 0.5s ease-out ${i * 0.1}s forwards`,
                    transformOrigin: 'bottom'
                  } : undefined}
                />
                {showValues && d.value > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={500}
                    fill="#374151"
                  >
                    {d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
                  </text>
                )}
                <text
                  x={x + barWidth / 2}
                  y={height + 15}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#6B7280"
                >
                  {d.label.length > 6 ? d.label.slice(0, 6) + '..' : d.label}
                </text>
              </g>
            )
          })}
        </svg>
        
        <style jsx>{`
          @keyframes grow {
            from {
              transform: scaleY(0);
            }
            to {
              transform: scaleY(1);
            }
          }
        `}</style>
      </div>
    )
  }

  if (type === 'line') {
    const chartWidth = 320
    const chartHeight = height - 30
    const pointSpacing = (chartWidth - 60) / Math.max(data.length - 1, 1)

    const points = data.map((d, i) => ({
      x: 40 + i * pointSpacing,
      y: chartHeight - (d.value / maxValue) * (chartHeight - 20)
    }))

    const pathD = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ')

    const areaD = pathD + ` L ${points[points.length - 1]?.x || 40} ${chartHeight} L 40 ${chartHeight} Z`

    return (
      <div className="w-full">
        {title && <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>}
        <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`} preserveAspectRatio="xMidYMid meet">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <g key={i}>
              <line
                x1={35}
                y1={chartHeight - pct * (chartHeight - 20)}
                x2={chartWidth - 10}
                y2={chartHeight - pct * (chartHeight - 20)}
                stroke="#E5E7EB"
                strokeDasharray={i === 0 ? 'none' : '4'}
              />
              <text
                x={30}
                y={chartHeight - pct * (chartHeight - 20) + 4}
                textAnchor="end"
                fontSize={10}
                fill="#9CA3AF"
              >
                {Math.round(maxValue * pct)}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path
            d={areaD}
            fill="url(#gradient)"
            opacity={0.2}
          />
          <defs>
            <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#8B5CF6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="white"
                stroke="#8B5CF6"
                strokeWidth={2}
              />
              {showValues && (
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#374151"
                >
                  {data[i].value}
                </text>
              )}
              <text
                x={p.x}
                y={chartHeight + 15}
                textAnchor="middle"
                fontSize={10}
                fill="#6B7280"
              >
                {data[i].label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  if (type === 'donut' || type === 'pie') {
    const centerX = 100
    const centerY = 100
    const radius = 80
    const innerRadius = type === 'donut' ? 50 : 0
    const total = data.reduce((sum, d) => sum + d.value, 0)

    let currentAngle = -90 // Start from top

    const slices = data.map((d, i) => {
      const percentage = total > 0 ? d.value / total : 0
      const angle = percentage * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle

      // Calculate arc path
      const startRad = (startAngle * Math.PI) / 180
      const endRad = (endAngle * Math.PI) / 180

      const x1 = centerX + radius * Math.cos(startRad)
      const y1 = centerY + radius * Math.sin(startRad)
      const x2 = centerX + radius * Math.cos(endRad)
      const y2 = centerY + radius * Math.sin(endRad)

      const x1Inner = centerX + innerRadius * Math.cos(startRad)
      const y1Inner = centerY + innerRadius * Math.sin(startRad)
      const x2Inner = centerX + innerRadius * Math.cos(endRad)
      const y2Inner = centerY + innerRadius * Math.sin(endRad)

      const largeArc = angle > 180 ? 1 : 0

      const pathD = innerRadius > 0
        ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x2Inner} ${y2Inner} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`
        : `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

      return {
        d: pathD,
        color: getColor(i, d.color),
        percentage: (percentage * 100).toFixed(1),
        label: d.label,
        value: d.value
      }
    })

    return (
      <div className="w-full">
        {title && <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>}
        <div className="flex items-center gap-6">
          <svg width={200} height={200} viewBox="0 0 200 200">
            {slices.map((slice, i) => (
              <path
                key={i}
                d={slice.d}
                fill={slice.color}
                className={animate ? 'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]' : ''}
                style={animate ? { animationDelay: `${i * 0.1}s` } : undefined}
              />
            ))}
            {type === 'donut' && (
              <text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={24}
                fontWeight="bold"
                fill="#374151"
              >
                {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
              </text>
            )}
          </svg>
          
          {showLegend && (
            <div className="space-y-2">
              {slices.map((slice, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-gray-600">{slice.label}</span>
                  <span className="font-medium text-gray-900">{slice.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return null
}

/**
 * Stat Card with trend indicator
 */
interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: string
  color?: 'purple' | 'blue' | 'green' | 'pink' | 'orange'
}

export function StatCard({ title, value, change, changeLabel, icon, color = 'purple' }: StatCardProps) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    pink: 'from-pink-500 to-pink-600',
    orange: 'from-orange-500 to-orange-600'
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-white`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold mt-1">
            {typeof value === 'number' && value >= 1000 
              ? `${(value / 1000).toFixed(1)}k` 
              : value}
          </p>
        </div>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
      {change !== undefined && (
        <div className="mt-2 flex items-center text-sm">
          <span className={change >= 0 ? 'text-green-200' : 'text-red-200'}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
          <span className="opacity-70 ml-1">{changeLabel || 'vs last period'}</span>
        </div>
      )}
    </div>
  )
}

export default MetricsChart







