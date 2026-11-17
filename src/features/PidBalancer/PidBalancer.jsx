import { useEffect, useRef, useState } from 'react'
import { CartPole, HALF_LENGTH, MAX_FORCE, MAX_WIND, PRESETS, RANGES, TRACK_HALF } from './cartpole.js'

const HISTORY_SECONDS = 10
const PUSH_SPIN = 1.2 // rad/s added to the stick by a push
const START = PRESETS[0] // start untuned, so the first thing a visitor sees is a fall
const deg = (r) => (r * 180) / Math.PI

function draw(canvas, sim) {
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }
  const css = getComputedStyle(canvas)
  const color = (name) => css.getPropertyValue(name).trim()
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = color('--paper')
  ctx.fillRect(0, 0, w, h)

  const margin = 18
  const k = (w - 2 * margin) / (2 * TRACK_HALF + 0.6) // pixels per metre
  const px = (x) => w / 2 + x * k
  const floor = h - 34

  // wind streaks
  if (sim.wind !== 0) {
    const dir = Math.sign(sim.wind)
    const strength = Math.abs(sim.wind) / MAX_WIND
    ctx.strokeStyle = 'rgba(79, 101, 84, .35)'
    ctx.lineWidth = 1.5
    const t = sim.time * 140 * dir
    for (let i = 0; i < 9; i++) {
      const y = 24 + ((i * 37) % (floor - 70))
      const len = 22 + 40 * strength
      const x0 = ((((i * 97 + t) % (w + 80)) + (w + 80)) % (w + 80)) - 40
      ctx.beginPath()
      ctx.moveTo(x0, y)
      ctx.lineTo(x0 + len * dir, y)
      ctx.lineTo(x0 + (len - 6) * dir, y - 4)
      ctx.stroke()
    }
  }

  // track, ticks, end stops
  ctx.strokeStyle = color('--ink')
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(px(-TRACK_HALF - 0.3), floor)
  ctx.lineTo(px(TRACK_HALF + 0.3), floor)
  ctx.stroke()
  ctx.lineWidth = 1
  ctx.fillStyle = color('--muted')
  ctx.font = `12px ${css.getPropertyValue('--font-body')}`
  ctx.textAlign = 'center'
  for (let m = -2; m <= 2; m += 0.5) {
    ctx.beginPath()
    ctx.moveTo(px(m), floor + 3)
    ctx.lineTo(px(m), floor + (Number.isInteger(m) ? 10 : 6))
    ctx.stroke()
    if (Number.isInteger(m)) ctx.fillText(`${m < 0 ? '−' : ''}${Math.abs(m)} m`, px(m), floor + 24)
  }
  ctx.fillStyle = color('--ink')
  for (const s of [-1, 1]) ctx.fillRect(px(s * (TRACK_HALF + 0.3)) - (s > 0 ? 8 : 0), floor - 40, 8, 40)

  // target flag
  const tx = px(sim.targetX)
  ctx.strokeStyle = color('--accent')
  ctx.fillStyle = color('--accent')
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(tx, floor)
  ctx.lineTo(tx, floor - 46)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(tx, floor - 46)
  ctx.lineTo(tx + 16, floor - 40)
  ctx.lineTo(tx, floor - 34)
  ctx.fill()

  // cart
  const cw = 0.55 * k
  const ch = 0.22 * k
  const cx = px(sim.x)
  const cartTop = floor - ch - 0.08 * k
  ctx.fillStyle = color('--surface')
  ctx.strokeStyle = color('--ink')
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(cx - cw / 2, cartTop, cw, ch, 5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color('--ink')
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(cx + (s * cw) / 3, floor - 0.05 * k, 0.05 * k, 0, 2 * Math.PI)
    ctx.fill()
  }

  // motor force arrow
  const f = sim.force / MAX_FORCE
  if (Math.abs(f) > 0.02) {
    const len = f * cw * 1.3
    const y = cartTop + ch / 2
    const x0 = cx + (Math.sign(f) * cw) / 2
    ctx.strokeStyle = Math.abs(f) > 0.98 ? '#8a2b1d' : color('--accent')
    ctx.fillStyle = ctx.strokeStyle
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x0, y)
    ctx.lineTo(x0 + len, y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x0 + len + Math.sign(f) * 8, y)
    ctx.lineTo(x0 + len, y - 6)
    ctx.lineTo(x0 + len, y + 6)
    ctx.fill()
  }

  // stick
  const L = 2 * HALF_LENGTH * k
  const pivotY = cartTop
  if (sim.controller.cartLoopOn && sim.status === 'balancing') {
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = color('--muted')
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx, pivotY)
    ctx.lineTo(cx + Math.sin(sim.targetAngle) * L * 0.9, pivotY - Math.cos(sim.targetAngle) * L * 0.9)
    ctx.stroke()
    ctx.setLineDash([])
  }
  const tipX = cx + Math.sin(sim.theta) * L
  const tipY = pivotY - Math.cos(sim.theta) * L
  ctx.strokeStyle = sim.status === 'fell' ? '#8a2b1d' : color('--ink')
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, pivotY)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()
  ctx.lineCap = 'butt'
  ctx.fillStyle = color('--signal')
  ctx.strokeStyle = color('--ink')
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(tipX, tipY, 9, 0, 2 * Math.PI)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, pivotY, 5, 0, 2 * Math.PI)
  ctx.fillStyle = color('--paper')
  ctx.fill()
  ctx.stroke()
}

