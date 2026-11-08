import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { adminService } from '../services/adminService.js'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider() {
  const [status, setStatus] = useState('loading')
  const [admin, setAdmin] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    let initialized = false

    async function verifySession() {
      try {
        const currentAdmin = await adminService.getCurrentAdmin()
        if (!current) return
        setAdmin(currentAdmin)
        setError('')
        setStatus('authenticated')
      } catch (requestError) {
        if (!current) return
        if (requestError.status === 401) {
          setAdmin(null)
          setError('')
          setStatus('unauthenticated')
        } else if (!initialized) {
          setAdmin(null)
          setError(requestError.message)
          setStatus('unauthenticated')
        }
      } finally {
        initialized = true
      }
    }

    const handleFocus = () => { void verifySession() }
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void verifySession()
    }

    void verifySession()
    const interval = window.setInterval(() => { void verifySession() }, 60000)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      current = false
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const signIn = useCallback(async (credentials) => {
    setError('')
    setStatus('authenticating')
    try {
      const currentAdmin = await adminService.signIn(credentials)
      setAdmin(currentAdmin)
      setStatus('authenticated')
      return currentAdmin
    } catch (requestError) {
      setAdmin(null)
      setStatus('unauthenticated')
      setError(requestError.message)
      throw requestError
    }
  }, [])

  const signOut = useCallback(async () => {
    setError('')
    try {
      await adminService.signOut()
      setAdmin(null)
      setStatus('unauthenticated')
    } catch (requestError) {
      if (requestError.status === 401) {
        setAdmin(null)
        setStatus('unauthenticated')
      }
      setError(requestError.message)
      throw requestError
    }
  }, [])

  const value = useMemo(() => ({ status, admin, error, signIn, signOut }), [status, admin, error, signIn, signOut])
  return <AdminAuthContext.Provider value={value}><Outlet /></AdminAuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return context
}
