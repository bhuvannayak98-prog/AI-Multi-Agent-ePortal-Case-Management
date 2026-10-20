
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_URL = 'http://127.0.0.1:8000'

const today = [
  new Date().getFullYear(),
  String(new Date().getMonth() + 1).padStart(2, '0'),
  String(new Date().getDate()).padStart(2, '0'),
].join('-')

function NewCase() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    caseType: '',
    petitioner: '',
    respondent: '',
    description: '',
    lawSection: '',
    filingDate: '',
    urgency: 'Medium',
    documentName: '',
  })

  const [selectedFile, setSelectedFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ocrCompleted, setOcrCompleted] = useState(false)

  const [registeredCaseId, setRegisteredCaseId] = useState('')
  const [showRepresentationChoice, setShowRepresentationChoice] =
    useState(false)
  const [isSavingRepresentation, setIsSavingRepresentation] =
    useState(false)

  const getToken = () => localStorage.getItem('accessToken')
  
const userRole = (localStorage.getItem('userRole') || '')
  .trim()
  .toLowerCase()

const isLitigant = userRole === 'litigant'



const handleChange = (event) => {
  const { name, value } = event.target



  if (name === 'filingDate' && value > today) {
    alert('Filing date cannot be in the future.')
    return
  }

  setFormData((previous) => ({
    ...previous,
    [name]: value,
  }))
}



const handleSelectedFile = (file) => {
  if (!file) return

  setSelectedFile(file)

  setFormData((previous) => ({
    ...previous,
    documentName: file.name,
  }))

  setOcrCompleted(false)
  setOcrText('')
}

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  handleSelectedFile(file)
}


const handleDragOver = (event) => {
  event.preventDefault()
  if (isSubmitting || isProcessingOCR) return
  setIsDragging(true)
}

const handleDragLeave = (event) => {
  event.preventDefault()
  setIsDragging(false)
}

const handleDrop = (event) => {
  event.preventDefault()
  setIsDragging(false)

  if (isSubmitting || isProcessingOCR) return

  const file = event.dataTransfer.files?.[0]
  handleSelectedFile(file)
}



const detectCaseType = (text) => {
  const content = text.toLowerCase()

  if (/property|land dispute|ownership dispute/.test(content))
    return 'Property Dispute'

  if (/contract|agreement|breach of contract/.test(content))
    return 'Contract Dispute'

  if (/divorce|custody|family dispute|maintenance/.test(content))
    return 'Family Dispute'

  if (/appeal|appellant|appellate/.test(content))
    return 'Civil Appeal'

  if (/cybercrime|cyber crime|online fraud|phishing/.test(content))
    return 'Cybercrime'

  if (/criminal|theft|assault|murder|fir\b/.test(content))
    return 'Criminal Case'

  if (/civil dispute|plaintiff|damages|injunction/.test(content))
    return 'Civil Dispute'

  return ''
}



const extractField = (text, labels) => {
const lines = text
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .join('\n')
  .replace(/Pet\s*\n\s*ner\s*:/gi, 'Petitioner:')
  .replace(/Respon\s*\n\s*dent\s*:/gi, 'Respondent:')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)

  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const regex = new RegExp(
      `^\\s*${escapedLabel}\\s*(?:[:+\\-]|\\s)\\s*(.*?)\\s*$`,
      'i'
    )

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex)
      if (!match) continue

      const value = match[1].trim()

      // Reject values that look like another field label.
      if (
        value &&
        !/^(?:case type|filing date|date of filing|respondent|defendant|law section|applicable law|urgency|priority|description)\b/i.test(value)
      ) {
        return value
      }

      // If the label has no value, inspect the next line.
      if (!value && lines[i + 1]) {
        const nextLine = lines[i + 1]

        const looksLikeAnotherField =
          /^(?:case type|filing date|date of filing|petitioner|plaintiff|appellant|complainant|respondent|defendant|law section|applicable law|urgency|priority|description)\b/i.test(
            nextLine
          )

        if (!looksLikeAnotherField) return nextLine
      }
    }
  }

  return ''
}



  const handleOCR = async () => {
    if (!selectedFile) {
      alert('Please upload a case document first.')
      return
    }

const allowedTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/tiff',
  'image/bmp',
]

