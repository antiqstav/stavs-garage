import { useEffect, useRef, useState } from 'react'
import { VIOLIN_STRINGS, describePitch, detectPitch, freqToMidi, median, midiToFreq, rms } from './pitch.js'

const TRACE_SECONDS = 6
const IN_TUNE = 5 // cents
const SILENCE = 0.008 // rms below this counts as silence

// A gentle violin-like reference: a harmonic series that fades with each overtone.
function referenceWave(ctx) {
  const n = 12
  const real = new Float32Array(n)
  const imag = new Float32Array(n)
  for (let h = 1; h < n; h++) imag[h] = 0.8 / h ** 1.15
  return ctx.createPeriodicWave(real, imag)
}

function Needle({ cents, active }) {
  // Arc from -50 to +50 cents across 120 degrees.
  const clamped = Math.max(-50, Math.min(50, cents ?? 0))
  const angle = (clamped / 50) * 60
  const tick = (c, len) => {
    const a = ((c / 50) * 60 - 90) * (Math.PI / 180)
    const r0 = 92 - len
    return <line key={c} x1={110 + r0 * Math.cos(a)} y1={110 + r0 * Math.sin(a)} x2={110 + 92 * Math.cos(a)} y2={110 + 92 * Math.sin(a)} className="tn-tick" />
  }
  const arc = (c0, c1) => {
    const p = (c) => {
      const a = ((c / 50) * 60 - 90) * (Math.PI / 180)
      return `${110 + 92 * Math.cos(a)} ${110 + 92 * Math.sin(a)}`
    }
    return `M ${p(c0)} A 92 92 0 0 1 ${p(c1)}`
  }
  return (
    <svg className="tn-gauge" viewBox="0 0 220 130" aria-hidden="true">
      <path d={arc(-50, 50)} className="tn-arc" />
      <path d={arc(-IN_TUNE, IN_TUNE)} className="tn-zone" />
      {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((c) => tick(c, c === 0 ? 16 : c % 50 === 0 ? 12 : 7))}
      <text x="22" y="124" className="tn-end">flat</text>
      <text x="198" y="124" className="tn-end" textAnchor="end">sharp</text>
      <g className={active ? 'tn-needle' : 'tn-needle idle'} style={{ transform: `rotate(${angle}deg)` }}>
        <line x1="110" y1="110" x2="110" y2="26" />
        <circle cx="110" cy="110" r="7" />
      </g>
    </svg>
  )
}

function Trace({ points }) {
  const w = 300
  const h = 80
  const y = (c) => h / 2 - (Math.max(-50, Math.min(50, c)) / 50) * (h / 2 - 4)
  if (points.length < 2) return <div className="tn-trace tn-trace-empty">Your pitch over the last few seconds shows up here.</div>
  const t1 = points[points.length - 1][0]
  const x = (t) => w - ((t1 - t) / (TRACE_SECONDS * 1000)) * w
  // Break the line wherever there was a gap (silence) so it doesn't draw across it.
  const runs = []
  let run = []
  points.forEach((p, i) => {
    if (i && p[0] - points[i - 1][0] > 250) {
      runs.push(run)
      run = []
    }
    run.push(`${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`)
  })
  runs.push(run)
  return (
    <svg className="tn-trace" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Pitch over the last six seconds, in cents from the target">
      <rect x="0" y={y(IN_TUNE)} width={w} height={y(-IN_TUNE) - y(IN_TUNE)} className="tn-band" />
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="tn-mid" />
      {runs.map((r, i) => r.length > 1 && <polyline key={i} points={r.join(' ')} className="tn-line" />)}
    </svg>
  )
}

