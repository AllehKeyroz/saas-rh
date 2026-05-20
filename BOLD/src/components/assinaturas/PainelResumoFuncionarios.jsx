import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STATUS_CONFIG = {
  aguardando: { label: 'Pendente',  color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
  assinado:   { label: 'Assinado',  color: 'bg-green-100 text-green-800 border-green-200',   dot: 'bg-green-500' },
  expirado:   { label: 'Expirado',  color: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400' },
  recusado:   { label: 'Recusado',  color: 'bg-red-100 text-red-800 border-red-200',          dot: 'bg-red-500' },
  cancelado:  { label: 'Cancelado', color: 'bg-gray-100 text-gray-500 border-gray-200',       dot: 'bg-gray-300' },
};

function MiniStatusBar({ pendentes, assinados, expirados, total }) {
  if (total === 0) return null;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
      {assinados > 0  && <div style={{ width: `${(assinados / total) * 100}%` }}  className="bg-green-500" />}
      {pendentes > 0  && <div style={{ width: `${(pendentes / total) * 100}%` }}  className="bg-yellow-400" />}
      {expirados > 0  && <div style={{ width: `${(expirados / total) * 100}%` }}  className="bg-gray-400" />}
    </div>
  );
}

function FuncionarioRow({ nome, docs }) {
  const [expanded, setExpanded] = useState(false);

  const pendentes  = docs.filter(d => d.status === 'aguardando').length;
  const assinados  = docs.filter(d => d.status === 'assinado').length;
  const expirados  = docs.filter(d => d.status === 'expirado').length;
  const outros     = docs.filter(d => !['aguardando','assinado','expirado'].includes(d.status)).length;
  const total      = docs.length;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{nome}</p>
          <div className="mt-1.5 w-full max-w-xs">
            <MiniStatusBar pendentes={pendentes} assinados={assinados} expirados={expirados} total={total} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pendentes > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3" />{pendentes}
            </span>
          )}
          {assinados > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-200 rounded-full px-2 py-0.5">
              <CheckCircle2 className="w-3 h-3" />{assinados}
            </span>
          )}
          {expirados > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
              <AlertTriangle className="w-3 h-3" />{expirados}
            </span>
          )}
          {outros > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
              <XCircle className="w-3 h-3" />{outros}
            </span>
          )}
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {docs.map(doc => {
            const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.aguardando;
            return (
              <div key={doc.id} className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
                <p className="text-sm text-foreground truncate flex-1">{doc.nome_documento}</p>
                <span className={`ml-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} shrink-0`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PainelResumoFuncionarios({ assinaturas, filtro }) {
  // Agrupar por funcionário
  const porFuncionario = {};
  assinaturas.forEach(doc => {
    const nome = doc.funcionario_nome || 'Sem nome';
    if (!porFuncionario[nome]) porFuncionario[nome] = [];
    porFuncionario[nome].push(doc);
  });

  // Filtrar por status se necessário
  const entradas = Object.entries(porFuncionario)
    .map(([nome, docs]) => ({
      nome,
      docs: filtro ? docs.filter(d => d.status === filtro) : docs,
    }))
    .filter(e => e.docs.length > 0)
    .sort((a, b) => {
      // Prioriza quem tem pendentes
      const pa = a.docs.filter(d => d.status === 'aguardando').length;
      const pb = b.docs.filter(d => d.status === 'aguardando').length;
      return pb - pa || a.nome.localeCompare(b.nome);
    });

  if (entradas.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum funcionário com documentos neste filtro</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entradas.map(({ nome, docs }) => (
        <FuncionarioRow key={nome} nome={nome} docs={docs} />
      ))}
    </div>
  );
}