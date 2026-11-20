import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ASK, BID, DELETE, EXECUTE_HIDDEN, EXECUTE_VISIBLE, FILL_MODELS, HALT, NEW, PARTIAL_CANCEL, Simulator,
} from './engine.js'

const LEVELS = 10

const MODELS = [
  { id: 'naive', label: 'Naive' },
  { id: 'pessimistic', label: 'Pessimistic' },
  { id: 'optimistic', label: 'Optimistic' },
  { id: 'idbased', label: 'ID-based' },
]

const LATENCIES = [
  { ns: 0, label: '0' },
  { ns: 100_000, label: '100 µs' },
  { ns: 1_000_000, label: '1 ms' },
  { ns: 10_000_000, label: '10 ms' },
]

const SPEEDS = [1, 10, 60, 300] // times real time

// ---------- formatting ----------
const usd = (ticks) => (ticks / 10_000).toFixed(2)
const money = (ticks) => {
  if (Number.isNaN(ticks)) return '—'
  const d = ticks / 10_000
  return `${d < 0 ? '−' : d > 0 ? '+' : ''}$${Math.abs(d).toFixed(2)}`
}
const clock = (ns) => {
  const ms = Math.floor(ns / 1e6)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor(ms / 60_000) % 60
  const s = Math.floor(ms / 1000) % 60
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)} ${h < 12 ? 'am' : 'pm'}`
}
const sideWord = (side) => (side === BID ? 'bid' : 'ask')

function describe(m) {
  const at = `$${usd(m.price)}`
  switch (m.type) {
    case NEW: return `New ${sideWord(m.side)}: ${m.size} @ ${at}`
    case PARTIAL_CANCEL: return `Partial cancel: −${m.size} ${sideWord(m.side)} @ ${at}`
    case DELETE: return `Cancel ${sideWord(m.side)}: ${m.size} @ ${at}`
    case EXECUTE_VISIBLE: return `Trade: ${m.size} @ ${at} (${m.side === BID ? 'sold into the bid' : 'bought from the ask'})`
    case EXECUTE_HIDDEN: return `Hidden trade: ${m.size} @ ${at}`
    case HALT: return 'Trading halt signal'
    default: return 'Unknown message'
  }
}

// Turns the compact JSON from scripts/make-replay-data.mjs back into what the engine expects.
function expand(raw) {
  const rows = (flat) => {
    const out = []
    for (let i = 0; i < flat.length; i += 4) out.push(flat.slice(i, i + 4))
    return out
  }
  return {
    source: raw.source,
    seed: rows(raw.seed),
    messages: raw.messages.map(([dt, type, id, size, price, side]) => ({ t: raw.t0 + dt, type, id, size, price, side })),
    repairs: Object.fromEntries(Object.entries(raw.repairs).map(([i, flat]) => [i, rows(flat)])),
  }
}

// Copies what the screen needs out of the (mutable) simulator into a plain object.
function snapshot(sim, series, tape) {
  const asks = []
  const bids = []
  for (let k = 1; k <= LEVELS; k++) {
    asks.push(sim.book.levelAt(ASK, k))
    bids.push(sim.book.levelAt(BID, k))
  }
  return {
    time: sim.time,
    cursor: sim.cursor,
    total: sim.data.messages.length,
    done: sim.done,
    profit: sim.profitTicks,
    realized: sim.realizedTicks,
    position: sim.position,
    fills: sim.fillCount,
    asks,
    bids,
    quotes: sim.quotes(),
    series,
    tape,
  }
}

function runToEnd(data, model, latencyNanos) {
  const sim = new Simulator(data, { model, latencyNanos, strict: false })
  while (!sim.done) sim.step()
  return sim
}

// ---------- small pieces ----------

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="obr-seg" role="group" aria-label={label}>
      <span className="obr-seg-label">{label}</span>
      <div className="obr-seg-buttons">
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Ladder({ asks, bids, quotes }) {
  const max = Math.max(1, ...asks.concat(bids).filter(Boolean).map((l) => l[1]))
  const bestBid = bids[0]
  const bestAsk = asks[0]

  const row = (side, level, k) => {
    if (!level) return <tr key={`${side}-${k}`} className="obr-empty"><td colSpan={3}>&nbsp;</td></tr>
    const [price, size] = level
    const mine = quotes.find((q) => q.side === side && q.price === price)
    return (
      <tr key={`${side}-${k}`} className={side === BID ? 'obr-bid' : 'obr-ask'}>
        <td className="obr-price">{usd(price)}</td>
        <td className="obr-size">
          <span className="obr-bar" style={{ width: `${(100 * size) / max}%` }} />
          <span className="obr-num">{size.toLocaleString()}</span>
        </td>
        <td className="obr-you">
          {mine && (
            <span className={mine.state === 'resting' ? 'obr-tag' : 'obr-tag flight'}>
              You {mine.qty}
              {mine.state === 'in flight'
                ? ' · in flight'
                : mine.ahead === null ? '' : ` · ${mine.ahead.toLocaleString()} ahead`}
            </span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <table className="obr-ladder">
      <caption className="sr-only">Top {LEVELS} levels of the GOOG order book</caption>
      <thead>
        <tr><th scope="col">Price</th><th scope="col">Shares</th><th scope="col">Your quote</th></tr>
      </thead>
      <tbody>
        {asks.map((l, i) => ({ l, k: i + 1 })).reverse().map(({ l, k }) => row(ASK, l, k))}
        <tr className="obr-spread">
          <td colSpan={3}>
            {bestBid && bestAsk
              ? <>Spread ${usd(bestAsk[0] - bestBid[0])} · mid ${usd((bestAsk[0] + bestBid[0]) / 2)}</>
              : 'One side of the book is empty'}
          </td>
        </tr>
        {bids.map((l, i) => row(BID, l, i + 1))}
      </tbody>
    </table>
  )
}

function PnlChart({ series, total }) {
  const w = 300
  const h = 90
  if (series.length < 2) {
    return <div className="obr-chart obr-chart-empty">Profit over time appears once the replay starts.</div>
  }
  const lo = Math.min(0, ...series)
  const hi = Math.max(0, ...series)
  const span = hi - lo || 1
  const x = (i) => (i / (total - 1)) * w
  const y = (v) => h - 6 - ((v - lo) / span) * (h - 12)
  const points = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = series[series.length - 1]
  return (
    <svg className="obr-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img"
      aria-label={`Profit over time, now ${money(last)}`}>
      <line x1="0" x2={w} y1={y(0)} y2={y(0)} className="obr-zero" />
      <polyline points={points} className={last < 0 ? 'obr-line neg' : 'obr-line'} />
    </svg>
  )
}

function Compare({ results, current }) {
  const max = Math.max(1, ...results.map((r) => Math.abs(r.profit)))
  return (
    <table className="obr-compare">
      <caption className="sr-only">Final results for each fill model</caption>
      <thead>
        <tr><th scope="col">Model</th><th scope="col">Fills</th><th scope="col">Profit</th></tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.model} className={r.model === current ? 'current' : undefined}>
            <th scope="row">{MODELS.find((m) => m.id === r.model).label}</th>
            <td className="obr-num">{r.fills}</td>
            <td className="obr-pnl-cell">
              <div className="obr-pnl">
                <span className="obr-axis">
                  <span className={r.profit < 0 ? 'obr-pbar neg' : 'obr-pbar'}
                    style={{ width: `${(50 * Math.abs(r.profit)) / max}%` }} />
                </span>
                <span className="obr-num">{money(r.profit)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------- the demo ----------

export default function OrderBookReplay() {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [model, setModel] = useState('pessimistic')
  const [latency, setLatency] = useState(0)
  const [speed, setSpeed] = useState(10)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState(null)
  const [compare, setCompare] = useState(null)

  const simRef = useRef(null)
  const clockRef = useRef(0) // replay clock in ns, advanced by real time x speed

  // Builds a fresh simulator. Called when the data arrives and whenever a setting changes.
  const start = useCallback((d, m, lat) => {
    const sim = new Simulator(d, { model: m, latencyNanos: lat, strict: false })
    simRef.current = sim
    clockRef.current = d.messages[0].t
    setPlaying(false)
    setView(snapshot(sim, [], []))
  }, [])

  useEffect(() => {
    let alive = true
    import('./goog-window.json')
      .then((mod) => {
        if (!alive) return
        const d = expand(mod.default)
        setData(d)
        start(d, 'pessimistic', 0)
      })
      .catch((err) => {
        console.error('HFT Simulator data failed to load:', err)
        if (alive) setLoadError('The market data did not load. Check your connection and refresh the page.')
      })
    return () => { alive = false }
  }, [start])

  // Applies messages up to replay time untilT (or exactly one when untilT is undefined).
  const advance = useCallback((untilT) => {
    const sim = simRef.current
    if (!sim) return
    const added = []
    const tape = []
    while (!sim.done && (untilT === undefined ? added.length < 1 : sim.data.messages[sim.cursor].t <= untilT)) {
      const r = sim.step()
      added.push(sim.profitTicks)
      const f = r.fills[0]
      tape.push({
        key: sim.cursor,
        t: r.message.t,
        text: describe(r.message),
        fill: f ? `You ${f.side === BID ? 'bought' : 'sold'} ${f.qty} @ $${usd(f.price)}` : null,
      })
    }
    if (!added.length) return
    const newest = tape.slice(-8).reverse()
    setView((v) => snapshot(sim, v.series.concat(added), newest.concat(v.tape).slice(0, 8)))
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const sim = simRef.current
      // Cap each frame so a backgrounded tab does not leap ahead when it returns.
      const dt = Math.min(now - last, 100)
      last = now
      clockRef.current += dt * 1e6 * speed
      // Skip quiet stretches longer than 2 real seconds so the screen never sits idle.
      const next = sim.data.messages[sim.cursor]
      if (next && next.t - clockRef.current > 2e9 * speed) clockRef.current = next.t
      advance(clockRef.current)
      if (sim.done) setPlaying(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, advance])

  if (loadError) return <p className="error-msg" role="alert">{loadError}</p>
  if (!data || !view) return <p className="status" role="status">Loading GOOG market data…</p>

  const chooseModel = (m) => { setModel(m); start(data, m, latency) }
  const chooseLatency = (l) => { setLatency(l); start(data, model, l) }
  const togglePlay = () => {
    if (view.done) return
    if (!playing) clockRef.current = Math.max(clockRef.current, simRef.current.time)
    setPlaying((p) => !p)
  }
  const runCompare = () => {
    setCompare({
      latency,
      results: Object.keys(FILL_MODELS).map((m) => {
        const s = runToEnd(data, m, latency)
        return { model: m, fills: s.fillCount, profit: s.profitTicks }
      }),
    })
  }

  return (
    <div className="obr">
      <div className="obr-controls">
        <Segmented label="Fill model" value={model} onChange={chooseModel}
          options={MODELS.map((m) => ({ value: m.id, label: m.label }))} />
        <Segmented label="Latency" value={latency} onChange={chooseLatency}
          options={LATENCIES.map((l) => ({ value: l.ns, label: l.label }))} />
      </div>

      <div className="obr-transport">
        <button type="button" className="btn primary small" onClick={togglePlay} disabled={view.done}>
          {playing ? 'Pause' : view.cursor === 0 ? 'Play' : view.done ? 'Finished' : 'Resume'}
        </button>
        <button type="button" className="btn small" onClick={() => { setPlaying(false); advance() }} disabled={view.done}>Step</button>
        <button type="button" className="btn small" onClick={() => start(data, model, latency)}>Restart</button>
        <button type="button" className="btn small" disabled={view.done}
          onClick={() => { setPlaying(false); advance(Infinity) }}>Skip to end</button>
        <Segmented label="Speed" value={speed} onChange={setSpeed}
          options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} />
      </div>

      <div className="obr-main">
        <div className="obr-book">
          <Ladder asks={view.asks} bids={view.bids} quotes={view.quotes} />
        </div>

        <div className="obr-side">
          <div className="obr-clock">
            <span>GOOG · June 21, 2012</span>
            <strong>{clock(view.time)}</strong>
            <div className="gauge" aria-hidden="true"><span style={{ width: `${(100 * view.cursor) / view.total}%` }} /></div>
            <span className="hint">{view.cursor.toLocaleString()} of {view.total.toLocaleString()} messages</span>
          </div>

          <dl className="obr-stats">
            <div><dt>Profit</dt><dd className={view.profit < 0 ? 'neg' : undefined}>{money(view.profit)}</dd></div>
            <div><dt>Position</dt><dd>{view.position > 0 ? '+' : ''}{view.position} sh</dd></div>
            <div><dt>Fills</dt><dd>{view.fills}</dd></div>
            <div><dt>Realized</dt><dd>{money(view.realized)}</dd></div>
          </dl>

          <PnlChart series={view.series} total={view.total} />

          <ol className="obr-tape" aria-label="Latest messages">
            {view.tape.map((e) => (
              <li key={e.key} className={e.fill ? 'fill' : undefined}>
                <span className="obr-t">{clock(e.t).split(' ')[0].slice(-9)}</span>
                <span>{e.fill ? <strong>{e.fill}</strong> : e.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="obr-compare-wrap">
        <div className="obr-compare-head">
          <h3>Same market, four answers</h3>
          <button type="button" className="btn small" onClick={runCompare}>
            {compare ? 'Run again' : 'Compare models'}
          </button>
        </div>
        {compare && <Compare results={compare.results} current={model} />}
      </div>
    </div>
  )
}
