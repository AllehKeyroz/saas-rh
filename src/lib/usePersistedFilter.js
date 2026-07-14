import { useState, useEffect, useCallback } from 'react';

export function usePersistedFilter(storageKey, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setAndPersist = useCallback((newValue) => {
    setValue(newValue);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newValue));
    } catch {
      /* localStorage cheio ou desabilitado — ignora */
    }
  }, [storageKey]);

  return [value, setAndPersist];
}
