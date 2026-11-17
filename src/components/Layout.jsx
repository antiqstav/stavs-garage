import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

// Served from public/; opens in a new tab.
export const RESUME_URL = '/Stavya-Palassery-Resume.pdf'

export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="shell">
      <div className="panel">
      <header className="site-header">
        <div className="wrap">
          <Link to="/" className="brand">Stavya Palassery</Link>
          <nav className="nav" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {l.label}
              </NavLink>
            ))}
            <a href={RESUME_URL} target="_blank" rel="noopener noreferrer">Résumé</a>
          </nav>
        </div>
      </header>
      <main>
        {/* Keyed on the path so each new page mounts fresh and plays the fade-in in App.css. */}
        <div className="wrap page-fade" key={pathname}><Outlet /></div>
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <span>Built in the garage with React and React Router.</span>
          <span>{new Date().getFullYear()} Stavya Palassery</span>
        </div>
      </footer>
      </div>
    </div>
  )
}
