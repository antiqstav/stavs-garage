import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <p className="eyebrow">ERR 404 · route not found</p>
      <h1 className="page-title">Page not found</h1>
      <div className="actions">
        <Link to="/" className="btn primary">Go home</Link>
        <Link to="/features" className="btn">Browse builds</Link>
      </div>
    </>
  )
}
