import * as React from "react"
import { cn } from "@/lib/utils"
import { formatBand } from "@/lib/format"

export interface BarDatum {
  label: string
  value: number
  colorVar?: string
}

export function BarChart({
  data,
  max,
  height = 180,
  formatter = (v: number) => formatBand(v),
  className,
}: {
  data: BarDatum[]
  max?: number
  height?: number
  formatter?: (value: number) => string
  className?: string
}) {
  const maxValue = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => {
          const pct = Math.max(2, (d.value / maxValue) * 100)
          return (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="font-mono text-[11px] font-semibold text-foreground tabular-nums">
                {formatter(d.value)}
              </span>
              <div
                className="w-full rounded-t-md bg-[var(--chart-2)] transition-all"
                style={{ height: `${pct}%`, backgroundColor: d.colorVar }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span
            key={d.label}
            className="flex-1 truncate text-center text-[11px] text-muted-foreground"
            title={d.label}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function HBarChart({
  data,
  max,
  formatter = (v: number) => `${v}%`,
  className,
}: {
  data: BarDatum[]
  max?: number
  formatter?: (value: number) => string
  className?: string
}) {
  const maxValue = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div className={cn("space-y-2.5", className)}>
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
          <span className="truncate text-xs text-muted-foreground" title={d.label}>
            {d.label}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--chart-2)] transition-all"
              style={{ width: `${(d.value / maxValue) * 100}%`, backgroundColor: d.colorVar }}
            />
          </div>
          <span className="text-right font-mono text-xs font-semibold tabular-nums text-foreground">
            {formatter(d.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface Series {
  name: string
  colorVar: string
  points: Array<number | null>
}

export function LineChart({
  series,
  labels,
  target,
  targetColorVar = "var(--chart-5)",
  min = 4,
  max = 9,
  gridStep,
  height = 220,
  className,
}: {
  series: Series[]
  labels: string[]
  target?: number
  targetColorVar?: string
  min?: number
  max?: number
  gridStep?: number
  height?: number
  className?: string
}) {
  const width = 640
  const padX = 36
  const padY = 20
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const n = Math.max(1, labels.length - 1)

  const x = (i: number) => padX + (i / n) * innerW
  const y = (v: number) => padY + innerH - ((v - min) / (max - min)) * innerH

  const gridValues = gridStep
    ? Array.from(
        { length: Math.floor((max - min) / gridStep) + 1 },
        (_, i) => min + gridStep * i
      )
    : Array.from({ length: 6 }, (_, i) => min + ((max - min) / 5) * i)

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img">
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={padX}
              x2={width - padX}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text x={4} y={y(v) + 3} fontSize={10} fill="var(--muted-foreground)" className="font-mono">
              {v.toFixed(1)}
            </text>
          </g>
        ))}

        {target !== undefined && (
          <line
            x1={padX}
            x2={width - padX}
            y1={y(target)}
            y2={y(target)}
            stroke={targetColorVar}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {series.map((s) => {
          const segments: string[] = []
          let current: string[] = []
          s.points.forEach((p, i) => {
            if (p === null || p === undefined) {
              if (current.length) segments.push(current.join(" "))
              current = []
            } else {
              current.push(`${x(i)},${y(p)}`)
            }
          })
          if (current.length) segments.push(current.join(" "))
          return (
            <g key={s.name}>
              {segments.map((points, idx) => (
                <polyline
                  key={idx}
                  points={points}
                  fill="none"
                  stroke={s.colorVar}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {s.points.map((p, i) =>
                p === null || p === undefined ? null : (
                  <circle key={i} cx={x(i)} cy={y(p)} r={2.5} fill={s.colorVar} />
                )
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-1 flex gap-2 pl-9">
        {labels.map((label, i) => (
          <span key={i} className="flex-1 truncate text-center text-[10px] text-muted-foreground">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.colorVar }} />
            {s.name}
          </span>
        ))}
        {target !== undefined && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ backgroundColor: targetColorVar }}
            />
            Target {target.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
}

/* =========================================================================
   1. RadarChart: Tương quan kỹ năng (L, R, W hoặc L, R, W, Overall)
========================================================================= */
export interface RadarDatum {
  label: string
  value: number
  max?: number
}

export function RadarChart({
  data,
  size = 240,
  colorVar = "var(--primary)",
  className,
}: {
  data: RadarDatum[]
  size?: number
  colorVar?: string
  className?: string
}) {
  const center = size / 2
  const radius = center - 38
  const total = data.length
  if (total < 3) return null

  const angleSlice = (Math.PI * 2) / total
  const defaultMax = 9

  // Calculate coordinates
  const getCoordinates = (value: number, max: number, index: number) => {
    const r = (Math.min(value, max) / max) * radius
    const angle = angleSlice * index - Math.PI / 2
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  // Polygon points
  const points = data
    .map((d, i) => {
      const { x, y } = getCoordinates(d.value, d.max ?? defaultMax, i)
      return `${x},${y}`
    })
    .join(" ")

  const levels = [0.25, 0.5, 0.75, 1]

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        {/* Concentric grid webs */}
        {levels.map((lvl, lIdx) => {
          const levelPoints = data
            .map((_, i) => {
              const r = radius * lvl
              const angle = angleSlice * i - Math.PI / 2
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`
            })
            .join(" ")
          return (
            <polygon
              key={lIdx}
              points={levelPoints}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={lvl < 1 ? "2 2" : undefined}
            />
          )
        })}

        {/* Axes from center to each vertex */}
        {data.map((_, i) => {
          const angle = angleSlice * i - Math.PI / 2
          const x2 = center + radius * Math.cos(angle)
          const y2 = center + radius * Math.sin(angle)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="var(--border)"
              strokeWidth={1}
            />
          )
        })}

        {/* Filled Data Polygon */}
        <polygon
          points={points}
          fill={colorVar}
          fillOpacity={0.18}
          stroke={colorVar}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Vertex dots & Labels */}
        {data.map((d, i) => {
          const { x, y } = getCoordinates(d.value, d.max ?? defaultMax, i)
          const angle = angleSlice * i - Math.PI / 2
          const labelDist = radius + 20
          const lx = center + labelDist * Math.cos(angle)
          const ly = center + labelDist * Math.sin(angle)

          return (
            <g key={d.label}>
              <circle cx={x} cy={y} r={3.5} fill={colorVar} />
              <text
                x={lx}
                y={ly + 4}
                textAnchor="middle"
                fontSize={10}
                className="fill-muted-foreground font-medium"
              >
                {d.label} ({d.value.toFixed(1)})
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* =========================================================================
   2. DonutChart: Tỷ lệ phân bố (Đạt mục tiêu / Hoàn thành bài tập)
========================================================================= */
export interface DonutDatum {
  label: string
  value: number
  colorVar: string
}

export function DonutChart({
  data,
  size = 180,
  strokeWidth = 22,
  centerLabel,
  centerValue,
  className,
}: {
  data: DonutDatum[]
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string | number
  className?: string
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // Tính sẵn offset tích lũy (tránh mutate trong render) — dùng reduce thay vì map+mutate
  const offsets = React.useMemo(
    () =>
      data.reduce<number[]>((acc, _d, i) => {
        const prev = i === 0 ? 0 : acc[i - 1] + data[i - 1].value / total
        acc.push(prev)
        return acc
      }, []),
    [data, total]
  )

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
          />
          {data.map((d, i) => {
            const fraction = d.value / total
            const strokeDasharray = `${circumference * fraction} ${circumference * (1 - fraction)}`
            const strokeDashoffset = -circumference * offsets[i]

            return (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.colorVar}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            )
          })}
        </svg>

        {(centerLabel || centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            {centerValue !== undefined && (
              <span className="font-mono text-xl font-bold text-foreground tabular-nums">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {data.map((d) => {
          const pct = Math.round((d.value / total) * 100)
          return (
            <div key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: d.colorVar }} />
              <span>{d.label}</span>
              <span className="font-mono text-foreground font-medium">({pct}%)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================================================
   3. RadialProgressChart: Đo % hoàn thành mục tiêu (Current / Target)
========================================================================= */
export function RadialProgressChart({
  current,
  target,
  size = 140,
  strokeWidth = 14,
  className,
}: {
  current: number
  target: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const percent = Math.min(100, Math.round((current / (target || 1)) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-bold text-foreground tabular-nums">
          {percent}%
        </span>
        <span className="text-[10px] text-muted-foreground">
          {current.toFixed(1)} / {target.toFixed(1)} Band
        </span>
      </div>
    </div>
  )
}

/* =========================================================================
   4. AreaChart: Xu hướng tiến bộ điểm số theo thời gian với vùng gradient
========================================================================= */
export function AreaChart({
  data,
  min = 4,
  max = 9,
  height = 180,
  colorVar = "var(--primary)",
  className,
}: {
  data: Array<{ label: string; value: number }>
  min?: number
  max?: number
  height?: number
  colorVar?: string
  className?: string
}) {
  const width = 480
  const padX = 24
  const padY = 16
  const innerW = width - padX * 2
  const innerH = height - padY * 2
  const n = Math.max(1, data.length - 1)

  const x = (i: number) => padX + (i / n) * innerW
  const y = (v: number) => padY + innerH - ((v - min) / (max - min)) * innerH

  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ")
  const areaPoints = `${x(0)},${padY + innerH} ${points} ${x(data.length - 1)},${padY + innerH}`

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="overflow-visible">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colorVar} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[min, (min + max) / 2, max].map((v) => (
          <line
            key={v}
            x1={padX}
            x2={width - padX}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        ))}

        {/* Shaded Area */}
        <polygon points={areaPoints} fill="url(#areaGradient)" />

        {/* Polyline */}
        <polyline
          points={points}
          fill="none"
          stroke={colorVar}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => (
          <circle key={i} cx={x(i)} cy={y(d.value)} r={3} fill={colorVar} />
        ))}
      </svg>

      <div className="mt-2 flex justify-between px-6 text-[10px] font-mono text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} className="truncate">
            {d.label} ({d.value})
          </span>
        ))}
      </div>
    </div>
  )
}
