import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseclient'

const AuthContext = createContext(null)
const STORAGE_KEY = 'flixnet-current-user'

function normalizeSubscriptions(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function setStoredUser(user) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = getStoredUser()
    if (saved) {
      setUser(saved)
    }
    setLoading(false)
  }, [])

  async function login({ name, password }) {
    if (!name || !password) {
      throw new Error('name and password are required.')
    }

    const { data, error } = await supabase
      .from('users')
      .select('user_id, name, email, subscription')
      .eq('name', name)
      .eq('password', password)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data) {
      throw new Error('Login failed. Please check your email and password.')
    }

    const profile = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      subscription: data.subscription,
      source: 'supabase',
    }
    setUser(profile)
    setStoredUser(profile)
    return profile
  }

  async function register({ name, email, password, subscription, date_of_birth }) {
    if (!name || !email || !password || !date_of_birth) {
      throw new Error('Name, email, password, and date of birth are required.')
    }
    if (!subscription || subscription.length === 0) {
      throw new Error('Please select a pricing tier.')
    }

    // Pass ALL profile fields through signUp options.data so the
    // handle_new_user trigger can write them to public.users.
    // This avoids any client-side INSERT, which was colliding with the
    // trigger's automatic row creation and causing duplicate-key errors.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, date_of_birth, subscription, password },
      },
    })

    if (signUpError) {
      throw new Error(signUpError.message)
    }

    const authUser = signUpData?.user
    if (!authUser || !authUser.id) {
      throw new Error('Registration failed creating auth user.')
    }

    // Build the profile from what we already know — no second DB round-trip
    // needed. The trigger has already written (or is writing) the full row.
    const profile = {
      id: authUser.id,
      name,
      email,
      subscription,
      date_of_birth,
      source: 'supabase',
    }
    setUser(profile)
    setStoredUser(profile)
    return profile
  }

  function logout() {
    setUser(null)
    setStoredUser(null)
  }

  const value = useMemo(
    () => ({ user, login, register, logout, loading }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
