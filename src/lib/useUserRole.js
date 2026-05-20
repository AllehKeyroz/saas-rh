import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'

export function useUserRole() {
  const { user, isAuthenticated, isLoadingAuth } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoadingAuth) {
      setRole(user?.role || null)
      setLoading(false)
    }
  }, [user, isAuthenticated, isLoadingAuth])

  const isAdmin = role === 'admin'
  const isRH = role === 'admin' || role === 'user'
  const isConsulta = role === 'consulta'
  const isFuncionario = role === 'funcionario'
  const canEdit = isAdmin || isRH
  const canProcess = isAdmin || isRH
  const canReprocess = isAdmin

  return { role, user, loading, isAdmin, isRH, isConsulta, isFuncionario, canEdit, canProcess, canReprocess }
}
