import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
  const [ocrText, setOcrText] = useState('')
  const [isProcessingOCR, setIsProcessingOCR] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ocrCompleted, setOcrCompleted] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]

    if (!file) {
      return
    }

    setSelectedFile(file)

    setFormData((previous) => ({
      ...previous,
      documentName: file.name,
    }))

    setOcrCompleted(false)
    setOcrText('')
  }

  const extractField = (text, labels) => {
    for (const label of labels) {
      const regex = new RegExp(
        `${label}\\s*[:\\-]\\s*(.+)`,
        'i'
      )

      const match = text.match(regex)

      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return ''
  }

  const detectCaseType = (text) => {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('property')) {
      return 'Property Dispute'
    }

    if (lowerText.includes('contract')) {
      return 'Contract Dispute'
    }

    if (
      lowerText.includes('family') ||
      lowerText.includes('divorce') ||
      lowerText.includes('custody')
    ) {
      return 'Family Dispute'
    }

    if (
      lowerText.includes('appeal') ||
      lowerText.includes('appellant')
    ) {
      return 'Civil Appeal'
    }

    if (
      lowerText.includes('criminal') ||
      lowerText.includes('ipc') ||
      lowerText.includes('fir')
    ) {
      return 'Criminal'
    }

    return ''
  }

  const handleOCR = async () => {
    if (!selectedFile) {
      alert('Please upload a case document first.')
      return
    }

    setIsProcessingOCR(true)

    try {
      const uploadData = new FormData()
      uploadData.append('file', selectedFile)

      const response = await fetch(
        'http://127.0.0.1:8000/ai/ocr',
        {
          method: 'POST',
          body: uploadData,
        }
      )

      if (!response.ok) {
        throw new Error('OCR processing failed')
      }

      const data = await response.json()
      const extractedText = data.text || ''

      setOcrText(extractedText)

      const petitioner = extractField(
        extractedText,
        ['Petitioner', 'Plaintiff', 'Appellant', 'Complainant']
      )

      const respondent = extractField(
        extractedText,
        ['Respondent', 'Defendant', 'Respondent Name', 'Opposite Party']
      )

      const lawSection = extractField(
        extractedText,
        ['Law Section', 'Section', 'Applicable Law', 'Act']
      )

      const filingDate = extractField(
        extractedText,
        ['Filing Date', 'Date of Filing']
      )

      const caseType = detectCaseType(extractedText)

      setFormData((previous) => ({
        ...previous,
        petitioner: petitioner || previous.petitioner,
        respondent: respondent || previous.respondent,
        lawSection: lawSection || previous.lawSection,
        filingDate: filingDate || previous.filingDate,
        caseType: caseType || previous.caseType,
        documentName: selectedFile.name,
      }))

      setOcrCompleted(true)

      alert(
        'Document processed successfully. Please verify the extracted information before registering the case.'
      )
    } catch (error) {
      console.error(error)

      alert(
        'OCR processing failed. Make sure FastAPI and Tesseract OCR are running.'
      )
    } finally {
      setIsProcessingOCR(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedFile) {
      alert('Please upload a case document.')
      return
    }

    if (
      !formData.caseType ||
      !formData.petitioner ||
      !formData.respondent ||
      !formData.description
    ) {
      alert(
        'Please verify and complete the required case information.'
      )
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        'http://127.0.0.1:8000/cases',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to register case')
      }

      const data = await response.json()

      const newCase = {
        id: `CASE-2026-${Math.floor(
          100 + Math.random() * 900
        )}`,
        ...data.case,
        status: 'Registered',
        priority: 'Pending AI Analysis',
        ocrText,
        documentName: selectedFile.name,
        ocrCompleted,
      }

      const existingCases = JSON.parse(
        localStorage.getItem('cases') || '[]'
      )

      const updatedCases = [
        ...existingCases,
        newCase,
      ]

      localStorage.setItem(
        'cases',
        JSON.stringify(updatedCases)
      )

      localStorage.setItem(
        'currentCase',
        JSON.stringify(newCase)
      )

      alert(
        `Case ${newCase.id} registered successfully.`
      )

      navigate(`/cases/${newCase.id}`)
    } catch (error) {
      console.error(error)

      alert(
        'Unable to connect to the backend. Make sure FastAPI is running.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="new-case-page">

      <div className="page-heading">
        <div>
          <h2>Register New Case</h2>

          <p>
            Upload the case document and let the AI-assisted
            intake process extract the initial case information.
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
                Upload the case document first. OCR will extract
                available information which can then be verified
                and edited before registration.
              </p>
            </div>

            <span className="required-note">
              * Required
            </span>
          </div>

          {/* DOCUMENT UPLOAD */}

          <div className="form-section">

            <h4>1. Upload Case Document</h4>

            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '10px',
                padding: '25px',
                background: '#f8fafc',
                textAlign: 'center',
              }}
            >

              <div
                style={{
                  fontSize: '36px',
                  marginBottom: '10px',
                }}
              >
                📄
              </div>

              <h3>
                Upload Case Document
              </h3>

              <p>
                Upload a PDF, image, or scanned case document
                for OCR-based information extraction.
              </p>

              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
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
                  <strong>
                    Selected:
                  </strong>{' '}
                  {selectedFile.name}
                </div>
              )}

              <div style={{ marginTop: '15px' }}>

                <button
                  type="button"
                  onClick={handleOCR}
                  disabled={
                    !selectedFile || isProcessingOCR
                  }
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

          {/* EXTRACTED INFORMATION */}

          <div className="form-section">

            <h4>2. Verify Extracted Case Information</h4>

            <p
              style={{
                color: '#64748b',
                fontSize: '14px',
                marginBottom: '20px',
              }}
            >
              Information extracted by OCR can be corrected
              before the case is officially registered.
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
                >
                  <option value="">
                    Select case type
                  </option>

                  <option value="Civil">
                    Civil
                  </option>

                  <option value="Criminal">
                    Criminal
                  </option>

                  <option value="Property Dispute">
                    Property Dispute
                  </option>

                  <option value="Contract Dispute">
                    Contract Dispute
                  </option>

                  <option value="Family Dispute">
                    Family Dispute
                  </option>

                  <option value="Constitutional">
                    Constitutional
                  </option>

                  <option value="Civil Appeal">
                    Civil Appeal
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>
                  Filing Date
                </label>

                <input
                  type="date"
                  name="filingDate"
                  value={formData.filingDate}
                  onChange={handleChange}
                />

              </div>

              <div className="form-group">

                <label>
                  Urgency
                </label>

                <select
                  name="urgency"
                  value={formData.urgency}
                  onChange={handleChange}
                >
                  <option value="Low">
                    Low
                  </option>

                  <option value="Medium">
                    Medium
                  </option>

                  <option value="High">
                    High
                  </option>

                  <option value="Critical">
                    Critical
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>
                  Applicable Law / Section
                </label>

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

          {/* PARTIES */}

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
                  placeholder="Extracted petitioner name"
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
                  placeholder="Extracted respondent name"
                />

              </div>

            </div>

          </div>

          {/* DESCRIPTION */}

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
              />

              <small>
                The description is used by the AI agents
                for precedent retrieval and priority analysis.
              </small>

            </div>

          </div>

          {/* OCR OUTPUT */}

          {ocrText && (
            <div className="form-section">

              <h4>
                OCR Extraction Result
              </h4>

              <textarea
                value={ocrText}
                readOnly
                rows="8"
                style={{
                  width: '100%',
                  background: '#f8fafc',
                }}
              />

              <small>
                This is the raw text extracted from the
                uploaded document by the OCR module.
              </small>

            </div>
          )}

          {/* DOCUMENT */}

          <div className="form-section">

            <h4>5. Document Information</h4>

            <div className="form-group">

              <label>
                Document Name
              </label>

              <input
                type="text"
                name="documentName"
                value={formData.documentName}
                readOnly
              />

            </div>

          </div>

          {/* FOOTER */}

          <div className="form-footer">

            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate('/cases')}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="submit-case-button"
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting
                ? 'Registering Case...'
                : 'Verify & Register Case →'}
            </button>

          </div>

        </section>

        {/* RIGHT SIDE WORKFLOW */}

        <aside className="intake-info-card">

          <div className="info-icon">
            ⚖
          </div>

          <h3>
            AI Case Intake Workflow
          </h3>

          <p>
            The uploaded document becomes the starting point
            for the AI-assisted case management pipeline.
          </p>

          <div className="workflow-list">

            <div className="workflow-item">
              <span>01</span>

              <div>
                <strong>
                  Document Upload
                </strong>

                <small>
                  Upload petition or case document
                </small>
              </div>
            </div>

            <div className="workflow-item">
              <span>02</span>

              <div>
                <strong>
                  OCR Extraction
                </strong>

                <small>
                  Extract text from the document
                </small>
              </div>
            </div>

            <div className="workflow-item">
              <span>03</span>

              <div>
                <strong>
                  Case Verification
                </strong>

                <small>
                  User verifies extracted information
                </small>
              </div>
            </div>

            <div className="workflow-item">
              <span>04</span>

              <div>
                <strong>
                  Precedent Retrieval
                </strong>

                <small>
                  Retrieve relevant legal precedents
                </small>
              </div>
            </div>

            <div className="workflow-item">
              <span>05</span>

              <div>
                <strong>
                  Priority Scoring
                </strong>

                <small>
                  AI evaluates urgency and priority
                </small>
              </div>
            </div>

            <div className="workflow-item">
              <span>06</span>

              <div>
                <strong>
                  Hearing Recommendation
                </strong>

                <small>
                  Recommend an appropriate hearing slot
                </small>
              </div>
            </div>

            <div className="workflow-item">
              <span>07</span>

              <div>
                <strong>
                  Human Review
                </strong>

                <small>
                  Judge or Registrar makes the final decision
                </small>
              </div>
            </div>

          </div>

          <div className="ai-disclaimer">

            <strong>
              Human-in-the-loop
            </strong>

            <p>
              AI outputs are recommendations only.
              Final decisions remain with authorized
              judicial or administrative users.
            </p>

          </div>

        </aside>

      </div>
    </div>
  )
}

export default NewCase