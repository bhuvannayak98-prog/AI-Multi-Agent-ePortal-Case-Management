import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="home-page">

      {/* Navigation */}
      <nav className="home-navbar">
        <div className="home-brand">
          <div className="home-logo">⚖</div>

          <div>
            <h2>AI Multi-Agent e-Portal</h2>
            <span>Case Management System</span>
          </div>
        </div>

        <div className="home-nav-links">
          <Link to="/">Home</Link>

          <Link
            to="/login"
            className="home-login-button"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main>

        <section className="home-hero">

          <div className="hero-content">

            <span className="hero-badge">
              AI-ASSISTED JUDICIAL CASE MANAGEMENT
            </span>

            <h1>
              Smarter Case Management
              <br />
              with <span>AI Multi-Agent Systems</span>
            </h1>

            <p>
              An academic prototype for intelligent case
              intake, legal precedent retrieval, priority
              analysis and hearing scheduling with
              human-in-the-loop review.
            </p>

            <div className="hero-actions">

              <Link
                to="/login"
                className="hero-primary-button"
              >
                Enter Portal →
              </Link>

              <a
                href="#features"
                className="hero-secondary-button"
              >
                Explore Features
              </a>

            </div>

            <div className="hero-note">
              <span>✓</span>
              AI recommendations remain subject to
              authorized human review.
            </div>

          </div>

          {/* System Preview */}
          <div className="portal-preview">

            <div className="preview-header">

              <div>
                <span>AI e-PORTAL</span>
                <strong>Case Intelligence</strong>
              </div>

              <div className="preview-status">
                ● System Active
              </div>

            </div>

            <div className="preview-stats">

              <div>
                <span>Total Cases</span>
                <strong>24</strong>
              </div>

              <div>
                <span>High Priority</span>
                <strong>05</strong>
              </div>

              <div>
                <span>Hearings</span>
                <strong>08</strong>
              </div>

            </div>

            <div className="preview-case">

              <div className="preview-case-top">
                <span>CASE-2026-001</span>

                <b>HIGH</b>
              </div>

              <h4>Property Dispute</h4>

              <p>
                Amit Kumar vs Ravi Sharma
              </p>

              <div className="preview-progress">

                <div className="preview-step completed">
                  OCR
                </div>

                <div className="preview-line" />

                <div className="preview-step completed">
                  RAG
                </div>

                <div className="preview-line" />

                <div className="preview-step active">
                  AI
                </div>

                <div className="preview-line" />

                <div className="preview-step">
                  REVIEW
                </div>

              </div>

            </div>

            <div className="preview-footer">
              Human-in-the-loop verification enabled
            </div>

          </div>

        </section>

        {/* Features */}
        <section
          id="features"
          className="home-features"
        >

          <div className="home-section-heading">

            <span>CORE CAPABILITIES</span>

            <h2>
              AI-assisted workflow for case management
            </h2>

            <p>
              The system connects multiple specialized
              processing stages into one case-management
              workflow.
            </p>

          </div>

          <div className="feature-grid">

            <div className="feature-card">
              <div className="feature-number">
                01
              </div>

              <div className="feature-icon">
                📄
              </div>

              <h3>Automated Case Intake</h3>

              <p>
                Capture and organize essential case
                information through a structured intake
                process.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">
                02
              </div>

              <div className="feature-icon">
                🔎
              </div>

              <h3>Document Processing</h3>

              <p>
                Extract useful information from uploaded
                case documents using OCR-based processing.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">
                03
              </div>

              <div className="feature-icon">
                ⚖
              </div>

              <h3>Precedent Retrieval</h3>

              <p>
                Identify relevant legal precedent records
                based on case type, description and legal
                information.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">
                04
              </div>

              <div className="feature-icon">
                !
              </div>

              <h3>Priority Scoring</h3>

              <p>
                Analyze case urgency and generate an
                AI-assisted priority recommendation.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">
                05
              </div>

              <div className="feature-icon">
                📅
              </div>

              <h3>Hearing Scheduling</h3>

              <p>
                Recommend an available hearing slot
                according to the case priority.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-number">
                06
              </div>

              <div className="feature-icon">
                ✓
              </div>

              <h3>Human Review</h3>

              <p>
                Authorized users can approve, modify or
                reject AI-generated recommendations.
              </p>
            </div>

          </div>

        </section>

        {/* Workflow */}
        <section className="home-workflow">

          <div className="home-section-heading">

            <span>AI MULTI-AGENT WORKFLOW</span>

            <h2>
              From case registration to human review
            </h2>

          </div>

          <div className="home-workflow-steps">

            <div>
              <span>01</span>
              <strong>Register</strong>
              <small>
                Case intake
              </small>
            </div>

            <div className="home-workflow-arrow">
              →
            </div>

            <div>
              <span>02</span>
              <strong>Extract</strong>
              <small>
                OCR processing
              </small>
            </div>

            <div className="home-workflow-arrow">
              →
            </div>

            <div>
              <span>03</span>
              <strong>Retrieve</strong>
              <small>
                Precedent search
              </small>
            </div>

            <div className="home-workflow-arrow">
              →
            </div>

            <div>
              <span>04</span>
              <strong>Prioritize</strong>
              <small>
                AI scoring
              </small>
            </div>

            <div className="home-workflow-arrow">
              →
            </div>

            <div>
              <span>05</span>
              <strong>Schedule</strong>
              <small>
                Hearing slot
              </small>
            </div>

            <div className="home-workflow-arrow">
              →
            </div>

            <div>
              <span>06</span>
              <strong>Review</strong>
              <small>
                Human approval
              </small>
            </div>

          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="home-footer">

        <div>
          <strong>
            AI Multi-Agent e-Portal
          </strong>

          <span>
            Academic Project · Presidency University,
            Bengaluru
          </span>
        </div>

        <span>
          AI recommendations require authorized
          human review.
        </span>

      </footer>

    </div>
  )
}

export default Home