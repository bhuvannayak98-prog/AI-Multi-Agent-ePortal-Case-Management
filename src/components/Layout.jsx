
import { NavLink, useNavigate } from 'react-router-dom'

function Layout({ children }) {
  const navigate = useNavigate()

  const role = (
    localStorage.getItem('userRole') || 'User'
  ).trim()

  const normalizedRole = role.toLowerCase()

  const email =
    localStorage.getItem('userEmail') ||
    'user@example.com'

  const dashboardPath = {
    litigant: '/litigant',
    lawyer: '/lawyer',
    judge: '/judge',
    admin: '/admin',
  }[normalizedRole] || '/login'

  const handleLogout = () => {
    // Clear the local session.
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userId')
    localStorage.removeItem('isLoggedIn')

    navigate('/', { replace: true })
  }

  const linkClass = ({ isActive }) =>
    isActive
      ? 'sidebar-link active'
      : 'sidebar-link'

  const canRegisterCase =
    normalizedRole === 'litigant' ||
    normalizedRole === 'lawyer'

  return (
    <div className="portal-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">⚖</div>
          <div>
            <h2>AI e-Portal</h2>
            <span>Case Management</span>
          </div>
        </div>

        <div className="sidebar-menu">
          <p className="menu-title">MAIN MENU</p>

          <NavLink
            to={dashboardPath}
            end
            className={linkClass}
          >
            <span>▣</span>
            Dashboard
          </NavLink>

          <NavLink
            to="/cases"
            className={linkClass}
          >
            <span>▤</span>
            Cases
          </NavLink>

          {canRegisterCase && (
            <NavLink
              to="/new-case"
              className={linkClass}
            >
              <span>＋</span>
              Register Case
            </NavLink>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="user-box">
            <div className="user-avatar">
              {role.charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <strong>{role}</strong>
              <span>{email}</span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="portal-main">
        <header className="topbar">
          <div>
            <h1>AI Multi-Agent e-Portal</h1>
            <p>
              Case Management &amp; Hearing Prioritization
            </p>
          </div>

          <div className="topbar-user">
            <span>Logged in as</span>
            <strong>{role}</strong>
          </div>
        </header>

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
