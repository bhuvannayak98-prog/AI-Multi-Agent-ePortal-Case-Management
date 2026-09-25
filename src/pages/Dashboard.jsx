import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const demoCases = [
  {
    id: 'CASE-2026-001',
    type: 'Property Dispute',
    parties: 'Amit Kumar vs Ravi Sharma',
    status: 'Pending',
    priority: 'High',
    hearing: '28 Sep 2026',
  },
  {
    id: 'CASE-2026-002',
    type: 'Contract Dispute',
    parties: 'ABC Pvt Ltd vs XYZ Ltd',
    status: 'Pending',
    priority: 'Medium',
    hearing: '30 Sep 2026',
  },
  {
    id: 'CASE-2026-003',
    type: 'Civil Appeal',
    parties: 'Meena Rao vs State',
    status: 'Under Review',
    priority: 'Low',
    hearing: '2 Oct 2026',
  },
]

function Dashboard() {
  const role =
    localStorage.getItem('userRole') || 'User'

  const email =
    localStorage.getItem('userEmail') ||
    'user@example.com'

  const [cases, setCases] = useState([])

  useEffect(() => {
    const storedCases = JSON.parse(
      localStorage.getItem('cases') || 'null'
    )

    if (
      storedCases &&
      Array.isArray(storedCases) &&
      storedCases.length > 0
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

  const totalCases = cases.length

  const pendingCases = cases.filter(
    (caseItem) =>
      (caseItem.status || '').toLowerCase() ===
      'pending'
  ).length

  const highPriorityCases = cases.filter(
    (caseItem) =>
      (caseItem.priority || '').toLowerCase() ===
      'high'
  ).length

  const upcomingHearings = cases.filter(
    (caseItem) =>
      caseItem.hearing &&
      caseItem.hearing !== 'Not scheduled'
  ).length

  const recentCases = [...cases].reverse().slice(0, 5)

  // Roles allowed to register new cases
  const canRegisterCase =
    role === 'Litigant' ||
    role === 'Lawyer' ||
    role === 'Registrar'

  return (
    <div className="dashboard-page">

      {/* PAGE HEADER */}

      <div className="page-heading">
        <div>
          <h2>Dashboard</h2>

          <p>
            Welcome back,{' '}
            <strong>{role}</strong>
          </p>
        </div>

        <div className="dashboard-user">
          {email}
        </div>
      </div>

      {/* STAT CARDS */}

      <div className="stats-grid">

        <div className="stat-card">
          <div>
            <p>Total Cases</p>
            <h3>{totalCases}</h3>
          </div>

          <div className="stat-icon">
            ▤
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p>Pending Cases</p>
            <h3>{pendingCases}</h3>
          </div>

          <div className="stat-icon">
            ◷
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p>High Priority</p>
            <h3>{highPriorityCases}</h3>
          </div>

          <div className="stat-icon">
            !
          </div>
        </div>

        <div className="stat-card">
          <div>
            <p>Upcoming Hearings</p>
            <h3>{upcomingHearings}</h3>
          </div>

          <div className="stat-icon">
            ◫
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS */}

      <section className="dashboard-section">

        <div className="section-header">
          <div>
            <h3>Quick Actions</h3>

            <p>
              Access frequently used case management
              functions.
            </p>
          </div>
        </div>

        <div className="quick-actions">

          {/* REGISTER CASE - ROLE BASED */}

          {canRegisterCase && (
            <Link
              to="/new-case"
              className="action-card"
            >
              <div className="action-icon">
                ＋
              </div>

              <div>
                <strong>
                  Register New Case
                </strong>

                <span>
                  Create a new case record
                </span>
              </div>
            </Link>
          )}

          {/* VIEW CASES - AVAILABLE TO ALL */}

          <Link
            to="/cases"
            className="action-card"
          >
            <div className="action-icon">
              ▤
            </div>

            <div>
              <strong>
                View All Cases
              </strong>

              <span>
                Manage registered cases
              </span>
            </div>
          </Link>

        </div>

      </section>

      {/* RECENT CASES */}

      <section className="dashboard-section">

        <div className="section-header">

          <div>
            <h3>Recent Cases</h3>

            <p>
              Recently registered and updated cases.
            </p>
          </div>

          <Link to="/cases">
            View all →
          </Link>

        </div>

        <div className="case-table-wrapper">

          <table className="case-table">

            <thead>
              <tr>
                <th>Case ID</th>
                <th>Case Type</th>
                <th>Parties</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Hearing</th>
              </tr>
            </thead>

            <tbody>

              {recentCases.length > 0 ? (
                recentCases.map((caseItem) => (

                  <tr key={caseItem.id}>

                    <td>
                      <Link
                        to={`/cases/${caseItem.id}`}
                      >
                        <strong>
                          {caseItem.id}
                        </strong>
                      </Link>
                    </td>

                    <td>
                      {caseItem.type ||
                        caseItem.caseType ||
                        'Not specified'}
                    </td>

                    <td>
                      {caseItem.parties ||
                        `${caseItem.petitioner || ''} vs ${
                          caseItem.respondent || ''
                        }`}
                    </td>

                    <td>
                      <span
                        className={`priority-badge ${
                          (
                            caseItem.priority ||
                            'pending'
                          ).toLowerCase()
                        }`}
                      >
                        {caseItem.priority ||
                          'Pending AI Analysis'}
                      </span>
                    </td>

                    <td>
                      <span className="status-badge">
                        {caseItem.status ||
                          'Registered'}
                      </span>
                    </td>

                    <td>
                      {caseItem.hearing ||
                        'Not scheduled'}
                    </td>

                  </tr>

                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign: 'center',
                      padding: '30px',
                    }}
                  >
                    No cases available.
                  </td>
                </tr>
              )}

            </tbody>

          </table>

        </div>

      </section>

      {/* SYSTEM INFORMATION */}

      <section className="system-info">

        <div>
          <strong>
            AI-Assisted Case Management
          </strong>

          <p>
            AI recommendations for precedent retrieval,
            priority scoring and hearing scheduling
            require human review before final decisions.
          </p>
        </div>

        <span className="system-status">
          ● System Active
        </span>

      </section>

    </div>
  )
}

export default Dashboard