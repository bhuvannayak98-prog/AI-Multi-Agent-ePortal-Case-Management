
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

function getDashboardPath(role) {
  switch (String(role || '').trim().toLowerCase()) {
    case 'litigant':
      return '/litigant'
    case 'lawyer':
      return '/lawyer'
    case 'judge':
      return '/judge'
    case 'registrar':
      return '/registrar'
    case 'admin':
      return '/admin'
    default:
      return '/login'
  }
}

function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [role, setRole] = useState('Litigant')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const successMessage = location.state?.signupMessage

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter email and password.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.detail === 'string'
            ? data.detail
            : 'Login failed. Please try again.'
        )
        return
      }

      const user = data.user

      if (!user?.role || !data.access_token) {
        setError('The server returned incomplete login information.')
        return
      }

      // The backend-verified role remains authoritative.
      const actualRole = String(user.role).trim()
      const dashboardPath = getDashboardPath(actualRole)

      if (dashboardPath === '/login') {
        setError('This account has an unsupported role. Contact the administrator.')
        return
      }

      localStorage.setItem('accessToken', data.access_token)
      localStorage.setItem('userRole', actualRole)
      localStorage.setItem('userEmail', user.email || '')
      localStorage.setItem('userId', String(user.id))
      localStorage.setItem('isLoggedIn', 'true')

      navigate(dashboardPath, { replace: true })
    } catch {
      setError(
        'Cannot connect to the server. Make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="login-page"
      style={{
        minHeight: '100vh',
        padding: '24px',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #edf3fa, #f8fafc)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="login-container"
        style={{
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #e1e8f0',
          boxShadow: '0 22px 60px rgba(20, 45, 80, 0.13)',
        }}
      >
        <div
          className="login-info"
          style={{
            background:
              'linear-gradient(145deg, #102542 0%, #173b68 58%, #24558a 100%)',
            color: '#f8fafc',
            padding: 'clamp(26px, 4vw, 44px)',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="login-brand"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div
              className="login-logo"
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ⚖
            </div>

            <div>
              <h2 style={{ color: '#ffffff', margin: 0 }}>
                AI Multi-Agent
              </h2>
              <span style={{ color: '#d8e5f7' }}>e-Portal</span>
            </div>
          </div>

          <div className="login-info-content" style={{ marginTop: '48px' }}>
            <span
              className="login-label"
              style={{
                color: '#c5dcff',
                letterSpacing: '2px',
                fontWeight: 700,
              }}
            >
              SECURE CASE MANAGEMENT
            </span>

            <h1
              style={{
                color: '#ffffff',
                fontSize: 'clamp(30px, 3.5vw, 42px)',
                lineHeight: 1.2,
                margin: '18px 0',
              }}
            >
              Intelligent Case
              <br />
              Management Portal
            </h1>

            <p style={{ color: '#d8e5f7', lineHeight: 1.8, maxWidth: '430px' }}>
              Access the AI-assisted judicial case management system for case
              registration, document processing, precedent retrieval, priority
              analysis and hearing scheduling.
            </p>

            <div className="login-features" style={{ marginTop: '28px' }}>
              <div><span>✓</span><p>AI-assisted case analysis</p></div>
              <div><span>✓</span><p>Precedent retrieval</p></div>
              <div><span>✓</span><p>Hearing prioritization</p></div>
              <div><span>✓</span><p>Human-in-the-loop review</p></div>
            </div>
          </div>

          <div
            className="login-university"
            style={{
              color: '#c7d7eb',
              marginTop: '44px',
              lineHeight: 1.6,
            }}
          >
            Academic Prototype · Presidency University, Bengaluru
          </div>
        </div>

        <div
          className="login-form-side"
          style={{
            padding: 'clamp(24px, 4vw, 44px)',
            boxSizing: 'border-box',
            background: '#ffffff',
          }}
        >
          <div
            className="login-form-wrapper"
            style={{ maxWidth: '420px', margin: '0 auto' }}
          >
            <button
              type="button"
              className="login-back-button"
              onClick={() => navigate('/')}
              style={{ marginBottom: '30px' }}
            >
              ← Back to Home
            </button>

            <div
              className="login-form-heading"
              style={{ marginBottom: '26px' }}
            >
              <span
                style={{
                  color: '#3267a8',
                  letterSpacing: '2px',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                PORTAL ACCESS
              </span>

              <h2 style={{ color: '#172b45', marginTop: '12px' }}>
                Sign in to your account
              </h2>

              <p style={{ color: '#64748b', lineHeight: 1.6 }}>
                Enter your credentials to continue.
              </p>
            </div>

            {successMessage && (
              <div
                role="status"
                style={{
                  background: '#ecfdf3',
                  color: '#166534',
                  padding: '12px 14px',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  marginBottom: '18px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                {successMessage}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="login-form-group" style={{ marginBottom: '18px' }}>
                <label htmlFor="login-role">User Role</label>
                <select
                  id="login-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Litigant">Litigant</option>
                  <option value="Lawyer">Lawyer</option>
                  <option value="Judge">Judge</option>
                  <option value="Registrar">Registrar</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div className="login-form-group" style={{ marginBottom: '18px' }}>
                <label htmlFor="login-email">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="login-form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              {error && (
                <p
                  role="alert"
                  style={{
                    background: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    borderRadius: '9px',
                    padding: '11px 12px',
                    marginTop: '16px',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="login-submit-button"
                disabled={loading}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  marginTop: '22px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                  boxShadow: '0 5px 14px rgba(35, 76, 137, 0.18)',
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '22px', color: '#64748b' }}>
              New to the portal? <Link to="/signup">Create an account</Link>
            </p>

            <div
              className="login-security-note"
              style={{
                background: '#f2f6fc',
                border: '1px solid #e1e9f4',
                borderRadius: '12px',
                padding: '14px',
                marginTop: '26px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <span>🔒</span>
              <div>
                <strong style={{ color: '#203b5c' }}>Secure access</strong>
                <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 0 }}>
                  Role-based permissions control access to portal functions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
