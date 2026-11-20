import { EMAIL, GITHUB_URL, LINKEDIN_URL, RESUME_URL } from '../links.js'

const external = { target: '_blank', rel: 'noopener noreferrer' }

// The four ways to reach me, as one line of mono links.
export function ContactLine() {
  return (
    <p className="contact-line">
      <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      <a href={GITHUB_URL} {...external}>GitHub ↗</a>
      <a href={LINKEDIN_URL} {...external}>LinkedIn ↗</a>
    </p>
  )
}

// Closing call to action at the bottom of the home page.
export function ContactPanel() {
  return (
    <section className="term-panel cta-panel" aria-labelledby="cta-title">
      <div>
        <p className="eyebrow">contact --hire</p>
        <h2 id="cta-title">Let's Talk!</h2>
      </div>
      <div className="cta-actions">
        <a className="btn primary" href={`mailto:${EMAIL}`}>Email me</a>
        <a className="btn" href={RESUME_URL} {...external}>Résumé (PDF) ↗</a>
        <a className="btn" href={LINKEDIN_URL} {...external}>LinkedIn ↗</a>
        <a className="btn" href={GITHUB_URL} {...external}>GitHub ↗</a>
      </div>
    </section>
  )
}
