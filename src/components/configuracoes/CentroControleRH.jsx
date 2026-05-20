import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { registrarAuditoria } from '@/lib/audit';
import { RH_FEATURES, GRUPOS } from '@/lib/rhControl';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';

export default function CentroControleRH() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes_rh'],
    queryFn: () => client.entities.ConfiguracoesRH.list(),
  });

  const { data: meUser } = useQuery({
    queryKey: ['me_user'],
    queryFn: () => client.auth.me(),
  });

  function getConfig(chave) {
    return configs.find(c => c.chave === chave);
  }

  function isAtiva(chave) {
    return getConfig(chave)?.ativa === true;
  }

  // Verifica se a dependência está satisfeita
  function dependenciaSatisfeita(feature) {
    if (!feature.dependeDe) return true;
    return isAtiva(feature.dependeDe);
  }

  async function handleToggle(feature, novoValor) {
    // Verificar dependência para ativação
    if (novoValor && !dependenciaSatisfeita(feature)) {
      const dep = RH_FEATURES.find(f => f.chave === feature.dependeDe);
      toast({
        title: 'Dependência necessária',
        description: `Ative primeiro: "${dep?.descricao || feature.dependeDe}"`,
        variant: 'destructive',
      });
      return;
    }

    // Se for desativar, verificar se há dependentes ativos
    if (!novoValor) {
      const dependentes = RH_FEATURES.filter(f => f.dependeDe === feature.chave && isAtiva(f.chave));
      if (dependentes.length > 0) {
        toast({
          title: 'Não é possível desativar',
          description: `As seguintes funcionalidades dependem desta e estão ativas: ${dependentes.map(d => d.descricao).join(', ')}. Desative-as primeiro.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSalvando(feature.chave);
    try {
      const agora = new Date().toISOString();
      const cfg = getConfig(feature.chave);
      const payload = {
        chave: feature.chave,
        descricao: feature.descricao,
        ativa: novoValor,
        data_ativacao: agora,
        ativado_por: meUser?.email || 'desconhecido',
      };

      if (cfg) {
        await client.entities.ConfiguracoesRH.update(cfg.id, payload);
      } else {
        await client.entities.ConfiguracoesRH.create(payload);
      }

      await registrarAuditoria({
        acao: 'editar',
        modulo: 'funcionario',
        descricao: `Centro de Controle: "${feature.descricao}" foi ${novoValor ? 'ATIVADA' : 'DESATIVADA'} por ${meUser?.email || '?'}`,
        dados_novos: payload,
      });

      queryClient.invalidateQueries({ queryKey: ['configuracoes_rh'] });

      toast({
        title: novoValor ? `✅ "${feature.descricao}" ativada` : `🔒 "${feature.descricao}" desativada`,
        description: novoValor
          ? 'A funcionalidade está agora disponível para uso.'
          : 'Recursos dependentes foram ocultados.',
      });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSalvando(null);
    }
  }

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
    </div>
  );

  // Agrupar por grupo
  const grupos = {};
  RH_FEATURES.forEach(f => {
    if (!grupos[f.grupo]) grupos[f.grupo] = [];
    grupos[f.grupo].push(f);
  });

  const ativasTotal = RH_FEATURES.filter(f => isAtiva(f.chave)).length;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 border border-primary/20">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-base">Centro de Controle do RH</h3>
          <p className="text-sm text-muted-foreground">Ative ou desative cada funcionalidade antes de liberar para uso.</p>
          <div className="flex gap-2 mt-2">
            <Badge className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle2 className="w-3 h-3 mr-1" />{ativasTotal} ativa(s)
            </Badge>
            <Badge variant="secondary">
              {RH_FEATURES.length - ativasTotal} inativa(s)
            </Badge>
          </div>
        </div>
      </div>

      {/* Aviso geral */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>Atenção:</strong> Funcionalidades desativadas ficam ocultas em todas as telas do sistema. Algumas possuem dependências que devem ser ativadas em ordem.
        </p>
      </div>

      {/* Grupos */}
      {Object.entries(grupos).map(([grupoKey, features]) => {
        const grupo = GRUPOS[grupoKey];
        return (
          <div key={grupoKey} className="space-y-2">
            <h4 className={`font-semibold text-sm flex items-center gap-2 ${grupo.cor}`}>
              <ShieldCheck className="w-4 h-4" />
              {grupo.label}
            </h4>

            <div className="border rounded-xl overflow-hidden bg-card divide-y">
              {features.map(feature => {
                const ativa = isAtiva(feature.chave);
                const cfg = getConfig(feature.chave);
                const depSatisfeita = dependenciaSatisfeita(feature);
                const isSaving = salvando === feature.chave;

                return (
                  <div key={feature.chave} className={`px-4 py-3 ${!depSatisfeita ? 'opacity-60 bg-muted/30' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{feature.descricao}</span>
                          {ativa ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" />Inativa
                            </Badge>
                          )}
                          {feature.dependeDe && !depSatisfeita && (
                            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                              Requer: {RH_FEATURES.find(f => f.chave === feature.dependeDe)?.descricao}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{feature.detalhe}</p>
                        {cfg?.data_ativacao && (
                          <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            Última alteração: {format(new Date(cfg.data_ativacao), 'dd/MM/yyyy HH:mm')}
                            {cfg.ativado_por && ` por ${cfg.ativado_por}`}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={ativa}
                        onCheckedChange={v => handleToggle(feature, v)}
                        disabled={isSaving || (!depSatisfeita && !ativa)}
                        className="shrink-0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}