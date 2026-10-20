
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'
const PROFESSIONAL_ROLES = ['lawyer', 'judge', 'registrar']

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(null)

  const clearSession = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_email')
    localStorage.removeItem('user')
    navigate('/login/admin', { replace: true })
  }, [navigate])

  const readError = (data, fallback) => {
    if (typeof data?.detail === 'string') return data.detail
    if (data?.detail?.message) return data.detail.message
    if (typeof data?.message === 'string') return data.message
    return fallback
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    const token = localStorage.getItem('access_token')

    if (!token) {
      clearSession()
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        clearSession()
        return
      }

      if (!response.ok) {
        throw new Error(readError(data, 'Could not load accounts.'))
      }

      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (err) {
      setError(err.message || 'Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }, [clearSession])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  function logout() {
    clearSession()
  }

  async function updateAccount(user, action, value) {
    const role = String(user.role || '').trim().toLowerCase()

    if (role === 'admin') {
      window.alert('Approval and status changes are disabled for admin accounts.')
      return
    }

    if (
      action === 'approval' &&
      !PROFESSIONAL_ROLES.includes(role)
    ) {
      window.alert('Only professional accounts can be reviewed.')
      return
    }

    if (action === 'approval' && !user.email_verified) {
      window.alert('This professional must verify their email first.')
      return
    }

    const actionLabel =
      action === 'approval'
        ? value
          ? 'approve this professional'
          : 'revoke this professional’s approval'
        : value
          ? 'reactivate this account'
          : 'suspend this account'

    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) {
      return
    }

    const token = localStorage.getItem('access_token')

    if (!token) {
      clearSession()
      return
    }

    const actionKey = `${user.id}-${action}`
    const endpoint =
      action === 'approval'
        ? `/admin/users/${user.id}/approval`
        : `/admin/users/${user.id}/status`

    const payload =
      action === 'approval'
        ? { approved: value }
        : { active: value }

    setActionLoading(actionKey)
    setError('')

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        clearSession()
        return
      }

      if (!response.ok) {
        throw new Error(readError(data, 'Account update failed.'))
      }

      await loadUsers()
      window.alert(data.message || 'Account updated successfully.')
    } catch (err) {
      setError(err.message || 'Could not update this account.')
    } finally {
      setActionLoading(null)
    }
  }

  async function deleteAccount(user) {
    const role = String(user.role || '').trim().toLowerCase()

    // The backend must enforce self-deletion protection using the
    // authenticated admin ID. Do not trust localStorage for authorization.
    const confirmed = window.confirm(
      `PERMANENTLY DELETE ACCOUNT?\n\n` +
      `ID: ${user.id}\n` +
      `Email: ${user.email}\n` +
      `Role: ${role}\n\n` +
      'Cases owned by this account may also be deleted. ' +
      'This action cannot be undone.\n\nContinue?'
    )

    if (!confirmed) return

    const token = localStorage.getItem('access_token')

    if (!token) {
      clearSession()
      return
    }

    setDeleteLoading(user.id)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/admin/users/${user.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401 || response.status === 403) {
        clearSession()
        return
      }

      if (!response.ok) {
        throw new Error(readError(data, 'Account deletion failed.'))
      }

      await loadUsers()
      window.alert(data.message || 'Account deleted successfully.')
    } catch (err) {
      setError(err.message || 'Could not delete this account.')
    } finally {
      setDeleteLoading(null)
    }
  }

  const professionals = users.filter((user) =>
    PROFESSIONAL_ROLES.includes(
      String(user.role || '').trim().toLowerCase()
    )
  )

  const pending = professionals.filter(
    (user) =>
      Boolean(user.email_verified) &&
      !user.is_approved &&
      Boolean(user.is_active)
  )

  const active = users.filter((user) => Boolean(user.is_active)).length
  const suspended = users.length - active

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>CASE MANAGEMENT PORTAL</p>
          <h1 style={styles.heading}>Admin Dashboard</h1>
          <p style={styles.muted}>
            Manage registered accounts and professional approvals.
          </p>
        </div>

        <button style={styles.logout} onClick={logout}>
          Log out
        </button>
      </header>

      {error && (
        <div role="alert" style={styles.error}>
          <span>{error}</span>
          <button style={styles.retry} onClick={loadUsers}>
            Retry
          </button>
        </div>
      )}

      <section style={styles.stats}>
        <Stat label="Total Accounts" value={users.length} />
        <Stat label="Active Accounts" value={active} />
        <Stat label="Suspended Accounts" value={suspended} />
        <Stat label="Pending Professionals" value={pending.length} />
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <h2 style={styles.subheading}>Registered Accounts</h2>
            <p style={styles.muted}>
              Review professional accounts and manage account deletion.
            </p>
          </div>

          <button
            style={styles.refresh}
            onClick={loadUsers}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <p style={styles.empty}>Loading accounts...</p>
        ) : users.length === 0 ? (
          <p style={styles.empty}>No accounts found.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Email Verified</th>
                  <th style={styles.th}>Approved</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const role = String(user.role || '')
                    .trim()
                    .toLowerCase()

                  const isAdmin = role === 'admin'
                  const isProfessional =
                    PROFESSIONAL_ROLES.includes(role)

                  const approvalBusy =
                    actionLoading === `${user.id}-approval`
                  const statusBusy =
                    actionLoading === `${user.id}-status`
                  const deleteBusy = deleteLoading === user.id
                  const rowBusy =
                    approvalBusy || statusBusy || deleteBusy

                  return (
                    <tr key={user.id}>
                      <td style={styles.td}>{user.id}</td>
                      <td style={styles.td}>{user.email}</td>

                      <td style={styles.td}>
                        <span style={styles.roleBadge}>
                          {user.role}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {user.email_verified ? 'Yes' : 'No'}
                      </td>

                      <td style={styles.td}>
                        {user.is_approved ? 'Yes' : 'No'}
                      </td>

                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.badge,
                            background: user.is_active
                              ? '#dcfce7'
                              : '#fee2e2',
                            color: user.is_active
                              ? '#166534'
                              : '#991b1b',
                          }}
                        >
                          {user.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {!isAdmin && (
                            <>
                              {isProfessional && user.email_verified && (
                                <button
                                  style={{
                                    ...styles.actionButton,
                                    ...(user.is_approved
                                      ? styles.revokeButton
                                      : styles.approveButton),
                                  }}
                                  disabled={rowBusy}
                                  onClick={() =>
                                    updateAccount(
                                      user,
                                      'approval',
                                      !user.is_approved
                                    )
                                  }
                                >
                                  {approvalBusy
                                    ? 'Saving...'
                                    : user.is_approved
                                      ? 'Revoke Approval'
                                      : 'Approve'}
                                </button>
                              )}

                              <button
                                style={{
                                  ...styles.actionButton,
                                  ...(user.is_active
                                    ? styles.suspendButton
                                    : styles.reactivateButton),
                                }}
                                disabled={rowBusy}
                                onClick={() =>
                                  updateAccount(
                                    user,
                                    'status',
                                    !user.is_active
                                  )
                                }
                              >
                                {statusBusy
                                  ? 'Saving...'
                                  : user.is_active
                                    ? 'Suspend'
                                    : 'Reactivate'}
                              </button>
                            </>
                          )}

                          <button
                            style={{
                              ...styles.deleteButton,
                              ...(rowBusy ? styles.disabledButton : {}),
                            }}
                            disabled={rowBusy}
                            onClick={() => deleteAccount(user)}
                          >
                            {deleteBusy ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p style={styles.note}>
          Deletion is permanent and may also delete cases owned by the
          selected account. The backend protects the currently logged-in
          admin account.
        </p>
      </section>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <article style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </article>
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
    marginBottom: '28px',
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
  muted: {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  logout: {
    padding: '10px 18px',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '7px',
    cursor: 'pointer',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '26px',
  },
  statCard: {
    background: '#fff',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  statLabel: {
    margin: 0,
    color: '#64748b',
    fontSize: '14px',
  },
  statValue: {
    margin: '10px 0 0',
    fontSize: '30px',
    fontWeight: 700,
  },
  panel: {
    background: '#fff',
    padding: '22px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '18px',
  },
  subheading: {
    margin: 0,
    fontSize: '20px',
  },
  refresh: {
    padding: '9px 14px',
    background: '#1d4ed8',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  tableWrap: {
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
    verticalAlign: 'middle',
  },
  badge: {
    display: 'inline-block',
    padding: '5px 9px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  roleBadge: {
    display: 'inline-block',
    padding: '5px 8px',
    borderRadius: '6px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  actionButton: {
    padding: '7px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  approveButton: {
    background: '#dcfce7',
    borderColor: '#86efac',
    color: '#166534',
  },
  revokeButton: {
    background: '#fff7ed',
    borderColor: '#fdba74',
    color: '#9a3412',
  },
  suspendButton: {
    background: '#fee2e2',
    borderColor: '#fecaca',
    color: '#991b1b',
  },
  reactivateButton: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
    color: '#1d4ed8',
  },
  deleteButton: {
    padding: '7px 10px',
    background: '#991b1b',
    color: '#fff',
    border: '1px solid #991b1b',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  disabledButton: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
  empty: {
    padding: '24px 0',
    color: '#64748b',
    textAlign: 'center',
  },
  note: {
    marginTop: '18px',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.6,
  },
  error: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    marginBottom: '20px',
    padding: '14px',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
  },
  retry: {
    padding: '6px 12px',
    cursor: 'pointer',
  },
}
