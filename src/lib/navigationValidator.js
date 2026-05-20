/**
 * Navigation Validator - Garante que todos os links e botões do sistema
 * direcionam para rotas válidas e operacionais
 */

// Mapa de todas as rotas válidas do sistema
export const VALID_ROUTES = {
  dashboard: '/',
  funcionarios: '/funcionarios',
  lancamentos: '/lancamentos',
  fechamento: '/fechamento',
  relatorios: '/relatorios',
  usuarios: '/usuarios',
  auditoria: '/auditoria',
  configuracoes: '/configuracoes',
  comissoes: '/comissoes',
  comunicacao: '/comunicacao',
  solicitacoes: '/solicitacoes',
  logsFinanceiros: '/logs-financeiros',
  advertencias: '/advertencias',
  assinaturasDigitais: '/assinaturas-digitais',
  modelosDocumentos: '/modelos-documentos',
  auditoriaDocumentos: '/auditoria-documentos',
  centroControleRH: '/centro-controle-rh',
  espelhoPortal: '/espelho-portal',
  funcionarios360: (funcId) => `/funcionarios/${funcId}/360`,
};

/**
 * Valida se a rota existe no mapa
 * @param {string} route - Rota a validar (ex: '/funcionarios')
 * @returns {boolean} - true se a rota é válida
 */
export function isValidRoute(route) {
  if (typeof route === 'function') return true; // rotas dinâmicas
  return Object.values(VALID_ROUTES).includes(route);
}

/**
 * Safe navigate - valida rota antes de navegar
 * @param {Function} navigate - Função navigate do useNavigate()
 * @param {string} route - Rota para navegar
 * @param {object} options - Opções adicionais (replace, state, etc)
 */
export function safeNavigate(navigate, route, options = {}) {
  if (!navigate || typeof navigate !== 'function') {
    console.error('[Navigation] navigate function is not available');
    return;
  }

  if (!isValidRoute(route)) {
    console.error(`[Navigation] Invalid route: ${route}`);
    return;
  }

  try {
    navigate(route, options);
  } catch (e) {
    console.error(`[Navigation] Navigation error to ${route}:`, e);
  }
}

/**
 * Valida se um elemento clicável tem handler correto
 * @param {object} action - { type: 'navigate'|'function'|'dialog', target, handler }
 * @returns {boolean}
 */
export function isValidAction(action) {
  if (!action) return false;

  if (action.type === 'navigate') {
    return isValidRoute(action.target);
  }

  if (action.type === 'function') {
    return typeof action.handler === 'function';
  }

  if (action.type === 'dialog') {
    return typeof action.handler === 'function';
  }

  return false;
}

/**
 * Registro de ações de UI para debugging
 */
export const UI_ACTIONS = {
  NAVIGATE: 'navigate',
  FUNCTION: 'function',
  DIALOG: 'dialog',
  SUBMIT: 'submit',
  CANCEL: 'cancel',
};

/**
 * Log de ação (apenas dev)
 */
export function logUIAction(componentName, actionType, target, success = true) {
  if (typeof window !== 'undefined' && window.__DEV__) {
    console.log(
      `[UI Action] ${componentName} → ${actionType} → ${target} (${success ? '✓' : '✗'})`
    );
  }
}