import { Link, useParams } from 'react-router-dom'
import DemoPanel from '../components/DemoPanel.jsx'
import NotFound from './NotFound.jsx'
import { features } from '../features/index.js'

export default function FeatureDetail() {
  const { slug } = useParams()
  const index = features.findIndex((f) => f.slug === slug)
  if (index === -1) return <NotFound />

  const feature = features[index]
  const prev = features[index - 1]
  const next = features[index + 1]

  return (
    <>
      <p className="crumbs"><Link to="/features">Features</Link> / {feature.title}</p>
      <h1 className="page-title">{feature.title}</h1>
      <p>{feature.summary}</p>
      <DemoPanel title={feature.title}>
        <feature.Demo />
      </DemoPanel>
      <section className="section">
        <h2>How it works</h2>
        <p>{feature.details}</p>
        {feature.repo && (
          <p><a href={feature.repo} target="_blank" rel="noopener noreferrer">View source on GitHub</a></p>
        )}
      </section>
      <nav className="pager" aria-label="More features">
        {prev ? <Link to={`/features/${prev.slug}`} className="btn">Previous: {prev.title}</Link> : <span />}
        {next ? <Link to={`/features/${next.slug}`} className="btn">Next: {next.title}</Link> : <span />}
      </nav>
    </>
  )
}
