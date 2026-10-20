
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

function getErrorMessage(data, fallback, status) {
  const detail = data?.detail

  if (typeof detail === 'string') return detail

  if (Array.isArray(detail)) {
    return detail
      .map((item) =>
        typeof item === 'string'
          ? item
          : item?.msg || JSON.stringify(item)
      )
      .join('; ')
  }

  if (detail && typeof detail === 'object') {
    return detail.message || detail.msg || JSON.stringify(detail)
  }

  if (typeof data?.message === 'string') return data.message

  return `${fallback}${status ? ` (HTTP ${status})` : ''}`
}

function LawyerRecommendations() {
  const { id: caseId } = useParams()
  const navigate = useNavigate()

  const [lawyers, setLawyers] = useState([])
  const [caseType, setCaseType] = useState('')
  const [selectedLawyer, setSelectedLawyer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [alreadyAssigned, setAlreadyAssigned] = useState(false)

  const token = localStorage.getItem('accessToken')

  useEffect(() => {
    let cancelled = false

    async function loadLawyers() {
      setLoading(true)
      setError('')

      if (!token) {
        navigate('/login')
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/cases/${encodeURIComponent(caseId)}/lawyers`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'Unable to load recommended lawyers.',
              response.status
            )
          )
        }

        if (cancelled) return

        const eligibleLawyers = Array.isArray(data.lawyers)
          ? data.lawyers.filter((lawyer) => {
              const id = lawyer.id ?? lawyer.userId
              return id !== undefined && id !== null
            })
          : []

        setLawyers(eligibleLawyers)
        setCaseType(data.caseType || '')
        setAlreadyAssigned(Boolean(data.alreadyAssigned))
        setMessage(data.message || '')
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Something went wrong while loading lawyers.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadLawyers()

    return () => {
      cancelled = true
    }
  }, [caseId, navigate, token])

  async function handleAssignLawyer() {
    if (!selectedLawyer || assigning || alreadyAssigned) return

    const confirmed = window.confirm(
      'Are you sure you want to assign this lawyer to your case?'
    )

    if (!confirmed) return

    setAssigning(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/cases/${encodeURIComponent(caseId)}/lawyer-assignment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lawyerUserId: selectedLawyer,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Could not assign this lawyer.',
            response.status
          )
        )
      }

      window.alert('Lawyer assigned successfully!')
      navigate(`/cases/${encodeURIComponent(caseId)}`)
    } catch (err) {
      setError(err.message || 'Unable to assign the selected lawyer.')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <main
      style={{
        maxWidth: '1050px',
        margin: '0 auto',
        padding: '28px 20px',
      }}
    >
      <Link
        to={`/cases/${encodeURIComponent(caseId)}`}
        style={{
          color: '#2563eb',
          textDecoration: 'none',
          display: 'inline-block',
          marginBottom: '22px',
        }}
      >
        ← Back to Case Details
      </Link>

      <h1 style={{ marginBottom: '8px' }}>Recommended Lawyers</h1>

      <p style={{ color: '#64748b', marginTop: 0 }}>
        Review eligible lawyers for your case and select one to confirm the
        assignment.
      </p>

      <section
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px',
          margin: '22px 0',
        }}
      >
        <strong>Case ID:</strong> {caseId}
        <br />
        <strong>Case type:</strong> {caseType || 'Loading...'}
      </section>

      {loading && <p>Finding eligible lawyers...</p>}

      {!loading && error && (
        <div
          role="alert"
          style={{
            padding: '14px',
            background: '#fef2f2',
            color: '#b91c1c',
            borderRadius: '8px',
            marginBottom: '18px',
          }}
        >
          {error}
          <div style={{ marginTop: '12px' }}>
            <button onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && alreadyAssigned && (
        <div
          style={{
            padding: '16px',
            background: '#fef3c7',
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          A lawyer is already assigned to this case. Contact the administrator
          if you need reassignment.
          <div style={{ marginTop: '12px' }}>
            <button onClick={() => navigate(`/cases/${encodeURIComponent(caseId)}`)}>
              View Case Details
            </button>
          </div>
        </div>
      )}

      {!loading && !error && !alreadyAssigned && lawyers.length === 0 && (
        <section
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <h3>No matching lawyers found</h3>
          <p>
            {message ||
              'There are currently no eligible lawyers for this case type.'}
          </p>
          <p>
            You can try again later or contact the administrator. No
            assignment has been made.
          </p>
        </section>
      )}

      {!loading && !error && !alreadyAssigned && lawyers.length > 0 && (
        <>
          <p>
            {lawyers.length} eligible lawyer{lawyers.length === 1 ? '' : 's'}{' '}
            found. Select one to continue.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginTop: '18px',
            }}
          >
            {lawyers.map((lawyer) => {
              const lawyerId = lawyer.id ?? lawyer.userId
              const isSelected = selectedLawyer === lawyerId

              return (
                <button
                  type="button"
                  key={lawyerId}
                  onClick={() => setSelectedLawyer(lawyerId)}
                  aria-pressed={isSelected}
                  style={{
                    textAlign: 'left',
                    padding: '20px',
                    border: isSelected
                      ? '2px solid #2563eb'
                      : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    color: '#0f172a',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                      alignItems: 'center',
                    }}
                  >
                    <strong style={{ fontSize: '17px' }}>
                      {lawyer.displayName || 'Approved Lawyer'}
                    </strong>
                    <span aria-hidden="true">
                      {isSelected ? '✓' : '○'}
                    </span>
                  </div>

                  <p style={{ color: '#475569', marginBottom: '8px' }}>
                    <strong>Expertise</strong>
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    {(Array.isArray(lawyer.expertise)
                      ? lawyer.expertise
                      : []
                    ).map((item) => (
                      <span
                        key={item}
                        style={{
                          background: '#e2e8f0',
                          padding: '4px 8px',
                          borderRadius: '20px',
                          fontSize: '12px',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <p style={{ marginBottom: 0, color: '#475569' }}>
                    Active assigned cases: {lawyer.activeCases ?? 0}
                  </p>
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: '24px' }}>
            <button
              type="button"
              onClick={handleAssignLawyer}
              disabled={!selectedLawyer || assigning}
              style={{
                background:
                  !selectedLawyer || assigning ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                padding: '12px 20px',
                border: 'none',
                borderRadius: '8px',
                cursor:
                  !selectedLawyer || assigning ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {assigning ? 'Assigning Lawyer...' : 'Confirm Lawyer Selection'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}

export default LawyerRecommendations
