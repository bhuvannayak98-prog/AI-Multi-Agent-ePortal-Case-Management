import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Signup.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

const LAWYER_EXPERTISE_OPTIONS = [
  'Civil',
  'Criminal',
  'Cybercrime',
  'Property',
  'Family',
]

function Signup() {
  const navigate = useNavigate()

  const [accountType, setAccountType] = useState('litigant')
  const [professionalRole, setProfessionalRole] = useState('Lawyer')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [expertise, setExpertise] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function toggleExpertise(area) {
    setExpertise((current) =>
      current.includes(area)
        ? current.filter((item) => item !== area)
        : [...current, area]
    )
  }

  function changeAccountType(type) {
    setAccountType(type)
    setError('')
    setMessage('')

    if (type !== 'professional') {
      setExpertise([])
    }
  }

  function changeProfessionalRole(role) {
    setProfessionalRole(role)
    setError('')
    setMessage('')

    if (role !== 'Lawyer') {
      setExpertise([])
    }
  }

  async function handleSignup(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (password.length > 128) {
      setError('Password cannot exceed 128 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (
      accountType === 'professional' &&
      professionalRole === 'Lawyer' &&
      expertise.length === 0
    ) {
      setError('Select at least one area of lawyer expertise.')
      return
    }

    setLoading(true)

    const endpoint =
      accountType === 'professional'
        ? '/auth/signup/professional'
        : '/auth/signup'

const requestBody =
  accountType === 'professional'
    ? {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        role: professionalRole,
        expertise: professionalRole === 'Lawyer' ? expertise : [],
      }
    : {
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
      }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail =
          typeof data.detail === 'string'
            ? data.detail
            : 'Unable to create your account.'

        const normalizedDetail = detail.toLowerCase()

        if (
          response.status === 503 ||
          (
            normalizedDetail.includes('email') &&
            (
              normalizedDetail.includes('send') ||
              normalizedDetail.includes('smtp') ||
              normalizedDetail.includes('delivery')
            )
          )
        ) {
          setError(
            'The account may already have been created, but the verification email could not be sent. Do not register again yet. Fix the email configuration and use Resend Verification.'
          )
        } else {
          setError(detail)
        }

        return
      }

      setPassword('')
      setConfirmPassword('')

      const signupMessage =
        accountType === 'professional'
          ? 'Your professional application was submitted. Please verify your email and wait for Admin approval before signing in.'
          : 'Your account was created successfully. Please check your email and verify your address before signing in.'

      navigate('/login', {
        replace: true,
        state: {
          signupMessage,
        },
      })
    } catch {
      setError(
        'Cannot connect to the server. Check whether the backend is running. If the request was interrupted, check whether the account was created before trying again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signup-page">
      <section className="signup-card">
        <button
          type="button"
          className="signup-back"
          onClick={() => navigate('/')}
        >
          ← Back to Home
        </button>

        <header className="signup-header">
          <div className="signup-logo" aria-hidden="true">
            ⚖
          </div>
          <h1>Create your account</h1>
          <p>
            Join the AI Multi-Agent e-Portal for Case Management
          </p>
        </header>

        <div className="signup-type-label">
          How would you like to register?
        </div>

        <div className="signup-type-options">
          <button
            type="button"
            className={`signup-type-card ${
              accountType === 'litigant' ? 'selected' : ''
            }`}
            onClick={() => changeAccountType('litigant')}
            aria-pressed={accountType === 'litigant'}
          >
            <span className="signup-type-icon" aria-hidden="true">
              👤
            </span>
            <strong>Litigant</strong>
            <span>
              Register a case, track progress and find a lawyer.
            </span>
            <small>Email verification required</small>
          </button>

          <button
            type="button"
            className={`signup-type-card ${
              accountType === 'professional' ? 'selected' : ''
            }`}
            onClick={() => changeAccountType('professional')}
            aria-pressed={accountType === 'professional'}
          >
            <span className="signup-type-icon" aria-hidden="true">
              ⚖️
            </span>
            <strong>Legal Professional</strong>
            <span>
              Apply for a lawyer, judge or registrar account.
            </span>
            <small>Email verification and approval required</small>
          </button>
        </div>

        <form onSubmit={handleSignup} className="signup-form">
          {accountType === 'professional' && (
            <div className="signup-field">
              <label htmlFor="professionalRole">
                Requested professional role
              </label>
              <select
                id="professionalRole"
                value={professionalRole}
                onChange={(event) =>
                  changeProfessionalRole(event.target.value)
                }
                required
              >
                <option value="Lawyer">Lawyer</option>
                <option value="Judge">Judge</option>
      
              </select>
              <p className="signup-help">
                Selecting a role does not grant professional access.
                Admin approval is required.
              </p>
            </div>
          )}

          {accountType === 'professional' &&
            professionalRole === 'Lawyer' && (
              <fieldset className="signup-expertise">
                <legend>Areas of practice</legend>
                <p className="signup-help">
                  Select all areas that apply. Choose at least one.
                </p>

                <div className="signup-expertise-options">
                  {LAWYER_EXPERTISE_OPTIONS.map((area) => (
                    <label
                      className="signup-expertise-option"
                      key={area}
                    >
                      <input
                        type="checkbox"
                        name="expertise"
                        value={area}
                        checked={expertise.includes(area)}
                        onChange={() => toggleExpertise(area)}
                      />
                      <span>{area}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

          <div className="signup-field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              required
            />
          </div>

          <div className="signup-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="signup-field">
            <label htmlFor="password">Create password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>

          <div className="signup-field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Enter your password again"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>

          {error && (
            <div className="signup-alert signup-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div
              className="signup-alert signup-success"
              role="status"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            className="signup-submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : accountType === 'litigant'
                ? 'Create Litigant Account'
                : `Submit ${professionalRole} Application`}
          </button>
        </form>

        <p className="signup-login-link">
          Already have an account? <Link to="/login">Log in</Link>
        </p>

        <p className="signup-security-note">
          Your portal password is separate from your email account
          password. Never share your email password with this portal.
        </p>
      </section>
    </main>
  )
}

export default Signup