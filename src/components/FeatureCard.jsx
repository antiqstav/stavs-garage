import { Link } from 'react-router-dom'

// The "Part No." label and punched hole on each card are drawn in App.css.
export default function FeatureCard({ feature }) {
  return (
    <Link to={`/features/${feature.slug}`} className="card">
      <h3>{feature.title}</h3>
      <p>{feature.summary}</p>
    </Link>
  )
}
