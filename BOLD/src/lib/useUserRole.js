import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      setUser(me);
      setRole(me.role || 'user');
      setLoading(false);
    }
    load();
  }, []);

  const isAdmin = role === 'admin';
  const isRH = role === 'admin' || role === 'user'; // RH = regular user
  const isConsulta = role === 'consulta';
  const isFuncionario = role === 'funcionario';
  const canEdit = isAdmin || isRH;
  const canProcess = isAdmin || isRH;
  const canReprocess = isAdmin;

  return { role, user, loading, isAdmin, isRH, isConsulta, isFuncionario, canEdit, canProcess, canReprocess };
}