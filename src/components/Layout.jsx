import { NavLink, Link, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/features', label: 'Features' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Layout() {
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
          </nav>
        </div>
      </header>
      <main>
        <div className="wrap"><Outlet /></div>
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
