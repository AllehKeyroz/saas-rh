/**
 * Navigation Audit - Registra e monitora tentativas de navegação
 */

const navigationLog = [];

export function logNavigation(route, success, error = null) {
  const entry = {
    timestamp: new Date().toISOString(),
    route,
    success,
    error: error?.message || null,
    source: new Error().stack?.split('\n')[3] || 'unknown',
  };

  navigationLog.push(entry);

  // Manter apenas últimos 100 registros
  if (navigationLog.length > 100) {
    navigationLog.shift();
  }

  if (typeof window !== 'undefined' && window.__DEV__) {
    console.log('[Navigation Audit]', {
      route,
      success: success ? '✓' : '✗',
      error,
    });
  }
}

export function getNavigationLog() {
  return navigationLog;
}

export function clearNavigationLog() {
  navigationLog.length = 0;
}

/**
 * Gera relatório de navegações falhadas
 */
export function getFailedNavigations() {
  return navigationLog.filter(entry => !entry.success);
}

/**
 * Valida padrão de navegação (detecção de loops)
 */
export function isNavigationLoop(maxAttempts = 5) {
  if (navigationLog.length < maxAttempts) return false;

  const recent = navigationLog.slice(-maxAttempts);
  const routes = recent.map(r => r.route);

  return routes.every(r => r === routes[0]);
}