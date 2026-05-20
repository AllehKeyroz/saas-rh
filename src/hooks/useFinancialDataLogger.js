import { useCallback } from 'react'
import { client } from '@/api/client'

export function useFinancialDataLogger(componentName) {
  const logError = useCallback(async (error, context = '', funcionarioId = null) => {
    const errorMessage = `[${componentName}] ${context}: ${error?.message || String(error)}`
    console.error(errorMessage)

    try {
      await client.entities.ApplicationError.create({
        component: componentName,
        context,
        error_message: error?.message || String(error),
        stack_trace: error?.stack,
        severity: 'error',
        funcionario_id: funcionarioId,
        notificado: false,
      })
    } catch (e) {
      console.error('Erro ao persistir log:', e)
    }

    return errorMessage
  }, [componentName])

  return { logError }
}
