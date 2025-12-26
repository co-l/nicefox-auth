import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Home() {
  const { user, logout, isAdmin } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="rounded-circle mb-3"
                    width="80"
                    height="80"
                  />
                ) : (
                  <div
                    className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center text-white mb-3"
                    style={{ width: 80, height: 80, fontSize: '2rem' }}
                  >
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h2>{user?.name}</h2>
                <p className="text-muted mb-1">{user?.email}</p>
                <span className={`badge ${user?.role === 'admin' ? 'bg-danger' : 'bg-secondary'}`}>
                  {user?.role}
                </span>
              </div>

              <hr />

              <div className="d-grid gap-2">
                {isAdmin && (
                  <Link to="/users" className="btn btn-outline-primary">
                    Manage Users
                  </Link>
                )}
                <button onClick={handleLogout} className="btn btn-outline-danger">
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header d-flex align-items-center gap-2">
              <img src="/nicefox_thumbnail.gif" alt="Nicefox" width="24" height="24" />
              <h5 className="mb-0">About Nicefox Auth</h5>
            </div>
            <div className="card-body">
              <p className="text-muted mb-0">
                This is the central authentication service for <code>*.nicefox.net</code> applications.
                Your authentication is shared across all nicefox apps using a secure cookie.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
