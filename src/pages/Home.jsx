import { Link } from 'react-router-dom'
import FeatureCard from '../components/FeatureCard.jsx'
import { features } from '../features/index.js'

export default function Home() {
  // The first two features sit beside the intro; any others are listed below it.
  const top = features.slice(0, 2)
  const rest = features.slice(2)
  return (
    <>
      <div className="hero">
        <div>
          <p className="eyebrow">Stav's Garage</p>
          <h1>Stavya Palassery</h1>
          <p className="lede">
            Welcome to my online garage, where you can see the tools I've built.
          </p>
          <div className="actions">
            <Link to="/features" className="btn primary">Browse features</Link>
            <Link to="/about" className="btn">About me</Link>
          </div>
        </div>
        {top.length > 0 ? (
          <div className="grid hero-picks">
            {top.map((f) => <FeatureCard key={f.slug} feature={f} />)}
          </div>
        ) : (
          <div className="slot">
            <strong>The bench is clear</strong>
            My first build is on its way. Check back soon.
          </div>
        )}
      </div>

      {rest.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Also on the bench</h2>
            <Link to="/features">See all features</Link>
          </div>
          <div className="grid after-first">
            {rest.map((f) => <FeatureCard key={f.slug} feature={f} />)}
          </div>
        </section>
      )}
    </>
  )
}
