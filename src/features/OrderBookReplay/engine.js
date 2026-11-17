// A JavaScript port of the core of hft-simulator (github.com/antiqstav/hft-simulator):
// the replay order book, the four queue fill models, the market-making strategy and
// the latency-aware simulator loop. It follows the Java code step for step so the
// browser demo produces the same fills and profit as the Java ExperimentRunner.
//
// Prices are integer ticks (dollars x 10,000) and times are nanoseconds after midnight,
// both of which fit exactly in a JavaScript number.

export const BID = 1
export const ASK = -1

// LOBSTER event codes
export const NEW = 1
export const PARTIAL_CANCEL = 2
export const DELETE = 3
export const EXECUTE_VISIBLE = 4
export const EXECUTE_HIDDEN = 5
export const HALT = 7

export const APPLIED = 'applied'
export const FALLBACK = 'fallback'
export const UNRESOLVED = 'unresolved'

// ---------- order book ----------

class PriceLevel {
  constructor() {
    this.orders = [] // FIFO queue of { id, price, qty, side }
    this.total = 0
  }

  add(o) {
    this.orders.push(o)
    this.total += o.qty
  }

  // Takes shares from the front order, like PriceLevel.fill in Java.
  fill(qty) {
    const front = this.orders[0]
    if (!front) throw new Error('Price level already empty.')
    if (qty <= 0 || qty > front.qty) throw new Error('Negative quantity leftover.')
    front.qty -= qty
    this.total -= qty
    if (front.qty === 0) this.orders.shift()
  }

  reduce(o, newQty) {
    if (newQty <= 0 || newQty > o.qty) throw new Error(`Attempted to reduce to ${newQty} from ${o.qty}`)
    this.total -= o.qty - newQty
    o.qty = newQty
  }

  remove(o) {
    const i = this.orders.indexOf(o)
    if (i === -1) return false
    this.orders.splice(i, 1)
    this.total -= o.qty
    return true
  }

  get empty() {
    return this.orders.length === 0
  }
}

// Inserts or removes a price in an array kept sorted best-first.
function insertSorted(arr, price, better) {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (better(arr[mid], price)) lo = mid + 1
    else hi = mid
  }
  arr.splice(lo, 0, price)
}

export class OrderBook {
  // strict: throw when a message disagrees with the book, as the Java code does.
  // Lenient mode (used by the browser demo) absorbs the disagreement instead.
  constructor({ strict = true } = {}) {
    this.strict = strict
    this.levels = { [BID]: new Map(), [ASK]: new Map() }
    this.prices = { [BID]: [], [ASK]: [] } // best first: bids high to low, asks low to high
    this.index = new Map()
    this.nextSyntheticId = -1 // made-up orders get negative ids so they never collide with real ones
  }

  levelFor(side, price) {
    return this.levels[side].get(price)
  }

  getOrCreate(side, price) {
    let pl = this.levels[side].get(price)
    if (!pl) {
      pl = new PriceLevel()
      this.levels[side].set(price, pl)
      insertSorted(this.prices[side], price, side === BID ? (a, b) => a > b : (a, b) => a < b)
    }
    return pl
  }

  dropLevel(side, price) {
    this.levels[side].delete(price)
    const arr = this.prices[side]
    arr.splice(arr.indexOf(price), 1)
  }

  // Seeds the book from one LOBSTER orderbook row: [askP, askS, bidP, bidS] per level.
  // Each occupied level becomes one synthetic order with a negative id.
  seed(row) {
    for (const [askP, askS, bidP, bidS] of row) {
      if (askS > 0) this.applyRest({ id: this.nextSyntheticId--, price: askP, qty: askS, side: ASK })
      if (bidS > 0) this.applyRest({ id: this.nextSyntheticId--, price: bidP, qty: bidS, side: BID })
    }
  }

