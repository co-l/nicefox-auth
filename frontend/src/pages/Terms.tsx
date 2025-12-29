import { Link } from 'react-router-dom'

export function Terms() {
  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="mb-4">Terms of Service</h1>
              <p className="text-muted">Last updated: December 2025</p>

              <hr />

              <h2 className="h5 mt-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Nicefox Auth and related nicefox.net applications, you agree 
                to be bound by these Terms of Service.
              </p>

              <h2 className="h5 mt-4">2. Description of Service</h2>
              <p>
                Nicefox Auth provides centralized authentication services for applications hosted 
                on the nicefox.net domain. The service allows you to sign in once and access 
                multiple nicefox.net applications.
              </p>

              <h2 className="h5 mt-4">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account. You agree to:
              </p>
              <ul>
                <li>Provide accurate information when signing up</li>
                <li>Keep your Google account secure</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>

              <h2 className="h5 mt-4">4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the service for any unlawful purpose</li>
                <li>Attempt to gain unauthorized access to any part of the service</li>
                <li>Interfere with or disrupt the service</li>
              </ul>

              <h2 className="h5 mt-4">5. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time for violation 
                of these terms or for any other reason at our discretion.
              </p>

              <h2 className="h5 mt-4">6. Disclaimer</h2>
              <p>
                The service is provided "as is" without warranties of any kind, either express or 
                implied. We do not guarantee that the service will be uninterrupted or error-free.
              </p>

              <h2 className="h5 mt-4">7. Changes to Terms</h2>
              <p>
                We may modify these terms at any time. Continued use of the service after changes 
                constitutes acceptance of the new terms.
              </p>

              <h2 className="h5 mt-4">8. Contact</h2>
              <p>
                For any questions about these terms, please contact us at{' '}
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
