import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()

  const [role, setRole] = useState('Lawyer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()

    if (!email || !password) {
      alert('Please enter email and password')
      return
    }

    // Store logged-in user information
    localStorage.setItem('userRole', role)
    localStorage.setItem('userEmail', email)
    localStorage.setItem('isLoggedIn', 'true')

    // Redirect to role-aware dashboard
    navigate('/dashboard')
  }

  return (
    <div className="login-page">

      <div className="login-container">

        {/* Left Information Panel */}
        <div className="login-info">

          <div className="login-brand">
            <div className="login-logo">
              ⚖
            </div>

            <div>
              <h2>AI Multi-Agent</h2>
              <span>e-Portal</span>
            </div>
          </div>

          <div className="login-info-content">

            <span className="login-label">
              SECURE CASE MANAGEMENT
            </span>

            <h1>
              Intelligent Case
              <br />
              Management Portal
            </h1>

            <p>
              Access the AI-assisted judicial case
              management system for case registration,
              document processing, precedent retrieval,
              priority analysis and hearing scheduling.
            </p>

            <div className="login-features">

              <div>
                <span>✓</span>
                <p>AI-assisted case analysis</p>
              </div>

              <div>
                <span>✓</span>
                <p>Precedent retrieval</p>
              </div>

              <div>
                <span>✓</span>
                <p>Hearing prioritization</p>
              </div>

              <div>
                <span>✓</span>
                <p>Human-in-the-loop review</p>
              </div>

            </div>

          </div>

          <div className="login-university">
            Academic Prototype · Presidency University,
            Bengaluru
          </div>

        </div>

        {/* Login Form */}
        <div className="login-form-side">

          <div className="login-form-wrapper">

            <button
              type="button"
              className="login-back-button"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>

            <div className="login-form-heading">

              <span>PORTAL ACCESS</span>

              <h2>Sign in to your account</h2>

              <p>
                Select your role and enter your credentials
                to continue.
              </p>

            </div>

            <form onSubmit={handleLogin}>

              <div className="login-form-group">

                <label>
                  User Role
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value)
                  }
                >
                  <option value="Litigant">
                    Litigant
                  </option>

                  <option value="Lawyer">
                    Lawyer
                  </option>

                  <option value="Judge">
                    Judge
                  </option>

                  <option value="Registrar">
                    Registrar
                  </option>

                  <option value="Admin">
                    Admin
                  </option>
                </select>

              </div>

              <div className="login-form-group">

                <label>
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
                />

              </div>

              <div className="login-form-group">

                <label>
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />

              </div>

              <button
                type="submit"
                className="login-submit-button"
              >
                Sign In →
              </button>

            </form>

            <div className="login-security-note">

              <span>🔒</span>

              <div>
                <strong>
                  Secure access
                </strong>

                <p>
                  Role-based permissions control access
                  to portal functions.
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