const allowedExtensions = /\.(pdf|png|jpe?g|tif?f|bmp)$/i

if (
  !allowedTypes.includes(selectedFile.type) &&
  !allowedExtensions.test(selectedFile.name)
) {
  alert('Please upload a PDF, PNG, JPG, JPEG, TIFF, or BMP document.')
  return
}

    const token = getToken()

    if (!token) {
      alert('Your session has expired. Please log in again.')
      navigate('/login')
      return
    }

    setIsProcessingOCR(true)

    try {
      const uploadData = new FormData()
      uploadData.append('file', selectedFile)

      const response = await fetch(`${API_URL}/ai/ocr/intake`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail = data.detail
        const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item.msg || JSON.stringify(item)).join('; ')
            : `OCR failed with status ${response.status}.`

  throw new Error(message)
}
      const extractedText = data.text || ''
      setOcrText(extractedText)

      const petitioner = extractField(extractedText, [
        'Petitioner',
        'Plaintiff',
        'Appellant',
        'Complainant',
      ])

      const respondent = extractField(extractedText, [
        'Respondent',
        'Defendant',
        'Respondent Name',
        'Opposite Party',
      ])

      const lawSection = extractField(extractedText, [
        'Law Section',
        'Section',
        'Applicable Law',
        'Act',
      ])

      const filingDate = extractField(extractedText, [
        'Filing Date',
        'Date of Filing',
        'Date',
      ])


const normalizeFilingDate = (value) => {
  const input = value.trim()
  let year, month, day
  let match


  // YYYY-MM-DD
match = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

if (match) {
  ;[, year, month, day] = match
} else {
  // DD-MM-YYYY or DD/MM/YYYY
  match = input.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
    if (match) {
      ;[, day, month, year] = match
    } else {
      // DD Month YYYY, e.g. 12 March 2026
      match = input.match(
        /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2}|\d{4})$/i
      )

      if (!match) return ''

      const monthNames = [
        'january', 'february', 'march', 'april',
        'may', 'june', 'july', 'august',
        'september', 'october', 'november', 'december',
      ]

      const monthIndex = monthNames.indexOf(match[2].toLowerCase())
      if (monthIndex === -1) return ''

      day = match[1]
      month = String(monthIndex + 1)
      year = match[3]

      if (year.length === 2) {
        year = `20${year}`
      }
    }
  }

  const y = Number(year)
  const m = Number(month)
  const d = Number(day)

  const parsedDate = new Date(Date.UTC(y, m - 1, d))

  if (
    parsedDate.getUTCFullYear() !== y ||
    parsedDate.getUTCMonth() !== m - 1 ||
    parsedDate.getUTCDate() !== d
  ) return ''

  const candidate = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  candidate.setHours(0, 0, 0, 0)

  if (candidate > today) return ''

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}



const detectedCaseType = detectCaseType(extractedText)
const detectedUrgency = extractField(extractedText, [
  'Urgency',
  'Priority',
  'Case Urgency',
  'Priority Level',
])

const urgencyText = detectedUrgency.trim().toLowerCase()

const normalizedUrgency = ['critical', 'high', 'medium', 'low'].find(
  (level) => new RegExp(`\\b${level}\\b`, 'i').test(urgencyText)
)

