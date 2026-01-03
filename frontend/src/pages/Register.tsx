import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { register, getTokenForRedirect } from '../services/api'
import axios from 'axios'

export function Register() {
  const { user, loading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirect = searchParams.get('redirect')

  useEffect(() => {
    if (!loading && user) {
      if (redirect) {
        // Get token for redirect domain, then redirect with token
        getTokenForRedirect(redirect)
          .then(token => {
            const url = new URL(redirect)
            url.searchParams.set('token', token)
            window.location.href = url.toString()
          })
          .catch(() => navigate('/'))  // fallback if redirect domain invalid
      } else {
        navigate('/')
      }
    }
  }, [user, loading, navigate, redirect])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      await register(email, password, name)
      await refreshUser()
      if (redirect) {
        // Get token for redirect domain, then redirect with token
        const redirectToken = await getTokenForRedirect(redirect)
        const url = new URL(redirect)
        url.searchParams.set('token', redirectToken)
        window.location.href = url.toString()
      } else {
        navigate('/')
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
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
              <h1 className="text-center mb-4">Create Account</h1>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

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

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={submitting}
                  />
                  <div className="form-text">At least 8 characters</div>
                </div>

                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="text-center">
                <span className="text-muted">Already have an account? </span>
                <Link to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}>
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
