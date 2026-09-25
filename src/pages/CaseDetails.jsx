import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

function CaseDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const role = localStorage.getItem('userRole') || 'User'

  const canReview =
    role === 'Judge' ||
    role === 'Registrar'

  const fallbackCase = {
    id: id || 'CASE-2026-001',
    caseType: 'Property Dispute',
    petitioner: 'Amit Kumar',
    respondent: 'Ravi Sharma',
    description:
      'Property dispute between the petitioner and respondent.',
    lawSection: 'Section 420 IPC',
    filingDate: '2026-09-20',
    urgency: 'High',
    status: 'Registered',
  }

  const [caseData, setCaseData] = useState(fallbackCase)
  const [selectedFile, setSelectedFile] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [priorityResult, setPriorityResult] = useState(null)
  const [precedentResult, setPrecedentResult] = useState(null)
  const [scheduleResult, setScheduleResult] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [reviewStatus, setReviewStatus] = useState('Pending')
  const [reviewComment, setReviewComment] = useState('')

  // ==========================================================
  // LOAD EXACT CASE
  // ==========================================================

  useEffect(() => {
    try {
      const existingCases = JSON.parse(
        localStorage.getItem('cases') || '[]'
      )

      if (
        Array.isArray(existingCases) &&
        existingCases.length > 0
      ) {
        const matchedCase = existingCases.find(
          (item) => item.id === id
        )

        if (matchedCase) {
          setCaseData(matchedCase)

          setOcrText(
            matchedCase.ocrText || ''
          )

          setPriorityResult(
            matchedCase.priorityResult || null
          )

          setPrecedentResult(
            matchedCase.precedentResult || null
          )

          setScheduleResult(
            matchedCase.scheduleResult || null
          )

          setReviewStatus(
            matchedCase.reviewStatus || 'Pending'
          )

          setReviewComment(
            matchedCase.reviewComment || ''
          )

          localStorage.setItem(
            'currentCase',
            JSON.stringify(matchedCase)
          )

          return
        }
      }

      setCaseData(fallbackCase)
      setOcrText('')
      setPriorityResult(null)
      setPrecedentResult(null)
      setScheduleResult(null)
      setReviewStatus('Pending')
      setReviewComment('')
    } catch (error) {
      console.error(
        'Failed to load case:',
        error
      )
    }
  }, [id])

  // ==========================================================
  // UPDATE CASE STORAGE
  // ==========================================================

  const updateCaseStorage = (updates) => {
    try {
      const updatedCase = {
        ...caseData,
        ...updates,
      }

      setCaseData(updatedCase)

      localStorage.setItem(
        'currentCase',
        JSON.stringify(updatedCase)
      )

      const existingCases = JSON.parse(
        localStorage.getItem('cases') || '[]'
      )

      const caseExists = existingCases.some(
        (item) => item.id === updatedCase.id
      )

      let updatedCases

      if (caseExists) {
        updatedCases = existingCases.map(
          (item) =>
            item.id === updatedCase.id
              ? {
                  ...item,
                  ...updates,
                }
              : item
        )
      } else {
        updatedCases = [
          ...existingCases,
          updatedCase,
        ]
      }

      localStorage.setItem(
        'cases',
        JSON.stringify(updatedCases)
      )

      return updatedCase
    } catch (error) {
      console.error(
        'Failed to update case storage:',
        error
      )

      return null
    }
  }

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  const handleFileChange = (e) => {
    setSelectedFile(
      e.target.files?.[0] || null
    )
  }

  // ==========================================================
  // OCR
  // ==========================================================

  const handleOCR = async () => {
    if (!selectedFile) {
      alert(
        'Please select a document first.'
      )

      return
    }

    try {
      setProcessing(true)

      const formData = new FormData()

      formData.append(
        'file',
        selectedFile
      )

      const response = await fetch(
        'http://127.0.0.1:8000/ai/ocr',
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error('OCR failed')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const extractedText =
        data.text || ''

      setOcrText(extractedText)

      updateCaseStorage({
        ocrText: extractedText,
        documentName: selectedFile.name,
        ocrStatus: 'Completed',
      })

      alert(
        'Document processed successfully.'
      )
    } catch (error) {
      console.error(error)

      alert(
        'OCR failed. Make sure FastAPI is running.'
      )
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================================
  // PRECEDENT RETRIEVAL
  // ==========================================================

  const handlePrecedents = async () => {
    try {
      setProcessing(true)

      const response = await fetch(
        'http://127.0.0.1:8000/ai/precedents',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            caseType:
              caseData.caseType,

            description:
              ocrText ||
              caseData.description,

            lawSection:
              caseData.lawSection,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          'Precedent retrieval failed'
        )
      }

      const data = await response.json()

      setPrecedentResult(data)

      updateCaseStorage({
        precedentResult: data,
        precedentStatus: 'Completed',
      })

      alert(
        `${data.resultsFound} relevant precedent(s) retrieved.`
      )
    } catch (error) {
      console.error(error)

      alert(
        'Precedent retrieval failed. Make sure FastAPI is running.'
      )
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================================
  // PRIORITY
  // ==========================================================

  const handlePriority = async () => {
    try {
      setProcessing(true)

      const response = await fetch(
        'http://127.0.0.1:8000/ai/priority',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            caseType:
              caseData.caseType,

            description:
              ocrText ||
              caseData.description,

            urgency:
              caseData.urgency,

            lawSection:
              caseData.lawSection,

            filingDate:
              caseData.filingDate,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          'Priority analysis failed'
        )
      }

      const data = await response.json()

      setPriorityResult(data)

      updateCaseStorage({
        priority:
          data.priority ||
          'MEDIUM',

        priorityScore:
          data.score ?? null,

        priorityResult: data,

        priorityStatus:
          'Completed',

        status:
          'Pending',
      })

      alert(
        `AI priority analysis completed: ${data.priority} (${data.score}/100)`
      )
    } catch (error) {
      console.error(error)

      alert(
        'Priority analysis failed. Make sure FastAPI is running.'
      )
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================================
  // SCHEDULING
  // ==========================================================

  const handleSchedule = async () => {
    if (!priorityResult) {
      alert(
        'Run AI priority analysis first.'
      )

      return
    }

    try {
      setProcessing(true)

      const priority =
        priorityResult.priority ||
        priorityResult.level ||
        'MEDIUM'

      const response = await fetch(
        'http://127.0.0.1:8000/ai/schedule',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            priority,

            preferredDate:
              caseData.filingDate ||
              '2026-09-28',
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          'Scheduling failed'
        )
      }

      const data =
        await response.json()

      setScheduleResult(data)

      updateCaseStorage({
        scheduleResult: data,

        hearing:
          `${data.recommendedDate} | ${data.recommendedTime}`,

        hearingDate:
          data.recommendedDate,

        hearingTime:
          data.recommendedTime,

        schedulingStatus:
          'Completed',
      })

      alert(
        'Hearing recommendation generated.'
      )
    } catch (error) {
      console.error(error)

      alert(
        'Scheduling failed. Make sure FastAPI is running.'
      )
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================================
  // HUMAN REVIEW
  // ==========================================================

  const saveReview = (
    status,
    customComment = null,
    customSchedule = null
  ) => {
    if (!canReview) {
      alert(
        'You are not authorized to make the final case decision.'
      )

      return
    }

    const reviewerRole =
      localStorage.getItem('userRole') ||
      'User'

    const reviewedAt =
      new Date().toLocaleString()

    const reviewData = {
      caseId: caseData.id,
      status,
      reviewerRole,
      reviewedAt,
    }

    localStorage.setItem(
      'caseReview',
      JSON.stringify(reviewData)
    )

    updateCaseStorage({
      reviewStatus: status,

      reviewComment:
        customComment ||
        (
          status === 'Approved'
            ? 'AI recommendation approved by the authorized reviewer.'
            : status === 'Rejected'
            ? 'AI recommendation rejected by the authorized reviewer.'
            : 'AI recommendation modified by the authorized reviewer.'
        ),

      reviewerRole,
      reviewedAt,

      ...(customSchedule
        ? {
            scheduleResult:
              customSchedule,

            hearing:
              `${customSchedule.recommendedDate} | ${customSchedule.recommendedTime}`,

            hearingDate:
              customSchedule.recommendedDate,

            hearingTime:
              customSchedule.recommendedTime,
          }
        : {}),

      status:
        status === 'Approved'
          ? 'Approved'
          : status === 'Rejected'
          ? 'Rejected'
          : 'Modified',
    })
  }

  // ==========================================================
  // APPROVE
  // ==========================================================

  const handleApprove = () => {
    if (!canReview) {
      alert(
        'Only Judge or Registrar can approve a case.'
      )

      return
    }

    const comment =
      'AI recommendation approved by the authorized reviewer.'

    setReviewStatus('Approved')
    setReviewComment(comment)

    saveReview(
      'Approved',
      comment
    )

    alert(
      'AI recommendation approved.'
    )
  }

  // ==========================================================
  // REJECT
  // ==========================================================

  const handleReject = () => {
    if (!canReview) {
      alert(
        'Only Judge or Registrar can reject a case.'
      )

      return
    }

    const comment =
      'AI recommendation rejected by the authorized reviewer.'

    setReviewStatus('Rejected')
    setReviewComment(comment)

    saveReview(
      'Rejected',
      comment
    )

    alert(
      'AI recommendation rejected.'
    )
  }

  // ==========================================================
  // MODIFY
  // ==========================================================

  const handleModify = () => {
    if (!canReview) {
      alert(
        'Only Judge or Registrar can modify a case.'
      )

      return
    }

    const newDate =
      window.prompt(
        'Enter modified hearing date:',
        scheduleResult?.recommendedDate ||
          '2026-09-28'
      )

    if (!newDate) {
      return
    }

    const newTime =
      window.prompt(
        'Enter modified hearing time:',
        scheduleResult?.recommendedTime ||
          '10:00 AM - 11:00 AM'
      )

    if (!newTime) {
      return
    }

    const modifiedSchedule = {
      ...(scheduleResult || {}),
      recommendedDate: newDate,
      recommendedTime: newTime,
    }

    const comment =
      'AI recommendation modified by the authorized reviewer.'

    setScheduleResult(
      modifiedSchedule
    )

    setReviewStatus(
      'Modified'
    )

    setReviewComment(
      comment
    )

    saveReview(
      'Modified',
      comment,
      modifiedSchedule
    )

    alert(
      'AI recommendation modified successfully.'
    )
  }

  // ==========================================================
  // WORKFLOW STATUS
  // ==========================================================

  const workflowSteps = [
    {
      number: '01',
      title: 'Case Registered',
      description:
        'Case record created',
      completed:
        Boolean(caseData.id),
    },

    {
      number: '02',
      title: 'OCR Extraction',
      description:
        'Document information extracted',
      completed:
        Boolean(
          caseData.ocrStatus ===
            'Completed' ||
          ocrText
        ),
    },

    {
      number: '03',
      title: 'Precedent Retrieval',
      description:
        'Relevant precedents identified',
      completed:
        Boolean(
          caseData.precedentStatus ===
            'Completed' ||
          precedentResult
        ),
    },

    {
      number: '04',
      title: 'Priority Scoring',
      description:
        'AI priority recommendation generated',
      completed:
        Boolean(
          caseData.priorityStatus ===
            'Completed' ||
          priorityResult
        ),
    },

    {
      number: '05',
      title: 'Hearing Scheduling',
      description:
        'Hearing slot recommended',
      completed:
        Boolean(
          caseData.schedulingStatus ===
            'Completed' ||
          scheduleResult
        ),
    },

    {
      number: '06',
      title: 'Human Review',
      description:
        'Authorized user reviews AI output',
      completed:
        reviewStatus !== 'Pending',
    },
  ]

  const completedSteps =
    workflowSteps.filter(
      (step) => step.completed
    ).length

  const currentStepIndex =
    workflowSteps.findIndex(
      (step) => !step.completed
    )

  const activeStep =
    currentStepIndex === -1
      ? workflowSteps.length
      : currentStepIndex + 1

  const workflowProgress = Math.round(
    (completedSteps /
      workflowSteps.length) *
      100
  )

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="case-details-page">

      {/* PAGE HEADING */}

      <div className="case-detail-heading">

        <div>

          <div className="breadcrumb">
            Cases / Case Details
          </div>

          <h2>
            {caseData.id}
          </h2>

          <p>
            AI-assisted case analysis and
            hearing management
          </p>

        </div>

        <div className="case-detail-actions">

          <button
            className="secondary-action"
            onClick={() =>
              navigate('/cases')
            }
          >
            ← All Cases
          </button>

        </div>

      </div>

      {/* CASE OVERVIEW */}

      <section className="case-overview-card">

        <div className="case-overview-top">

          <div>

            <span className="case-label">
              CASE ID
            </span>

            <h3>
              {caseData.id}
            </h3>

          </div>

          <div className="case-overview-badges">

            <span className="detail-status-badge">
              {caseData.status ||
                'Registered'}
            </span>

            <span className="detail-priority-badge">

              {priorityResult?.priority ||
                caseData.priority ||
                caseData.urgency ||
                'Medium'}

              {' '}

              {priorityResult
                ? 'Priority'
                : 'Urgency'}

            </span>

          </div>

        </div>

        <div className="case-overview-grid">

          <div>
            <span>
              Case Type
            </span>

            <strong>
              {caseData.caseType}
            </strong>
          </div>

          <div>
            <span>
              Petitioner
            </span>

            <strong>
              {caseData.petitioner}
            </strong>
          </div>

          <div>
            <span>
              Respondent
            </span>

            <strong>
              {caseData.respondent}
            </strong>
          </div>

          <div>
            <span>
              Filing Date
            </span>

            <strong>
              {caseData.filingDate ||
                'Not specified'}
            </strong>
          </div>

          <div>
            <span>
              Applicable Law
            </span>

            <strong>
              {caseData.lawSection ||
                'Not specified'}
            </strong>
          </div>

        </div>

        <div className="case-description">

          <span>
            Case Description
          </span>

          <p>
            {caseData.description}
          </p>

        </div>

      </section>

      {/* =====================================================
          CASE WORKFLOW TRACKER
      ====================================================== */}

      <section className="workflow-tracker-card">

        <div className="workflow-tracker-header">

          <div>

            <span className="agent-label">
              CASE PROCESSING
            </span>

            <h3>
              Case Workflow Progress
            </h3>

            <p>
              Track the case from registration
              through AI processing and
              authorized human review.
            </p>

          </div>

          <div className="workflow-progress-summary">

            <strong>
              {workflowProgress}%
            </strong>

            <span>
              {completedSteps} of{' '}
              {workflowSteps.length}{' '}
              stages completed
            </span>

          </div>

        </div>

        <div className="workflow-progress-bar">

          <div
            className="workflow-progress-fill"
            style={{
              width: `${workflowProgress}%`,
            }}
          />

        </div>

        <div className="workflow-tracker">

          {workflowSteps.map(
            (step, index) => {

              const isCompleted =
                step.completed

              const isCurrent =
                !isCompleted &&
                index ===
                  currentStepIndex

              return (
                <div
                  className={`workflow-tracker-step ${
                    isCompleted
                      ? 'completed'
                      : isCurrent
                      ? 'current'
                      : 'locked'
                  }`}
                  key={step.number}
                >

                  <div className="workflow-tracker-circle">

                    {isCompleted
                      ? '✓'
                      : step.number}

                  </div>

                  <div className="workflow-tracker-content">

                    <strong>
                      {step.title}
                    </strong>

                    <span>
                      {isCompleted
                        ? 'Completed'
                        : isCurrent
                        ? 'Current stage'
                        : 'Pending'}
                    </span>

                    <small>
                      {step.description}
                    </small>

                  </div>

                  {index <
                    workflowSteps.length -
                      1 && (
                    <div className="workflow-tracker-connector" />
                  )}

                </div>
              )
            }
          )}

        </div>

        <div className="workflow-current-message">

          {workflowProgress === 100 ? (

            <strong>
              ✓ Complete workflow finished
            </strong>

          ) : (

            <strong>
              Current stage: Step{' '}
              {activeStep} —{' '}
              {workflowSteps[
                activeStep - 1
              ]?.title}
            </strong>

          )}

          <span>
            AI recommendations remain subject
            to authorized human review.
          </span>

        </div>

      </section>

      {/* AI WORKFLOW */}

      <section className="workflow-overview">

        <div className="section-title-row">

          <div>

            <h3>
              AI Case Processing Workflow
            </h3>

            <p>
              Process the case through the
              specialized AI agents.
            </p>

          </div>

        </div>

        <div className="workflow-progress">

          <div className="workflow-step">

            <div className="workflow-number">
              01
            </div>

            <strong>
              OCR
            </strong>

            <span>
              Document extraction
            </span>

          </div>

          <div className="workflow-line" />

          <div className="workflow-step">

            <div className="workflow-number">
              02
            </div>

            <strong>
              Precedent
            </strong>

            <span>
              Legal retrieval
            </span>

          </div>

          <div className="workflow-line" />

          <div className="workflow-step">

            <div className="workflow-number">
              03
            </div>

            <strong>
              Priority
            </strong>

            <span>
              Case assessment
            </span>

          </div>

          <div className="workflow-line" />

          <div className="workflow-step">

            <div className="workflow-number">
              04
            </div>

            <strong>
              Scheduling
            </strong>

            <span>
              Hearing recommendation
            </span>

          </div>

          <div className="workflow-line" />

          <div className="workflow-step">

            <div className="workflow-number">
              05
            </div>

            <strong>
              Review
            </strong>

            <span>
              Human approval
            </span>

          </div>

        </div>

      </section>

      {/* DOCUMENT PROCESSING */}

      <section className="agent-card">

        <div className="agent-header">

          <div className="agent-title">

            <div className="agent-icon">
              📄
            </div>

            <div>

              <span className="agent-label">
                AGENT 01
              </span>

              <h3>
                Document Processing & OCR
              </h3>

              <p>
                Extract text from uploaded
                case documents.
              </p>

            </div>

          </div>

          <span className="agent-status">

            {ocrText
              ? '● Completed'
              : '● Ready'}

          </span>

        </div>

        <div className="upload-area">

          <div className="upload-content">

            <div className="upload-symbol">
              ↑
            </div>

            <strong>
              Select case document
            </strong>

            <span>
              PNG, JPG, JPEG or PDF
            </span>

            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={
                handleFileChange
              }
            />

          </div>

        </div>

        {selectedFile && (

          <div className="selected-file">

            <span>
              📄
            </span>

            <div>

              <strong>
                {selectedFile.name}
              </strong>

              <small>
                Document selected for OCR
                processing
              </small>

            </div>

          </div>

        )}

        <div className="agent-action-row">

          <button
            onClick={handleOCR}
            disabled={processing}
          >
            {processing
              ? 'Processing...'
              : 'Extract Text using OCR'}
          </button>

        </div>

      </section>

      {/* OCR RESULT */}

      <section className="result-card">

        <div className="result-header">

          <div>

            <span className="result-label">
              OCR OUTPUT
            </span>

            <h3>
              Extracted Document Text
            </h3>

          </div>

          {ocrText && (

            <span className="completed-badge">
              ✓ Completed
            </span>

          )}

        </div>

        {ocrText ? (

          <textarea
            className="ocr-output"
            value={ocrText}
            readOnly
            rows="10"
          />

        ) : (

          <div className="empty-result">

            <span>
              📄
            </span>

            <p>
              No OCR text available yet.
            </p>

            <small>
              Upload a document above and
              run the OCR agent.
            </small>

          </div>

        )}

      </section>

      {/* PRECEDENT AGENT */}

      <section className="agent-card">

        <div className="agent-header">

          <div className="agent-title">

            <div className="agent-icon">
              ⚖
            </div>

            <div>

              <span className="agent-label">
                AGENT 02
              </span>

              <h3>
                Precedent Retrieval Agent
              </h3>

              <p>
                Retrieve relevant precedents
                based on case information.
              </p>

            </div>

          </div>

          {precedentResult && (

            <span className="agent-status">
              ● Completed
            </span>

          )}

        </div>

        <div className="agent-description">

          The agent analyzes the case type,
          extracted document text and
          applicable law to identify
          relevant precedent records.

        </div>

        <button
          onClick={handlePrecedents}
          disabled={processing}
        >
          Retrieve Relevant Precedents
        </button>

        {precedentResult && (

          <div className="agent-result">

            <div className="result-summary-grid">

              <div>

                <span>
                  Agent
                </span>

                <strong>
                  {precedentResult.agent}
                </strong>

              </div>

              <div>

                <span>
                  Results Found
                </span>

                <strong>
                  {precedentResult.resultsFound}
                </strong>

              </div>

              <div>

                <span>
                  Human Review
                </span>

                <strong>
                  {precedentResult.humanReviewRequired
                    ? 'Required'
                    : 'Not Required'}
                </strong>

              </div>

            </div>

            <div className="precedent-list">

              {precedentResult.results &&
                precedentResult.results.map(
                  (precedent) => (

                    <div
                      key={precedent.id}
                      className="precedent-item"
                    >

                      <div className="precedent-top">

                        <div>

                          <span className="precedent-id">
                            {precedent.id}
                          </span>

                          <h4>
                            {precedent.title}
                          </h4>

                        </div>

                        <span className="relevance-badge">
                          {precedent.relevance}
                        </span>

                      </div>

                      <p>
                        {precedent.summary}
                      </p>

                      <div className="precedent-meta">

                        <span>
                          Type:{' '}

                          <strong>
                            {precedent.caseType}
                          </strong>

                        </span>

                        <span>
                          Match Score:{' '}

                          <strong>
                            {precedent.matchScore}
                          </strong>

                        </span>

                        <span>
                          Keywords:{' '}

                          <strong>
                            {precedent.matchedKeywords?.join(
                              ', '
                            )}
                          </strong>

                        </span>

                      </div>

                    </div>

                  )
                )}

            </div>

          </div>

        )}

      </section>

      {/* PRIORITY AGENT */}

      <section className="agent-card">

        <div className="agent-header">

          <div className="agent-title">

            <div className="agent-icon">
              !
            </div>

            <div>

              <span className="agent-label">
                AGENT 03
              </span>

              <h3>
                Priority Scoring Agent
              </h3>

              <p>
                Analyze case urgency and
                generate an AI-assisted
                priority recommendation.
              </p>

            </div>

          </div>

          {priorityResult && (

            <span className="agent-status">
              ● Completed
            </span>

          )}

        </div>

        <div className="agent-description">

          The agent evaluates the case
          information, urgency, legal details
          and other factors to determine the
          recommended priority.

        </div>

        <button
          onClick={handlePriority}
          disabled={processing}
        >
          Run AI Priority Analysis
        </button>

        {priorityResult && (

          <div className="priority-result">

            <div className="priority-main">

              <span>
                Recommended Priority
              </span>

              <strong>
                {priorityResult.priority ||
                  priorityResult.level ||
                  'Not available'}
              </strong>

            </div>

            <div className="priority-details">

              <div>

                <span>
                  Score
                </span>

                <strong>
                  {priorityResult.score ??
                    priorityResult.priorityScore ??
                    'Not available'}
                </strong>

              </div>

              <div>

                <span>
                  Recommendation
                </span>

                <strong>
                  {priorityResult.recommendation ||
                    'AI-based case assessment'}
                </strong>

              </div>

            </div>

            {priorityResult.reasons &&
              priorityResult.reasons.length >
                0 && (

                <div className="priority-reasons">

                  <span>
                    Analysis Factors
                  </span>

                  <ul>

                    {priorityResult.reasons.map(
                      (
                        reason,
                        index
                      ) => (

                        <li
                          key={index}
                        >
                          {reason}
                        </li>

                      )
                    )}

                  </ul>

                </div>

              )}

          </div>

        )}

      </section>

      {/* SCHEDULING AGENT */}

      <section className="agent-card">

        <div className="agent-header">

          <div className="agent-title">

            <div className="agent-icon">
              📅
            </div>

            <div>

              <span className="agent-label">
                AGENT 04
              </span>

              <h3>
                Hearing Scheduling Agent
              </h3>

              <p>
                Recommend an available
                hearing slot based on case
                priority.
              </p>

            </div>

          </div>

          {scheduleResult && (

            <span className="agent-status">
              ● Completed
            </span>

          )}

        </div>

        <div className="agent-description">

          The scheduling agent uses the case
          priority and available hearing slots
          to recommend an appropriate date
          and time.

        </div>

        <button
          onClick={handleSchedule}
          disabled={
            processing ||
            !priorityResult
          }
        >
          Generate Hearing Recommendation
        </button>

        {!priorityResult && (

          <div className="dependency-message">
            Run the Priority Scoring Agent
            first.
          </div>

        )}

        {scheduleResult && (

          <div className="schedule-result">

            <div className="schedule-highlight">

              <span>
                Recommended Hearing
              </span>

              <strong>
                {scheduleResult.recommendedDate}
              </strong>

              <b>
                {scheduleResult.recommendedTime}
              </b>

            </div>

            <div className="schedule-details">

              <div>

                <span>
                  Priority
                </span>

                <strong>
                  {scheduleResult.priority}
                </strong>

              </div>

              <div>

                <span>
                  Reason
                </span>

                <strong>
                  {scheduleResult.reason}
                </strong>

              </div>

              <div>

                <span>
                  Human Approval
                </span>

                <strong>
                  {scheduleResult.humanApprovalRequired
                    ? 'Required'
                    : 'Not Required'}
                </strong>

              </div>

            </div>

          </div>

        )}

      </section>

      {/* HUMAN REVIEW */}

      <section className="review-card">

        <div className="review-header">

          <div>

            <span className="agent-label">
              FINAL CONTROL
            </span>

            <h3>
              Human-in-the-Loop Review
            </h3>

            <p>
              AI recommendations are advisory.
              Final action requires authorized
              human review.
            </p>

          </div>

          <span
            className={`review-status ${reviewStatus.toLowerCase()}`}
          >
            {reviewStatus}
          </span>

        </div>

        <div className="review-information">

          <div>

            <span>
              Current User Role
            </span>

            <strong>
              {role}
            </strong>

          </div>

          <div>

            <span>
              Case
            </span>

            <strong>
              {caseData.id}
            </strong>

          </div>

          <div>

            <span>
              Recommendation
            </span>

            <strong>
              {scheduleResult
                ? `${scheduleResult.recommendedDate} | ${scheduleResult.recommendedTime}`
                : 'Not generated'}
            </strong>

          </div>

        </div>

        {canReview ? (

          reviewStatus === 'Pending' ? (

            <div className="review-actions">

              <button
                className="approve-button"
                onClick={handleApprove}
                disabled={
                  !scheduleResult
                }
              >
                ✓ Approve
              </button>

              <button
                className="modify-button"
                onClick={handleModify}
                disabled={
                  !scheduleResult
                }
              >
                ✎ Modify
              </button>

              <button
                className="reject-button"
                onClick={handleReject}
                disabled={
                  !scheduleResult
                }
              >
                × Reject
              </button>

            </div>

          ) : (

            <div className="final-review-message">

              <strong>
                Final Decision:{' '}
                {reviewStatus}
              </strong>

              <p>
                {reviewComment}
              </p>

            </div>

          )

        ) : (

          <div className="final-review-message">

            <strong>
              🔒 Authorized Review Required
            </strong>

            <p>
              You are logged in as{' '}
              <strong>
                {role}
              </strong>.
              Only Judge or Registrar can
              approve, modify or reject AI
              recommendations.
            </p>

          </div>

        )}

      </section>

      <div className="case-footer-note">

        Academic Prototype · AI
        recommendations require human
        review before final decisions.

      </div>

    </div>
  )
}

export default CaseDetails