import { RECOGNITION } from '../links.js'

// Awards and results as a row of stat tiles.
export default function Recognition() {
  return (
    <ul className="recognition" aria-label="Awards and results">
      {RECOGNITION.map((r) => (
        <li key={r.label}>
          <strong>{r.value}</strong>
          <span className="rec-label">{r.label}</span>
        </li>
      ))}
    </ul>
  )
}