  // Demo-only addition (not in the Java project): makes the top levels match an exchange
  // snapshot row again. The LOBSTER file only records 10 levels, so when a level empties,
  // the 11th slides into view with orders this book never saw. Repair adds the missing
  // shares as a synthetic order at the back of the queue, trims extra shares from the back,
  // and drops levels the snapshot says are empty. Orders the book already knows keep their
  // place in line. Returns the number of levels it changed.
  repair(row) {
    let changed = 0
    for (const side of [ASK, BID]) {
      const snap = row.map((r) => (side === ASK ? [r[0], r[1]] : [r[2], r[3]])).filter(([, s]) => s > 0)
      const snapPrices = new Set(snap.map(([p]) => p))
      const full = snap.length === row.length
      const worst = snap.length ? snap[snap.length - 1][0] : null
      const inRange = (p) => worst === null || !full || (side === BID ? p >= worst : p <= worst)

      for (const p of [...this.prices[side]]) {
        if (inRange(p) && !snapPrices.has(p)) {
          for (const o of this.levels[side].get(p).orders) this.index.delete(o.id)
          this.dropLevel(side, p)
          changed++
        }
      }
      for (const [p, size] of snap) {
        const pl = this.getOrCreate(side, p)
        let diff = size - pl.total
        if (diff === 0) continue
        changed++
        if (diff > 0) {
          const o = { id: this.nextSyntheticId--, price: p, qty: diff, side }
          pl.add(o)
          this.index.set(o.id, o)
        } else {
          for (let i = pl.orders.length - 1; i >= 0 && diff < 0; i--) {
            const o = pl.orders[i]
            const take = Math.min(-diff, o.qty)
            diff += take
            if (take === o.qty) {
              pl.remove(o)
              this.index.delete(o.id)
            } else {
              pl.reduce(o, o.qty - take)
            }
          }
        }
      }
    }
    return changed
  }

  cancel(id) {
    const o = this.index.get(id)
    if (!o) return false
    const pl = this.levelFor(o.side, o.price)
    if (pl) {
      pl.remove(o)
      if (pl.empty) this.dropLevel(o.side, o.price)
    }
    this.index.delete(id)
    return true
  }

  // event 1
  applyRest(o) {
    if (this.index.has(o.id)) {
      if (this.strict) throw new Error(`Duplicated order ID of ${o.id}`)
      this.cancel(o.id)
    }
    this.getOrCreate(o.side, o.price).add(o)
    this.index.set(o.id, o)
    return APPLIED
  }

  // events 2 and 4
  applyReduce(id, qty, side, price) {
    if (qty <= 0) throw new Error(`Reduce amount must be positive ${qty}`)
    const o = this.index.get(id)
    if (!o) return this.fallback(qty, side, price)
    if (o.side !== side || o.price !== price) {
      if (this.strict) throw new Error(`Order ${id} is ${o.side} @ ${o.price}, message says ${side} @ ${price}`)
      return this.fallback(qty, side, price)
    }
    if (o.qty < qty && !this.strict) {
      // An earlier fallback took shares from this order by mistake: remove it, take the rest from the front.
      const extra = qty - o.qty
      this.cancel(id)
      this.fallback(extra, side, price)
      return FALLBACK
    }
    if (o.qty > qty) {
      this.levelFor(o.side, o.price).reduce(o, o.qty - qty)
      return APPLIED
    }
    if (o.qty === qty) {
      this.cancel(id)
      return APPLIED
    }
    throw new Error(`Order ${id} has ${o.qty} but message removes ${qty}`)
  }

  // event 3
  applyDelete(id, qty, side, price) {
    const o = this.index.get(id)
    if (!o) return this.fallback(qty, side, price)
    if (o.side !== side || o.price !== price) {
      if (this.strict) throw new Error(`Order ${id} is ${o.side} @ ${o.price}, message says ${side} @ ${price}`)
      return this.fallback(qty, side, price)
    }
    this.cancel(id)
    return APPLIED
  }

