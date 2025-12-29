import { Link } from 'react-router-dom'

export function Privacy() {
  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="mb-4">Privacy Policy</h1>
              <p className="text-muted">Last updated: December 2025</p>

              <hr />

              <h2 className="h5 mt-4">1. Information We Collect</h2>
              <p>
                When you sign in with Google, we collect the following information from your Google account:
              </p>
              <ul>
                <li>Email address</li>
                <li>Display name</li>
                <li>Profile picture (if available)</li>
              </ul>

              <h2 className="h5 mt-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul>
                <li>Authenticate you across nicefox.net applications</li>
                <li>Display your profile information within our applications</li>
                <li>Manage your account and permissions</li>
              </ul>

              <h2 className="h5 mt-4">3. Data Storage</h2>
              <p>
                Your data is stored securely in our database. We do not sell or share your personal 
                information with third parties except as required by law.
              </p>

              <h2 className="h5 mt-4">4. Cookies</h2>
              <p>
                We use a secure, httpOnly authentication cookie to maintain your session across 
                nicefox.net applications. This cookie is essential for the service to function.
              </p>

              <h2 className="h5 mt-4">5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal data</li>
                <li>Request deletion of your account and data</li>
                <li>Revoke Google OAuth access at any time via your Google account settings</li>
              </ul>

              <h2 className="h5 mt-4">6. Contact</h2>
              <p>
                For any privacy-related questions, please contact us at{' '}
                <a href="mailto:support@nicefox.net">support@nicefox.net</a>
              </p>

              <hr className="my-4" />

              <Link to="/" className="btn btn-outline-primary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
