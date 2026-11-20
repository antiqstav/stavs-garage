import { Link } from 'react-router-dom'
import CodeProjects from '../components/CodeProjects.jsx'
import { ContactLine, ContactPanel } from '../components/ContactLinks.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import Recognition from '../components/Recognition.jsx'
import { features } from '../features/index.js'
import { RESUME_URL } from '../links.js'

// Home samples the site: the intro with the two top builds, a short About with awards,
// the GitHub projects, and a way to get in touch.
export default function Home() {
  const top = features.slice(0, 2)
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">whoami</p>
          <h1>Stavya Palassery</h1>
          <p className="tagline">
            <span>CS @ USC</span>
            <span>Minor in finance</span>
            <span>Full-stack · quant · robotics</span>
          </p>
          <p className="lede">
            Live builds you can run right here in your browser: market simulators, control systems,
            and audio tools, each with the story of how it works.
          </p>
          <div className="actions">
            <Link to="/features" className="btn primary">Browse builds</Link>
            <a href={RESUME_URL} className="btn" target="_blank" rel="noopener noreferrer">Résumé (PDF) ↗</a>
            <Link to="/contact" className="btn">Get in touch</Link>
          </div>
          <ContactLine />
        </div>
        {top.length > 0 ? (
          <div className="hero-picks">
            <p className="label">Top builds</p>
            {top.map((f) => <FeatureCard key={f.slug} feature={f} />)}
          </div>
        ) : (
          <div className="slot">
            <strong>No builds yet</strong>
            The first one is on its way.
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="home-about">
        <div className="section-head">
          <h2 id="home-about">About</h2>
          <Link to="/about">More about me →</Link>
        </div>
        <div className="term-panel about-teaser">
          <img src="/IMG_7538.jpeg" alt="Photo of Stavya Palassery" />
          <div>
            <p>
              I'm a Computer Science freshman at the <span className="highlight">University of Southern California</span>,
              minoring in finance. I grew up in Houston, and I like building things you can watch work: trading
              simulators, robot controllers, and tools for the violin I play.
            </p>
            <p>
              My name is Stavya Palassery, and I'm a Computer Science freshman at USC, minoring in Finance. I grew
              up in Houston, Texas, and I'm into full-stack development, finance and quantitative analysis, Laufey,
              and playing the violin.
            </p>
          </div>
          <dl className="kv">
            <div><dt>School</dt><dd>USC · B.S. CS, 2030</dd></div>
            <div><dt>Minor</dt><dd>Finance</dd></div>
            <div><dt>Based</dt><dd>Los Angeles, from Houston</dd></div>
            <div><dt>Certs</dt><dd>AWS, Azure, CompTIA</dd></div>
            <div><dt>Languages</dt><dd>Python, Java, C++, JS, C</dd></div>
          </dl>
        </div>
        <Recognition />
      </section>

      <section className="section" aria-labelledby="home-code">
        <div className="section-head">
          <h2 id="home-code">Github projects I've been working on</h2>
          <Link to="/features#full-stack">Details →</Link>
        </div>
        <CodeProjects compact />
      </section>

      <div className="section">
        <ContactPanel />
      </div>
    </>
  )
}
