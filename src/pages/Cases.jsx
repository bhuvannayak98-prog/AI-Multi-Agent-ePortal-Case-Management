import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const demoCases = [
  {
    id: 'CASE-2026-001',
    type: 'Property Dispute',
    parties: 'Amit Kumar vs Ravi Sharma',
    status: 'Pending',
    priority: 'High',
    hearing: '28 September 2026',
  },
  {
    id: 'CASE-2026-002',
    type: 'Contract Dispute',
    parties: 'ABC Pvt Ltd vs XYZ Ltd',
    status: 'Pending',
    priority: 'Medium',
    hearing: '30 September 2026',
  },
  {
    id: 'CASE-2026-003',
    type: 'Civil Appeal',
    parties: 'Meena Rao vs State',
    status: 'Under Review',
    priority: 'Low',
    hearing: '2 October 2026',
  },
]

function Cases() {
  const [cases, setCases] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState('All')
  const [priorityFilter, setPriorityFilter] =
    useState('All')

  useEffect(() => {
    const storedCases = JSON.parse(
      localStorage.getItem('cases') || 'null'
    )

    if (
      storedCases &&
      Array.isArray(storedCases)
    ) {
      setCases(storedCases)
    } else {
      localStorage.setItem(
        'cases',
        JSON.stringify(demoCases)
      )

      setCases(demoCases)
    }
  }, [])

  // ==========================================================
  // SUMMARY COUNTS
  // ==========================================================

  const totalCases = cases.length

  const pendingCases = cases.filter(
    (item) => {
      const status =
        (item.status || '').toLowerCase()

      return (
        status === 'pending' ||
        status === 'registered' ||
        status === 'pending ai analysis'
      )
    }
  ).length

  const highPriorityCases =
    cases.filter(
      (item) =>
        (item.priority || '')
          .toLowerCase() === 'high'
    ).length

  const underReviewCases =
    cases.filter(
      (item) =>
        (item.status || '')
          .toLowerCase() ===
        'under review'
    ).length

  // ==========================================================
  // FILTERED CASES
  // ==========================================================

  const filteredCases =
    cases.filter((caseItem) => {
      const searchText =
        search.toLowerCase()

      const matchesSearch =
        (caseItem.id || '')
          .toLowerCase()
          .includes(searchText) ||
        (
          caseItem.type ||
          caseItem.caseType ||
          ''
        )
          .toLowerCase()
          .includes(searchText) ||
        (
          caseItem.parties ||
          `${caseItem.petitioner || ''} ${
            caseItem.respondent || ''
          }`
        )
          .toLowerCase()
          .includes(searchText)

      const matchesStatus =
        statusFilter === 'All' ||
        (
          caseItem.status || ''
        ).toLowerCase() ===
          statusFilter.toLowerCase()

      const matchesPriority =
        priorityFilter === 'All' ||
        (
          caseItem.priority || ''
        ).toLowerCase() ===
          priorityFilter.toLowerCase()

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      )
    })

  return (
    <div className="cases-page">

      {/* PAGE HEADER */}

      <div className="page-heading">

        <div>

          <h2>
            Case Management
          </h2>

          <p>
            Manage registered cases, priorities and
            upcoming hearings.
          </p>

        </div>

        <Link
          to="/new-case"
          className="primary-action"
        >
          + Register New Case
        </Link>

      </div>

      {/* SUMMARY */}

      <section className="cases-summary">

        <div className="case-summary-item">

          <span>
            Total Cases
          </span>

          <strong>
            {totalCases}
          </strong>

        </div>

        <div className="case-summary-item">

          <span>
            Pending
          </span>

          <strong>
            {pendingCases}
          </strong>

        </div>

        <div className="case-summary-item">

          <span>
            High Priority
          </span>

          <strong>
            {highPriorityCases}
          </strong>

        </div>

        <div className="case-summary-item">

          <span>
            Under Review
          </span>

          <strong>
            {underReviewCases}
          </strong>

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
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

          </div>

          <div className="case-filters">

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
            >

              <option value="All">
                All Status
              </option>

              <option value="Registered">
                Registered
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Under Review">
                Under Review
              </option>

              <option value="Approved">
                Approved
              </option>

              <option value="Modified">
                Modified
              </option>

              <option value="Rejected">
                Rejected
              </option>

            </select>

            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(
                  e.target.value
                )
              }
            >

              <option value="All">
                All Priority
              </option>

              <option value="High">
                High
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="Low">
                Low
              </option>

              <option value="Pending AI Analysis">
                Pending AI Analysis
              </option>

            </select>

          </div>

        </div>

        <div className="cases-table-wrapper">

          <table className="cases-table">

            <thead>

              <tr>

                <th>
                  Case ID
                </th>

                <th>
                  Case Type
                </th>

                <th>
                  Parties
                </th>

                <th>
                  Status
                </th>

                <th>
                  Priority
                </th>

                <th>
                  Hearing Date
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredCases.length > 0 ? (

                filteredCases.map(
                  (caseItem) => (

                    <tr
                      key={caseItem.id}
                    >

                      <td>

                        <Link
                          to={`/cases/${caseItem.id}`}
                          className="case-id-link"
                        >
                          {caseItem.id}
                        </Link>

                      </td>

                      <td>

                        <strong>
                          {caseItem.type ||
                            caseItem.caseType ||
                            'Not specified'}
                        </strong>

                      </td>

                      <td>

                        {caseItem.parties ||
                          `${caseItem.petitioner || ''} vs ${
                            caseItem.respondent || ''
                          }`}

                      </td>

                      <td>

                        <span className="case-status">

                          {caseItem.status ||
                            'Registered'}

                        </span>

                      </td>

                      <td>

                        <span
                          className={`case-priority ${
                            (
                              caseItem.priority ||
                              'pending'
                            )
                              .toLowerCase()
                              .replaceAll(
                                ' ',
                                '-'
                              )
                          }`}
                        >

                          {caseItem.priority ||
                            'Pending AI Analysis'}

                        </span>

                      </td>

                      <td>

                        {caseItem.hearing ||
                          'Not scheduled'}

                      </td>

                      <td>

                        <Link
                          to={`/cases/${caseItem.id}`}
                          className="view-case-button"
                        >
                          View Case
                        </Link>

                      </td>

                    </tr>

                  )
                )

              ) : (

                <tr>

                  <td
                    colSpan="7"
                    className="no-cases"
                  >
                    No cases found matching your
                    filters.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  )
}

export default Cases