  // For ids the book never saw (orders resting before the window): take shares from the front.
  fallback(qty, side, price) {
    const pl = this.levelFor(side, price)
    if (!pl || pl.total < qty) return UNRESOLVED
    let remaining = qty
    while (remaining > 0) {
      const front = pl.orders[0]
      const take = Math.min(remaining, front.qty)
      const frontId = front.id
      pl.fill(take)
      if (front.qty === 0) this.index.delete(frontId)
      remaining -= take
    }
    if (pl.empty) this.dropLevel(side, price)
    return FALLBACK
  }

  // [price, totalQty] of the k-th best level (1-based), or null.
  levelAt(side, k) {
    const price = this.prices[side][k - 1]
    if (price === undefined) return null
    return [price, this.levels[side].get(price).total]
  }

  checkInvariants() {
    let inLevels = 0
    for (const side of [BID, ASK]) {
      for (const [price, pl] of this.levels[side]) {
        if (pl.empty) throw new Error(`Empty level at ${price}`)
        let sum = 0
        for (const o of pl.orders) {
          if (o.qty <= 0) throw new Error(`Bad quantity on order ${o.id}`)
          sum += o.qty
          inLevels++
        }
        if (sum !== pl.total) throw new Error(`Total drift at ${price}`)
      }
    }
    if (inLevels !== this.index.size) throw new Error(`Index has ${this.index.size} orders, levels have ${inLevels}`)
    const b = this.prices[BID][0]
    const a = this.prices[ASK][0]
    if (b !== undefined && a !== undefined && b >= a) throw new Error('Crossed book')
  }
}

// ---------- fill models ----------
// Each one tracks a "shadow" order that lives outside the real book and decides how many
// shares of each recorded execution would have reached it.

class NaiveOrder {
  constructor(side, price, size) {
    Object.assign(this, { side, price, remaining: size, filled: 0, arrived: false })
  }
  onArrival() {
    this.arrived = true
  }
  onMessage(m) {
    if (!this.arrived) return 0
    if (m.type === EXECUTE_VISIBLE && m.side === this.side && m.price === this.price) {
      const fill = Math.min(m.size, this.remaining)
      this.filled += fill
      this.remaining -= fill
      return fill
    }
    return 0
  }
  aheadQty() {
    return null // naive ignores the queue
  }
}

class PessimisticOrder {
  constructor(side, price, size) {
    if (size <= 0) throw new Error(`size must be positive: ${size}`)
    Object.assign(this, { side, price, remaining: size, filled: 0, ahead: 0, arrived: false })
  }
  onArrival(level) {
    this.arrived = true
    this.ahead = level ? level.total : 0
  }
  onMessage(m) {
    if (!this.arrived) return 0
    if (m.type !== EXECUTE_VISIBLE || m.side !== this.side || m.price !== this.price) return 0
    const consumedAhead = Math.min(m.size, this.ahead)
    this.ahead -= consumedAhead
    const fill = Math.min(m.size - consumedAhead, this.remaining)
    this.filled += fill
    this.remaining -= fill
    return fill
  }
  aheadQty() {
    return this.ahead
  }
}

class OptimisticOrder {
  constructor(side, price, size) {
    if (size <= 0) throw new Error(`size must be positive: ${size}`)
    Object.assign(this, { side, price, remaining: size, filled: 0, ahead: 0, arrived: false })
  }
  onArrival(level) {
    this.ahead = level ? level.total : 0
    this.arrived = true
  }
  onMessage(m) {
    if (!this.arrived || m.side !== this.side || m.price !== this.price) return 0
    if (m.type === PARTIAL_CANCEL || m.type === DELETE) {
      this.ahead -= Math.min(m.size, this.ahead) // assume every cancel was ahead of us
      return 0
    }
    if (m.type !== EXECUTE_VISIBLE) return 0
    const consumedAhead = Math.min(m.size, this.ahead)
    this.ahead -= consumedAhead
    const fill = Math.min(m.size - consumedAhead, this.remaining)
    this.filled += fill
    this.remaining -= fill
    return fill
  }
  aheadQty() {
    return this.ahead
  }
}

