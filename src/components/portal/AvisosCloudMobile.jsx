import React, { useState } from 'react';
import { AlertCircle, Cloud, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { client } from '@/api/client';
import { formatDate } from '@/lib/formatters';

const TIPO_COLORS = {
  motivacional: 'bg-green-100 text-green-900',
  aviso: 'bg-yellow-100 text-yellow-900',
  comunicado: 'bg-blue-100 text-blue-900',
  meta: 'bg-purple-100 text-purple-900',
  financeiro: 'bg-orange-100 text-orange-900',
  geral: 'bg-slate-100 text-slate-900',
};

export default function AvisosCloudMobile({ funcionario, mensagensRH, onRefresh }) {
  const [messagemSelecionada, setMensagemSelecionada] = useState(null);
  const [marcando, setMarcando] = useState(false);

  const naoLidas = mensagensRH.filter(m => {
    if (m.publico_alvo === 'todos') return true;
    if (m.publico_alvo === 'setor' && funcionario?.setor && m.setor_alvo === funcionario.setor) return true;
    if (m.publico_alvo === 'funcionario' && m.funcionario_id_alvo === funcionario?.id) return true;
    return false;
  }).filter(m => !(m.lidas_por || []).includes(funcionario?.id));

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
      
      await client.entities.MensagensRH.update(messagemSelecionada.id, { 
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

  if (naoLidas.length === 0) {
    return (
      <div className="md:hidden flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
        <Cloud className="w-3 h-3" />
        Sem mensagens novas
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden flex flex-wrap gap-1.5">
        {naoLidas.map(m => (
          <button
            key={m.id}
            onClick={() => handleAbrirMensagem(m)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all hover:shadow-sm ${TIPO_COLORS[m.tipo] || TIPO_COLORS.geral}`}
          >
            <Cloud className="w-2.5 h-2.5 inline mr-1" />
            {m.titulo.length > 15 ? m.titulo.substring(0, 15) + '...' : m.titulo}
          </button>
        ))}
      </div>

      <Dialog open={!!messagemSelecionada}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messagemSelecionada?.titulo}</DialogTitle>
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