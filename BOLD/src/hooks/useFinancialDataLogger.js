import { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';

export function useFinancialDataLogger(componentName) {
  const logError = useCallback(async (error, context = '', funcionarioId = null) => {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ${componentName} - ${context}: ${error?.message || String(error)}`;
    
    // Log no console para debug
    console.error(errorMessage);
    
    // Log no sessionStorage para análise posterior
    const logs = JSON.parse(sessionStorage.getItem('financial_logs') || '[]');
    logs.push({
      timestamp,
      component: componentName,
      context,
      error: error?.message || String(error),
      stack: error?.stack
    });
    sessionStorage.setItem('financial_logs', JSON.stringify(logs.slice(-50))); // Manter últimos 50 logs
    
    // Persistir erro na entidade ApplicationError
    try {
      await base44.entities.ApplicationError.create({
        component: componentName,
        context,
        error_message: error?.message || String(error),
        stack_trace: error?.stack,
        severity: 'error',
        funcionario_id: funcionarioId,
        notificado: false,
      });
    } catch (persistError) {
      console.error('Erro ao persistir log de erro:', persistError);
    }
    
    return errorMessage;
  }, [componentName]);

  return { logError };
}