class IdBasedOrder {
  constructor(side, price, size) {
    if (size <= 0) throw new Error(`size must be positive: ${size}`)
    Object.assign(this, { side, price, remaining: size, filled: 0, arrived: false })
    this.ahead = new Map() // queue order: id -> shares left
    this.behind = new Set() // ids that arrived after us
    this.anomalies = 0
    this.unknownCancels = 0
    this.unknownExecutions = 0
  }
  onArrival(level) {
    this.ahead.clear()
    this.behind.clear()
    if (level) for (const o of level.orders) this.ahead.set(o.id, o.qty)
    this.arrived = true
  }
  onMessage(m) {
    if (!this.arrived || m.side !== this.side || m.price !== this.price) return 0
    const { id, size } = m
    switch (m.type) {
      case NEW:
        this.behind.add(id)
        return 0
      case PARTIAL_CANCEL:
        if (this.ahead.has(id)) {
          const left = this.ahead.get(id) - size
          if (left > 0) this.ahead.set(id, left)
          else this.ahead.delete(id)
        } else if (!this.behind.has(id)) {
          this.unknownCancels++
        }
        return 0
      case DELETE:
        if (!this.ahead.delete(id) && !this.behind.has(id)) this.unknownCancels++
        return 0
      case EXECUTE_VISIBLE:
        return this.execute(id, size)
      default:
        return 0
    }
  }
  execute(id, size) {
    let toYou = 0
    if (this.ahead.has(id)) {
      const have = this.ahead.get(id)
      if (id !== this.ahead.keys().next().value) this.anomalies++ // skipped the line
      if (size > have) this.anomalies++
      if (size >= have) this.ahead.delete(id)
      else this.ahead.set(id, have - size)
    } else if (this.ahead.size === 0) {
      toYou = size // we are at the front
      if (!this.behind.has(id)) this.unknownExecutions++
    } else if (this.behind.has(id)) {
      this.anomalies++
    } else {
      this.unknownExecutions++
      toYou = this.drainFront(size)
    }
    const fill = Math.min(toYou, this.remaining)
    this.filled += fill
    this.remaining -= fill
    return fill
  }
  drainFront(amount) {
    for (const [id, qty] of this.ahead) {
      if (amount <= 0) break
      const take = Math.min(amount, qty)
      amount -= take
      if (take === qty) this.ahead.delete(id)
      else this.ahead.set(id, qty - take)
    }
    return amount
  }
  aheadQty() {
    let sum = 0
    for (const q of this.ahead.values()) sum += q
    return sum
  }
}

export const FILL_MODELS = {
  naive: NaiveOrder,
  pessimistic: PessimisticOrder,
  optimistic: OptimisticOrder,
  idbased: IdBasedOrder,
}

// ---------- strategy ----------
// Quotes one bid at the best bid and one ask at the best ask, with an inventory limit.

export class MarketMakerStrategy {
  constructor(quoteSize = 100, inventoryLimit = 300) {
    if (quoteSize <= 0) throw new Error(`quoteSize must be positive: ${quoteSize}`)
    if (inventoryLimit < quoteSize) throw new Error('inventoryLimit must be at least quoteSize')
    this.quoteSize = quoteSize
    this.inventoryLimit = inventoryLimit
    this.nextId = 0
    this.bid = { id: -1, price: 0 }
    this.ask = { id: -1, price: 0 }
    this.cancelling = new Set()
  }

  onUpdate(view) {
    const open = new Map(view.openOrders.map((o) => [o.id, o]))
    if (this.bid.id !== -1 && !open.has(this.bid.id)) this.bid.id = -1
    if (this.ask.id !== -1 && !open.has(this.ask.id)) this.ask.id = -1
    for (const id of this.cancelling) if (!open.has(id)) this.cancelling.delete(id)

    const bidBlocked = view.position + this.quoteSize > this.inventoryLimit
    const askBlocked = view.position - this.quoteSize < -this.inventoryLimit

    const out = []
    this.manage(this.bid, BID, view.bidSize > 0 && !bidBlocked, view.bidPrice, view, out)
    this.manage(this.ask, ASK, view.askSize > 0 && !askBlocked, view.askPrice, view, out)
    return out
  }

