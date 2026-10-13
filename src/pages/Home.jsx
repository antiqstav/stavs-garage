import { Link } from 'react-router-dom'
import DemoPanel from '../components/DemoPanel.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import { features } from '../features/index.js'

export default function Home() {
  const [first, ...rest] = features
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
        {first ? (
          <div>
            <p>Featured build:</p>
          <DemoPanel title={first.title}>
            <first.Demo />
          </DemoPanel>
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
