import { Link } from 'react-router-dom'

function LoginChoice() {
  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.logo}>⚖</div>

        <h1 style={styles.title}>Welcome to the e-Portal</h1>
        <p style={styles.subtitle}>
          Choose your account type to continue signing in.
        </p>

        <div style={styles.options}>
          <Link to="/login/litigant" style={styles.option}>
            <span style={styles.icon}>👤</span>
            <strong>Litigant Login</strong>
            <span style={styles.description}>
              Access your cases and track their progress.
            </span>
            <span style={styles.action}>Continue →</span>
          </Link>

          <Link to="/login/professional" style={styles.option}>
            <span style={styles.icon}>⚖️</span>
            <strong>Professional Login</strong>
            <span style={styles.description}>
              For lawyers, judges, and authorized professionals.
            </span>
            <span style={styles.action}>Continue →</span>
          </Link>
        </div>

        <p style={styles.signup}>
          New to the portal? <Link to="/signup">Create an account</Link>
        </p>

        <p style={styles.note}>
          Professional accounts require email verification and administrator
          approval.
        </p>

        <Link to="/" style={styles.home}>← Back to Home</Link>
      </section>
    </main>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '28px 16px',
    background: '#f4f6fb',
    color: '#172033',
    fontFamily: 'Cambria, Georgia, serif',
  },
  card: {
    width: '100%',
    maxWidth: '680px',
    boxSizing: 'border-box',
    padding: '32px 26px',
    background: '#ffffff',
    border: '1px solid #e3e7ef',
    borderRadius: '18px',
    boxShadow: '0 12px 36px rgba(26, 42, 74, 0.08)',
    textAlign: 'center',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    borderRadius: '15px',
    background: '#eaf0ff',
    color: '#254b9b',
    fontSize: '30px',
  },
  title: {
    margin: '18px 0 8px',
    color: '#172b4d',
    fontSize: 'clamp(25px, 5vw, 32px)',
  },
  subtitle: {
    margin: '0 0 26px',
    color: '#69758a',
    lineHeight: 1.5,
  },
  options: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
    gap: '16px',
    textAlign: 'left',
  },
  option: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '22px 18px',
    border: '1px solid #dce2ed',
    borderRadius: '13px',
    color: '#26344c',
    textDecoration: 'none',
    background: '#ffffff',
  },
  icon: {
    fontSize: '28px',
  },
  description: {
    color: '#69758a',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  action: {
    marginTop: '4px',
    color: '#254b9b',
    fontWeight: 'bold',
  },
  signup: {
    marginTop: '26px',
    color: '#69758a',
  },
  note: {
    color: '#69758a',
    fontSize: '12px',
    lineHeight: 1.5,
  },
  home: {
    display: 'inline-block',
    marginTop: '12px',
    color: '#254b9b',
    textDecoration: 'none',
  },
}

export default LoginChoice