  manage(q, side, usable, target, view, out) {
    if (!usable) {
      this.cancelQuote(q, side, out)
      return
    }
    if (q.id !== -1 && q.price === target) return
    this.cancelQuote(q, side, out)
    for (const o of view.openOrders) {
      if (this.cancelling.has(o.id) && o.side === side && o.price === target) return
    }
    const id = this.nextId++
    q.id = id
    q.price = target
    out.push({ id, type: 'place', side, price: target, size: this.quoteSize })
  }

  cancelQuote(q, side, out) {
    if (q.id === -1) return
    if (!this.cancelling.has(q.id)) {
      this.cancelling.add(q.id)
      out.push({ id: q.id, type: 'cancel', side, price: q.price, size: 0 })
    }
    q.id = -1
  }
}

// ---------- simulator ----------

export class Simulator {
  // data: {
  //   seed: [[askP, askS, bidP, bidS], ...]           first snapshot row, one entry per level
  //   messages: [{ t, type, id, size, price, side }]   the recorded LOBSTER messages
  //   repairs: { [messageIndex]: snapshotRow }         optional, demo only (see OrderBook.repair)
  // }
  constructor(data, { model = 'pessimistic', latencyNanos = 0, quoteSize = 100, inventoryLimit = 300, strict = true } = {}) {
    if (!FILL_MODELS[model]) throw new Error(`Unknown fill model ${model}`)
    if (latencyNanos < 0) throw new Error('latencyNanos must be >= 0')
    this.data = data
    this.Model = FILL_MODELS[model]
    this.latencyNanos = latencyNanos
    this.strategy = new MarketMakerStrategy(quoteSize, inventoryLimit)
    this.book = new OrderBook({ strict })
    this.book.seed(data.seed)
    this.repairs = 0
    this.live = new Map() // id -> { id, side, price, model }
    this.pending = [] // { action, arrival } in send order
    this.cursor = 0
    this.time = data.messages.length ? data.messages[0].t : 0
    this.position = 0
    this.cash = 0
    this.sharesBought = 0
    this.sharesSold = 0
    this.spentTicks = 0
    this.receivedTicks = 0
    this.lastMid = NaN
    this.fillCount = 0
    this.sharesTraded = 0
    this.ordersPlaced = 0
    this.ordersCancelled = 0
    this.status = { [APPLIED]: 0, [FALLBACK]: 0, [UNRESOLVED]: 0 }
  }

  get done() {
    return this.cursor >= this.data.messages.length
  }

  // Applies the next recorded message. Returns { message, fills: [{ side, price, qty }], repaired } or null.
  step() {
    return this.stepChecked(null)
  }

  // Like step(), but lets a caller check the book between applying a message and the
  // strategy reacting to it (the Java simulator validates there). Returns false to stop.
  stepChecked(check) {
    if (this.done) return null
    const i = this.cursor++
    const m = this.data.messages[i]
    this.time = m.t
    while (this.pending.length && this.pending[0].arrival < m.t) this.activate(this.pending.shift())
    this.applyToBook(m)
    const row = this.data.repairs?.[i]
    const repaired = row ? this.book.repair(row) > 0 : false
    if (repaired) this.repairs++
    const fills = this.distributeFills(m)
    if (check && check(this) === false) return false
    const actions = this.strategy.onUpdate(this.view(m.t))
    for (const a of actions) this.schedule(a, m.t)
    return { message: m, fills, repaired }
  }

  applyToBook(m) {
    const b = this.book
    switch (m.type) {
      case NEW:
        this.status[b.applyRest({ id: m.id, price: m.price, qty: m.size, side: m.side })]++
        break
      case PARTIAL_CANCEL:
      case EXECUTE_VISIBLE:
        this.status[b.applyReduce(m.id, m.size, m.side, m.price)]++
        break
      case DELETE:
        this.status[b.applyDelete(m.id, m.size, m.side, m.price)]++
        break
      case EXECUTE_HIDDEN:
      case HALT:
        break
      default:
        throw new Error(`Unhandled event type ${m.type}`)
    }
  }

