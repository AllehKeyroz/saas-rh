// Tipos de afastamento e helpers compartilhados
export const AFASTAMENTO_TIPOS = {
  atestado_medico: { label: 'Atestado Médico', color: 'bg-orange-100 text-orange-700' },
  suspensao: { label: 'Suspensão', color: 'bg-red-100 text-red-700' },
  outro: { label: 'Outro', color: 'bg-slate-100 text-slate-700' },
};

export function getTipoAfastamento(tipo) {
  return AFASTAMENTO_TIPOS[tipo] || { label: tipo || 'Outro', color: 'bg-slate-100 text-slate-700' };
}

export function getHojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Retorna true se o afastamento está ativo na data de hoje
export function isAfastamentoAtivo(a, hoje) {
  if (!a || a.status === 'encerrado') return false;
  if (a.data_inicio && a.data_inicio > hoje) return false;
  if (a.data_fim && a.data_fim < hoje) return false;
  return true;
}

// Encontra o afastamento ativo de um funcionário (ou null)
export function getAfastamentoAtivo(funcionarioId, afastamentos, hoje) {
  return (afastamentos || []).find(a => a.funcionario_id === funcionarioId && isAfastamentoAtivo(a, hoje)) || null;
}
