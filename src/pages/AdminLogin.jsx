import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function AdminLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed. Please try again.')
      }

      const role = String(data.user?.role || data.role || '')
        .trim()
        .toLowerCase()

      const token = data.access_token || data.token

      if (role !== 'admin') {
        throw new Error('Access denied. Admin accounts only.')
      }

      if (!token) {
        throw new Error(
          'Login response did not contain an access token. Check the backend response.'
        )
      }

      // Store the token only after the backend confirms Admin access.
      localStorage.setItem('access_token', token)
      localStorage.setItem('user_role', 'Admin')
      localStorage.setItem('user_email', data.user?.email || email.trim())

      navigate('/admin')
    } catch (err) {
      setError(
        err.message ||
          'Unable to connect to the server. Check that the backend is running.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.icon}>🔐</div>

        <h1 style={styles.title}>Admin Login</h1>
        <p style={styles.subtitle}>
          Authorized administration access only
        </p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label} htmlFor="admin-email">
            Email address
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            placeholder="Enter admin email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={styles.input}
          />

          <label style={styles.label} htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter admin password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={styles.input}
          />

          {error && (
            <div role="alert" style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In as Admin'}
          </button>
        </form>

        <p style={styles.footer}>
          <Link to="/login" style={styles.link}>
            Back to login options
          </Link>
        </p>
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '24px',
    background: '#f3f6fb',
    fontFamily: 'Arial, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '32px',
    background: '#ffffff',
    borderRadius: '14px',
    boxShadow: '0 8px 28px rgba(20, 40, 80, 0.10)',
  },
  icon: {
    fontSize: '36px',
    textAlign: 'center',
  },
  title: {
    margin: '12px 0 8px',
    textAlign: 'center',
    color: '#183153',
    fontSize: '28px',
  },
  subtitle: {
    marginBottom: '28px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#26364b',
    fontSize: '14px',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    marginBottom: '20px',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    fontSize: '15px',
  },
  button: {
    width: '100%',
    padding: '13px',
    border: 'none',
    borderRadius: '7px',
    background: '#1d4ed8',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  error: {
    padding: '10px',
    marginBottom: '16px',
    borderRadius: '6px',
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: '14px',
  },
  footer: {
    marginTop: '22px',
    textAlign: 'center',
    fontSize: '14px',
  },
  link: {
    color: '#1d4ed8',
    textDecoration: 'none',
  },
}