  schedule(a, decisionTime) {
    if (a.type === 'place') {
      if (a.size <= 0) throw new Error(`PLACE with non-positive size: id ${a.id}`)
      if (a.price <= 0) throw new Error(`PLACE with non-positive price: id ${a.id}`)
      this.ordersPlaced++
    }
    this.pending.push({ action: a, arrival: decisionTime + this.latencyNanos })
  }

  activate({ action: a }) {
    if (a.type === 'cancel') {
      if (this.live.delete(a.id)) this.ordersCancelled++
      return
    }
    if (this.live.has(a.id)) throw new Error(`duplicate live order id ${a.id}`)
    for (const o of this.live.values()) {
      if (o.side === a.side && o.price === a.price) throw new Error(`two live orders at ${a.side} ${a.price} are not supported`)
    }
    const model = new this.Model(a.side, a.price, a.size)
    model.onArrival(this.book.levelFor(a.side, a.price))
    this.live.set(a.id, { id: a.id, side: a.side, price: a.price, model })
  }

  distributeFills(m) {
    const fills = []
    for (const [id, o] of this.live) {
      const fill = o.model.onMessage(m)
      if (fill > 0) {
        this.fillCount++
        this.sharesTraded += fill
        if (o.side === BID) {
          this.position += fill
          this.cash -= o.price * fill
          this.sharesBought += fill
          this.spentTicks += o.price * fill
        } else {
          this.position -= fill
          this.cash += o.price * fill
          this.sharesSold += fill
          this.receivedTicks += o.price * fill
        }
        fills.push({ side: o.side, price: o.price, qty: fill })
      }
      if (o.model.remaining === 0) this.live.delete(id)
    }
    return fills
  }

  view(t) {
    const bid = this.book.levelAt(BID, 1)
    const ask = this.book.levelAt(ASK, 1)
    const openOrders = []
    for (const o of this.live.values()) openOrders.push({ id: o.id, side: o.side, price: o.price, qty: o.model.remaining })
    for (const p of this.pending) {
      const a = p.action
      if (a.type === 'place') openOrders.push({ id: a.id, side: a.side, price: a.price, qty: a.size })
    }
    const v = {
      t,
      bidPrice: bid ? bid[0] : 0,
      bidSize: bid ? bid[1] : 0,
      askPrice: ask ? ask[0] : 0,
      askSize: ask ? ask[1] : 0,
      position: this.position,
      openOrders,
    }
    if (v.bidSize > 0 && v.askSize > 0) this.lastMid = (v.bidPrice + v.askPrice) / 2
    return v
  }

  // Our resting quotes and pending (in-flight) orders, for drawing on the ladder.
  quotes() {
    const out = []
    for (const o of this.live.values()) out.push({ side: o.side, price: o.price, qty: o.model.remaining, ahead: o.model.aheadQty(), state: 'resting' })
    for (const p of this.pending) {
      const a = p.action
      if (a.type === 'place') out.push({ side: a.side, price: a.price, qty: a.size, ahead: null, state: 'in flight' })
    }
    return out
  }

  // Profit in ticks, marking any open position at the last midprice.
  get profitTicks() {
    if (this.position !== 0 && Number.isNaN(this.lastMid)) return NaN
    return this.cash + (this.position === 0 ? 0 : this.position * this.lastMid)
  }

  get realizedTicks() {
    if (this.sharesBought === 0 || this.sharesSold === 0) return 0
    const avgBuy = this.spentTicks / this.sharesBought
    const avgSell = this.receivedTicks / this.sharesSold
    return (avgSell - avgBuy) * Math.min(this.sharesBought, this.sharesSold)
  }

  get unrealizedTicks() {
    return this.profitTicks - this.realizedTicks
  }
}

export const ticksToDollars = (ticks) => ticks / 10_000
