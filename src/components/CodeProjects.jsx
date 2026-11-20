import { Link } from 'react-router-dom'
import { codeProjects } from '../features/codeProjects.js'

// Full-stack and backend projects with links to their code.
export default function CodeProjects({ compact = false }) {
  return (
    <div className="code-grid">
      {codeProjects.map((p) => (
        <article key={p.name} className="code-card">
          <div className="card-top">
            <h3>{p.name}</h3>
            {p.award && <span className="award">{p.award}</span>}
          </div>
          <p className="code-tagline">{p.tagline}</p>
          {!compact && (
            <ul className="code-points">
              {p.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>
          )}
          <div className="tags">{p.stack.map((s) => <span key={s} className="tag">{s}</span>)}</div>
          <div className="code-links">
            <a href={p.repo} target="_blank" rel="noopener noreferrer">Code on GitHub ↗</a>
            {p.demo && <Link to={`/features/${p.demo}`}>Live demo →</Link>}
          </div>
        </article>
      ))}
    </div>
  )
}
