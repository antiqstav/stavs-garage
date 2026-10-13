import { Link } from 'react-router-dom'

export default function About() {
  return (
    <>
      <p className="eyebrow">About the builder</p>
      <div className="about-layout">
        <div className="about-image-wrap">
          <img className="about-image" src="/IMG_7538.jpeg" alt="About the builder" />
        </div>
        <div className="about-copy">
          <h1 className="page-title">About</h1>
          <p>
            My name is Stavya Palassery, and I am a Computer Science freshman at the 
            <span className="highlight"> University of Southern California. Fight On! </span>
            I am based out of Houston, Texas, and my interests include full-stack development, finance and quantitative analysis, Laufey, and playing the violin.
          </p>
          
          <p>
            Throughout my career, I've worked with languages like Java, Python, C++, C#, Javascript, and SQL-related languages. My current project
            building a High Frequency Trading simulator as an MVP because I wanted to learn more about the intricacies of algorithmic trading and improve my skills in both software development and quantitative analysis.
            It's currently viewable in <a href="https://github.com/antiqstav/hft-simulator" target="_blank" rel="noopener noreferrer">this GitHub repository</a>.
          </p>

          <p>Click on these links to learn more about me:</p>
          <div>
            <div className="actions">
              <Link to="https://github.com/antiqstav" className="btn primary">GitHub</Link>
              <Link to="https://www.linkedin.com/in/stavya-palassery-74249b291" className="btn primary">LinkedIn</Link>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <h2>Under the hood</h2>
        <dl className="specs">
          <div><dt>Framework</dt><dd>React 19</dd></div>
          <div><dt>Build tool</dt><dd>Vite 8</dd></div>
          <div><dt>Routing</dt><dd>React Router 7</dd></div>
          <div><dt>Styling</dt><dd>Plain CSS, no UI library</dd></div>
          <div><dt>Fonts</dt><dd>IBM Plex Serif for headings, Instrument Serif for text</dd></div>
        </dl>
      </section>

      <div className="actions">
        <Link to="/contact" className="btn primary">Get in touch</Link>
      </div>
    </>
  )
}
