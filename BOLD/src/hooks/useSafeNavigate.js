import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { logNavigation } from '@/lib/navigationAudit';
import { VALID_ROUTES, isValidRoute } from '@/lib/navigationValidator';

/**
 * Hook para navegação segura com validação e auditoria
 */
export function useSafeNavigate() {
  const navigate = useNavigate();

  const safeNavigate = useCallback((route, options = {}) => {
    try {
      // Valida rota
      if (!isValidRoute(route)) {
        console.warn(`[useSafeNavigate] Rota inválida: ${route}`);
        logNavigation(route, false, new Error('Invalid route'));
        return;
      }

      // Executa navegação
      navigate(route, options);
      logNavigation(route, true);
    } catch (error) {
      console.error('[useSafeNavigate] Erro de navegação:', error);
      logNavigation(route, false, error);
    }
  }, [navigate]);

  return { safeNavigate, VALID_ROUTES };
}