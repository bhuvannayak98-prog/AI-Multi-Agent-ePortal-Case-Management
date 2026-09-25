import { NavLink, useNavigate } from 'react-router-dom'

function Layout({ children }) {
  const navigate = useNavigate()

  const role =
    localStorage.getItem('userRole') || 'User'

  const email =
    localStorage.getItem('userEmail') ||
    'user@example.com'

  const handleLogout = () => {
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('isLoggedIn')
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    isActive
      ? 'sidebar-link active'
      : 'sidebar-link'

  // Role-based navigation permissions
  const canRegisterCase =
    role === 'Litigant' ||
    role === 'Lawyer' ||
    role === 'Registrar'

  return (
    <div className="portal-layout">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="sidebar-logo">
          <div className="logo-mark">
            ⚖
          </div>

          <div>
            <h2>AI e-Portal</h2>
            <span>Case Management</span>
          </div>
        </div>

        <div className="sidebar-menu">

          <p className="menu-title">
            MAIN MENU
          </p>

          <NavLink
            to="/dashboard"
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
              {role.charAt(0)}
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

      {/* MAIN AREA */}

      <div className="portal-main">

        <header className="topbar">

          <div>
            <h1>
              AI Multi-Agent e-Portal
            </h1>

            <p>
              Case Management & Hearing
              Prioritization
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