function Chart({ points, label, unit, range, field, guide }) {
  const w = 300
  const h = 70
  if (points.length < 2) return <div className="pid-chart pid-chart-empty">{label} over time shows up here.</div>
  const t1 = points[points.length - 1].t
  const x = (t) => w - ((t1 - t) / HISTORY_SECONDS) * w
  const y = (v) => h / 2 - (Math.max(-range, Math.min(range, v)) / range) * (h / 2 - 4)
  const line = (key) => points.map((p) => `${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  return (
    <figure className="pid-chart-wrap">
      <figcaption>{label} <span>(±{range} {unit})</span></figcaption>
      <svg className="pid-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${label} over the last ${HISTORY_SECONDS} seconds`}>
        <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="pid-zero" />
        {guide && <polyline points={line(guide)} className="pid-guide" />}
        <polyline points={line(field)} className="pid-line" />
      </svg>
    </figure>
  )
}

function Gain({ id, label, value, range, onChange, hint }) {
  return (
    <div className="loc-slider pid-gain">
      <label htmlFor={id}>
        <span>{label} <span className="pid-gain-hint">{hint}</span></span>
        <strong>{value.toFixed(range.step < 0.01 ? 3 : range.step < 1 ? 2 : 0)}</strong>
      </label>
      <input id={id} type="range" min={range.min} max={range.max} step={range.step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

export default function PidBalancer() {
  const canvasRef = useRef(null)
  const simRef = useRef(null)
  const historyRef = useRef([])
  const [gains, setGains] = useState(START.gains)
  const [preset, setPreset] = useState(START.id)
  const [wind, setWind] = useState(0)
  const [target, setTarget] = useState(0)
  const [running, setRunning] = useState(false)
  const [view, setView] = useState(null)
  const [best, setBest] = useState(0)

  const sim = () => {
    if (!simRef.current) simRef.current = new CartPole(START.gains)
    return simRef.current
  }

  const snapshot = () => {
    const s = simRef.current
    return {
      status: s.status,
      balanced: s.balanced,
      lean: deg(s.theta),
      x: s.x,
      force: s.force / MAX_FORCE,
      why: s.status === 'balancing' ? '' : s.diagnosis(),
      history: historyRef.current.slice(),
    }
  }

  // Keep the canvas drawn and sized, even while paused.
  useEffect(() => {
    const canvas = canvasRef.current
    sim()
    const redraw = () => draw(canvas, simRef.current)
    redraw()
    const ro = new ResizeObserver(redraw)
    ro.observe(canvas)
    return () => ro.disconnect()
  })

  useEffect(() => {
    if (!running) return
    let raf
    let last = performance.now()
    let lastUi = 0
    let lastSample = 0
    const loop = (now) => {
      const s = simRef.current
      s.advance(Math.min((now - last) / 1000, 0.05)) // a background tab must not leap ahead
      last = now
      if (s.time < lastSample) lastSample = -1 // the simulation was restarted mid-run
      if (s.time - lastSample > 1 / 30) {
        lastSample = s.time
        historyRef.current.push({ t: s.time, lean: deg(s.theta), leanTarget: deg(s.targetAngle), off: s.x - s.targetX })
        while (historyRef.current[0].t < s.time - HISTORY_SECONDS) historyRef.current.shift()
      }
      draw(canvasRef.current, s)
      if (s.status !== 'balancing') {
        setBest((b) => Math.max(b, s.balanced))
        setView(snapshot())
        setRunning(false)
        return
      }
      if (now - lastUi > 100) {
        lastUi = now
        setView(snapshot())
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const restart = () => {
    const s = sim()
    setBest((b) => Math.max(b, s.balanced))
    s.reset()
    s.wind = wind
    s.targetX = target
    historyRef.current = []
    setView(snapshot())
    setRunning(true)
  }
  const changeGain = (key, v) => {
    const next = { ...gains, [key]: v }
    setGains(next)
    setPreset(null)
    sim().controller.set(next)
  }
  const choosePreset = (p) => {
    setGains(p.gains)
    setPreset(p.id)
    sim().controller.set(p.gains)
    restart()
  }
  const changeWind = (v) => { setWind(v); sim().wind = v }
  const changeTarget = (v) => { setTarget(v); sim().targetX = v }
  const push = (dir) => {
    sim().push(dir * PUSH_SPIN)
    if (!running && sim().status === 'balancing') setRunning(true)
  }

  const v = view
  const down = v && v.status !== 'balancing'
  const presetNote = PRESETS.find((p) => p.id === preset)?.note
  return (
    <div className="pid">
      <div className="pid-presets" role="group" aria-label="Presets">
        <span className="obr-seg-label">Start from</span>
        <div className="obr-seg-buttons">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => choosePreset(p)}>{p.label}</button>
          ))}
        </div>
      </div>
      <p className="obr-about">{presetNote ? <><strong>{PRESETS.find((p) => p.id === preset).label}:</strong> {presetNote}</> : <><strong>Custom:</strong> your own tune. Can you keep it up?</>}</p>

      <div className="pid-stage">
        <canvas ref={canvasRef} className="pid-canvas" role="img"
          aria-label={`Cart on a track balancing a stick. ${v ? `The stick leans ${Math.abs(v.lean).toFixed(0)} degrees ${v.lean >= 0 ? 'right' : 'left'}.` : ''}`} />
        {(!v || down) && (
          <div className="pid-overlay" role="status">
            {!v
              ? <><strong>Can you keep the stick up?</strong><span>Pick a preset or tune the sliders, then press Start.</span></>
              : <><strong>{v.status === 'wall' ? 'Hit the end of the track' : 'It fell over'} after {v.balanced.toFixed(1)} s</strong><span>{v.why}</span></>}
            <button type="button" className="btn primary small" onClick={restart}>{v ? 'Try again' : 'Start'}</button>
          </div>
        )}
      </div>

      <div className="pid-transport">
        <button type="button" className="btn small" onClick={() => push(-1)} disabled={down}>← Push</button>
        <button type="button" className="btn small" onClick={() => push(1)} disabled={down}>Push →</button>
        <button type="button" className="btn small" onClick={restart}>Restart</button>
        <dl className="pid-readout">
          <div><dt>Balanced</dt><dd>{v ? `${v.balanced.toFixed(1)} s` : '—'}</dd></div>
          <div><dt>Best</dt><dd>{best ? `${best.toFixed(1)} s` : '—'}</dd></div>
          <div><dt>Lean</dt><dd>{v ? `${v.lean.toFixed(1)}°` : '—'}</dd></div>
          <div><dt>Motor</dt><dd className={v && Math.abs(v.force) > 0.98 ? 'hot' : undefined}>{v ? `${Math.round(Math.abs(v.force) * 100)}%` : '—'}</dd></div>
        </dl>
      </div>

      <div className="pid-grid">
        <fieldset className="pid-loop">
          <legend>Stick loop <span>keeps the stick upright</span></legend>
          <Gain id="pid-kp" label="P" hint="push harder the more it leans" value={gains.kp} range={RANGES.kp} onChange={(x) => changeGain('kp', x)} />
          <Gain id="pid-kd" label="D" hint="push against how fast it's tipping" value={gains.kd} range={RANGES.kd} onChange={(x) => changeGain('kd', x)} />
        </fieldset>
        <fieldset className="pid-loop">
          <legend>Cart loop <span>keeps the cart at the flag</span></legend>
          <Gain id="pid-xp" label="P" hint="lean toward the flag the farther away" value={gains.xp} range={RANGES.xp} onChange={(x) => changeGain('xp', x)} />
          <Gain id="pid-xi" label="I" hint="lean more the longer it's been off" value={gains.xi} range={RANGES.xi} onChange={(x) => changeGain('xi', x)} />
          <Gain id="pid-xd" label="D" hint="ease off as it speeds toward it" value={gains.xd} range={RANGES.xd} onChange={(x) => changeGain('xd', x)} />
        </fieldset>
        <fieldset className="pid-loop">
          <legend>The world</legend>
          <div className="loc-slider">
            <label htmlFor="pid-wind"><span>Wind</span><strong>{wind === 0 ? 'calm' : `${Math.abs(wind).toFixed(2)} N ${wind > 0 ? '→' : '←'}`}</strong></label>
            <input id="pid-wind" type="range" min={-MAX_WIND} max={MAX_WIND} step={0.01} value={wind} onChange={(e) => changeWind(Number(e.target.value))} />
          </div>
          <div className="loc-slider">
            <label htmlFor="pid-target"><span>Flag position</span><strong>{target.toFixed(1)} m</strong></label>
            <input id="pid-target" type="range" min={-2} max={2} step={0.1} value={target} onChange={(e) => changeTarget(Number(e.target.value))} />
          </div>
        </fieldset>
      </div>

      <div className="pid-charts">
        <Chart points={v ? v.history : []} label="Stick lean" unit="°" range={15} field="lean" guide={gains.xp || gains.xi || gains.xd ? 'leanTarget' : null} />
        <Chart points={v ? v.history : []} label="Cart distance from flag" unit="m" range={2.4} field="off" />
      </div>
    </div>
  )
}
