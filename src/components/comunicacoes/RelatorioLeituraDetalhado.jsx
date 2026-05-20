import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function RelatorioLeituraDetalhado() {
  const [mensagemSelecionada, setMensagemSelecionada] = useState(null);

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ['mensagens_rh'],
    queryFn: () => client.entities.MensagensRH.list('-created_date', 100),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const TIPO_COLORS = {
    motivacional: 'bg-green-100 text-green-800',
    aviso: 'bg-yellow-100 text-yellow-800',
    comunicado: 'bg-blue-100 text-blue-800',
    meta: 'bg-purple-100 text-purple-800',
    financeiro: 'bg-orange-100 text-orange-800',
    geral: 'bg-slate-100 text-slate-700',
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const mensagem = mensagens.find(m => m.id === mensagemSelecionada);

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Selecione uma mensagem</label>
        <Select value={mensagemSelecionada || ''} onValueChange={setMensagemSelecionada}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha uma mensagem..." />
          </SelectTrigger>
          <SelectContent>
            {mensagens.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.titulo} ({format(new Date(m.data_envio), 'dd/MM/yyyy')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {mensagem && (
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{mensagem.titulo}</h3>
            <Badge className={TIPO_COLORS[mensagem.tipo] || TIPO_COLORS.geral}>{mensagem.tipo}</Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Enviado em: {format(new Date(mensagem.data_envio), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-sm mb-3">Confirmações de Leitura</h4>
            
            {(() => {
              const leituras = mensagem.leituras || [];
              const todasDisp = (() => {
                if (mensagem.publico_alvo === 'todos') return funcionarios.filter(f => f.ativo !== false);
                if (mensagem.publico_alvo === 'setor') return funcionarios.filter(f => f.setor === mensagem.setor_alvo && f.ativo !== false);
                if (mensagem.publico_alvo === 'funcionario') return funcionarios.filter(f => f.id === mensagem.funcionario_id_alvo);
                return [];
              })();

              const lidas = todasDisp.filter(f => leituras.some(l => l.funcionario_id === f.id));
              const naoLidas = todasDisp.filter(f => !leituras.some(l => l.funcionario_id === f.id));

              return (
                <div className="space-y-4">
                  {lidas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-700">✅ Lido ({lidas.length}/{todasDisp.length})</span>
                      </div>
                      <div className="space-y-2">
                        {lidas.map(f => {
                          const leitura = leituras.find(l => l.funcionario_id === f.id);
                          return (
                            <div key={f.id} className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-green-900">{f.nome}</p>
                                {leitura?.data_leitura && (
                                  <div className="flex items-center gap-4 text-xs text-green-700 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(leitura.data_leitura), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(new Date(leitura.data_leitura), 'HH:mm:ss')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {naoLidas.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-orange-700">⏳ Pendente ({naoLidas.length}/{todasDisp.length})</span>
                      </div>
                      <div className="space-y-2">
                        {naoLidas.map(f => (
                          <div key={f.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-sm font-medium text-orange-900">{f.nome}</p>
                            <p className="text-xs text-orange-700 mt-1">Aguardando confirmação</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p>Taxa de confirmação: {(() => {
              const leituras = mensagem.leituras || [];
              const todasDisp = (() => {
                if (mensagem.publico_alvo === 'todos') return funcionarios.filter(f => f.ativo !== false);
                if (mensagem.publico_alvo === 'setor') return funcionarios.filter(f => f.setor === mensagem.setor_alvo && f.ativo !== false);
                if (mensagem.publico_alvo === 'funcionario') return funcionarios.filter(f => f.id === mensagem.funcionario_id_alvo);
                return [];
              })();
              const percentual = todasDisp.length > 0 ? Math.round((leituras.length / todasDisp.length) * 100) : 0;
              return `${percentual}% (${leituras.length}/${todasDisp.length})`;
            })()}</p>
          </div>
        </div>
      )}
    </div>
  );
}