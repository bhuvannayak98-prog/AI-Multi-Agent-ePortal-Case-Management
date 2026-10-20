import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

export default function ProfessionalApprovals() {
  const navigate = useNavigate()

  const [professionals, setProfessionals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const loadPendingProfessionals = useCallback(async () => {
    setLoading(true)
    setError('')

    const token = localStorage.getItem('access_token')

    if (!token) {
      navigate('/login/admin', { replace: true })
      setLoading(false)
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/admin/pending-professionals`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_email')
        navigate('/login/admin', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          data.detail || 'Could not load pending professionals.'
        )
      }

      setProfessionals(
        Array.isArray(data.pending) ? data.pending : []
      )
    } catch (err) {
      setError(
        err.message || 'Could not connect to the backend.'
      )
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadPendingProfessionals()
  }, [loadPendingProfessionals])

  async function reviewProfessional(user, approved) {
    const action = approved ? 'approve' : 'revoke approval for'

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${user.email}?`
      )
    ) {
      return
    }

    const token = localStorage.getItem('access_token')

    if (!token) {
      navigate('/login/admin', { replace: true })
      return
    }

    setProcessingId(user.id)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/admin/users/${user.id}/approval`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ approved }),
        }
      )

      const data = await response.json()

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_role')
        localStorage.removeItem('user_email')
        navigate('/login/admin', { replace: true })
        return
      }

      if (!response.ok) {
        throw new Error(
          data.detail || 'Could not update professional approval.'
        )
      }

      window.alert(data.message || 'Approval status updated.')
      await loadPendingProfessionals()
    } catch (err) {
      setError(
        err.message || 'Could not update professional approval.'
      )
    } finally {
      setProcessingId(null)
    }
  }

  function logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_email')
    navigate('/login/admin', { replace: true })
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>CASE MANAGEMENT PORTAL</p>
          <h1 style={styles.heading}>Professional Approvals</h1>
          <p style={styles.subtitle}>
            Review verified professionals awaiting administrator approval.
          </p>
        </div>

        <button style={styles.logout} onClick={logout}>
          Log out
        </button>
      </header>

      <nav style={styles.navigation}>
        <Link to="/admin" style={styles.backLink}>
          ← Back to Admin Dashboard
        </Link>

        <button
          style={styles.refresh}
          onClick={loadPendingProfessionals}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh list'}
        </button>
      </nav>

      {error && (
        <div role="alert" style={styles.error}>
          {error}
        </div>
      )}

      <section style={styles.summary}>
        <div>
          <p style={styles.summaryLabel}>Awaiting approval</p>
          <p style={styles.summaryValue}>{professionals.length}</p>
        </div>
        <p style={styles.summaryDescription}>
          Only active, email-verified professional accounts appear here.
        </p>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Pending Applications</h2>

        {loading ? (
          <p style={styles.empty}>Loading applications...</p>
        ) : professionals.length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={styles.emptyHeading}>No pending applications</h3>
            <p style={styles.empty}>
              Verified professional accounts awaiting approval will appear here.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Account ID</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Professional Role</th>
                  <th style={styles.th}>Email Verification</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {professionals.map((user) => (
                  <tr key={user.id}>
                    <td style={styles.td}>{user.id}</td>
                    <td style={styles.td}>{user.email}</td>
                    <td style={styles.td}>
                      <span style={styles.roleBadge}>{user.role}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.verifiedBadge}>
                        Verified
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.approveButton}
                        disabled={processingId === user.id}
                        onClick={() => reviewProfessional(user, true)}
                      >
                        {processingId === user.id
                          ? 'Processing...'
                          : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={styles.note}>
          Approval enables eligible professionals to sign in, subject to
          backend verification and account-status checks. This page does not
          make legal decisions or grant judicial authority.
        </p>
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    padding: '32px',
    background: '#f3f6fb',
    fontFamily: 'Arial, sans-serif',
    color: '#183153',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  eyebrow: {
    margin: '0 0 8px',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1.5px',
  },
  heading: {
    margin: 0,
    fontSize: '30px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  logout: {
    padding: '10px 18px',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    cursor: 'pointer',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '24px',
  },
  backLink: {
    color: '#1d4ed8',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  refresh: {
    padding: '9px 14px',
    background: '#1d4ed8',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
    flexWrap: 'wrap',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '24px',
  },
  summaryLabel: {
    margin: 0,
    color: '#64748b',
    fontSize: '14px',
  },
  summaryValue: {
    margin: '8px 0 0',
    fontSize: '32px',
    fontWeight: 700,
  },
  summaryDescription: {
    color: '#64748b',
    fontSize: '13px',
    lineHeight: 1.6,
    maxWidth: '400px',
  },
  panel: {
    background: '#fff',
    padding: '22px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
  },
  sectionTitle: {
    margin: '0 0 18px',
    fontSize: '20px',
  },
  tableWrapper: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '14px',
  },
  th: {
    padding: '12px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '5px 8px',
    borderRadius: '6px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '12px',
  },
  verifiedBadge: {
    display: 'inline-block',
    padding: '5px 8px',
    borderRadius: '6px',
    background: '#dcfce7',
    color: '#166534',
    fontSize: '12px',
    fontWeight: 600,
  },
  approveButton: {
    padding: '8px 14px',
    border: '1px solid #86efac',
    borderRadius: '6px',
    background: '#dcfce7',
    color: '#166534',
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '24px 12px',
  },
  emptyHeading: {
    margin: 0,
    fontSize: '17px',
  },
  empty: {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  error: {
    padding: '14px',
    marginBottom: '20px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '14px',
  },
  note: {
    marginTop: '20px',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.7,
  },
}