import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

const subscriptionTiers = {
  Basic: 4.99,
  Standard: 9.99,
  Premium: 14.99,
}

export default function Account() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!user) {
    return (
      <div>
        <h2>My Account</h2>
        <p>You must be logged in to view account details.</p>
      </div>
    )
  }

  return (
    <div>
      <h2>My Account</h2>
      <div className="account-section">
        <p>
          Signed in as <strong>{user.name}</strong> ({user.email})
        </p>
        {user.dateOfBirth && <p>Date of Birth: {user.dateOfBirth}</p>}
      </div>
      <div className="account-section">
        <h3>Pricing Tier</h3>
        {user.subscription ? (
          <p>{user.subscription} - ${subscriptionTiers[user.subscription]}/month</p>
        ) : (
          <p>No pricing tier selected yet.</p>
        )}
      </div>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}
