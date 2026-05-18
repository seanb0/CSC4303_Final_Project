import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function Login() {
  const { user, login } = useAuth()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const navigate = useNavigate()

  if (user) {
    return <Navigate to="/browse" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const profile = await login({ name: name.trim(), password })
      setSuccess(`Welcome back, ${profile.name}! Redirecting...`)
      setLoading(false)
      setTimeout(() => {
        navigate('/browse')
      }, 800)
    } catch (loginError) {
      setLoading(false)
      setError(loginError.message)
    }
  }

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="name">Name:</label>
          <br />
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            style={{ width: '100%', maxWidth: '320px' }}
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="password">Password:</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ width: '100%', maxWidth: '320px' }}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Login'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        Don't have an account? <Link to="/register">Register here</Link>.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  )
}
