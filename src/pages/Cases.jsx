
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

function Cases() {
  const navigate = useNavigate()

  const [cases, setCases] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadCases = useCallback(async () => {
    const token = localStorage.getItem('accessToken')

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/cases`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401 || response.status === 403) {
        setError('Your session is invalid or expired. Please sign in again.')
        return
      }

      if (!response.ok) {
        throw new Error('Unable to load cases from the server.')
      }

      const data = await response.json()

      // Supports either a direct array or an object containing cases.
      const serverCases = Array.isArray(data)
        ? data
        : Array.isArray(data.cases)
          ? data.cases
          : []

      setCases(serverCases)
    } catch (err) {
      setError(err.message || 'Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  // Support the field names used by both older UI code and the backend.
  const getCaseId = (item) =>
    item.case_id || item.caseId || item.id || ''

  const getCaseType = (item) =>
    item.case_type || item.caseType || item.type || 'Not specified'

  const getParties = (item) =>
    item.parties ||
    `${item.petitioner || ''} vs ${item.respondent || ''}`.trim() ||
    'Not specified'

  const getStatus = (item) =>
    item.status || 'Registered'

  const getPriority = (item) =>
    item.priority || item.priority_level || 'Pending AI Analysis'

  const getHearing = (item) => {
    const hearing =
      item.hearing ||
      item.hearing_date ||
      item.hearingDate ||
      item.recommended_hearing_date

    if (!hearing) return 'Not scheduled'

    const date = new Date(hearing)

    return Number.isNaN(date.getTime())
      ? hearing
      : date.toLocaleDateString('en-IN')
  }

  // Summary counts
  const totalCases = cases.length

  const pendingCases = cases.filter((item) => {
    const status = getStatus(item).toLowerCase()

    return [
      'pending',
      'registered',
      'pending ai analysis',
      'under review',
    ].includes(status)
  }).length

  const highPriorityCases = cases.filter(
    (item) => getPriority(item).toLowerCase() === 'high'
  ).length

  const underReviewCases = cases.filter(
    (item) => getStatus(item).toLowerCase() === 'under review'
  ).length

  // Search and filters
  const normalizedSearch = search.trim().toLowerCase()

  const filteredCases = cases.filter((item) => {
    const searchableText = [
      getCaseId(item),
      getCaseType(item),
      getParties(item),
      getStatus(item),
      getPriority(item),
    ].join(' ').toLowerCase()

    const matchesSearch = searchableText.includes(normalizedSearch)

    const matchesStatus =
      statusFilter === 'All' ||
      getStatus(item).toLowerCase() === statusFilter.toLowerCase()

    const matchesPriority =
      priorityFilter === 'All' ||
      getPriority(item).toLowerCase() === priorityFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="cases-page">
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <h2>Case Management</h2>
          <p>
            Manage registered cases, priorities and upcoming hearings.
          </p>
        </div>

        <Link to="/new-case" className="primary-action">
          + Register New Case
        </Link>
      </div>

      {/* SUMMARY */}
      <section className="cases-summary">
        <div className="case-summary-item">
          <span>Total Cases</span>
          <strong>{loading ? '—' : totalCases}</strong>
        </div>

        <div className="case-summary-item">
          <span>Pending</span>
          <strong>{loading ? '—' : pendingCases}</strong>
        </div>

        <div className="case-summary-item">
          <span>High Priority</span>
          <strong>{loading ? '—' : highPriorityCases}</strong>
        </div>

        <div className="case-summary-item">
          <span>Under Review</span>
          <strong>{loading ? '—' : underReviewCases}</strong>
        </div>
      </section>

      {/* CASE TABLE */}
      <section className="cases-section">
        <div className="cases-toolbar">
          <div className="case-search">
            <input
              type="text"
              placeholder="Search by case ID, type or party..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search cases"
            />
          </div>

          <div className="case-filters">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All Status</option>
              <option value="Registered">Registered</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Modified">Modified</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
            >
              <option value="All">All Priority</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Pending AI Analysis">Pending AI Analysis</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="no-cases">Loading cases from the server...</div>
        ) : error ? (
          <div className="no-cases">
            <p>{error}</p>
            <button
              type="button"
              className="view-case-button"
              onClick={loadCases}
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="cases-table-wrapper">
            <table className="cases-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Case Type</th>
                  <th>Parties</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Hearing Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCases.length > 0 ? (
                  filteredCases.map((caseItem, index) => {
                    const caseId = getCaseId(caseItem)
                    const status = getStatus(caseItem)
                    const priority = getPriority(caseItem)

                    return (
                      <tr key={caseId || index}>
                        <td>
                          {caseId ? (
                            <Link
                              to={`/cases/${encodeURIComponent(caseId)}`}
                              className="case-id-link"
                            >
                              {caseId}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td>
                          <strong>{getCaseType(caseItem)}</strong>
                        </td>

                        <td>{getParties(caseItem)}</td>

                        <td>
                          <span className="case-status">{status}</span>
                        </td>

                        <td>
                          <span
                            className={`case-priority ${
                              priority.toLowerCase().replace(/\s+/g, '-')
                            }`}
                          >
                            {priority}
                          </span>
                        </td>

                        <td>{getHearing(caseItem)}</td>

                        <td>
                          {caseId ? (
                            <Link
                              to={`/cases/${encodeURIComponent(caseId)}`}
                              className="view-case-button"
                            >
                              View Case
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="no-cases">
                      {cases.length === 0
                        ? 'No cases have been registered for this account yet.'
                        : 'No cases found matching your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Cases
