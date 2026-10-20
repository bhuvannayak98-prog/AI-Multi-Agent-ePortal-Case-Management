
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LawyerDashboard.css';

const API_URL = 'http://127.0.0.1:8000'

function LawyerDashboard() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [priorityResults, setPriorityResults] = useState({})
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])
  const [notificationError, setNotificationError] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [clearingNotifications, setClearingNotifications] = useState(false)

  // Load cases and refresh them every 30 seconds.
  useEffect(() => {
    const role = (localStorage.getItem('userRole') || '').toLowerCase()
    const token = localStorage.getItem('accessToken')

    if (role !== 'lawyer' || !token) {
      navigate('/login', { replace: true })
      return
    }

    let cancelled = false

    async function loadCases() {
      try {
        const response = await fetch(`${API_URL}/cases`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const data = await response.json().catch(() => ({}))

        if (response.status === 401) {
          if (!cancelled) {
            setError('Your session is invalid or expired. Please log in again.')
          }
          return
        }

        if (response.status === 403) {
          if (!cancelled) {
            setError('You do not have permission to view these cases.')
          }
          return
        }

        if (!response.ok) {
          const detail =
            typeof data.detail === 'string'
              ? data.detail
              : data.detail?.message || 'Unable to load cases.'

          throw new Error(detail)
        }

        const receivedCases = Array.isArray(data)
          ? data
          : Array.isArray(data.cases)
            ? data.cases
            : []

        if (!cancelled) {
          setCases(receivedCases)
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load cases.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCases()

    const refreshInterval = window.setInterval(loadCases, 30000)

    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
    }
  }, [navigate])

  // Load reminders.
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    let cancelled = false

    async function loadNotifications() {
      try {
        const response = await fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error('Unable to load reminders.')
        }

        const data = await response.json()

        if (!cancelled) {
          setNotifications(
            Array.isArray(data.notifications) ? data.notifications : []
          )
          setNotificationError('')
        }
      } catch (err) {
        if (!cancelled) {
          setNotificationError(err.message || 'Unable to load reminders.')
        }
      }
    }

    loadNotifications()

    return () => {
      cancelled = true
    }
  }, [])

  // Clear all reminders after confirmation.
  async function clearNotifications() {
    if (notifications.length === 0 || clearingNotifications) return

    const confirmed = window.confirm(
      'Are you sure you want to clear all reminders?'
    )

    if (!confirmed) return

    const token = localStorage.getItem('accessToken')

    if (!token) {
      setNotificationError('Please log in again to clear reminders.')
      return
    }

    setClearingNotifications(true)
    setNotificationError('')

    try {
      const response = await fetch(`${API_URL}/notifications`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.detail || 'Unable to clear reminders.')
      }

      setNotifications([])
      setNotificationsOpen(false)
    } catch (err) {
      setNotificationError(err.message || 'Unable to clear reminders.')
    } finally {
      setClearingNotifications(false)
    }
  }

  // Show only pending or accepted lawyer-request workflows.
  const lawyerCases = useMemo(() => {
    return cases.filter((item) => {
      const representation = String(
        item.representationType || item.representation_type || ''
      )
        .trim()
        .toLowerCase()

      const stage = String(
        item.workflowStage || item.workflow_stage || ''
      )
        .trim()
        .toLowerCase()

      return (
        representation === 'recommend a lawyer' &&
        ['awaiting lawyer approval', 'lawyer assigned'].includes(stage)
      )
    })
  }, [cases])

  // Fetch priorities for assigned cases.
  useEffect(() => {
    const token = localStorage.getItem('accessToken')

    if (!token || lawyerCases.length === 0) return

    let cancelled = false

    async function loadPriorities() {
      const eligibleCases = lawyerCases.filter((item) => {
        const stage = String(
          item.workflowStage || item.workflow_stage || ''
        )
          .trim()
          .toLowerCase()

        const id = item.caseId || item.case_id || item.id

        return (
          stage === 'lawyer assigned' &&
          id &&
          !Object.prototype.hasOwnProperty.call(priorityResults, id)
        )
      })

      const results = await Promise.all(
        eligibleCases.map(async (item) => {
          const id = item.caseId || item.case_id || item.id

          try {
            const response = await fetch(`${API_URL}/ai/priority`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                caseId: id,
                caseType: item.caseType || item.case_type || '',
                description: item.description || '',
                lawSection: item.lawSection || item.law_section || '',
                filingDate: item.filingDate || item.filing_date || '',
                urgency: item.urgency || 'Medium',
              }),
            })

            if (!response.ok) {
              return { id, result: null }
            }

            return { id, result: await response.json() }
          } catch {
            return { id, result: null }
          }
        })
      )

      if (cancelled) return

      setPriorityResults((previous) => {
        const next = { ...previous }

        for (const entry of results) {
          if (entry && entry.result) {
            next[entry.id] = entry.result
          }
        }

        return next
      })
    }

    loadPriorities()

    return () => {
      cancelled = true
    }
  }, [lawyerCases])

  const pendingCount = lawyerCases.filter((item) => {
    const status = String(item.status || '').toLowerCase()

    return ['registered', 'pending', 'under review'].includes(status)
  }).length

  function renderPriority(item) {
    const id = item.caseId || item.case_id || item.id
    const result = priorityResults[id]

    if (!result) {
      return <span className="priority-not-calculated">Not calculated</span>
    }

    const priority = String(result.priority || '').toUpperCase()

    const priorityColors = {
      CRITICAL: { background: '#fee2e2', color: '#991b1b' },
      HIGH: { background: '#ffedd5', color: '#9a3412' },
      MEDIUM: { background: '#fef3c7', color: '#92400e' },
      LOW: { background: '#dcfce7', color: '#166534' },
    }

    const style = priorityColors[priority]

    if (!style || !Number.isFinite(Number(result.score))) {
      return <span className="priority-not-calculated">Not calculated</span>
    }

    return (
      <span
        className="priority-badge"
        style={style}
      >
        {priority} · {result.score}/100
      </span>
    )
  }

  return (
    <div className="dashboard-page lawyer-dashboard">
      {/* Fixed top-right notification control */}
      <div className="dashboard-notifications">
        <button
          type="button"
          className="dashboard-notifications-button"
          onClick={() => setNotificationsOpen((open) => !open)}
          aria-expanded={notificationsOpen}
          aria-label={`Notifications and reminders: ${notifications.length}`}
        >
          <span className="notification-bell">🔔</span>
          <span>Reminders</span>

          {notifications.length > 0 && (
            <span className="notification-count">
              {notifications.length}
            </span>
          )}
        </button>

        {notificationsOpen && (
          <div className="dashboard-notifications-menu">
            <div className="notification-menu-header">
              <div>
                <h3>Reminders</h3>
                <p>
                  {notifications.length} notification
                  {notifications.length === 1 ? '' : 's'}
                </p>
              </div>

              <button
                type="button"
                className="notification-clear-button"
                onClick={clearNotifications}
                disabled={
                  clearingNotifications || notifications.length === 0
                }
              >
                {clearingNotifications ? 'Clearing...' : 'Clear all'}
              </button>
            </div>

            {notificationError && (
              <p role="alert" className="notification-error">
                {notificationError}
              </p>
            )}

            {notifications.length === 0 && !notificationError && (
              <div className="notification-empty">
                <span>🔔</span>
                <strong>You're all caught up</strong>
                <p>No reminders right now.</p>
              </div>
            )}

            {notifications.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className="notification-item"
              >
                <span className="notification-item-dot" />

                <div className="notification-item-content">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>

                  {notification.caseId && (
                    <small>Case ID: {notification.caseId}</small>
                  )}

                  <small className="notification-time">
                    {notification.createdAt
                      ? new Date(
                          notification.createdAt
                        ).toLocaleString()
                      : ''}
                  </small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard heading */}
      <header className="page-heading">
        <div>
          <span className="dashboard-eyebrow">LAWYER WORKSPACE</span>
          <h2>Lawyer Dashboard</h2>
          <p>Manage your pending requests and accepted case assignments.</p>
        </div>

        <span className="dashboard-user">
          {localStorage.getItem('userEmail') || ''}
        </span>
      </header>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <p>Cases Requiring a Lawyer</p>
            <h3>{loading ? '—' : lawyerCases.length}</h3>
            <span className="stat-description">Current lawyer requests</span>
          </div>

          <div className="stat-icon">▤</div>
        </div>

        <div className="stat-card">
          <div>
            <p>Registered / Pending</p>
            <h3>{loading ? '—' : pendingCount}</h3>
            <span className="stat-description">Cases needing attention</span>
          </div>

          <div className="stat-icon stat-icon-orange">◷</div>
        </div>
      </div>

      {/* Case management actions */}
      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h3>Case Management</h3>
            <p>
              Review cases whose representation workflow requests a lawyer.
            </p>
          </div>
        </div>

        <div className="quick-actions">
          <Link to="/cases" className="action-card">
            <div className="action-icon">▤</div>

            <div>
              <strong>View Cases</strong>
              <span>Open cases available to your account</span>
            </div>

            <span className="action-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* Lawyer case list */}
      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h3>Cases Requiring a Lawyer</h3>
            <p>
              Self-representation cases are excluded from this list.
            </p>
          </div>

          <Link to="/cases" className="view-all-link">
            View all →
          </Link>
        </div>

        {loading && (
          <div className="dashboard-state" role="status">
            <span className="state-spinner" />
            Loading cases...
          </div>
        )}

        {!loading && error && (
          <p role="alert" className="dashboard-error">
            {error}
          </p>
        )}

        {!loading && !error && lawyerCases.length === 0 && (
          <div className="dashboard-empty">
            <span className="empty-icon">▤</span>
            <h4>No lawyer requests found</h4>
            <p>
              Cases will appear here when their representation choice is
              “Recommend a Lawyer.”
            </p>
          </div>
        )}

        {!loading && !error && lawyerCases.length > 0 && (
          <div className="case-table-wrapper">
            <table className="case-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Case Type</th>
                  <th>Parties</th>
                  <th>Priority</th>
                  <th>Proposed Hearing</th>
                  <th>Status</th>
                  <th>Workflow</th>
                </tr>
              </thead>

              <tbody>
                {lawyerCases.slice(0, 10).map((item, index) => {
                  const id = item.caseId || item.case_id || item.id

                  return (
                    <tr key={id || index}>
                      <td className="case-id-cell">
                        {id ? (
                          <Link to={`/cases/${encodeURIComponent(id)}`}>
                            {id}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>{item.caseType || item.case_type || '—'}</td>

                      <td>
                        {item.parties ||
                          `${item.petitioner || '—'} vs ${item.respondent || '—'}`}
                      </td>

                      <td>{renderPriority(item)}</td>

                      <td>
                        {item.proposedHearingDate || 'Not scheduled'}
                        {item.proposedHearingTime
                          ? ` · ${item.proposedHearingTime}`
                          : ''}
                      </td>

                      <td>
                        <span className="case-status">
                          {item.status || 'Registered'}
                        </span>
                      </td>

                      <td>
                        {item.workflowStage ||
                          item.workflow_stage ||
                          'Awaiting lawyer selection'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && lawyerCases.length > 10 && (
          <p className="table-footnote">
            Showing the first 10 cases. Use View all to access the complete list.
          </p>
        )}
      </section>
    </div>
  )
}



export default LawyerDashboard
