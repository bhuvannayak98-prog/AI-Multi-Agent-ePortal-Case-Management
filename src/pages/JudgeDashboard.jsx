
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

function JudgeDashboard() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyCase, setBusyCase] = useState('')

  const [availabilityStartDate, setAvailabilityStartDate] = useState('')
  const [availabilityEndDate, setAvailabilityEndDate] = useState('')
  const [availabilityStart, setAvailabilityStart] = useState('09:00')
  const [availabilityEnd, setAvailabilityEnd] = useState('12:00')
  const [availabilityBusy, setAvailabilityBusy] = useState(false)

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    const role = (localStorage.getItem('userRole') || '').toLowerCase()

    if (!token || role !== 'judge') {
      navigate('/login', { replace: true })
      return
    }

    setLoading(true)
    setError('')

    try {
      const headers = { Authorization: `Bearer ${token}` }

      const [caseResponse, notificationResponse] = await Promise.all([
        fetch(`${API_URL}/cases`, { headers }),
        fetch(`${API_URL}/notifications`, { headers }),
      ])

      if (caseResponse.status === 401) {
        navigate('/login', { replace: true })
        return
      }

      if (!caseResponse.ok) {
        throw new Error(`Could not load cases (${caseResponse.status}).`)
      }

      const caseData = await caseResponse.json()
      const notificationData = notificationResponse.ok
        ? await notificationResponse.json()
        : { notifications: [] }

      const caseList = Array.isArray(caseData)
        ? caseData
        : Array.isArray(caseData.cases)
          ? caseData.cases
          : []

      setCases(caseList)
      setNotifications(
        Array.isArray(notificationData.notifications)
          ? notificationData.notifications
          : []
      )
    } catch (err) {
      setError(err.message || 'Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      loadDashboard()
    }, 30000)

    return () => window.clearInterval(refreshInterval)
  }, [loadDashboard])

  const getId = (item) => item.case_id || item.caseId || ''

  const getDate = (item) =>
    item.proposedHearingDate || item.proposed_hearing_date || ''

  const getTime = (item) =>
    item.proposedHearingTime || item.proposed_hearing_time || ''

  const getDecision = (item) =>
    String(item.hearingDecision || item.hearing_decision || 'Pending')

  const pendingCases = cases.filter(
    (item) =>
      getDate(item) &&
      getTime(item) &&
      getDecision(item).toLowerCase() === 'pending'
  )

  const reviewedCases = cases.filter((item) =>
    ['approved', 'modified', 'rejected'].includes(
      getDecision(item).toLowerCase()
    )
  )

  async function reviewHearing(caseItem, decision) {
    const caseId = getId(caseItem)
    if (!caseId || busyCase) return

    let comments = ''
    let modifiedDate = ''
    let modifiedTime = ''

    if (decision === 'Modified') {
      modifiedDate =
        window.prompt(
          'Enter the new hearing date (YYYY-MM-DD):',
          getDate(caseItem)
        ) || ''

      if (!modifiedDate) return

      if (!/^\d{4}-\d{2}-\d{2}$/.test(modifiedDate)) {
        setMessage('Enter the date in YYYY-MM-DD format.')
        return
      }

      const [year, month, day] = modifiedDate.split('-').map(Number)
      const parsedDate = new Date(year, month - 1, day)

      const isValidDate =
        parsedDate.getFullYear() === year &&
        parsedDate.getMonth() === month - 1 &&
        parsedDate.getDate() === day

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (!isValidDate || parsedDate < today) {
        setMessage('Enter a valid date that is today or later.')
        return
      }

      const currentTime = getTime(caseItem)
      const match = currentTime.match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)/i
      )

      const defaultTime = match
        ? `${String(
            (Number(match[1]) % 12) +
              (match[3].toUpperCase() === 'PM' ? 12 : 0)
          ).padStart(2, '0')}:${match[2]}`
        : /^\d{2}:\d{2}$/.test(currentTime)
          ? currentTime
          : ''

      modifiedTime =
        window.prompt(
          'Enter the new hearing START time in 24-hour format (HH:MM), e.g. 10:30:',
          defaultTime
        ) || ''

      if (!modifiedTime) return

      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(modifiedTime)) {
        setMessage('Enter a valid start time in HH:MM format, such as 10:30.')
        return
      }

      comments =
        window.prompt('Reason for modifying the hearing:') || ''
    } else if (decision === 'Rejected') {
      comments =
        window.prompt('Reason for rejecting this proposal:') || ''

      if (!comments.trim()) {
        setMessage('Please provide a reason for rejection.')
        return
      }
    }

    setBusyCase(caseId)
    setMessage('')
    setError('')

    try {
      const token = localStorage.getItem('accessToken')

      const response = await fetch(
        `${API_URL}/judge/cases/${encodeURIComponent(caseId)}/hearing-decision`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision,
            comments,
            modifiedDate,
            modifiedTime,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.detail || `Review failed (${response.status}).`
        )
      }

      setMessage(`Case ${caseId}: ${decision} decision submitted.`)
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Could not submit the decision.')
    } finally {
      setBusyCase('')
    }
  }

  async function saveAvailability(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    const token = localStorage.getItem('accessToken')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    if (
      !availabilityStartDate ||
      !availabilityEndDate ||
      !availabilityStart ||
      !availabilityEnd
    ) {
      setError('Please fill in both dates and the daily start and end times.')
      return
    }

    if (availabilityStartDate > availabilityEndDate) {
      setError('The end date must be on or after the start date.')
      return
    }

    if (availabilityStart >= availabilityEnd) {
      setError('End time must be later than start time.')
      return
    }

    const startDate = new Date(`${availabilityStartDate}T00:00:00Z`)
    const endDate = new Date(`${availabilityEndDate}T00:00:00Z`)
    const dayCount =
      Math.round((endDate - startDate) / 86400000) + 1

    if (dayCount > 366) {
      setError('Please register no more than 366 days at a time.')
      return
    }

    setAvailabilityBusy(true)

    let savedCount = 0
    let skippedCount = 0
    const failures = []

    try {
      for (let offset = 0; offset < dayCount; offset += 1) {
        const currentDate = new Date(startDate)
        currentDate.setUTCDate(currentDate.getUTCDate() + offset)

        const availableDate = currentDate.toISOString().slice(0, 10)

        const response = await fetch(`${API_URL}/judge/availability`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            available_date: availableDate,
            start_time: `${availabilityStart}:00`,
            end_time: `${availabilityEnd}:00`,
          }),
        })

        const data = await response.json().catch(() => ({}))
        const detail = data.detail

        if (response.ok) {
          savedCount += 1
          continue
        }

        const readableDetail = Array.isArray(detail)
          ? detail
              .map((item) => {
                const field = Array.isArray(item.loc)
                  ? item.loc.filter((part) => part !== 'body').join('.')
                  : 'request'

                return `${field}: ${item.msg || 'Invalid value'}`
              })
              .join(', ')
          : typeof detail === 'string'
            ? detail
            : `Request failed (${response.status})`

        if (
          response.status === 409 &&
          (
            readableDetail.toLowerCase().includes('already exists') ||
            readableDetail.toLowerCase().includes('already registered')
          )
        ) {
          skippedCount += 1
        } else {
          failures.push(`${availableDate}: ${readableDetail}`)
        }
      }

      if (savedCount > 0 || skippedCount > 0) {
        setMessage(
          `Saved ${savedCount} date(s)` +
            (skippedCount
              ? `; skipped ${skippedCount} duplicate date(s)`
              : '') +
            '.'
        )
      }

      if (failures.length > 0) {
        setError(
          `Some dates could not be saved: ${failures.slice(0, 5).join('; ')}` +
            (failures.length > 5
              ? `; and ${failures.length - 5} more`
              : '')
        )
      }

      if (savedCount > 0) {
        setAvailabilityStartDate('')
        setAvailabilityEndDate('')
        await loadDashboard()
      }
    } catch (err) {
      setError(err.message || 'Could not connect to the backend.')
    } finally {
      setAvailabilityBusy(false)
    }
  }

  async function markRead(notification) {
    if (notification.isRead) return

    try {
      const response = await fetch(
        `${API_URL}/notifications/${notification.id}/read`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Could not mark notification as read.')
      }

      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Could not update notification.')
    }
  }

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <h2>Judge Dashboard</h2>
          <p>
            Review AI-assisted hearing proposals and make judicial decisions.
          </p>
        </div>

        <span className="dashboard-user">
          {localStorage.getItem('userEmail') || ''}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <p>Cases for Review</p>
            <h3>{loading ? '—' : pendingCases.length}</h3>
          </div>
          <div className="stat-icon">◷</div>
        </div>

        <div className="stat-card">
          <div>
            <p>Upcoming Hearings</p>
            <h3>
              {loading
                ? '—'
                : cases.filter(
                    (item) =>
                      getDate(item) &&
                      getDecision(item).toLowerCase() !== 'rejected'
                  ).length}
            </h3>
          </div>
          <div className="stat-icon">◫</div>
        </div>

        <div className="stat-card">
          <div>
            <p>Reviewed Recommendations</p>
            <h3>{loading ? '—' : reviewedCases.length}</h3>
          </div>
          <div className="stat-icon">✓</div>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: '#b42318' }}>
          {error}
        </p>
      )}

      {message && <p role="status">{message}</p>}

      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h3>Manage Hearing Availability</h3>
            <p>
              Register future dates and time ranges when you can conduct
              hearings.
            </p>
          </div>
        </div>

        <form onSubmit={saveAvailability}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'end',
            }}
          >
            <label style={{ display: 'grid', gap: 6 }}>
              Available from
              <input
                type="date"
                value={availabilityStartDate}
                onChange={(event) =>
                  setAvailabilityStartDate(event.target.value)
                }
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              Available until
              <input
                type="date"
                value={availabilityEndDate}
                onChange={(event) =>
                  setAvailabilityEndDate(event.target.value)
                }
                min={availabilityStartDate || undefined}
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              Start time
              <input
                type="time"
                value={availabilityStart}
                onChange={(event) =>
                  setAvailabilityStart(event.target.value)
                }
                required
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              End time
              <input
                type="time"
                value={availabilityEnd}
                onChange={(event) =>
                  setAvailabilityEnd(event.target.value)
                }
                required
              />
            </label>

            <button type="submit" disabled={availabilityBusy}>
              {availabilityBusy ? 'Saving...' : 'Save Availability'}
            </button>
          </div>
        </form>

        <p style={{ marginTop: 12 }}>
          Select a date range and daily hours. For example, 09:00–12:00 from
          October 22 through October 30 registers those hours on each date.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <div>
            <h3>Hearing Proposals for Review</h3>
            <p>
              Only cases returned by the backend for your judge account are
              shown.
            </p>
          </div>

          <button type="button" onClick={loadDashboard} disabled={loading}>
            Refresh
          </button>
        </div>

        {loading ? (
          <p>Loading assigned cases...</p>
        ) : pendingCases.length === 0 ? (
          <p>No pending hearing proposals assigned to you.</p>
        ) : (
          pendingCases.map((item) => (
            <article
              key={getId(item)}
              className="action-card"
              style={{
                marginBottom: 12,
                display: 'block',
              }}
            >
              <h4>{getId(item)}</h4>

              <p>
                Proposed date: <strong>{getDate(item)}</strong>
              </p>

              <p>
                Proposed time: <strong>{getTime(item)}</strong>
              </p>

              <p>Decision: {getDecision(item)}</p>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  disabled={!!busyCase}
                  onClick={() => reviewHearing(item, 'Approved')}
                >
                  Approve
                </button>

                <button
                  type="button"
                  disabled={!!busyCase}
                  onClick={() => reviewHearing(item, 'Modified')}
                >
                  Modify Date/Time
                </button>

                <button
                  type="button"
                  disabled={!!busyCase}
                  onClick={() => reviewHearing(item, 'Rejected')}
                >
                  Reject
                </button>

                {busyCase === getId(item) && <span>Submitting...</span>}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="dashboard-section">
        <h3>Notifications</h3>

        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          notifications.map((notification) => (
            <article
              key={notification.id}
              style={{
                padding: 12,
                borderBottom: '1px solid #ddd',
              }}
            >
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
              <small>{notification.createdAt}</small>

              {!notification.isRead && (
                <button
                  type="button"
                  onClick={() => markRead(notification)}
                  style={{ marginLeft: 12 }}
                >
                  Mark as read
                </button>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  )
}

export default JudgeDashboard
