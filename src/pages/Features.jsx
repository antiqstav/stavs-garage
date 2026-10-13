import FeatureCard from '../components/FeatureCard.jsx'
import { features } from '../features/index.js'

export default function Features() {
  return (
    <>
      <p className="eyebrow">The workbench</p>
      <h1 className="page-title">Features</h1>
      {features.length === 0 ? (
        <div className="slot">
          <strong>Nothing here yet!</strong>
          Be patient.
        </div>
      ) : (
        <>
          <p>Pick one to open its live demo.</p>
          <div className="grid">
            {features.map((f) => <FeatureCard key={f.slug} feature={f} />)}
          </div>
        </>
      )}
    </>
  )
}
