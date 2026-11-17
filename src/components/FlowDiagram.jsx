import { useId } from 'react'

// A vertical flow chart drawn as inline SVG, used for each feature's "How it works" diagram.
// It picks up the site's colors and fonts; styles live under .workflow in App.css.
//
//   steps: [{ title, lines: [up to 2 short lines], kind?: 'data' | 'key' | 'out' }]
//   edges: labels for the arrows between consecutive steps ('' for none)
//   lanes: dashed side routes, [{ from, to, side: 'left' | 'right', label }]
//          (step indexes; use these for shortcuts and feedback loops)

const VIEW_W = 380
const X = 60 // box left edge
const W = 260 // box width
const H = 72 // box height
const GAP = 32 // space between boxes
const LANE_X = { left: 30, right: VIEW_W - 30 }

const top = (i) => 12 + i * (H + GAP)
const mid = (i) => top(i) + H / 2

export default function FlowDiagram({ title, description, steps, edges = [], lanes = [] }) {
  const id = useId()
  const arrow = `${id}-arrow`
  const height = top(steps.length - 1) + H + 12
  const cx = X + W / 2

  return (
    <svg className="workflow" viewBox={`0 0 ${VIEW_W} ${height}`} role="img" aria-labelledby={`${id}-t ${id}-d`}>
      <title id={`${id}-t`}>{title}</title>
      <desc id={`${id}-d`}>{description}</desc>
      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="wf-head" />
        </marker>
      </defs>

      {steps.slice(1).map((_, i) => {
        const y1 = top(i) + H
        const y2 = top(i + 1)
        return (
          <g key={`edge-${i}`}>
            <line x1={cx} y1={y1 + 2} x2={cx} y2={y2 - 3} className="wf-edge" markerEnd={`url(#${arrow})`} />
            {edges[i] && <text x={cx + 9} y={(y1 + y2) / 2 + 4} className="wf-edge-label">{edges[i]}</text>}
          </g>
        )
      })}

      {lanes.map(({ from, to, side, label }) => {
        const lx = LANE_X[side]
        const edge = side === 'left' ? X : X + W
        const into = side === 'left' ? X - 3 : X + W + 3
        const labelX = side === 'left' ? lx - 9 : lx + 9
        return (
          <g key={`${from}-${to}-${side}`}>
            <path d={`M${edge} ${mid(from)} H ${lx} V ${mid(to)} H ${into}`} className="wf-edge wf-lane" markerEnd={`url(#${arrow})`} />
            <text transform={`translate(${labelX} ${(mid(from) + mid(to)) / 2}) rotate(${side === 'left' ? -90 : 90})`} className="wf-lane-label">
              {label}
            </text>
          </g>
        )
      })}

      {steps.map((s, i) => (
        <g key={s.title} className={s.kind ? `wf-box ${s.kind}` : 'wf-box'}>
          <rect x={X + 4} y={top(i) + 4} width={W} height={H} rx="9" className="wf-shadow" />
          <rect x={X} y={top(i)} width={W} height={H} rx="9" className="wf-card" />
          <text x={X + 14} y={top(i) + 25} className="wf-title">{s.title}</text>
          {s.lines.map((line, j) => (
            <text key={line} x={X + 14} y={top(i) + 45 + j * 17} className="wf-sub">{line}</text>
          ))}
        </g>
      ))}
    </svg>
  )
}
