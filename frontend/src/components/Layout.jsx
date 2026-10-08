import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

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
          <span className="brand-mark" aria-hidden="true">🥚</span>
          <div className="brand-text">
            <h1>CANDOLER</h1>
            <p>Egg candling · Day 1–21</p>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/logs">Logs</NavLink>
          <NavLink to="/archives">Archive</NavLink>
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
