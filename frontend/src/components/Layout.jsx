import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo size={38} variant="mark" />
          <div className="brand-text">
            <h1>Egg Candling</h1>
            <p>AI-powered egg analysis</p>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/logs">Logs</NavLink>
          <NavLink to="/archives">Archive</NavLink>
          <NavLink to="/electric-border">FX Lab</NavLink>
        </nav>

        <div className="user">
          <span className="user-email" title={user?.email ?? ''}>
            {user?.email}
          </span>
          <button className="btn btn-ghost" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
