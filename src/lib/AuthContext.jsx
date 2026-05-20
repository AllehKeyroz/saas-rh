import React, { createContext, useState, useContext, useEffect } from 'react'
import { onAuthChange, logout as fbLogout } from '@/firebase/auth'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    setIsLoadingAuth(true)
    const unsub = onAuthChange((fbUser) => {
      if (fbUser) {
        setUser(fbUser)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      setIsLoadingAuth(false)
      setAuthChecked(true)
    })
    return unsub
  }, [])

  const logout = (shouldRedirect = true) => {
    setUser(null)
    setIsAuthenticated(false)
    fbLogout(shouldRedirect ? window.location.origin + '/login' : undefined)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError: null,
      authChecked,
      logout,
      navigateToLogin: () => {},
      checkUserAuth: () => {},
      checkAppState: () => {},
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
