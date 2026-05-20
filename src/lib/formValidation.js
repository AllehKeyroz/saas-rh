/**
 * Form Validation Utilities
 * Garante que todos os botões de salvar/cancelar funcionem corretamente
 */

import { toast } from 'sonner';

/**
 * Wraps form submission para garantir error handling
 * @param {Function} callback - Função assíncrona de submissão
 * @param {object} options - { onSuccess, onError, loadingState }
 */
export async function handleFormSubmit(callback, options = {}) {
  const {
    onSuccess = () => {},
    onError = (e) => toast.error(`Erro: ${e.message}`),
    loadingState = null,
  } = options;

  if (typeof callback !== 'function') {
    console.error('[Form] callback deve ser uma função');
    onError(new Error('Callback inválido'));
    return false;
  }

  try {
    await callback();
    onSuccess();
    return true;
  } catch (e) {
    console.error('[Form] Erro na submissão:', e);
    onError(e);
    return false;
  }
}

/**
 * Valida se botão de formulário está habilitado
 * @param {object} state - { loading, isValid, isDirty }
 * @returns {boolean}
 */
export function isFormButtonEnabled(state = {}) {
  const { loading = false, isValid = true, isDirty = true } = state;
  return !loading && isValid && isDirty;
}

/**
 * Cria estado seguro de botão
 */
export function createButtonState(isLoading = false, hasErrors = false) {
  return {
    disabled: isLoading || hasErrors,
    loading: isLoading,
    hasErrors,
  };
}

/**
 * Valida campos requeridos antes de submissão
 * @param {object} formData - dados do formulário
 * @param {array} requiredFields - lista de campos obrigatórios
 * @returns {object} - { isValid, errors }
 */
export function validateRequiredFields(formData, requiredFields = []) {
  const errors = {};

  for (const field of requiredFields) {
    const value = formData[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = `${field} é obrigatório`;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitiza entrada para evitar XSS
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Wrapper para handlers de cancelar
 */
export function createCancelHandler(onClose, onReset = () => {}) {
  return () => {
    try {
      onReset();
      onClose?.();
    } catch (e) {
      console.error('[Cancel Handler] Erro:', e);
      onClose?.();
    }
  };
}

/**
 * Validador de estado de carregamento
 */
export function createLoadingState() {
  return {
    isLoading: false,
    error: null,
    success: false,
    
    setLoading: function(value) {
      this.isLoading = value;
    },
    setError: function(error) {
      this.error = error;
      this.isLoading = false;
    },
    setSuccess: function() {
      this.success = true;
      this.isLoading = false;
      this.error = null;
    },
    reset: function() {
      this.isLoading = false;
      this.error = null;
      this.success = false;
    },
  };
}