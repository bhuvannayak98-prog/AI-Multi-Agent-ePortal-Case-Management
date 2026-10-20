
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

function CaseDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const role = localStorage.getItem('userRole') || 'User'
  const token = localStorage.getItem('accessToken')
  const normalizedRole = role.trim().toLowerCase()
  const canReview = normalizedRole === 'judge'

  const [caseData, setCaseData] = useState(null)
  const [representationType, setRepresentationType] = useState(null)
  const [workflowStage, setWorkflowStage] = useState(null)
  const [representationLoading, setRepresentationLoading] = useState(false)
  const [representationError, setRepresentationError] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [lawyerDecisionLoading, setLawyerDecisionLoading] = useState(false)
  const [lawyerDecisionError, setLawyerDecisionError] = useState('')
  const [lawyerDecisionMessage, setLawyerDecisionMessage] = useState('')
  const [priorityResult, setPriorityResult] = useState(null)
  const [precedentResult, setPrecedentResult] = useState(null)
  const [scheduleResult, setScheduleResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewStatus, setReviewStatus] = useState('Pending')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewerNote, setReviewerNote] = useState('')
  const [modifiedDate, setModifiedDate] = useState('')
  const [modifiedTime, setModifiedTime] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadCase() {
      if (!token) {
        navigate('/login', { replace: true })
        return
      }

      setLoading(true)
      setError('')
      setCaseData(null)
      setRepresentationError('')

      try {
        const response = await fetch(
          `${API_URL}/cases/${encodeURIComponent(id)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('isLoggedIn')
          navigate('/login', { replace: true })
          return
        }

        if (response.status === 404) {
          if (!cancelled) {
            setError('Case not found or you are not authorized to access it.')
          }
          return
        }

        if (!response.ok) {
          throw new Error(`Could not load case (${response.status}).`)
        }

        const data = await response.json()
        const loadedCase = data.case || data

        if (!cancelled) {
          setCaseData(loadedCase)
          setRepresentationType(loadedCase.representationType || null)
          setWorkflowStage(loadedCase.workflowStage || null)
          setOcrText(loadedCase.ocrText || '')
          setPriorityResult(loadedCase.priorityResult || null)
          setPrecedentResult(loadedCase.precedentResult || null)
          setScheduleResult(
  loadedCase.proposedHearingDate && loadedCase.proposedHearingTime
    ? {
        recommendedDate: loadedCase.proposedHearingDate,
        recommendedTime: loadedCase.proposedHearingTime,
        decision: loadedCase.hearingDecision || 'Pending',
        humanApprovalRequired:
          (loadedCase.hearingDecision || 'Pending') === 'Pending',
        alreadyScheduled: true,
      }
    : loadedCase.scheduleResult || null
)

setReviewStatus(loadedCase.hearingDecision || 'Pending')
setReviewComment('')
setModifiedDate(loadedCase.proposedHearingDate || '')
setModifiedTime(loadedCase.proposedHearingTime || '')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load case:', err)
          setError(err.message || 'Failed to load case.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCase()

    return () => {
      cancelled = true
    }
  }, [id, token, navigate])

  async function apiPost(path, body, isFormData = false) {
    if (!token) {
      navigate('/login', { replace: true })
      throw new Error('Your session has expired. Please log in again.')
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    })

    if (response.status === 401 || response.status === 403) {
      if (response.status === 401) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('isLoggedIn')
        navigate('/login', { replace: true })
      }

      const deniedData = await response.json().catch(() => ({}))
      throw new Error(
        deniedData.detail ||
          deniedData.message ||
          'Your session has expired or access was denied.'
      )
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || `Request failed (${response.status}).`
      )
    }

    if (data.error) throw new Error(data.error)

    return data
  }

  const caseId =
    caseData?.caseId || caseData?.case_id || caseData?.id

  const isCaseOwnerLitigant =
    normalizedRole === 'litigant' &&
    caseData?.isCaseOwner === true

  const isLawyerOwner =
    normalizedRole === 'lawyer' &&
    caseData?.isCaseOwner === true

  const isAssignedLawyer =
    normalizedRole === 'lawyer' &&
    caseData?.isCaseOwner !== true &&
    representationType === 'Recommend a Lawyer' &&
    workflowStage === 'Lawyer Assigned'

  const canUseAllAgents =
    (isCaseOwnerLitigant &&
      representationType === 'Self-Representation') ||
    isLawyerOwner

  const canUseAnalysisAgents =
    canUseAllAgents || isAssignedLawyer

  const canUseOcr = canUseAllAgents

  const handleRepresentationChoice = async (choice) => {
    if (!isCaseOwnerLitigant || !caseId) {
      setRepresentationError(
        'Only the litigant who owns this case can choose representation.'
      )
      return
    }

    try {
      setRepresentationLoading(true)
      setRepresentationError('')

      const data = await apiPost(
        `/cases/${encodeURIComponent(caseId)}/representation`,
        { representation_type: choice }
      )

      setRepresentationType(data.representationType || choice)
      setWorkflowStage(
        choice === 'Recommend a Lawyer'
          ? 'Awaiting Lawyer Approval'
          : 'Self-Representation Selected'
      )
    } catch (err) {
      console.error('Failed to save representation choice:', err)
      setRepresentationError(
        err.message || 'Could not save your representation choice.'
      )
    } finally {
      setRepresentationLoading(false)
    }
  }

  const handleLawyerDecision = async (decision) => {
    if (!caseId) return

    setLawyerDecisionLoading(true)
    setLawyerDecisionError('')
    setLawyerDecisionMessage('')

    try {
      const result = await apiPost(
        `/cases/${encodeURIComponent(caseId)}/lawyer-decision`,
        { decision }
      )

      setLawyerDecisionMessage(
        result.message ||
          (decision === 'reject'
            ? 'Lawyer rejected the case. The litigant can choose another lawyer.'
            : 'Lawyer accepted the case.')
      )

      setWorkflowStage(result.workflowStage || workflowStage)
    } catch (err) {
      setLawyerDecisionError(
        err.message || 'Unable to submit your decision.'
      )
    } finally {
      setLawyerDecisionLoading(false)
    }
  }

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null)
  }

  const handleOCR = async () => {
    if (!selectedFile) {
      alert('Please select a document first.')
      return
    }

    if (!caseId) {
      alert('Case ID is missing. Reload the case and try again.')
      return
    }

    try {
      setProcessing(true)

      const formData = new FormData()
      formData.append('caseId', caseId)
      formData.append('file', selectedFile)

      const data = await apiPost('/ai/ocr', formData, true)

      setOcrText(data.text || '')
      alert('OCR completed. Review the extracted text carefully.')
    } catch (err) {
      console.error(err)
    const message =
      typeof err.message === 'string'
      ? err.message
      : JSON.stringify(err.message ?? err)

alert(message || 'OCR failed.')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrecedents = async () => {
    if (!caseData) return

    try {
      setProcessing(true)

      const data = await apiPost('/ai/precedents', {
        caseId,
        caseType: caseData.caseType,
        description: caseData.description || '',
        lawSection: caseData.lawSection,
      })

      setPrecedentResult(data)
      alert(`${data.resultsFound ?? 0} precedent record(s) returned.`)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Precedent retrieval failed.')
    } finally {
      setProcessing(false)
    }
  }

  const handlePriority = async () => {
    if (!caseData) return

    try {
      setProcessing(true)

      const data = await apiPost('/ai/priority', {
        caseId,
        caseType: caseData.caseType,
        description: ocrText || caseData.description,
        urgency: caseData.urgency,
        lawSection: caseData.lawSection,
        filingDate: caseData.filingDate,
      })

      setPriorityResult(data)
      alert(
        `Priority recommendation: ${data.priority || data.level || 'Unavailable'}; score: ${data.score ?? 'Unavailable'}.`
      )
    } catch (err) {
      console.error(err)
      alert(err.message || 'Priority analysis failed.')
    } finally {
      setProcessing(false)
    }
  }

  const handleSchedule = async () => {
    if (!caseData) return

    if (!priorityResult) {
      alert('Run priority analysis first.')
      return
    }

    try {
      setProcessing(true)

      const data = await apiPost('/ai/schedule', {
        caseId,
        priority: priorityResult.priority || priorityResult.level || 'MEDIUM',
        preferredDate: caseData.filingDate || '',
      })

      setScheduleResult(data)
      setModifiedDate(data.recommendedDate || '')
      setModifiedTime(data.recommendedTime || '')

      alert('Hearing recommendation generated. Human approval is required.')
    } catch (err) {
      console.error(err)
      alert(err.message || 'Scheduling failed.')
    } finally {
      setProcessing(false)
    }
  }

  // Prototype review decisions are local-only; they are not persisted.
  const saveReview = async (status) => {
  if (!canReview) {
    alert('Only the assigned judge can review this recommendation.')
    return
  }

  if (!caseId || !scheduleResult) {
    alert('A hearing recommendation is required before reviewing.')
    return
  }

  if (reviewStatus !== 'Pending') {
    alert(`This hearing has already been ${reviewStatus.toLowerCase()}.`)
    return
  }

  if (status === 'Modified' && (!modifiedDate || !modifiedTime.trim())) {
    alert('Enter both the modified hearing date and time.')
    return
  }

const decisionMap = {
  Approved: 'Approved',
  Modified: 'Modified',
  Rejected: 'Rejected',
}

  const payload = {
    decision: decisionMap[status],
    comments: reviewerNote.trim(),
  }

  if (status === 'Modified') {
    payload.modifiedDate = modifiedDate
    payload.modifiedTime = modifiedTime.trim()
  }

  try {
    setProcessing(true)

    const result = await apiPost(
      `/judge/cases/${encodeURIComponent(caseId)}/hearing-decision`,
      payload
    )

    const savedDecision = result.decision || status

    setReviewStatus(savedDecision)
    setReviewComment(result.comments || reviewerNote.trim())

    setScheduleResult((previous) => ({
      ...previous,
      recommendedDate: result.hearingDate || previous.recommendedDate,
      recommendedTime: result.hearingTime || previous.recommendedTime,
      decision: savedDecision,
      humanApprovalRequired: false,
      alreadyScheduled: true,
    }))

    setModifiedDate(result.hearingDate || modifiedDate)
    setModifiedTime(result.hearingTime || modifiedTime)

    setCaseData((previous) => ({
      ...previous,
      hearingDecision: savedDecision,
      proposedHearingDate: result.hearingDate || previous.proposedHearingDate,
      proposedHearingTime: result.hearingTime || previous.proposedHearingTime,
    }))

    alert(result.message || `Hearing decision saved: ${savedDecision}.`)
  } catch (err) {
    console.error('Failed to save judge decision:', err)
    alert(err.message || 'Could not save the hearing decision.')
  } finally {
    setProcessing(false)
  }
}

  const workflowSteps = [
    {
      title: 'Case Registered',
      description: 'Case record loaded from the backend',
      completed: Boolean(caseData?.id || caseData?.caseId),
    },
    {
      title: 'OCR Extraction',
      description: 'Document text extracted',
      completed: Boolean(ocrText),
    },
    {
      title: 'Precedent Retrieval',
      description: 'Precedent results returned',
      completed: Boolean(precedentResult),
    },
    {
      title: 'Priority Scoring',
      description: 'Priority recommendation generated',
      completed: Boolean(priorityResult),
    },
    {
      title: 'Hearing Scheduling',
      description: 'Hearing slot recommended',
      completed: Boolean(scheduleResult),
    },
    {
      title: 'Human Review',
      description: 'Authorized review in current session',
      completed: reviewStatus !== 'Pending',
    },
  ]

  const completedSteps = workflowSteps.filter(
    (step) => step.completed
  ).length

  const currentStepIndex = workflowSteps.findIndex(
    (step) => !step.completed
  )

  const workflowProgress = Math.round(
    (completedSteps / workflowSteps.length) * 100
  )

  if (loading) {
    return (
      <div className="case-details-page">
        <p>Loading case details...</p>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="case-details-page">
        <h2>Case unavailable</h2>
        <p role="alert">{error || 'This case could not be loaded.'}</p>
        <button onClick={() => navigate('/cases')}>
          Back to My Cases
        </button>
      </div>
    )
  }

  return (
    <div className="case-details-page">
      <div className="case-detail-heading">
        <div>
          <div className="breadcrumb">
            <Link to="/cases">Cases</Link> / Case Details
          </div>
          <h2>{caseId}</h2>
          <p>AI-assisted case analysis and hearing recommendations</p>
        </div>

        <button
          className="secondary-action"
          onClick={() => navigate('/cases')}
        >
          ← My Cases
        </button>
      </div>

      <section className="case-overview-card">
        <div className="case-overview-top">
          <div>
            <span className="case-label">CASE ID</span>
            <h3>{caseId}</h3>
          </div>

          <div className="case-overview-badges">
            <span className="detail-status-badge">
              {caseData.status || 'Registered'}
            </span>
            <span className="detail-priority-badge">
              {priorityResult?.priority ||
                caseData.priority ||
                caseData.urgency ||
                'Not assessed'}
            </span>
          </div>
        </div>

        <div className="case-overview-grid">
          <div>
            <span>Case Type</span>
            <strong>{caseData.caseType || 'Not specified'}</strong>
          </div>
          <div>
            <span>Petitioner</span>
            <strong>{caseData.petitioner || '—'}</strong>
          </div>
          <div>
            <span>Respondent</span>
            <strong>{caseData.respondent || '—'}</strong>
          </div>
          <div>
            <span>Filing Date</span>
            <strong>{caseData.filingDate || 'Not specified'}</strong>
          </div>
          <div>
            <span>Applicable Law</span>
            <strong>{caseData.lawSection || 'Not specified'}</strong>
          </div>
        </div>

        <div className="case-description">
          <span>Case Description</span>
          <p>{caseData.description || 'No description provided.'}</p>
        </div>
      </section>

      {isCaseOwnerLitigant && (
        <section className="agent-card">
          <div className="agent-header">
            <div className="agent-title">
              <div className="agent-icon">⚖</div>
              <div>
                <span className="agent-label">LITIGANT OPTIONS</span>
                <h3>Legal Representation</h3>
                <p>
                  Choose whether you want help finding a lawyer or prefer
                  to represent yourself.
                </p>
              </div>
            </div>

            <span className="agent-status">
              {representationType ? '● Choice saved' : '● Choice required'}
            </span>
          </div>

          {representationType ? (
            <div className="agent-result">
              <p>
                Your representation choice:{' '}
                <strong>{representationType}</strong>
              </p>
              <p>
                Workflow status:{' '}
                <strong>{workflowStage || 'Saved'}</strong>
              </p>

              {representationType === 'Recommend a Lawyer' && (
                <>
                  {workflowStage === 'Lawyer Assigned' ? (
                    <p role="status">
                      Your lawyer has accepted the case and is now assigned.
                      You cannot select another lawyer while this assignment
                      is active.
                    </p>
                  ) : workflowStage === 'Awaiting Lawyer Approval' ? (
                    <p role="status">
                      Your selected lawyer has not responded yet. Please wait
                      for their decision.
                    </p>
                  ) : workflowStage === 'Lawyer Rejected' ? (
                    <>
                      <p role="status">
                        The lawyer rejected your case. You can select another
                        lawyer using the same case ID.
                      </p>
                      <button
                        onClick={() =>
                          navigate(
                            `/cases/${encodeURIComponent(caseId)}/lawyers`
                          )
                        }
                      >
                        Select Another Lawyer
                      </button>
                    </>
                  ) : (
                    <p role="status">
                      Current representation status: {workflowStage || 'Pending'}.
                    </p>
                  )}
                </>
              )}

              {representationType === 'Self-Representation' && (
                <p>
                  You selected self-representation. Your saved choice will
                  appear here when you return to this case.
                </p>
              )}
            </div>
          ) : (
            <div className="representation-actions">
              <button
                disabled={representationLoading}
                onClick={() =>
                  handleRepresentationChoice('Recommend a Lawyer')
                }
              >
                {representationLoading ? 'Saving...' : 'Recommend a Lawyer'}
              </button>

              <button
                className="secondary-action"
                disabled={representationLoading}
                onClick={() =>
                  handleRepresentationChoice('Self-Representation')
                }
              >
                {representationLoading ? 'Saving...' : 'Self-Representation'}
              </button>
            </div>
          )}

          {representationError && (
            <p role="alert" className="representation-error">
              {representationError}
            </p>
          )}
        </section>
      )}

      {normalizedRole === 'lawyer' &&
        workflowStage === 'Awaiting Lawyer Approval' && (
          <section className="agent-card">
            <div className="agent-header">
              <div className="agent-title">
                <div className="agent-icon">⚖</div>
                <div>
                  <span className="agent-label">LAWYER ACTION</span>
                  <h3>Case Representation Request</h3>
                  <p>
                    Review this case and decide whether to represent the
                    litigant.
                  </p>
                </div>
              </div>
              <span className="agent-status">● Decision required</span>
            </div>

            {lawyerDecisionError && (
              <p role="alert" className="representation-error">
                {lawyerDecisionError}
              </p>
            )}

            {lawyerDecisionMessage && (
              <p role="status">{lawyerDecisionMessage}</p>
            )}

            <div className="representation-actions">
              <button
                disabled={lawyerDecisionLoading}
                onClick={() => handleLawyerDecision('accept')}
              >
                {lawyerDecisionLoading ? 'Submitting...' : 'Accept Case'}
              </button>

              <button
                className="secondary-action"
                disabled={lawyerDecisionLoading}
                onClick={() => handleLawyerDecision('reject')}
              >
                {lawyerDecisionLoading ? 'Submitting...' : 'Reject Case'}
              </button>
            </div>
          </section>
        )}

      <section className="workflow-tracker-card">
        <div className="workflow-tracker-header">
          <div>
            <span className="agent-label">CASE PROCESSING</span>
            <h3>Case Workflow Progress</h3>
            <p>Track the case through processing and human review.</p>
          </div>
          <div className="workflow-progress-summary">
            <strong>{workflowProgress}%</strong>
            <span>
              {completedSteps} of {workflowSteps.length} stages completed
            </span>
          </div>
        </div>

        <div className="workflow-progress-bar">
          <div
            className="workflow-progress-fill"
            style={{ width: `${workflowProgress}%` }}
          />
        </div>

        <div className="workflow-tracker">
          {workflowSteps.map((step, index) => (
            <div
              className={`workflow-tracker-step ${
                step.completed
                  ? 'completed'
                  : index === currentStepIndex
                    ? 'current'
                    : 'locked'
              }`}
              key={step.title}
            >
              <div className="workflow-tracker-circle">
                {step.completed ? '✓' : String(index + 1).padStart(2, '0')}
              </div>
              <div className="workflow-tracker-content">
                <strong>{step.title}</strong>
                <span>
                  {step.completed
                    ? 'Completed this session'
                    : index === currentStepIndex
                      ? 'Current stage'
                      : 'Pending'}
                </span>
                <small>{step.description}</small>
              </div>
              {index < workflowSteps.length - 1 && (
                <div className="workflow-tracker-connector" />
              )}
            </div>
          ))}
        </div>

        <p>
          Workflow indicators reflect this page session. AI recommendations
          are advisory and require authorized human review.
        </p>
      </section>

      {/* OCR is available only to self-represented litigants and lawyer owners. */}
      {canUseOcr && (
        <>
          <section className="agent-card">
            <div className="agent-header">
              <div className="agent-title">
                <div className="agent-icon">📄</div>
                <div>
                  <span className="agent-label">PROCESSING MODULE</span>
                  <h3>Document Processing & OCR</h3>
                  <p>Extract text from a case document.</p>
                </div>
              </div>
              <span className="agent-status">
                {ocrText ? '● Text available' : '● Ready'}
              </span>
            </div>

            <div className="upload-area">
              <div className="upload-content">
                <strong>Select case document</strong>
                <span>
                  PNG, JPG, JPEG, TIFF or BMP supported by the current backend
                </span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.tif,.tiff,.bmp"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {selectedFile && <p>Selected: {selectedFile.name}</p>}

            <button
              onClick={handleOCR}
              disabled={processing || !selectedFile}
            >
              {processing ? 'Processing...' : 'Extract Text using OCR'}
            </button>
          </section>

          <section className="result-card">
            <div className="result-header">
              <div>
                <span className="result-label">OCR OUTPUT</span>
                <h3>Extracted Document Text</h3>
              </div>
            </div>

            {ocrText ? (
              <textarea
                className="ocr-output"
                value={ocrText}
                readOnly
                rows={10}
              />
            ) : (
              <div className="empty-result">
                <p>No OCR text available in this session yet.</p>
              </div>
            )}
          </section>
        </>
      )}

      {/* All three analysis agents are available to authorized case handlers. */}
      {canUseAnalysisAgents && (
        <>
          <section className="agent-card">
            <div className="agent-header">
              <div className="agent-title">
                <div className="agent-icon">⚖</div>
                <div>
                  <span className="agent-label">MODULE 02</span>
                  <h3>Precedent Retrieval</h3>
                  <p>Search the prototype precedent knowledge source.</p>
                </div>
              </div>
            </div>

            <button onClick={handlePrecedents} disabled={processing}>
              Retrieve Relevant Precedents
            </button>

            {precedentResult && (
              <div className="agent-result">
                <p>
                  Results returned:{' '}
                  {precedentResult.resultsFound ?? 'Not specified'}
                </p>
                <p>
                  Human review required:{' '}
                  {precedentResult.humanReviewRequired
                    ? 'Yes'
                    : 'Check source output'}
                </p>


{(precedentResult.results || []).map((precedent, index) => (
  <div
    className="precedent-item"
    key={precedent.id || index}
  >
    <h4>{precedent.title || 'Precedent record'}</h4>

    <p>{precedent.summary || ''}</p>

    <p>
      <strong>Case type:</strong>{' '}
      {precedent.caseType || 'Not specified'}
    </p>

    <p>
      <strong>Relevance:</strong>{' '}
      {precedent.relevance || 'Not assessed'}
      {' · '}
      <strong>Match score:</strong>{' '}
      {precedent.matchScore ?? 'Unavailable'}
    </p>

    <p>
      <strong>Verification status:</strong>{' '}
      {precedent.verificationStatus || 'Unknown'}
    </p>

    {precedent.citation && (
      <p>
        <strong>Citation:</strong> {precedent.citation}
      </p>
    )}

    {precedent.court && (
      <p>
        <strong>Court:</strong> {precedent.court}
      </p>
    )}

    {precedent.decisionDate && (
      <p>
        <strong>Decision date:</strong> {precedent.decisionDate}
      </p>
    )}

    {precedent.sourceUrl && (
      <p>
        <strong>Source:</strong>{' '}
        <a
          href={precedent.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View source
        </a>
      </p>
    )}

    {precedent.matchedKeywords?.length > 0 && (
      <p>
        <strong>Matched keywords:</strong>{' '}
        {precedent.matchedKeywords.join(', ')}
      </p>
    )}
  </div>
))}

{precedentResult.resultsFound === 0 && (
  <p role="status">No matching records were found.</p>
)}

{precedentResult.disclaimer && (
  <p role="note">
    <strong>Important:</strong> {precedentResult.disclaimer}
  </p>
)}

              </div>
            )}
          </section>

          <section className="agent-card">
            <div className="agent-header">
              <div className="agent-title">
                <div className="agent-icon">!</div>
                <div>
                  <span className="agent-label">MODULE 03</span>
                  <h3>Priority Scoring</h3>
                  <p>Generate a prototype priority recommendation.</p>
                </div>
              </div>
            </div>

            <button onClick={handlePriority} disabled={processing}>
              Run Priority Analysis
            </button>

            
{priorityResult && (
  <div className="priority-result">
    <p>
      Priority:{' '}
      <strong>{priorityResult.priority || 'Unavailable'}</strong>
    </p>

    <p>
      Prototype score:{' '}
      <strong>{priorityResult.score ?? 'Unavailable'} / 100</strong>
    </p>

    <p>
      This is a rule-based prototype score, not an accuracy percentage
      or a legally validated assessment.
    </p>

    {priorityResult.recommendation && (
      <p>
        <strong>Recommendation:</strong>{' '}
        {priorityResult.recommendation}
      </p>
    )}

    {priorityResult.reasons?.length > 0 && (
      <div>
        <h4>Scoring reasons</h4>
        <ul>
          {priorityResult.reasons.map((reason, index) => (
            <li key={`${index}-${reason}`}>{reason}</li>
          ))}
        </ul>
      </div>
    )}

    {priorityResult.factors?.length > 0 && (
      <div>
        <h4>Scoring factors</h4>
        {priorityResult.factors.map((factor, index) => (
          <div
            className="precedent-item"
            key={`${factor.factor}-${index}`}
          >
            <p>
              <strong>{factor.factor}</strong>
            </p>
            <p>
              <strong>Value:</strong>{' '}
              {Array.isArray(factor.value)
                ? factor.value.map((item) =>
                    typeof item === 'string'
                      ? item
                      : item?.title || JSON.stringify(item)
                  ).join(', ') || 'None'
                : factor.value ?? 'Not available'}
            </p>
            <p>
              <strong>Points:</strong> {factor.points ?? 0}
            </p>
            {factor.explanation && <p>{factor.explanation}</p>}
          </div>
        ))}
      </div>
    )}

    {priorityResult.reviewFlags?.length > 0 && (
      <div role="note">
        <h4>Human review flags</h4>
        <ul>
          {priorityResult.reviewFlags.map((flag, index) => (
            <li key={`${index}-${flag}`}>{flag}</li>
          ))}
        </ul>
      </div>
    )}

    {priorityResult.precedents?.length > 0 && (
      <div>
        <h4>Precedent context</h4>
        {priorityResult.precedents.map((precedent, index) => (
          <div
            className="precedent-item"
            key={precedent.id || index}
          >
            <p>
              <strong>{precedent.title}</strong>
            </p>
            <p>
              Match score: {precedent.matchScore ?? 'Unavailable'}
            </p>
            <p>
              Verification status:{' '}
              {precedent.verificationStatus || 'Unknown'}
            </p>
            {precedent.citation && <p>{precedent.citation}</p>}
          </div>
        ))}
      </div>
    )}

    {priorityResult.humanReviewRequired && (
      <p role="note">
        Human review is required before acting on this recommendation.
      </p>
    )}

    {priorityResult.disclaimer && (
      <p role="note">
        <strong>Disclaimer:</strong> {priorityResult.disclaimer}
      </p>
    )}
  </div>
)}

          </section>

          <section className="agent-card">
            <div className="agent-header">
              <div className="agent-title">
                <div className="agent-icon">📅</div>
                <div>
                  <span className="agent-label">MODULE 04</span>
                  <h3>Hearing Scheduling</h3>
                  <p>Generate a prototype hearing-slot recommendation.</p>
                </div>
              </div>
            </div>

<button
  onClick={handleSchedule}
  disabled={
    processing ||
    !priorityResult ||
    Boolean(scheduleResult?.alreadyScheduled)
  }
>
  {scheduleResult?.alreadyScheduled
    ? 'Recommendation Already Exists'
    : 'Generate Hearing Recommendation'}
</button>

            {!priorityResult && <p>Run priority analysis first.</p>}

            {scheduleResult && (
              <div className="schedule-result">
                <p>
                  Recommended date:{' '}
                  <strong>
                    {scheduleResult.recommendedDate || 'Not returned'}
                  </strong>
                </p>
                <p>
                  Recommended time:{' '}
                  <strong>
                    {scheduleResult.recommendedTime || 'Not returned'}
                  </strong>
                </p>
                <p>
                  Human approval required:{' '}
                  <strong>
                    {scheduleResult.humanApprovalRequired
                      ? 'Yes'
                      : 'Verify response'}
                  </strong>
                </p>
                {scheduleResult.reason && <p>{scheduleResult.reason}</p>}
              </div>
            )}
          </section>
        </>
      )}

      {/* Judges and registrars can review recommendations but cannot run agents. */}
      {canReview && (
        <section className="review-card">
          <div className="review-header">
            <div>
              <span className="agent-label">FINAL CONTROL</span>
              <h3>Human-in-the-Loop Review</h3>
              <p>Final decisions must be made by authorized personnel.</p>
            </div>
            <span className={`review-status ${reviewStatus.toLowerCase()}`}>
              {reviewStatus}
            </span>
          </div>

          <p>
            Current role: <strong>{role}</strong>
          </p>

          <p>
            Current recommendation:{' '}
            <strong>
              {scheduleResult
                ? `${scheduleResult.recommendedDate || ''} ${scheduleResult.recommendedTime || ''}`
                : 'Not generated'}
            </strong>
          </p>

          <label>
            Reviewer note
            <textarea
              value={reviewerNote}
              onChange={(event) => setReviewerNote(event.target.value)}
              rows={3}
              placeholder="Enter review notes"
            />
          </label>

          {scheduleResult && (
            <>
              <label>
                Modified hearing date
                <input
                  type="date"
                  value={modifiedDate}
                  onChange={(event) => setModifiedDate(event.target.value)}
                />
              </label>

              <label>
                Modified hearing time
                <input
                  type="text"
                  value={modifiedTime}
                  onChange={(event) => setModifiedTime(event.target.value)}
                  placeholder="e.g. 10:00 AM - 11:00 AM"
                />
              </label>
            </>
          )}

          <div className="review-actions">
        <button
  className="approve-button"
  disabled={
    processing ||
    reviewStatus !== 'Pending' ||
    !scheduleResult
  }
  onClick={() => saveReview('Approved')}
>
  {processing ? 'Saving...' : 'Approve'}
</button>

 <button
  className="modify-button"
  disabled={
    processing ||
    reviewStatus !== 'Pending' ||
    !scheduleResult ||
    !modifiedDate ||
    !modifiedTime.trim()
  }
  onClick={() => saveReview('Modified')}
>
  {processing ? 'Saving...' : 'Modify'}
</button>           
  <button
  className="reject-button"
  disabled={
    processing ||
    reviewStatus !== 'Pending' ||
    !scheduleResult
  }
  onClick={() => saveReview('Rejected')}
>
  {processing ? 'Saving...' : 'Reject'}
</button>
          </div>

          {reviewComment && <p>Current session note: {reviewComment}</p>}

<p>
  Hearing decisions are submitted to the backend. Once a decision
  is recorded, review actions are disabled for this recommendation.
</p>
        </section>
      )}

      <div className="case-footer-note">
        Academic prototype · Recommendations are advisory and require human
        review.
      </div>
    </div>
  )
}

export default CaseDetails
