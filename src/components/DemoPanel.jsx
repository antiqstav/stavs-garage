export default function DemoPanel({ title, children }) {
  return (
    <section className="demo" aria-label={`${title} demo`}>
      <div className="demo-bar">
        <span>{title}</span>
        <span className="live">Live demo</span>
      </div>
      <div className="demo-body">{children}</div>
    </section>
  )
}
