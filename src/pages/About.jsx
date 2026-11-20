import { Link } from 'react-router-dom'
import Recognition from '../components/Recognition.jsx'
import { GITHUB_URL, LINKEDIN_URL, RESUME_URL } from '../links.js'

export default function About() {
  return (
    <>
      <p className="eyebrow">cat about.txt</p>
      <div className="about-layout">
        <figure className="about-image-wrap">
          <img className="about-image" src="/IMG_7538.jpeg" alt="Photo of Stavya Palassery" />
        </figure>
        <div className="about-copy">
          <h1 className="page-title">About</h1>
          <p>
            I'm Stavya Palassery, a Computer Science freshman at the{' '}
            <span className="highlight">University of Southern California</span>, minoring in finance. Fight On! I grew up in
            Houston, Texas, and I'm into full-stack development, finance and quantitative analysis, Laufey,
            and playing the violin.
          </p>
          <p>
            I mostly write Python, Java, C++, JavaScript, and C, and I've built with React, Flask,
            scikit-learn, and OpenAI's Whisper. I'm an AWS Certified Cloud Practitioner. As a technology
            intern at Zentech, I moved hundreds of gigabytes of employee data to Azure Blob Storage and set up
            about 20 Docker environments, replacing a multi-hour ticket process with self-service access.
          </p>
          <p>
            Right now I'm building a high-frequency trading simulator in Java to learn how algorithmic trading
            really works. It rebuilds a limit order book from real LOBSTER market data, checks itself against
            exchange snapshots, and tests how queue position and latency change a market maker's results. You
            can <Link to="/features/hft-simulator">try it in your browser</Link> or read the
            code <a href="https://github.com/antiqstav/hft-simulator" target="_blank" rel="noopener noreferrer">on GitHub</a>.
          </p>
          <p>
            Outside of class, I led the vision subteam on my FRC robotics team, founded my high school's ACSL
            competitive programming team, and I'm an Eagle Scout.
          </p>

          <div className="actions">
            <a href={GITHUB_URL} className="btn primary" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href={LINKEDIN_URL} className="btn primary" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href={RESUME_URL} className="btn" target="_blank" rel="noopener noreferrer">Résumé (PDF)</a>
          </div>
        </div>
      </div>

      <section className="section" aria-labelledby="about-awards">
        <div className="section-head"><h2 id="about-awards">Awards and results</h2></div>
        <Recognition />
      </section>

      <section className="section" aria-labelledby="about-stack">
        <div className="section-head"><h2 id="about-stack">Under the hood</h2></div>
        <dl className="specs">
          <div><dt>Framework</dt><dd>React 19</dd></div>
          <div><dt>Build tool</dt><dd>Vite 8</dd></div>
          <div><dt>Routing</dt><dd>React Router 7</dd></div>
          <div><dt>Styling</dt><dd>Plain CSS, no UI library</dd></div>
          <div><dt>Fonts</dt><dd>IBM Plex Sans for text, IBM Plex Mono for numbers and labels</dd></div>
        </dl>
      </section>

      <div className="actions">
        <Link to="/contact" className="btn primary">Get in touch</Link>
      </div>
    </>
  )
}
