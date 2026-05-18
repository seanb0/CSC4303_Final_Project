import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import Login from './Login.jsx'
import Register from './Register.jsx'
import Browse from './Browse.jsx'
import ConnectionCheck from './ConnectionCheck.jsx'
import Analytics from './Analytics.jsx'
import Account from './Account.jsx'
import { isAdmin } from './auth'
import './App.css'

function Home() {
  return (
    <div className="home-content">
      <h1>FlixNet</h1>
      <p>
        Welcome to FlixNet. Use the login page to authenticate, then browse movie links from the
        database.
      </p>
    </div>
  )
}

function AppNav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <Link to="/" style={{ marginRight: '1rem' }}>
        Home
      </Link>
      <Link to="/browse" style={{ marginRight: '1rem' }}>
        Browse Movies
      </Link>
      <Link to="/check-connection" style={{ marginRight: '1rem' }}>
        Check Connection
      </Link>
      {isAdmin(user) && (
        <Link to="/admin/analytics" style={{ marginRight: '1rem' }}>
          Admin Analytics
        </Link>
      )}
      {user ? (
        <>
          <Link to="/account" style={{ marginRight: '1rem' }}>
            My Account
          </Link>
          <button type="button" onClick={handleLogout} style={{ marginLeft: 'auto' }}>
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={{ marginRight: '1rem' }}>
            Login
          </Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  )
}

export default function MyApp() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AppNav />

          <div className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/account" element={<Account />} />
              <Route path="/check-connection" element={<ConnectionCheck />} />
              <Route path="/admin/analytics" element={<Analytics />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

