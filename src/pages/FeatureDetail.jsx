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
      <p className="crumbs"><Link to="/features">Features</Link> / {feature.ticker || feature.title}</p>
      <div className="feature-head">
        <h1 className="page-title">{feature.title}</h1>
        {feature.ticker && <span className="sym">{feature.ticker}</span>}
      </div>
      <p className="lede">{feature.summary}</p>
      {(feature.stack || feature.repo) && (
        <div className="feature-meta">
          {feature.stack && (
            <div className="tags" aria-label="Built with">
              <span className="label">Stack</span>
              {feature.stack.map((s) => <span key={s} className="tag">{s}</span>)}
            </div>
          )}
          {feature.repo && <a href={feature.repo} target="_blank" rel="noopener noreferrer">Code on GitHub ↗</a>}
        </div>
      )}
      <DemoPanel title={feature.title} ticker={feature.ticker}>
        <feature.Demo />
      </DemoPanel>
      <section className={feature.Diagram ? 'section how-it-works with-diagram' : 'section how-it-works'}>
        <div>
          <h2>How it works</h2>
          <p>{feature.details}</p>
          {feature.repo && (
            <p><a href={feature.repo} target="_blank" rel="noopener noreferrer">View source on GitHub</a></p>
          )}
        </div>
        {feature.Diagram && (
          <figure className="how-diagram">
            <feature.Diagram />
          </figure>
        )}
      </section>
      <nav className="pager" aria-label="More features">
        {prev ? <Link to={`/features/${prev.slug}`} className="btn">Previous: {prev.title}</Link> : <span />}
        {next ? <Link to={`/features/${next.slug}`} className="btn">Next: {next.title}</Link> : <span />}
      </nav>
    </>
  )
}
