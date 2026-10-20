import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')

    if (!token) {
      setError('Reset token is missing. Please request a new reset link.')
      return
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(
          typeof data.detail === 'string'
            ? data.detail
            : 'Unable to reset your password. The link may have expired.'
        )
        return
      }

      setMessage(
        typeof data.message === 'string'
          ? data.message
          : 'Password reset successfully. You can now sign in.'
      )

      setPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        navigate('/login')
      }, 1800)
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
            <span className="login-label">ACCOUNT SECURITY</span>
            <h1>Create a New Password</h1>
            <p>
              Choose a new password to regain access to your account.
              Your reset link must be valid.
            </p>

            <div className="login-features">
              <div><span>✓</span><p>Reset token checked by the server</p></div>
              <div><span>✓</span><p>Minimum 8-character password</p></div>
              <div><span>✓</span><p>Both password fields must match</p></div>
              <div><span>✓</span><p>Existing account verification rules remain in effect</p></div>
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
              ← Back to Login
            </Link>

            <div className="login-form-heading">
              <span>ACCOUNT RECOVERY</span>
              <h2>Reset Password</h2>
              <p>Enter and confirm your new password.</p>
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

            {!token && (
              <div
                role="alert"
                style={{
                  background: '#fff3e0',
                  color: '#8a4b08',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                }}
              >
                No reset token was found in this URL. Request a new reset link.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <div className="login-form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              <button
                type="submit"
                className="login-submit-button"
                disabled={loading || !token}
              >
                {loading ? 'Resetting password...' : 'Reset Password →'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '20px' }}>
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword