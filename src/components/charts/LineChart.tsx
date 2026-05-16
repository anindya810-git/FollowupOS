'use client'

interface LineChartProps {
  data: Array<{ date: string; count: number }>
  height?: number
  color?: string
  showDots?: boolean
}

function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`
}

export function LineChart({
  data,
  height = 160,
  color = '#F25A3C',
  showDots = false,
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-mute text-sm"
        style={{ height }}
      >
        No data
      </div>
    )
  }

  const paddingLeft = 8
  const paddingRight = 8
  const paddingTop = 8
  const paddingBottom = 28
  const width = 600
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const counts = data.map(d => d.count)
  const maxVal = Math.max(...counts, 1)
  const minVal = 0

  const toX = (i: number) => paddingLeft + (i / (data.length - 1 || 1)) * chartWidth
  const toY = (v: number) =>
    paddingTop + chartHeight - ((v - minVal) / (maxVal - minVal || 1)) * chartHeight

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.count) }))

  // Build path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // Fill area
  const firstX = points[0]?.x ?? paddingLeft
  const lastX = points[points.length - 1]?.x ?? paddingLeft
  const baseY = paddingTop + chartHeight
  const areaPath = `${linePath} L ${lastX.toFixed(1)} ${baseY} L ${firstX.toFixed(1)} ${baseY} Z`

  // Grid lines (4 horizontal)
  const gridLines = [0, 0.33, 0.66, 1].map(ratio => ({
    y: paddingTop + chartHeight * (1 - ratio),
    value: Math.round(minVal + (maxVal - minVal) * ratio),
  }))

  // X-axis labels: every 7th
  const labelIndices: number[] = []
  for (let i = 0; i < data.length; i += 7) {
    labelIndices.push(i)
  }
  if (labelIndices[labelIndices.length - 1] !== data.length - 1) {
    labelIndices.push(data.length - 1)
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height }}
      aria-label="Line chart"
    >
      {/* Grid lines */}
      {gridLines.map((line, i) => (
        <line
          key={i}
          x1={paddingLeft}
          y1={line.y}
          x2={width - paddingRight}
          y2={line.y}
          stroke="#E4DED2"
          strokeWidth="1"
        />
      ))}

      {/* Fill area */}
      <path d={areaPath} fill={color} opacity="0.08" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {showDots &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
        ))}

      {/* X-axis labels */}
      {labelIndices.map(i => (
        <text
          key={i}
          x={toX(i)}
          y={height - 6}
          textAnchor="middle"
          fontSize="9"
          fill="#5B6473"
          fontFamily="var(--font-mono)"
        >
          {formatDateLabel(data[i].date)}
        </text>
      ))}
    </svg>
  )
}
