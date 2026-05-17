import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseclient'

const AuthContext = createContext(null)

function normalizeSubscription(value) {
  if (!value) return ''
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed[0] || ''
      }
      return String(parsed)
    } catch {
      return value.trim()
    }
  }
  return String(value)
}

const STORAGE_KEY = 'flixnet-current-user'

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
      throw new Error('Name and password are required.')
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
      throw new Error('Login failed. Please check your name and password.')
    }

    const profile = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      subscription: normalizeSubscription(data.subscription),
      source: 'supabase',
    }
    setUser(profile)
    setStoredUser(profile)
    return profile
  }

  async function register({ name, email, password, subscription }) {
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required.')
    }
    if (!subscription) {
      throw new Error('Please select a pricing tier.')
    }

    const { data: existingInDb, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .or(`name.eq.${name},email.eq.${email}`)
      .maybeSingle()

    if (checkError) {
      throw new Error(checkError.message)
    }

    if (existingInDb) {
      throw new Error('An account with that name or email already exists.')
    }

    const { data: inserted, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password,
        subscription,
      })
      .select('user_id, name, email, subscription')
      .single()

    if (error || !inserted) {
      throw new Error(`Registration failed: ${error?.message ?? 'unknown error'}`)
    }

    const profile = {
      id: inserted.user_id,
      name: inserted.name,
      email: inserted.email,
      subscription: normalizeSubscription(inserted.subscription),
      source: 'supabase',
    }
    setUser(profile)
    setStoredUser(profile)
    return profile
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
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
