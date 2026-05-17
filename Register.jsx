import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const subscriptionOptions = [
  { name: 'Basic', price: 4.99 },
  { name: 'Standard', price: 9.99 },
  { name: 'Premium', price: 14.99 },
]

export default function Register() {
  const { user, register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [subscription, setSubscription] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (user) {
    return <Navigate to="/browse" replace />
  }

  const handleSubscriptionChange = (tier) => {
    setSubscription(tier)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!subscription) {
      setError('Please select a pricing tier.')
      return
    }

    setLoading(true)
    try {
      const profile = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        subscription,
      })
      setSuccess(`Welcome, ${profile.name}! Your account is ready.`)
      setLoading(false)
      setTimeout(() => {
        navigate('/browse')
      }, 1000)
    } catch (registrationError) {
      setLoading(false)
      setError(registrationError.message)
    }
  }

  return (
    <div>
      <h2>Create an Account</h2>
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
          <label htmlFor="email">Email:</label>
          <br />
          <input
            id="email"
            type="text"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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

        <div style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <br />
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            style={{ width: '100%', maxWidth: '320px' }}
          />
        </div>

        <div>
          <p><strong>Select a pricing tier:</strong></p>
          <div className="checkbox-group">
            {subscriptionOptions.map((option) => (
              <label key={option.name}>
                <input
                  type="radio"
                  name="subscription"
                  checked={subscription === option.name}
                  onChange={() => handleSubscriptionChange(option.name)}
                />
                {option.name} - ${option.price}/month
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Login here</Link>.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
    </div>
  )
}
