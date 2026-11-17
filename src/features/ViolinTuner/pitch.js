// Pitch detection with the YIN algorithm (de Cheveigné and Kawahara, 2002), plus note math.
// Pure functions, no Web Audio, so they can be tested in Node with synthetic signals.
//
// YIN asks: "if I shift the signal by tau samples, how different is it from itself?"
// A periodic sound is nearly identical to itself shifted by one period, so the first
// clear dip in that difference marks the period, and frequency = sampleRate / period.

export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']

// The open strings of a violin, low to high, as MIDI note numbers.
export const VIOLIN_STRINGS = [
  { name: 'G', midi: 55 },
  { name: 'D', midi: 62 },
  { name: 'A', midi: 69 },
  { name: 'E', midi: 76 },
]

export const midiToFreq = (midi, a4 = 440) => a4 * 2 ** ((midi - 69) / 12)
export const freqToMidi = (f, a4 = 440) => 69 + 12 * Math.log2(f / a4)
export const noteName = (midi) => `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`

// Root-mean-square loudness of a buffer.
export function rms(buf) {
  let s = 0
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]
  return Math.sqrt(s / buf.length)
}

// Returns { freq, clarity } or null when there is no clear pitch.
// clarity is 1 for a perfect periodic tone and falls toward 0 for noise.
export function detectPitch(buf, sampleRate, { minFreq = 150, maxFreq = 1500, threshold = 0.12 } = {}) {
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq))
  const tauMax = Math.min(Math.floor(sampleRate / minFreq), Math.floor(buf.length / 2))
  const w = buf.length - tauMax // compare windows of the same length for every tau
  if (w <= 0 || tauMax <= tauMin) return null

  // Step 1-2: difference function d(tau) and its cumulative mean normalized form d'(tau).
  const d = new Float64Array(tauMax + 1)
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0
    for (let j = 0; j < w; j++) {
      const diff = buf[j] - buf[j + tau]
      sum += diff * diff
    }
    d[tau] = sum
  }
  const cmnd = new Float64Array(tauMax + 1)
  cmnd[0] = 1
  let running = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau]
    cmnd[tau] = running === 0 ? 1 : (d[tau] * tau) / running
  }

  // Step 3: the first dip below the threshold, followed down to its bottom.
  let tau = -1
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++
      tau = t
      break
    }
  }
  // No dip under the threshold: fall back to the overall minimum, if it is decent.
  if (tau === -1) {
    let best = tauMin
    for (let t = tauMin + 1; t <= tauMax; t++) if (cmnd[t] < cmnd[best]) best = t
    if (cmnd[best] > 0.35) return null
    tau = best
  }

  // Step 4: parabolic interpolation around the dip for a sub-sample period.
  let better = tau
  if (tau > 1 && tau < tauMax) {
    const a = cmnd[tau - 1]
    const b = cmnd[tau]
    const c = cmnd[tau + 1]
    const den = a - 2 * b + c
    if (den !== 0) better = tau + (a - c) / (2 * den)
  }
  return { freq: sampleRate / better, clarity: Math.max(0, 1 - cmnd[tau]) }
}

// Nearest note in chromatic mode, or nearest open string in violin mode.
// cents: how far the pitch is from the target, + is sharp, - is flat.
export function describePitch(freq, { a4 = 440, mode = 'violin' } = {}) {
  const m = freqToMidi(freq, a4)
  if (mode === 'violin') {
    let target = VIOLIN_STRINGS[0]
    for (const s of VIOLIN_STRINGS) if (Math.abs(m - s.midi) < Math.abs(m - target.midi)) target = s
    return { label: target.name, sub: noteName(target.midi), targetFreq: midiToFreq(target.midi, a4), cents: (m - target.midi) * 100, midi: m }
  }
  const nearest = Math.round(m)
  return { label: noteName(nearest).replace(/-?\d+$/, ''), sub: noteName(nearest), targetFreq: midiToFreq(nearest, a4), cents: (m - nearest) * 100, midi: m }
}

export function median(values) {
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
