// A stick (inverted pendulum) balanced on a cart that slides along a track, held up by a
// PID controller that pushes the cart. Pure logic, no DOM, so it can be tested in Node.
//
// Angle theta is 0 when the stick is straight up and positive when it leans right.
// Position x is 0 at the middle of the track and positive to the right. Force F pushes the
// cart, positive to the right. Units: metres, kilograms, seconds, radians, newtons.
//
// Physics: the standard cart-pole equations (Barto, Sutton & Anderson 1983, with Florian's
// 2007 correction), stepped with 4th-order Runge-Kutta.

export const G = 9.81
export const CART_MASS = 1.0
export const POLE_MASS = 0.2
export const HALF_LENGTH = 0.6 // pivot to the stick's centre of mass; the stick is 1.2 m long
export const TRACK_HALF = 2.4 // the track runs from -2.4 m to +2.4 m
export const MAX_FORCE = 30 // the motor can't push harder than this
export const FALL_ANGLE = (60 * Math.PI) / 180
// Friction is treated as negligible. The one imperfection kept is motor lag: a real motor
// takes a moment to deliver the force it is asked for, which is what makes D necessary.
export const MOTOR_LAG = 0.05 // seconds

const TOTAL = CART_MASS + POLE_MASS

// Time derivatives of [x, v, theta, omega] under cart force F and wind force W on the stick.
function derivs([, v, th, om], F, W) {
  const s = Math.sin(th)
  const c = Math.cos(th)
  // From the Lagrangian of a uniform stick on a cart, with wind W as a sideways force at the
  // stick's centre (it acts on the whole system, and as a torque W * l * cos(theta) on the stick).
  const temp = (F + W + POLE_MASS * HALF_LENGTH * om * om * s) / TOTAL
  const alpha = (G * s - c * temp + (W * c) / POLE_MASS) / (HALF_LENGTH * (4 / 3 - (POLE_MASS * c * c) / TOTAL))
  const acc = temp - (POLE_MASS * HALF_LENGTH * alpha * c) / TOTAL
  return [v, acc, om, alpha]
}

