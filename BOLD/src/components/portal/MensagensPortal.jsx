import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Bell, Megaphone, TrendingUp, DollarSign, Info, Star, CheckCircle2, XCircle, X } from 'lucide-react';
import { format } from 'date-fns';

const TIPO_CONFIG = {
  motivacional: { label: 'Motivacional', icon: Star, color: 'bg-green-50 border-green-200', badgeColor: 'bg-green-100 text-green-800', iconColor: 'text-green-600' },
  aviso: { label: 'Aviso', icon: Bell, color: 'bg-yellow-50 border-yellow-200', badgeColor: 'bg-yellow-100 text-yellow-800', iconColor: 'text-yellow-600' },
  comunicado: { label: 'Comunicado', icon: Megaphone, color: 'bg-blue-50 border-blue-200', badgeColor: 'bg-blue-100 text-blue-800', iconColor: 'text-blue-600' },
  meta: { label: 'Meta', icon: TrendingUp, color: 'bg-purple-50 border-purple-200', badgeColor: 'bg-purple-100 text-purple-800', iconColor: 'text-purple-600' },
  financeiro: { label: 'Financeiro', icon: DollarSign, color: 'bg-orange-50 border-orange-200', badgeColor: 'bg-orange-100 text-orange-800', iconColor: 'text-orange-600' },
  geral: { label: 'Geral', icon: Info, color: 'bg-slate-50 border-slate-200', badgeColor: 'bg-slate-100 text-slate-700', iconColor: 'text-slate-600' },
};

export default function MensagensPortal({ funcionario }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [alertasResposta, setAlertasResposta] = useState([]);
  const isFirstLoad = useRef(true);

  const { data: todasMensagens = [], isLoading } = useQuery({
    queryKey: ['mensagens_rh_portal'],
    queryFn: () => base44.entities.MensagensRH.list('-data_envio', 200),
  });

  // Subscrição em tempo real para detectar respostas do RH
  useEffect(() => {
    if (!funcionario?.id) return;

    const unsubscribe = base44.entities.MensagensRH.subscribe((event) => {
      if (isFirstLoad.current) return;
      if (event.type !== 'create') return;

      const msg = event.data;
      // Só notifica se for direcionada a este funcionário
      const isParaMim =
        msg.publico_alvo === 'todos' ||
        (msg.publico_alvo === 'setor' && msg.setor_alvo === funcionario.setor) ||
        (msg.publico_alvo === 'funcionario' && msg.funcionario_id_alvo === funcionario.id);

      if (!isParaMim) return;

      queryClient.invalidateQueries({ queryKey: ['mensagens_rh_portal'] });

      // Se for resposta de solicitação, mostrar alerta especial
      const isResposta = msg.titulo?.includes('solicitação') || msg.titulo?.includes('Solicitação');
      const isAprovado = msg.tipo === 'comunicado';

      toast({
        title: isAprovado ? '✅ Solicitação aprovada!' : '⚠️ Resposta do RH',
        description: msg.titulo,
        variant: isAprovado ? 'default' : 'destructive',
      });

      if (isResposta) {
        setAlertasResposta(prev => [msg, ...prev]);
      }
    });

    const timer = setTimeout(() => { isFirstLoad.current = false; }, 2000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [funcionario?.id, funcionario?.setor, queryClient, toast]);

  // Filtrar mensagens do funcionário
  const mensagens = todasMensagens.filter(m => {
    if (m.publico_alvo === 'todos') return true;
    if (m.publico_alvo === 'setor' && funcionario?.setor && m.setor_alvo === funcionario.setor) return true;
    if (m.publico_alvo === 'funcionario' && m.funcionario_id_alvo === funcionario?.id) return true;
    return false;
  });

  const naolidas = mensagens.filter(m => !(m.lidas_por || []).includes(funcionario?.id));
  const filtradas = filtroTipo === 'todos' ? mensagens : mensagens.filter(m => m.tipo === filtroTipo);

  const marcarLida = async (msg) => {
    if (!funcionario?.id) return;
    if ((msg.lidas_por || []).includes(funcionario.id)) return;
    const novasLidas = [...(msg.lidas_por || []), funcionario.id];
    await base44.entities.MensagensRH.update(msg.id, { lidas_por: novasLidas });
    queryClient.invalidateQueries({ queryKey: ['mensagens_rh_portal'] });
  };

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  );

  return (
    <div className="space-y-5">

      {/* Alertas de resposta em tempo real */}
      {alertasResposta.length > 0 && (
        <div className="space-y-2">
          {alertasResposta.map((msg, idx) => {
            const isAprovado = msg.tipo === 'comunicado';
            return (
              <div key={idx} className={`flex items-start gap-3 rounded-xl p-4 border ${isAprovado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {isAprovado
                  ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                }
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isAprovado ? 'text-green-800' : 'text-red-800'}`}>{msg.titulo}</p>
                  {msg.mensagem && <p className="text-xs mt-0.5 text-muted-foreground">{msg.mensagem}</p>}
                </div>
                <button onClick={() => setAlertasResposta(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-lg">Mensagens do RH</h2>
          {naolidas.length > 0 && (
            <p className="text-sm text-muted-foreground">{naolidas.length} mensagem(ns) não lida(s)</p>
          )}
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma mensagem</p>
          <p className="text-sm">Você verá avisos e comunicados do RH aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(m => {
            const cfg = TIPO_CONFIG[m.tipo] || TIPO_CONFIG.geral;
            const Icon = cfg.icon;
            const lida = (m.lidas_por || []).includes(funcionario?.id);
            return (
              <div
                key={m.id}
                className={`border rounded-xl p-4 cursor-pointer transition-all ${cfg.color} ${!lida ? 'ring-2 ring-primary/20 shadow-sm' : 'opacity-80'}`}
                onClick={() => marcarLida(m)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-semibold text-sm ${!lida ? '' : 'text-muted-foreground'}`}>{m.titulo}</span>
                      <Badge className={`text-xs ${cfg.badgeColor}`}>{cfg.label}</Badge>
                      {!lida && <Badge className="text-xs bg-primary text-primary-foreground">Nova</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.mensagem}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {m.data_envio && <span>{format(new Date(m.data_envio), 'dd/MM/yyyy HH:mm')}</span>}
                      {lida && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3 h-3" />Lida</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}