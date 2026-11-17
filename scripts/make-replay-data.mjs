// Cuts a window out of the LOBSTER sample files from hft-simulator and writes it as compact
// JSON for the Order Book Replay demo. It also works out where the replayed book drifts away
// from the exchange's 10-level snapshots and stores those snapshot rows as "repairs", so the
// browser never needs the 34 MB orderbook file. Afterwards it checks that, with the repairs,
// the top 10 levels match the snapshot after every single message.
//
// usage:
//   node scripts/make-replay-data.mjs <messages.csv> <orderbook.csv> <startRow> <count> <out.json>
//   node scripts/make-replay-data.mjs <messages.csv> <orderbook.csv> --scan <count>
import fs from 'node:fs'
import { BID, ASK, Simulator, FILL_MODELS } from '../src/features/OrderBookReplay/engine.js'

const [msgPath, obPath, a3, a4, outPath] = process.argv.slice(2)
if (!msgPath || !obPath || !a3) {
  console.error('usage: node scripts/make-replay-data.mjs <messages.csv> <orderbook.csv> <startRow> <count> <out.json>')
  process.exit(1)
}

const parseNanos = (s) => {
  const [sec, frac = ''] = s.trim().split('.')
  return Number(sec) * 1e9 + Number((frac + '000000000').slice(0, 9))
}
const msgLines = fs.readFileSync(msgPath, 'utf8').trim().split(/\r?\n/)
const obLines = fs.readFileSync(obPath, 'utf8').trim().split(/\r?\n/)
const parseMsg = (line) => {
  const f = line.split(',')
  return { t: parseNanos(f[0]), type: +f[1], id: +f[2], size: +f[3], price: +f[4], side: +f[5] === 1 ? BID : ASK }
}
const parseRow = (line) => {
  const v = line.split(',').map(Number)
  const rows = []
  for (let i = 0; i < v.length; i += 4) rows.push(v.slice(i, i + 4))
  return rows
}
const matches = (book, row) =>
  row.every(([ap, as, bp, bs], i) => {
    const a = book.levelAt(ASK, i + 1)
    const b = book.levelAt(BID, i + 1)
    const askOk = as === 0 ? !a : a && a[0] === ap && a[1] === as
    const bidOk = bs === 0 ? !b : b && b[0] === bp && b[1] === bs
    return askOk && bidOk
  })

// Row `start` seeds the book; messages start+1 .. start+count are replayed (as in the Java code).
function buildWindow(start, count) {
  const data = {
    seed: parseRow(obLines[start]),
    messages: msgLines.slice(start + 1, start + 1 + count).map(parseMsg),
    repairs: {},
  }
  const sim = new Simulator(data, { model: 'naive', strict: false })
  while (!sim.done) {
    sim.stepChecked((s) => {
      const i = s.cursor - 1
      const row = parseRow(obLines[start + 1 + i])
      if (!matches(s.book, row)) {
        s.book.repair(row)
        data.repairs[i] = row
        if (!matches(s.book, row)) throw new Error(`repair failed at message ${i}`)
      }
    })
  }
  // Replay again from scratch with the repairs baked in and check every message.
  const check = new Simulator(data, { model: 'naive', strict: false })
  while (!check.done) {
    check.step()
    if (!matches(check.book, parseRow(obLines[start + check.cursor]))) throw new Error(`mismatch at message ${check.cursor - 1}`)
  }
  return data
}

function summarize(data) {
  const out = {}
  for (const model of Object.keys(FILL_MODELS)) {
    const s = new Simulator(data, { model, strict: false })
    while (!s.done) s.step()
    out[model] = { fills: s.fillCount, profit: +(s.profitTicks / 1e4).toFixed(2), position: s.position }
  }
  return out
}

if (a3 === '--scan') {
  const count = Number(a4)
  for (let start = 0; start + count < msgLines.length; start += 5000) {
    const data = buildWindow(start, count)
    const mins = (data.messages.at(-1).t - data.messages[0].t) / 6e10
    const res = summarize(data)
    console.log(start, `${mins.toFixed(1)} min`, `${Object.keys(data.repairs).length} repairs`,
      Object.entries(res).map(([m, r]) => `${m} ${r.fills}f $${r.profit}`).join(' | '))
  }
} else {
  const start = Number(a3)
  const count = Number(a4)
  const data = buildWindow(start, count)
  const t0 = data.messages[0].t
  // Compact form: times as offsets from t0, one array per message, flattened snapshot rows.
  const compact = {
    source: 'LOBSTER sample, GOOG, 2012-06-21 (lobsterdata.com)',
    startRow: start,
    t0,
    seed: data.seed.flat(),
    messages: data.messages.map((m) => [m.t - t0, m.type, m.id, m.size, m.price, m.side]),
    repairs: Object.fromEntries(Object.entries(data.repairs).map(([i, row]) => [i, row.flat()])),
  }
  fs.writeFileSync(outPath, JSON.stringify(compact))
  console.log(`wrote ${outPath}: ${count} messages, ${Object.keys(data.repairs).length} repairs, ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB`)
  console.log(summarize(data))
}
