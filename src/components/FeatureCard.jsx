import { Link } from 'react-router-dom'

// A "quote card" for one build: symbol and tags, name, summary.
export default function FeatureCard({ feature }) {
  return (
    <Link to={`/features/${feature.slug}`} className="card">
      <div className="card-top">
        <span className="sym">{feature.ticker}</span>
        {feature.tags && (
          <span className="tags">{feature.tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
        )}
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.summary}</p>
      <span className="card-go" aria-hidden="true">OPEN DEMO →</span>
    </Link>
  )
}