export default function ViolinTuner() {
  const [mode, setMode] = useState('violin')
  const [a4, setA4] = useState(440)
  const [micOn, setMicOn] = useState(false)
  const [refString, setRefString] = useState(null) // MIDI note of the reference tone, or null
  const [detune, setDetune] = useState(0)
  const [reading, setReading] = useState(null)
  const [trace, setTrace] = useState([])
  const [error, setError] = useState('')

  const audio = useRef({ ctx: null, analyser: null, stream: null, mic: null, osc: null, gain: null })
  const recent = useRef([]) // last few detected pitches, as MIDI numbers
  const traceRef = useRef([])
  const detuneRef = useRef(0) // read when a new reference tone starts
  const settings = useRef({ mode, a4 })
  useEffect(() => { settings.current = { mode, a4 } }, [mode, a4])

  const ensureContext = async () => {
    const a = audio.current
    if (!a.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) throw new Error('This browser does not support Web Audio.')
      a.ctx = new Ctx()
      a.analyser = a.ctx.createAnalyser()
      a.analyser.fftSize = 2048
    }
    if (a.ctx.state === 'suspended') await a.ctx.resume()
    return a
  }

  // The reference tone feeds the detector directly only while the mic is off, so with the
  // mic on, the tuner hears the room (the speaker or your violin) like a real tuner would.
  const routeReference = (a, mic) => {
    if (!a.gain) return
    try { a.gain.disconnect(a.analyser) } catch { /* was not connected */ }
    if (!mic) a.gain.connect(a.analyser)
  }

  const startMic = async () => {
    setError('')
    try {
      const a = await ensureContext()
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use a microphone here.')
      a.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      })
      a.mic = a.ctx.createMediaStreamSource(a.stream)
      a.mic.connect(a.analyser)
      routeReference(a, true)
      setMicOn(true)
    } catch (err) {
      console.error('Tuner microphone error:', err)
      setError(err?.name === 'NotAllowedError'
        ? 'Microphone access was blocked. Allow it in your browser, or use a reference tone below.'
        : err?.message || 'The microphone could not start.')
    }
  }

  const stopMic = () => {
    const a = audio.current
    a.mic?.disconnect()
    a.stream?.getTracks().forEach((t) => t.stop())
    a.mic = null
    a.stream = null
    routeReference(a, false)
    setMicOn(false)
    setReading((r) => (r ? { ...r, live: false } : r))
  }

  const stopReference = () => {
    const a = audio.current
    if (!a.osc) return
    const { osc, gain, ctx } = a
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03)
    osc.stop(ctx.currentTime + 0.2)
    osc.onended = () => gain.disconnect()
    a.osc = null
    a.gain = null
    setRefString(null)
    setReading((r) => (r ? { ...r, live: false } : r))
  }

  const playReference = async (midi) => {
    setError('')
    if (refString === midi) {
      stopReference()
      return
    }
    try {
      const a = await ensureContext()
      if (a.osc) stopReference()
      const osc = a.ctx.createOscillator()
      osc.setPeriodicWave(referenceWave(a.ctx))
      osc.frequency.value = midiToFreq(midi, settings.current.a4)
      osc.detune.value = detuneRef.current
      const gain = a.ctx.createGain()
      gain.gain.value = 0
      gain.gain.setTargetAtTime(0.18, a.ctx.currentTime, 0.04)
      osc.connect(gain)
      gain.connect(a.ctx.destination)
      osc.start()
      a.osc = osc
      a.gain = gain
      routeReference(a, !!a.mic)
      setRefString(midi)
    } catch (err) {
      console.error('Tuner reference tone error:', err)
      setError('The reference tone could not play in this browser.')
    }
  }

  const changeDetune = (v) => {
    setDetune(v)
    detuneRef.current = v
    const a = audio.current
    if (a.osc) a.osc.detune.setTargetAtTime(v, a.ctx.currentTime, 0.05)
  }

  const changeA4 = (v) => {
    setA4(v)
    const a = audio.current
    if (a.osc && refString !== null) a.osc.frequency.setTargetAtTime(midiToFreq(refString, v), a.ctx.currentTime, 0.05)
  }

  const listening = micOn || refString !== null

  // Read the analyser about 30 times a second while anything is feeding it.
  useEffect(() => {
    if (!listening) return
    const a = audio.current
    const buf = new Float32Array(a.analyser.fftSize)
    let raf
    let lastRead = 0
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (now - lastRead < 33) return
      lastRead = now
      a.analyser.getFloatTimeDomainData(buf)
      const { mode: m, a4: ref } = settings.current
      const loud = rms(buf) > SILENCE
      const p = loud ? detectPitch(buf, a.ctx.sampleRate) : null
      if (p && p.clarity > 0.8) {
        recent.current.push(freqToMidi(p.freq, ref))
        if (recent.current.length > 5) recent.current.shift()
        const freq = midiToFreq(median(recent.current), ref)
        const info = describePitch(freq, { a4: ref, mode: m })
        setReading({ ...info, freq, live: true })
        traceRef.current.push([now, info.cents])
      } else {
        recent.current = []
        setReading((r) => (r ? { ...r, live: false } : r))
      }
      while (traceRef.current.length && traceRef.current[0][0] < now - TRACE_SECONDS * 1000) traceRef.current.shift()
      setTrace(traceRef.current.slice())
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [listening])

  // Release the microphone and audio device when leaving the page.
  useEffect(() => () => {
    const a = audio.current
    a.stream?.getTracks().forEach((t) => t.stop())
    if (a.ctx && a.ctx.state !== 'closed') a.ctx.close().catch(() => {})
    Object.assign(a, { ctx: null, analyser: null, stream: null, mic: null, osc: null, gain: null })
  }, [])

  const cents = reading?.cents
  const verdict = !listening
    ? 'Turn on the microphone, or play a reference tone.'
    : !reading?.live
      ? 'Listening… play a note.'
      : Math.abs(cents) <= IN_TUNE
        ? 'In tune'
        : cents < 0
          ? `Flat by ${Math.round(-cents)} cents: tune up`
          : `Sharp by ${Math.round(cents)} cents: tune down`

  return (
    <div className="tn">
      <div className="tn-top">
        <div className="row">
          {micOn
            ? <button type="button" className="btn small" onClick={stopMic}>Stop microphone</button>
            : <button type="button" className="btn primary small" onClick={startMic}>Use microphone</button>}
        </div>
        <div className="obr-seg" role="group" aria-label="Mode">
          <span className="obr-seg-label">Mode</span>
          <div className="obr-seg-buttons">
            <button type="button" aria-pressed={mode === 'violin'} onClick={() => setMode('violin')}>Violin strings</button>
            <button type="button" aria-pressed={mode === 'chromatic'} onClick={() => setMode('chromatic')}>Chromatic</button>
          </div>
        </div>
      </div>
      {error && <p className="error-msg" role="alert">{error}</p>}

      <div className="tn-main">
        <div className={reading?.live && Math.abs(cents) <= IN_TUNE ? 'tn-face good' : 'tn-face'}>
          <Needle cents={reading?.live ? cents : null} active={!!reading?.live} />
          <div className="tn-note" aria-hidden="true">
            <strong className={reading?.live ? undefined : 'dim'}>{reading ? reading.label : '–'}</strong>
            <span>{reading ? `${reading.sub} · ${reading.freq.toFixed(1)} Hz` : 'no pitch yet'}</span>
          </div>
          <p className="tn-verdict" role="status" aria-live="polite">{verdict}</p>
        </div>

        <div className="tn-side">
          <Trace points={trace} />
          <div>
            <p className="tn-label">Reference tones</p>
            <div className="tn-strings">
              {VIOLIN_STRINGS.map((s) => (
                <button key={s.midi} type="button" className="tn-string" aria-pressed={refString === s.midi}
                  onClick={() => playReference(s.midi)}>
                  <strong>{s.name}</strong>
                  <span>{midiToFreq(s.midi, a4).toFixed(1)} Hz</span>
                </button>
              ))}
            </div>
          </div>
          <div className="loc-slider">
            <label htmlFor="tn-detune">Detune the reference <strong>{detune > 0 ? '+' : ''}{detune} cents</strong></label>
            <input id="tn-detune" type="range" min={-40} max={40} step={1} value={detune} onChange={(e) => changeDetune(Number(e.target.value))} />
          </div>
          <div className="loc-slider">
            <label htmlFor="tn-a4">Concert A <strong>{a4} Hz</strong></label>
            <input id="tn-a4" type="range" min={436} max={446} step={1} value={a4} onChange={(e) => changeA4(Number(e.target.value))} />
          </div>
        </div>
      </div>
    </div>
  )
}
