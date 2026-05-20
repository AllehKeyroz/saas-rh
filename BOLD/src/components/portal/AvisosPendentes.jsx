import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/formatters';

const TIPO_COLORS = {
  motivacional: { icon: '✨', bg: 'bg-green-50 border-green-200', title: 'text-green-900', badge: 'bg-green-100 text-green-800' },
  aviso: { icon: '⚠️', bg: 'bg-yellow-50 border-yellow-200', title: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-800' },
  comunicado: { icon: '📢', bg: 'bg-blue-50 border-blue-200', title: 'text-blue-900', badge: 'bg-blue-100 text-blue-800' },
  meta: { icon: '🎯', bg: 'bg-purple-50 border-purple-200', title: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
  financeiro: { icon: '💰', bg: 'bg-orange-50 border-orange-200', title: 'text-orange-900', badge: 'bg-orange-100 text-orange-800' },
  geral: { icon: '📋', bg: 'bg-slate-50 border-slate-200', title: 'text-slate-900', badge: 'bg-slate-100 text-slate-700' },
};

export default function AvisosPendentes({ funcionario, mensagensRH, onRefresh }) {
  const [messagemSelecionada, setMensagemSelecionada] = useState(null);
  const [marcando, setMarcando] = useState(false);

  // Filtrar mensagens disponíveis para este funcionário
  const mensagensDisponiveis = mensagensRH.filter(m => {
    if (m.publico_alvo === 'todos') return true;
    if (m.publico_alvo === 'setor' && funcionario?.setor && m.setor_alvo === funcionario.setor) return true;
    if (m.publico_alvo === 'funcionario' && m.funcionario_id_alvo === funcionario?.id) return true;
    return false;
  });

  // Filtrar não lidas
  const naoLidas = mensagensDisponiveis.filter(m => !(m.lidas_por || []).includes(funcionario?.id));

  const handleAbrirMensagem = (mensagem) => {
    setMensagemSelecionada(mensagem);
  };

  const handleConfirmarLeitura = async () => {
    if (!messagemSelecionada) return;
    
    setMarcando(true);
    try {
      const novasLidas = [...(messagemSelecionada.lidas_por || [])];
      if (!novasLidas.includes(funcionario.id)) {
        novasLidas.push(funcionario.id);
      }
      
      const novasLeituras = [...(messagemSelecionada.leituras || [])];
      novasLeituras.push({
        funcionario_id: funcionario.id,
        data_leitura: new Date().toISOString(),
      });
      
      await base44.entities.MensagensRH.update(messagemSelecionada.id, { 
        lidas_por: novasLidas,
        leituras: novasLeituras,
      });
      setMensagemSelecionada(null);
      onRefresh?.();
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    } finally {
      setMarcando(false);
    }
  };

  if (naoLidas.length === 0) return null;

  const tipo = TIPO_COLORS.aviso;

  return (
    <>
      <div className={`rounded-xl border ${tipo.bg} p-4 space-y-3`}>
        <div className="flex items-center gap-2">
          <AlertCircle className={`w-5 h-5 ${tipo.title}`} />
          <div>
            <h3 className={`font-semibold text-sm ${tipo.title}`}>
              Você tem {naoLidas.length} aviso{naoLidas.length > 1 ? 's' : ''} pendente{naoLidas.length > 1 ? 's' : ''}
            </h3>
            <p className="text-xs text-muted-foreground">Clique para ler e confirmar</p>
          </div>
        </div>

        <div className="space-y-2">
          {naoLidas.map(m => {
            const tipoConfig = TIPO_COLORS[m.tipo] || TIPO_COLORS.geral;
            return (
              <button
                key={m.id}
                onClick={() => handleAbrirMensagem(m)}
                className="w-full text-left p-3 rounded-lg bg-white/60 border border-white hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{m.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.mensagem.substring(0, 60)}...</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${tipoConfig.badge}`}>
                    {tipoConfig.icon} {m.tipo === 'geral' ? 'Geral' : m.tipo}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal de leitura */}
      <Dialog open={!!messagemSelecionada}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {messagemSelecionada && TIPO_COLORS[messagemSelecionada.tipo]?.icon}
              {messagemSelecionada?.titulo}
            </DialogTitle>
          </DialogHeader>
          {messagemSelecionada && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap text-foreground">
                {messagemSelecionada.mensagem}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {messagemSelecionada.data_envio && (
                  <p>Enviado em: {formatDate(messagemSelecionada.data_envio)}</p>
                )}
                {messagemSelecionada.enviado_por && (
                  <p>Por: {messagemSelecionada.enviado_por}</p>
                )}
              </div>
              <Button 
               onClick={handleConfirmarLeitura} 
               className="w-full"
               disabled={marcando}
              >
               {marcando ? 'Confirmando...' : 'Confirmar Leitura'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}