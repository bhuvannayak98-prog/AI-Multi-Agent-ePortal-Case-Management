import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const API_BASE_URL = 'http://127.0.0.1:8000'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('Verifying your email...')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setStatus('Verification token is missing. Please open the complete link from your email.')
      return
    }

    let cancelled = false

    async function verify() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.detail || 'Verification failed. The link may have expired.')
        }

        if (!cancelled) {
          setSuccess(true)
          setStatus(result.message || 'Email verified successfully.')
        }
      } catch (error) {
        if (!cancelled) {
          setSuccess(false)
          setStatus(
            error.message.includes('Failed to fetch')
              ? 'Cannot connect to the backend. Make sure the backend is running.'
              : error.message
          )
        }
      }
    }

    verify()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  return (
    <main style={{
      maxWidth: 520,
      margin: '80px auto',
      padding: 24,
      textAlign: 'center',
      fontFamily: 'Cambria, serif',
    }}>
      <h1>Email Verification</h1>
      <p role="status">{status}</p>

      {success && (
        <p>
          Your email is verified. Account approval may still be required
          before you can access the portal.
        </p>
      )}

      <p>
        <Link to="/login">Go to Login</Link>
      </p>
    </main>
  )
}

export default VerifyEmail