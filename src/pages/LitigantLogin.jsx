import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  border: '1px solid #dbe2ec',
  borderRadius: '9px',
  background: '#fbfcfe',
  color: '#17243b',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color .2s, box-shadow .2s',
}

function LitigantLogin() {
  const navigate = useNavigate()
  const location = useLocation()

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
        headers: { 'Content-Type': 'application/json' },
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

      if (
        !user ||
        !data.access_token ||
        user.id == null ||
        String(user.role || '').trim().toLowerCase() !== 'litigant'
      ) {
        setError(
          'This page is for litigant accounts only. Please use the correct login page.'
        )
        return
      }

      localStorage.setItem('accessToken', data.access_token)
      localStorage.setItem('userRole', user.role)
      localStorage.setItem('userEmail', user.email || '')
      localStorage.setItem('userId', String(user.id))
      localStorage.setItem('isLoggedIn', 'true')

      navigate('/litigant')
    } catch (err) {
      console.error('Litigant login error:', err)
      setError(
        'Cannot connect to the server. Make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        background:
          'radial-gradient(circle at 10% 10%, #dbeafe 0, transparent 35%), radial-gradient(circle at 90% 90%, #e0e7ff 0, transparent 35%), #f4f7fb',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        .litigant-layout {
          display: grid;
          grid-template-columns: .95fr 1.05fr;
          width: 100%;
          max-width: 940px;
          min-height: 0;
          overflow: hidden;
          border-radius: 20px;
          background: #fff;
          border: 1px solid #e5ebf3;
          box-shadow: 0 20px 55px rgba(15,35,70,.12);
        }

        .litigant-input:focus {
          border-color: #4263eb !important;
          box-shadow: 0 0 0 3px rgba(66,99,235,.12);
          background: #fff !important;
        }

        .litigant-submit {
          width: 100%;
          min-height: 46px;
          padding: 12px 16px;
          border: 0;
          border-radius: 9px;
          background: linear-gradient(110deg,#2346a8,#4263eb);
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 14px rgba(45,78,183,.18);
          transition: transform .2s, box-shadow .2s, opacity .2s;
        }

        .litigant-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 9px 18px rgba(45,78,183,.25);
        }

        .litigant-submit:disabled {
          cursor: wait;
          opacity: .65;
        }

        .litigant-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #526078;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .litigant-back:hover {
          background: #f8fafc;
          color: #2346a8;
        }

        .litigant-link {
          color: #3156c7;
          font-weight: 650;
          text-decoration: none;
        }

        .litigant-link:hover {
          text-decoration: underline;
        }

        .litigant-label {
          display: block;
          margin-bottom: 7px;
          color: #27364d;
          font-size: 12px;
          font-weight: 650;
        }

        @media (max-width: 760px) {
          .litigant-layout {
            grid-template-columns: 1fr;
            max-width: 460px;
          }

          .litigant-brand-panel {
            padding: 24px !important;
          }

          .litigant-brand-content {
            margin-top: 28px !important;
            margin-bottom: 22px !important;
            padding: 0 !important;
          }

          .litigant-brand-title {
            font-size: 32px !important;
          }

          .litigant-features {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 13px !important;
          }

          .litigant-university {
            margin-top: 0 !important;
          }

          .litigant-form-panel {
            padding: 26px 24px !important;
          }

          .litigant-form-content {
            max-width: 100% !important;
          }
        }

        @media (max-width: 380px) {
          .litigant-features {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="litigant-layout">
        {/* Left branding panel */}
        <section
          className="litigant-brand-panel"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '32px 30px 24px',
            display: 'flex',
            flexDirection: 'column',
            color: '#fff',
            background:
              'radial-gradient(circle at 100% 0%, rgba(99,132,255,.25), transparent 35%), linear-gradient(145deg,#101d3c,#172e5b 58%,#23458a)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              right: '-145px',
              bottom: '45px',
              border: '1px solid rgba(255,255,255,.12)',
              borderRadius: '50%',
              boxShadow:
                '0 0 0 32px rgba(255,255,255,.025),0 0 0 64px rgba(255,255,255,.02)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
            }}
          >
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                width: '42px',
                height: '42px',
                flexShrink: 0,
                borderRadius: '12px',
                background: 'rgba(255,255,255,.12)',
                border: '1px solid rgba(255,255,255,.2)',
                fontSize: '25px',
              }}
            >
              ⚖
            </div>

            <div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 750,
                  letterSpacing: '-.3px',
                }}
              >
                AI Multi-Agent
              </div>
              <div
                style={{
                  marginTop: '3px',
                  color: '#b9c9f5',
                  fontSize: '11px',
                }}
              >
                e-Portal · Case Management
              </div>
            </div>
          </div>

          <div
            className="litigant-brand-content"
            style={{
              marginTop: 'auto',
              marginBottom: 'auto',
              padding: '32px 0 28px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '6px 9px',
                borderRadius: '5px',
                border: '1px solid rgba(167,190,255,.28)',
                background: 'rgba(126,157,255,.12)',
                color: '#c8d6ff',
                fontSize: '9px',
                fontWeight: 750,
                letterSpacing: '1.4px',
              }}
            >
              LITIGANT ACCESS
            </span>

            <h1
              className="litigant-brand-title"
              style={{
                maxWidth: '340px',
                margin: '19px 0 13px',
                fontSize: 'clamp(28px,3vw,37px)',
                lineHeight: 1.15,
                letterSpacing: '-1px',
                fontWeight: 760,
              }}
            >
              Your case.
              <br />
              Your information.
              <br />
              One portal.
            </h1>

            <p
              style={{
                maxWidth: '340px',
                margin: '0 0 25px',
                color: '#c2cde4',
                fontSize: '13px',
                lineHeight: 1.75,
              }}
            >
              Access your registered cases, review case information, and follow
              progress through one case-management portal.
            </p>

            <div
              className="litigant-features"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
              }}
            >
              {[
                'Case registration and tracking',
                'Document processing',
                'Case status updates',
                'Human-supervised recommendations',
              ].map((feature) => (
                <div
                  key={feature}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '21px',
                      height: '21px',
                      flexShrink: 0,
                      borderRadius: '50%',
                      background: 'rgba(104,222,180,.13)',
                      border: '1px solid rgba(104,222,180,.35)',
                      color: '#7ce3bd',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    ✓
                  </span>

                  <span
                    style={{
                      color: '#e3eafa',
                      fontSize: '12px',
                      lineHeight: 1.5,
                    }}
                  >
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="litigant-university"
            style={{
              paddingTop: '15px',
              borderTop: '1px solid rgba(255,255,255,.14)',
              color: '#b8c5df',
              fontSize: '10px',
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                color: '#e6edff',
                fontWeight: 650,
              }}
            >
              Academic Prototype
            </div>
            Presidency University, Bengaluru
          </div>
        </section>

        {/* Right login panel */}
        <section
          className="litigant-form-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 36px',
            background: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="litigant-form-content"
            style={{
              width: '100%',
              maxWidth: '350px',
            }}
          >
            <button
              type="button"
              className="litigant-back"
              onClick={() => navigate('/login')}
            >
              <span aria-hidden="true">←</span>
              Choose Login Type
            </button>

            <div
              style={{
                marginTop: '26px',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  color: '#4263eb',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '1.7px',
                }}
              >
                SECURE SIGN IN
              </div>

              <h2
                style={{
                  margin: '9px 0 8px',
                  color: '#17243b',
                  fontSize: '27px',
                  letterSpacing: '-.7px',
                  lineHeight: 1.2,
                }}
              >
                Welcome back
              </h2>

              <p
                style={{
                  margin: 0,
                  color: '#758198',
                  fontSize: '12px',
                  lineHeight: 1.7,
                }}
              >
                Sign in to access and manage your registered cases.
              </p>
            </div>

            {successMessage && (
              <div
                role="status"
                style={{
                  display: 'flex',
                  gap: '9px',
                  alignItems: 'flex-start',
                  padding: '11px 12px',
                  marginBottom: '16px',
                  border: '1px solid #bbf7d0',
                  borderRadius: '9px',
                  background: '#f0fdf4',
                  color: '#166534',
                  fontSize: '12px',
                  lineHeight: 1.6,
                }}
              >
                <span aria-hidden="true">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                padding: '11px 12px',
                marginBottom: '21px',
                border: '1px solid #e3eaff',
                borderRadius: '9px',
                background: '#f7f9ff',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '18px' }}>
                🛡️
              </span>
              <div>
                <div
                  style={{
                    color: '#263c75',
                    fontSize: '11px',
                    fontWeight: 750,
                  }}
                >
                  Your case-management portal
                </div>
                <div
                  style={{
                    marginTop: '3px',
                    color: '#73809a',
                    fontSize: '10px',
                    lineHeight: 1.5,
                  }}
                >
                  Use the email associated with your account.
                </div>
              </div>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '17px' }}>
                <label
                  className="litigant-label"
                  htmlFor="litigant-email"
                >
                  Email address
                </label>
                <input
                  className="litigant-input"
                  style={inputStyle}
                  id="litigant-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label
                  className="litigant-label"
                  htmlFor="litigant-password"
                >
                  Password
                </label>
                <input
                  className="litigant-input"
                  style={inputStyle}
                  id="litigant-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '19px',
                }}
              >
                <Link
                  className="litigant-link"
                  style={{ fontSize: '11px' }}
                  to="/forgot-password"
                >
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
                    padding: '11px',
                    marginBottom: '15px',
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
                className="litigant-submit"
                disabled={loading}
              >
                {loading ? 'Signing in…' : 'Sign in securely  →'}
              </button>
            </form>

            <p
              style={{
                margin: '19px 0',
                textAlign: 'center',
                color: '#778399',
                fontSize: '11px',
              }}
            >
              New to the portal?{' '}
              <Link className="litigant-link" to="/signup">
                Create an account
              </Link>
            </p>

            <p
              style={{
                margin: '0 0 18px',
                textAlign: 'center',
                color: '#778399',
                fontSize: '11px',
              }}
            >
              Lawyer or Judge?{' '}
              <Link
                className="litigant-link"
                to="/login/professional"
              >
                Professional Login
              </Link>
            </p>

            <div
              style={{
                height: '1px',
                margin: '17px 0 15px',
                background: '#edf0f5',
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: '9px',
                alignItems: 'flex-start',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '15px' }}>
                🔐
              </span>
              <div>
                <div
                  style={{
                    color: '#35435a',
                    fontSize: '10px',
                    fontWeight: 750,
                  }}
                >
                  Secure account access
                </div>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: '#8a94a6',
                    fontSize: '10px',
                    lineHeight: 1.65,
                  }}
                >
                  Keep your login credentials private. Case access follows
                  your account permissions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default LitigantLogin