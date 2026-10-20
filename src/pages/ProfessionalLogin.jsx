import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

const PROFESSIONAL_ROLES = ['lawyer', 'judge']

const pageStyle = {
  minHeight: '100vh',
  padding: '32px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background:
    'radial-gradient(circle at 10% 10%, #dbeafe 0, transparent 35%), radial-gradient(circle at 90% 90%, #e0e7ff 0, transparent 35%), #f4f7fb',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
  boxSizing: 'border-box',
}

const containerStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 0.95fr) minmax(0, 1.05fr)',
  width: '100%',
  maxWidth: '1040px',
  minHeight: '620px',
  overflow: 'hidden',
  borderRadius: '24px',
  background: '#ffffff',
  boxShadow: '0 28px 80px rgba(15, 35, 70, 0.15)',
  border: '1px solid rgba(255,255,255,0.8)',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 15px',
  border: '1px solid #dbe2ec',
  borderRadius: '10px',
  background: '#fbfcfe',
  color: '#17243b',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

function ProfessionalLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(
          typeof data.detail === 'string'
            ? data.detail
            : 'Login failed. Please try again.'
        )
        return
      }

      const user = data.user
      const actualRole = String(user?.role || '').trim().toLowerCase()

      if (
        !user ||
        !data.access_token ||
        user.id == null ||
        !PROFESSIONAL_ROLES.includes(actualRole)
      ) {
        setError(
          'This page is for approved Lawyer and Judge accounts only. Please use the correct login page.'
        )
        return
      }

      // Preserve the existing authentication/session flow.
      localStorage.setItem('accessToken', data.access_token)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userEmail', user.email || '')
      localStorage.setItem('userId', String(user.id))
      localStorage.setItem('isLoggedIn', 'true')

      // Route according to the role returned by the backend.
      if (actualRole === 'lawyer') {
        navigate('/lawyer', { replace: true })
      } else {
        navigate('/judge', { replace: true })
      }
    } catch (err) {
      console.error('Professional login error:', err)
      setError(
        'Cannot connect to the server. Make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <style>{`
        .professional-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          width: 100%;
          max-width: 1040px;
          min-height: 620px;
          overflow: hidden;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 28px 80px rgba(15, 35, 70, 0.15);
          border: 1px solid rgba(255,255,255,.8);
        }
        .professional-input:focus {
          border-color: #4263eb !important;
          box-shadow: 0 0 0 3px rgba(66,99,235,.12);
          background: #fff !important;
        }
        .professional-submit {
          width: 100%;
          border: 0;
          border-radius: 11px;
          padding: 15px 18px;
          background: linear-gradient(110deg, #2346a8, #4263eb);
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(45,78,183,.2);
          transition: transform .2s, box-shadow .2s, opacity .2s;
        }
        .professional-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgba(45,78,183,.27);
        }
        .professional-submit:disabled {
          cursor: wait;
          opacity: .65;
        }
        .professional-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 9px;
          padding: 9px 12px;
          background: #fff;
          color: #526078;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .professional-back:hover {
          background: #f8fafc;
          color: #2346a8;
        }
        .professional-link {
          color: #3156c7;
          font-weight: 650;
          text-decoration: none;
        }
        .professional-link:hover {
          text-decoration: underline;
        }
        .professional-field-label {
          display: block;
          margin-bottom: 8px;
          color: #27364d;
          font-size: 13px;
          font-weight: 650;
        }
        @media (max-width: 760px) {
          .professional-layout {
            grid-template-columns: 1fr;
            max-width: 490px;
            min-height: unset;
          }
          .professional-brand-panel {
            padding: 28px 25px !important;
          }
          .professional-brand-description {
            margin-bottom: 18px !important;
          }
          .professional-feature-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px !important;
          }
          .professional-university {
            margin-top: 22px !important;
          }
          .professional-form-panel {
            padding: 28px 24px !important;
          }
        }
        @media (max-width: 380px) {
          .professional-feature-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="professional-layout">
        {/* Branding panel */}
        <section
          className="professional-brand-panel"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '46px 38px 30px',
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            background:
              'radial-gradient(circle at 100% 0%, rgba(99,132,255,.3), transparent 35%), linear-gradient(145deg, #101d3c, #172e5b 58%, #23458a)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '260px',
              height: '260px',
              right: '-150px',
              bottom: '70px',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: '50%',
              boxShadow: '0 0 0 35px rgba(255,255,255,.025), 0 0 0 70px rgba(255,255,255,.02)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '46px',
                height: '46px',
                flexShrink: 0,
                borderRadius: '14px',
                background: 'rgba(255,255,255,.12)',
                border: '1px solid rgba(255,255,255,.2)',
                fontSize: '27px',
              }}
            >
              ⚖
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 750, letterSpacing: '-.3px' }}>
                AI Multi-Agent
              </div>
              <div style={{ marginTop: '3px', color: '#b9c9f5', fontSize: '12px' }}>
                e-Portal · Case Management
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', marginBottom: 'auto', padding: '45px 0 35px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid rgba(167,190,255,.28)',
                background: 'rgba(126,157,255,.12)',
                color: '#c8d6ff',
                fontSize: '10px',
                fontWeight: 750,
                letterSpacing: '1.5px',
              }}
            >
              PROFESSIONAL ACCESS
            </span>

            <h1
              style={{
                maxWidth: '370px',
                margin: '22px 0 15px',
                fontSize: 'clamp(30px, 3.4vw, 43px)',
                lineHeight: 1.12,
                letterSpacing: '-1.5px',
                fontWeight: 760,
              }}
            >
              Your professional workspace.
            </h1>

            <p
              className="professional-brand-description"
              style={{
                maxWidth: '370px',
                margin: '0 0 32px',
                color: '#c2cde4',
                fontSize: '14px',
                lineHeight: 1.8,
              }}
            >
              Access case-management tools and AI-assisted recommendations
              through your authorized professional account.
            </p>

            <div
              className="professional-feature-list"
              style={{ display: 'flex', flexDirection: 'column', gap: '19px' }}
            >
              {[
                'Case-management workflow',
                'Precedent retrieval',
                'Priority recommendations',
                'Human-supervised review',
              ].map((feature) => (
                <div
                  key={feature}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '23px',
                      height: '23px',
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: 'rgba(104,222,180,.13)',
                      border: '1px solid rgba(104,222,180,.35)',
                      color: '#7ce3bd',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ color: '#e3eafa', fontSize: '13px' }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="professional-university"
            style={{
              paddingTop: '19px',
              borderTop: '1px solid rgba(255,255,255,.14)',
              color: '#b8c5df',
              fontSize: '11px',
              lineHeight: 1.6,
            }}
          >
            <div style={{ color: '#e6edff', fontWeight: 650 }}>
              Academic Prototype
            </div>
            Presidency University, Bengaluru
          </div>
        </section>

        {/* Login form */}
        <section
          className="professional-form-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '42px 46px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '365px' }}>
            <button
              type="button"
              className="professional-back"
              onClick={() => navigate('/login')}
            >
              <span aria-hidden="true">←</span>
              Choose Login Type
            </button>

            <div style={{ marginTop: '36px', marginBottom: '28px' }}>
              <div
                style={{
                  color: '#4263eb',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '1.8px',
                }}
              >
                SECURE SIGN IN
              </div>
              <h2
                style={{
                  margin: '10px 0 9px',
                  color: '#17243b',
                  fontSize: '29px',
                  letterSpacing: '-.8px',
                  lineHeight: 1.2,
                }}
              >
                Welcome back
              </h2>
              <p style={{ margin: 0, color: '#758198', fontSize: '13px', lineHeight: 1.7 }}>
                Sign in with your registered Lawyer or Judge account.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '11px',
                alignItems: 'center',
                padding: '13px 14px',
                marginBottom: '25px',
                border: '1px solid #e3eaff',
                borderRadius: '11px',
                background: '#f7f9ff',
              }}
            >
              <span style={{ fontSize: '20px' }} aria-hidden="true">🛡️</span>
              <div>
                <div style={{ color: '#263c75', fontSize: '12px', fontWeight: 750 }}>
                  Professional account
                </div>
                <div style={{ marginTop: '3px', color: '#73809a', fontSize: '11px', lineHeight: 1.5 }}>
                  Access is subject to role validation and account approval.
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '20px' }}>
                <label className="professional-field-label" htmlFor="professional-email">
                  Email address
                </label>
                <input
                  className="professional-input"
                  style={inputStyle}
                  id="professional-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label className="professional-field-label" htmlFor="professional-password">
                  Password
                </label>
                <input
                  className="professional-input"
                  style={inputStyle}
                  id="professional-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
                <Link className="professional-link" style={{ fontSize: '12px' }} to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    gap: '9px',
                    alignItems: 'flex-start',
                    padding: '12px',
                    marginBottom: '17px',
                    border: '1px solid #fecaca',
                    borderRadius: '9px',
                    background: '#fff5f5',
                    color: '#b42318',
                    fontSize: '12px',
                    lineHeight: 1.6,
                  }}
                >
                  <span aria-hidden="true">!</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="professional-submit"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in securely  →'}
              </button>
            </form>

            <p style={{ margin: '23px 0', textAlign: 'center', color: '#778399', fontSize: '12px' }}>
              Need an account?{' '}
              <Link className="professional-link" to="/signup">
                Register here
              </Link>
            </p>

            <div
              style={{
                height: '1px',
                margin: '22px 0 18px',
                background: '#edf0f5',
              }}
            />

            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span aria-hidden="true" style={{ fontSize: '16px' }}>🔐</span>
              <div>
                <div style={{ color: '#35435a', fontSize: '11px', fontWeight: 750 }}>
                  Protected professional access
                </div>
                <p style={{ margin: '5px 0 0', color: '#8a94a6', fontSize: '11px', lineHeight: 1.7 }}>
                  AI outputs support professional review. Case decisions remain
                  subject to authorized human oversight.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProfessionalLogin