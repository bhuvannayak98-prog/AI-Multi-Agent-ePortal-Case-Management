import { useState } from 'react'
import { Link } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!email.trim()) {
      setError('Please enter your registered email address.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.detail === 'string'
            ? data.detail
            : 'Unable to process your request. Please try again.'
        )
        return
      }

      setMessage(
        typeof data.message === 'string'
          ? data.message
          : 'If an account exists for that email, password-reset instructions will be sent.'
      )
    } catch {
      setError(
        'Cannot connect to the server. Make sure the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-info">
          <div className="login-brand">
            <div className="login-logo">⚖</div>
            <div>
              <h2>AI Multi-Agent</h2>
              <span>e-Portal</span>
            </div>
          </div>

          <div className="login-info-content">
            <span className="login-label">ACCOUNT RECOVERY</span>
            <h1>Reset Your Password</h1>
            <p>
              Forgot your password? Request a secure password-reset link
              using the email address associated with your account.
            </p>

            <div className="login-features">
              <div><span>✓</span><p>Secure reset link by email</p></div>
              <div><span>✓</span><p>Time-limited reset token</p></div>
              <div><span>✓</span><p>Works for litigant and professional accounts</p></div>
              <div><span>✓</span><p>Account verification and approval rules remain in effect</p></div>
            </div>
          </div>

          <div className="login-university">
            Academic Prototype · Presidency University, Bengaluru
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-form-wrapper">
            <Link
              to="/login"
              className="login-back-button"
              style={{ display: 'inline-block', textDecoration: 'none' }}
            >
              ← Back to Login Choices
            </Link>

            <div className="login-form-heading">
              <span>ACCOUNT RECOVERY</span>
              <h2>Forgot Password?</h2>
              <p>Enter your registered email address below.</p>
            </div>

            {message && (
              <div
                role="status"
                style={{
                  background: '#e8f5e9',
                  color: '#1b5e20',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="alert"
                style={{
                  background: '#ffebee',
                  color: '#c62828',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label htmlFor="reset-email">Email Address</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                className="login-submit-button"
                disabled={loading}
              >
                {loading ? 'Sending request...' : 'Send Reset Link →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px' }}>
              Remember your password? <Link to="/login">Sign in</Link>
            </p>

            <div className="login-security-note">
              <span>🔒</span>
              <div>
                <strong>Secure password recovery</strong>
                <p>
                  For privacy, the server may show the same response whether
                  or not an account exists for the submitted email.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword