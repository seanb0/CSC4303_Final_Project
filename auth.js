const STORAGE_KEY = 'flixnet-current-user'
const LEGACY_STORAGE_KEY = 'flixnet_user'

function readStorageKey(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn(`Failed to read user from storage key ${key}:`, error)
    return null
  }
}

export function getCurrentUser() {
  return readStorageKey(STORAGE_KEY) || readStorageKey(LEGACY_STORAGE_KEY)
}

export function saveCurrentUser(user) {
  if (!user) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch (error) {
    console.warn('Failed to write current user to storage:', error)
  }
}

export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function isAdmin(user) {
  return user?.name === 'admin'
}