function rk4(state, F, W, dt) {
  const add = (a, b, k) => a.map((x, i) => x + b[i] * k)
  const k1 = derivs(state, F, W)
  const k2 = derivs(add(state, k1, dt / 2), F, W)
  const k3 = derivs(add(state, k2, dt / 2), F, W)
  const k4 = derivs(add(state, k3, dt), F, W)
  return state.map((x, i) => x + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
}

// ---------- the controller: two PID loops, one inside the other ----------
// Stick loop (inner, fast): P and D on the stick's angle decide how hard to push the cart.
// Cart loop (outer, slow): P, I and D on the cart's position decide which way the stick
// should lean. To drive the cart somewhere you must first let the stick lean that way, and
// a steady lean to the right needs the cart to keep accelerating right. So when the cart is
// right of its target, the cart loop asks for a lean to the left, and vice versa.
// The cart loop is off while its P, I and D are all zero; then the cart is free to drift.
//
// Why no I in the stick loop: against a steady push like wind, the stick *has* to lean into
// it to stay up, so the error that never goes away is the cart's position, not the angle.
// That's where the I term belongs.

export const MAX_LEAN = (12 * Math.PI) / 180 // the cart loop never asks for more lean than this

export class Controller {
  constructor(gains) {
    this.set(gains)
    this.reset()
  }

  set({ kp = 0, kd = 0, xp = 0, xi = 0, xd = 0 } = {}) {
    Object.assign(this, { kp, kd, xp, xi, xd })
  }

  reset() {
    this.posIntegral = 0
  }

  get cartLoopOn() {
    return this.xp !== 0 || this.xi !== 0 || this.xd !== 0
  }

  // Returns { force, targetAngle, saturated } for the current state.
  update({ x, v, theta, omega }, targetX, dt) {
    let targetAngle = 0
    if (this.cartLoopOn) {
      const err = x - targetX
      const trial = this.posIntegral + err * dt
      const want = -(this.xp * err + this.xi * trial + this.xd * v) // D acts on the measured speed
      // Anti-windup: stop adding up error while the lean request is already at its limit.
      if (Math.abs(want) < MAX_LEAN) this.posIntegral = trial
      const lean = -(this.xp * err + this.xi * this.posIntegral + this.xd * v)
      targetAngle = Math.max(-MAX_LEAN, Math.min(MAX_LEAN, lean))
    }
    const unclamped = this.kp * (theta - targetAngle) + this.kd * omega
    return {
      force: Math.max(-MAX_FORCE, Math.min(MAX_FORCE, unclamped)),
      targetAngle,
      saturated: Math.abs(unclamped) > MAX_FORCE,
    }
  }
}

// ---------- the simulation ----------

export class CartPole {
  constructor(gains, { startAngle = (4 * Math.PI) / 180 } = {}) {
    this.controller = new Controller(gains)
    this.reset(startAngle)
  }

  reset(startAngle = (4 * Math.PI) / 180) {
    this.x = 0
    this.v = 0
    this.theta = startAngle
    this.omega = 0
    this.time = 0
    this.balanced = 0 // seconds since the last reset, while still up
    this.force = 0 // what the motor is actually pushing
    this.command = 0 // what the controller asked for
    this.targetAngle = 0
    this.targetX = 0
    this.wind = 0
    this.status = 'balancing' // 'balancing' | 'fell' | 'wall'
    this.controller.reset()
    this.saturatedTime = 0
    this.crossings = [] // times the stick swung through its target angle
    this.peaks = [] // largest lean between crossings, in radians
    this.peak = 0
    this.lastSide = Math.sign(startAngle)
    this.pendingKick = 0
  }

  // A sideways shove on the top of the stick, in rad/s of spin.
  push(spin) {
    if (this.status === 'balancing') this.omega += spin
  }

  step(dt) {
    if (this.status !== 'balancing') return
    const { force, targetAngle, saturated } = this.controller.update(this, this.targetX, dt)
    this.command = force
    // Real motors take a moment to deliver what they're asked for.
    this.force += (force - this.force) * Math.min(1, dt / MOTOR_LAG)
    this.targetAngle = targetAngle
    if (saturated) this.saturatedTime += dt
    const [x, v, theta, omega] = rk4([this.x, this.v, this.theta, this.omega], this.force, this.wind, dt)
    Object.assign(this, { x, v, theta, omega })
    this.time += dt
    this.balanced += dt

    // Swing tracking, used to explain a fall.
    const side = Math.sign(this.theta - targetAngle)
    this.peak = Math.max(this.peak, Math.abs(this.theta - targetAngle))
    if (side !== 0 && side !== this.lastSide) {
      this.crossings.push(this.time)
      this.peaks.push(this.peak)
      if (this.peaks.length > 12) this.peaks.shift()
      if (this.crossings.length > 40) this.crossings.shift()
      this.peak = 0
      this.lastSide = side
    }

    if (Math.abs(this.x) >= TRACK_HALF) {
      this.x = Math.sign(this.x) * TRACK_HALF
      this.v = 0
      this.status = 'wall'
    } else if (Math.abs(this.theta) >= FALL_ANGLE) {
      this.status = 'fell'
    }
  }

  // Runs for `seconds` in small fixed steps (more accurate than one big step).
  advance(seconds, h = 1 / 480) {
    let left = seconds
    while (left > 1e-9 && this.status === 'balancing') {
      const dt = Math.min(h, left)
      this.step(dt)
      left -= dt
    }
  }

  // A plain-English reason for the last fall, for the coaching message.
  diagnosis() {
    const { kp, kd, xp, xd, cartLoopOn } = this.controller
    if (this.status === 'wall') {
      if (!cartLoopOn) return "The stick stayed up, but the cart drifted off the end of the track. The stick loop only cares about the angle, not where the cart is. Turn up the cart loop's P."
      if (xd < xp * 0.8) return "The stick stayed up, but the cart overshot its target and hit the end. Add cart D to slow it down as it gets close."
      return 'The stick stayed up, but the cart ran off the end of the track. Try a gentler cart loop (lower P and I).'
    }
    if (this.status !== 'fell') return ''
    const recentSwings = this.crossings.filter((t) => t > this.time - 4).length
    const growing = this.peaks.length >= 3 && this.peaks.at(-1) > this.peaks.at(-3) * 1.15
    if (kp < 12) return 'Not enough P: the cart never pushes hard enough to get back under the stick. Raise the stick P.'
    if (recentSwings >= 3 && (growing || kd < 3)) return 'It wobbled back and forth, more and more each time. Add stick D to damp the wobble, or lower stick P.'
    if (this.saturatedTime > this.balanced * 0.3) return 'The motor was maxed out. Either the push was too big to recover from, or the gains are asking for more than the motor can give.'
    if (recentSwings >= 3) return 'It wobbled too much. Try a bit more stick D.'
    return 'It fell over. Try more stick P to react harder, with some D to keep it from overshooting.'
  }
}

// Presets that each show one lesson. Each was checked in Node.
export const PRESETS = [
  { id: 'weak', label: 'Too weak', gains: { kp: 8, kd: 0, xp: 0, xi: 0, xd: 0 } },
  { id: 'p-only', label: 'P only', gains: { kp: 40, kd: 0, xp: 0, xi: 0, xd: 0 } },
  { id: 'pd', label: 'Stick PD', gains: { kp: 40, kd: 7, xp: 0, xi: 0, xd: 0 } },
  { id: 'cart-pd', label: '+ Cart PD', gains: { kp: 40, kd: 7, xp: 0.06, xi: 0, xd: 0.1 } },
  { id: 'tuned', label: 'Full PID', gains: { kp: 40, kd: 7, xp: 0.06, xi: 0.01, xd: 0.1 } },
]

// Slider ranges for the UI.
export const RANGES = {
  kp: { min: 0, max: 100, step: 1 },
  kd: { min: 0, max: 20, step: 0.5 },
  xp: { min: 0, max: 0.2, step: 0.01 },
  xi: { min: 0, max: 0.05, step: 0.005 },
  xd: { min: 0, max: 0.3, step: 0.01 },
}
export const MAX_WIND = 0.25 // newtons
