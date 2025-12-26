import { useState, useEffect } from 'react'

const COOKIE_CONSENT_KEY = 'cookie_consent'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      setShow(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      className="position-fixed bottom-0 start-0 end-0 p-3"
      style={{ zIndex: 1050 }}
    >
      <div className="container">
        <div className="card shadow">
          <div className="card-body d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
            <p className="mb-0 small">
              This site uses essential cookies for authentication. 
              These cookies are strictly necessary for the service to function and cannot be disabled.
              By continuing to use this site, you accept our use of cookies.
            </p>
            <button
              className="btn btn-primary btn-sm flex-shrink-0"
              onClick={handleAccept}
            >
              I understand
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