const urgencyValue = normalizedUrgency
  ? normalizedUrgency.charAt(0).toUpperCase() + normalizedUrgency.slice(1)
  : ''

      setFormData((previous) => ({
        ...previous,
        petitioner: petitioner || previous.petitioner,
        urgency: urgencyValue || previous.urgency,
        respondent: respondent || previous.respondent,
        lawSection: lawSection || previous.lawSection,
        filingDate: filingDate
        ? normalizeFilingDate(filingDate)
        : previous.filingDate,
        caseType: detectedCaseType || previous.caseType,
        description: previous.description || extractedText,
        documentName: selectedFile.name,
      }))

      setOcrCompleted(true)

      alert(
        'OCR completed. Please verify and correct the extracted information before registering the case.'
      )
    } catch (error) {
      console.error('OCR processing error:', error)
      alert(error.message || 'OCR processing failed.')
    } finally {
      setIsProcessingOCR(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

     if (!formData.filingDate) {
  alert(
    'Cannot register the case. Filing date is missing or invalid. Please verify the date in the document and enter a valid filing date.'
  )
  return
}

if (formData.filingDate > today) {
  alert('Filing date cannot be in the future.')
  return
}

    if (!ocrCompleted) {
      alert('Please run OCR successfully before registering the case.')
      return
    }

    
const missingFields = []

if (!formData.caseType.trim()) missingFields.push('Case Type')
if (!formData.petitioner.trim()) missingFields.push('Petitioner')
if (!formData.respondent.trim()) missingFields.push('Respondent')
if (!formData.description.trim()) missingFields.push('Case Description')

if (missingFields.length > 0) {
  alert(
    `Cannot register the case. Please provide the following required information:\n\n${missingFields.join('\n')}`
  )
  return
}


    const token = getToken()

    if (!token) {
      alert('Your session has expired. Please log in again.')
      navigate('/login')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
  ...formData,
  ocrText,
}),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || 'Failed to register the case.'
        )
      }

      const newCase = data.case
      const actualCaseId = newCase?.caseId || newCase?.case_id

      if (!actualCaseId) {
        throw new Error(
          'The server response did not contain a case ID. Check the registered case before trying again.'
        )
      }

      setRegisteredCaseId(actualCaseId)

      localStorage.setItem('currentCase', JSON.stringify({
        ...newCase,
        ocrText,
        documentName: selectedFile.name,
        ocrCompleted,
      }))

      if (isLitigant) {
  setShowRepresentationChoice(true)
  window.scrollTo({ top: 0, behavior: 'smooth' })
} else {
  alert(`Case registered successfully! Case ID: ${actualCaseId}`)
  navigate('/cases')
}
    } catch (error) {
      console.error('Case registration error:', error)
      alert(error.message || 'Unable to register the case.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChooseRepresentation = async (representationType) => {
    if (!registeredCaseId) {
      alert('Register your case before choosing a representation option.')
      return
    }

    const token = getToken()

    if (!token) {
      alert('Your session has expired. Please log in again.')
      navigate('/login')
      return
    }

    setIsSavingRepresentation(true)

    try {
      const response = await fetch(
        `${API_URL}/cases/${encodeURIComponent(registeredCaseId)}/representation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            representation_type: representationType,
          }),
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            'Could not save your representation choice.'
        )
      }

      if (representationType === 'Recommend a Lawyer') {
        navigate(`/cases/${encodeURIComponent(registeredCaseId)}/lawyers`)
      } else {
        navigate(`/cases/${encodeURIComponent(registeredCaseId)}`)
      }
    } catch (error) {
      console.error('Representation choice error:', error)
      alert(error.message || 'Could not save your choice.')
    } finally {
      setIsSavingRepresentation(false)
    }
  }

  if (showRepresentationChoice && isLitigant) {
    return (
      <div className="new-case-page">
        <div className="page-heading">
          <div>
            <h2>Case Registered Successfully</h2>
            <p>
              Your case has been registered. Choose how you want to
              manage it through the portal.
            </p>
          </div>
        </div>

        <section
          className="intake-form-card"
          style={{ maxWidth: '850px', margin: '0 auto' }}
        >
          <div className="form-card-header">
            <div>
              <h3>Choose Your Representation</h3>
              <p>
                Case ID: <strong>{registeredCaseId}</strong>
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              padding: '20px 0',
            }}
          >
            <article
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '24px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontSize: '32px' }}>⚖️</div>
              <h3>Recommend a Lawyer</h3>
              <p>
                View eligible lawyers whose registered expertise matches
                your case, then select a lawyer.
              </p>
              <button
                type="button"
                disabled={isSavingRepresentation}
                onClick={() =>
                  handleChooseRepresentation('Recommend a Lawyer')
                }
              >
                {isSavingRepresentation
                  ? 'Saving...'
                  : 'Find a Lawyer →'}
              </button>
            </article>

            <article
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '24px',
                background: '#f8fafc',
              }}
            >
              <div style={{ fontSize: '32px' }}>📁</div>
              <h3>Self-Representation</h3>
              <p>
                Continue managing the case yourself in the portal.
                This option is for a litigant who is handling the
                portal workflow independently.
              </p>
              <button
                type="button"
                disabled={isSavingRepresentation}
                onClick={() =>
                  handleChooseRepresentation('Self-Representation')
                }
              >
                {isSavingRepresentation
                  ? 'Saving...'
                  : 'Continue →'}
              </button>
            </article>
          </div>

          <p style={{ color: '#64748b', fontSize: '13px' }}>
            AI-generated outputs are recommendations for this academic
            prototype. They do not replace legal advice or judicial decisions.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="new-case-page">
      <div className="page-heading">
        <div>
          <h2>Register New Case</h2>
          <p>
            Upload a case document, extract information using OCR,
            verify the details, and register the case.
          </p>
        </div>

        <div className="new-case-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => navigate('/cases')}
          >
            ← All Cases
          </button>
        </div>
      </div>

      <div className="intake-layout">
        <section className="intake-form-card">
          <div className="form-card-header">
            <div>
              <h3>AI-Assisted Case Intake</h3>
              <p>
                Extract available information from an image document.
                Verify and correct the details before registration.
              </p>
            </div>
            <span className="required-note">* Required</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h4>1. Upload Case Document</h4>


<div
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  style={{
    border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
    borderRadius: '10px',
    padding: '25px',
    background: isDragging ? '#eff6ff' : '#f8fafc',
    textAlign: 'center',
    transition: 'background 0.2s, border 0.2s',
  }}
>

                <div style={{ fontSize: '36px', marginBottom: '10px' }}>
                  📄
                </div>
                <h3>Upload Case Document</h3>
                
<p>
  Upload a PDF, PNG, JPG, JPEG, TIFF, or BMP document for OCR.
</p>

<div
  style={{
    marginTop: '12px',
    padding: '12px',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    background: '#fffbeb',
    color: '#92400e',
    textAlign: 'left',
    fontSize: '13px',
  }}
>
  <strong>📅 Date Formatting Notice</strong>
  <p style={{ margin: '6px 0 0' }}>
    For more reliable date extraction, write dates in numeric format
    (DD/MM/YYYY), for example, 12/03/2025. Dates written using month
    names may not populate automatically. Please verify and correct
    all extracted information before registering the case.
  </p>
</div>

                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.bmp,application/pdf,image/*"
                  onChange={handleFileChange}
                  disabled={isSubmitting || isProcessingOCR}
                />

                {selectedFile && (
                  <div
                    style={{
                      marginTop: '15px',
                      padding: '10px',
                      background: '#e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    <strong>Selected:</strong> {selectedFile.name}
                  </div>
                )}

                <div style={{ marginTop: '15px' }}>
                  <button
                    type="button"
                    onClick={handleOCR}
                    disabled={!selectedFile || isProcessingOCR || isSubmitting}
                  >
                    {isProcessingOCR
                      ? 'Processing Document...'
                      : 'Run OCR & Extract Information'}
                  </button>
                </div>

                {ocrCompleted && (
                  <p
                    style={{
                      marginTop: '12px',
                      color: '#166534',
                      fontWeight: '600',
                    }}
                  >
                    ✓ OCR extraction completed
                  </p>
                )}
              </div>
            </div>

            <div className="form-section">
              <h4>2. Verify Case Information</h4>
              <p
                style={{
                  color: '#64748b',
                  fontSize: '14px',
                  marginBottom: '20px',
                }}
              >
                OCR may not identify every field correctly. Please verify
                the extracted information and correct it where necessary.
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Case Type <span>*</span>
                  </label>
                  <select
                    name="caseType"
                    value={formData.caseType}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select case type</option>
                    <option value="Civil Dispute">Civil Dispute</option>
                    <option value="Civil Appeal">Civil Appeal</option>
                    <option value="Contract Dispute">Contract Dispute</option>
                    <option value="Property Dispute">Property Dispute</option>
                    <option value="Family Dispute">Family Dispute</option>
                    <option value="Divorce">Divorce</option>
                    <option value="Criminal Case">Criminal Case</option>
                    <option value="Criminal Appeal">Criminal Appeal</option>
                    <option value="Cybercrime">Cybercrime</option>
                    <option value="Constitutional">Constitutional</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Filing Date</label>

<input
  type="date"
  name="filingDate"
  value={formData.filingDate}
  max={today}
  onChange={handleChange}
/>

                </div>

                <div className="form-group">
                  <label>Urgency</label>
                  <select
                    name="urgency"
                    value={formData.urgency}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Applicable Law / Section</label>
                  <input
                    type="text"
                    name="lawSection"
                    value={formData.lawSection}
                    onChange={handleChange}
                    placeholder="Example: Property Law"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>3. Verify Parties</h4>

              <div className="form-grid two-columns">
                <div className="form-group">
                  <label>
                    Petitioner <span>*</span>
                  </label>
                  <input
                    type="text"
                    name="petitioner"
                    value={formData.petitioner}
                    onChange={handleChange}
                    placeholder="Petitioner name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Respondent <span>*</span>
                  </label>
                  <input
                    type="text"
                    name="respondent"
                    value={formData.respondent}
                    onChange={handleChange}
                    placeholder="Respondent name"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>4. Case Description</h4>

              <div className="form-group">
                <label>
                  Description <span>*</span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter or verify the case description, claims and relevant facts..."
                  rows="7"
                  required
                />
                <small>
                  This description is used by the prototype's AI agents
                  for precedent retrieval and priority analysis.
                </small>
              </div>
            </div>

            {ocrText && (
              <div className="form-section">
                <h4>OCR Extraction Result</h4>
                <textarea
                  value={ocrText}
                  readOnly
                  rows="8"
                  style={{ width: '100%', background: '#f8fafc' }}
                />
                <small>
                  Raw text extracted from the uploaded image by the OCR module.
                </small>
              </div>
            )}

            <div className="form-section">
              <h4>5. Document Information</h4>
              <div className="form-group">
                <label>Document Name</label>
                <input
                  type="text"
                  name="documentName"
                  value={formData.documentName}
                  readOnly
                />
              </div>
            </div>

            <div className="form-footer">
              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate('/cases')}
                disabled={isSubmitting || isProcessingOCR}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="submit-case-button"
                disabled={isSubmitting || isProcessingOCR}
              >
                {isSubmitting
                  ? 'Registering Case...'
                  : 'Verify & Register Case →'}
              </button>
            </div>
          </form>
        </section>

        <aside className="intake-sidebar">
          <div className="workflow-card">
            <h3>AI Case Intake Workflow</h3>
            <p>
              The uploaded document starts the AI-assisted case-management
              workflow.
            </p>

            <div className="workflow-list">
              {[
                ['01', 'Document Upload', 'Upload the case document image'],
                ['02', 'OCR Extraction', 'Extract text from the document'],
                ['03', 'Case Verification', 'Review and correct extracted details'],
                ['04', 'Precedent Retrieval', 'Find potentially relevant precedents'],
                ['05', 'Priority Scoring', 'Estimate case priority'],
                ['06', 'Hearing Recommendation', 'Suggest a possible hearing slot'],
                ['07', 'Human Review', 'Authorized users review recommendations'],
              ].map(([number, title, description]) => (
                <div className="workflow-item" key={number}>
                  <span>{number}</span>
                  <div>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="ai-disclaimer">
              <strong>Human-in-the-loop</strong>
              <p>
                AI outputs are prototype recommendations only. They are
                not verified legal advice or actual court bookings.
                Final decisions remain with authorized human users.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default NewCase
