import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getGoogleAuthUrl, login } from '../services/api'
import axios from 'axios'

export function Login() {
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const urlError = searchParams.get('error')
  const redirect = searchParams.get('redirect')

  useEffect(() => {
    if (!loading && user) {
      if (redirect) {
        window.location.href = redirect
      } else {
        navigate('/')
      }
    }
  }, [user, loading, navigate, redirect])

  const handleGoogleLogin = () => {
    window.location.href = getGoogleAuthUrl(redirect || undefined)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      await refreshUser()
      if (redirect) {
        window.location.href = redirect
      } else {
        navigate('/')
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Login failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'oauth_denied':
        return 'Authentication was denied. Please try again.'
      case 'auth_failed':
        return 'Authentication failed. Please try again.'
      case 'invalid_state':
        return 'Invalid request. Please try again.'
      default:
        return 'An error occurred. Please try again.'
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div className="card shadow">
            <div className="card-body p-5">
              <div className="text-center mb-3">
                <img src="/nicefox.gif" alt="Nicefox" width="50" height="80" />
              </div>
              <h1 className="text-center mb-4">Nicefox Auth</h1>
              <p className="text-center text-muted mb-4">
                Sign in to access nicefox.net applications
              </p>

              {(error || urlError) && (
                <div className="alert alert-danger" role="alert">
                  {error || getErrorMessage(urlError!)}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 mb-3"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="d-flex align-items-center my-3">
                <hr className="flex-grow-1" />
                <span className="px-3 text-muted">or</span>
                <hr className="flex-grow-1" />
              </div>

              <button
                onClick={handleGoogleLogin}
                className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                disabled={submitting}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9.003 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.33z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>

              <div className="text-center mt-4">
                <span className="text-muted">Don't have an account? </span>
                <Link to={redirect ? `/register?redirect=${encodeURIComponent(redirect)}` : '/register'}>
                  Create one
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
