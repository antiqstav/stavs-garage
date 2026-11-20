import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { features } from '../features/index.js'
import { RESUME_URL } from '../links.js'

// Pressing a tab's number key opens it (see useNumberKeys below).
const links = [
  { to: '/', label: 'Home', key: '1', end: true },
  { to: '/features', label: 'Features', key: '2' },
  { to: '/about', label: 'About', key: '3' },
  { to: '/contact', label: 'Contact', key: '4' },
]

// Keys 1-4 jump to the matching page, except while typing in a field or holding a modifier,
// so the shortcuts never get in the way of the Contact form or browser shortcuts.
function useNumberKeys() {
  const navigate = useNavigate()
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.defaultPrevented) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest('input, textarea, select'))) return
      const link = links.find((l) => l.key === e.key)
      if (!link) return
      e.preventDefault()
      navigate(link.to)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])
}

// The browser tab reads "Page · Stavya Palassery" on inner pages and just the name on Home.
const SITE_NAME = 'Stavya Palassery'

function pageTitle(pathname) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return SITE_NAME
  const page = links.find((l) => l.to === path)
  if (page) return `${page.label} · ${SITE_NAME}`
  const build = path.match(/^\/features\/([^/]+)$/)
  const feature = build && features.find((f) => f.slug === build[1])
  if (feature) return `${feature.title} · ${SITE_NAME}`
  return `Page not found · ${SITE_NAME}`
}

function useDocumentTitle(pathname) {
  useEffect(() => { document.title = pageTitle(pathname) }, [pathname])
}

// Live clocks for where I am (Los Angeles) and where I'm from (Houston).
const CLOCKS = [
  { label: 'LA', city: 'Los Angeles', timeZone: 'America/Los_Angeles' },
  { label: 'HTX', city: 'Houston', timeZone: 'America/Chicago' },
]

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="term-clock">
      <span className="live-dot" aria-hidden="true" />
      {CLOCKS.map((c) => {
        const time = now.toLocaleTimeString('en-US', { timeZone: c.timeZone, hour12: false })
        return (
          <span key={c.label} className="clock-zone" aria-label={`${c.city} time ${time}`}>
            {c.label} <strong>{time}</strong>
          </span>
        )
      })}
    </span>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  useNumberKeys()
  useDocumentTitle(pathname)
  return (
    <div className="shell">
      <header className="term-header">
        <div className="wrap term-bar">
          <Link to="/" className="brand" aria-label="Stavya Palassery, home">
            <span className="brand-mark" aria-hidden="true">SP</span>
            <span className="brand-name">STAVYA PALASSERY</span>
            <span className="brand-tag" aria-hidden="true">$STAV</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} aria-keyshortcuts={l.key} title={`${l.label} (press ${l.key})`}
                className={({ isActive }) => (isActive ? 'active' : undefined)}>
                <kbd aria-hidden="true">{l.key}</kbd>{l.label}
              </NavLink>
            ))}
            <a href={RESUME_URL} target="_blank" rel="noopener noreferrer">Résumé</a>
          </nav>
          <Clock />
        </div>
      </header>
      <main>
        {/* Keyed on the path so each new page mounts fresh and plays the fade-in in App.css. */}
        <div className="wrap page-fade" key={pathname}><Outlet /></div>
      </main>
      <footer className="status-bar">
        <div className="wrap">
          <span><span className="ok">●</span> SYS OK</span>
          <span>{features.length} builds online</span>
          <span>React · Vite · React Router</span>
          <span className="push">© {new Date().getFullYear()} Stavya Palassery</span>
        </div>
      </footer>
    </div>
  )
}
