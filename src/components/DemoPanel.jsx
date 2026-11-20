export default function DemoPanel({ title, ticker, children }) {
  return (
    <section className="demo" aria-label={`${title} demo`}>
      <div className="demo-bar">
        <span>{ticker && <b>{ticker}</b>}{title}</span>
        <span className="live">Live</span>
      </div>
      <div className="demo-body">{children}</div>
    </section>
  )
}
