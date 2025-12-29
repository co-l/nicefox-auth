import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Landing() {
  const { user, loading } = useAuth()

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Main content */}
      <main className="flex-grow-1 d-flex align-items-center">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-8 text-center">
              {/* Logo */}
              <div className="mb-4">
                <img src="/nicefox.gif" alt="Nicefox" width="100" height="160" />
              </div>

              {/* Title */}
              <h1 className="display-4 fw-bold mb-3">Nicefox Auth</h1>

              {/* Description */}
              <p className="lead text-muted mb-4">
                Central authentication service for <code>*.nicefox.net</code> applications.
                Sign in once and access all Nicefox apps with a single account.
              </p>

              {/* Features */}
              <div className="row g-4 mb-5 text-start">
                <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">Single Sign-On</h5>
                      <p className="card-text text-muted small">
                        One account for all Nicefox applications. No need to remember multiple passwords.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">Secure</h5>
                      <p className="card-text text-muted small">
                        Protected with Google OAuth and secure httpOnly cookies across all apps.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">Simple</h5>
                      <p className="card-text text-muted small">
                        Sign in with your Google account or create a password-based account.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Call to action */}
              {loading ? (
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : user ? (
                <div className="d-flex gap-3 justify-content-center">
                  <Link to="/dashboard" className="btn btn-primary btn-lg px-5">
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Link to="/login" className="btn btn-primary btn-lg px-5">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn btn-outline-primary btn-lg px-5">
                    Create Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-top bg-light">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 text-center text-md-start mb-3 mb-md-0">
              <small className="text-muted">
                &copy; 2025 Nicefox. All rights reserved.
              </small>
            </div>
            <div className="col-md-6 text-center text-md-end">
              <Link to="/privacy" className="text-muted small me-3">Privacy Policy</Link>
              <Link to="/terms" className="text-muted small me-3">Terms of Service</Link>
              <a href="mailto:support@nicefox.net" className="text-muted small">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
