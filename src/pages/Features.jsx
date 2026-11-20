import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import CodeProjects from '../components/CodeProjects.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import { features } from '../features/index.js'
import { GITHUB_URL } from '../links.js'

export default function Features() {
  // Links like /features#full-stack jump to that section once the page has rendered.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <>
      <p className="eyebrow">ls builds/</p>
      <h1 className="page-title">Features</h1>
      {features.length === 0 ? (
        <div className="slot">
          <strong>No builds yet</strong>
          The first one is on its way.
        </div>
      ) : (
        <>
          <div className="grid">
            {features.map((f) => <FeatureCard key={f.slug} feature={f} />)}
          </div>
        </>
      )}

      <section className="section" id="full-stack" aria-labelledby="fs-title">
        <div className="section-head">
          <h2 id="fs-title">Full-stack projects</h2>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">All repos ↗</a>
        </div>
        <CodeProjects />
      </section>
    </>
  )
}
