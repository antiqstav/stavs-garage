import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <h1 className="page-title">Page not found</h1>
      <p>That address doesn't match anything on this site. Check the link, or head back to a page that exists.</p>
      <div className="actions">
        <Link to="/" className="btn primary">Go home</Link>
        <Link to="/features" className="btn">Browse features</Link>
      </div>
    </>
  )
}
