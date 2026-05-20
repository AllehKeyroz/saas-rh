import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Item que persiste no banco via ConfiguracoesRH
function OpcoesRH({ chave, label, descricao, configs, onToggle, loading }) {
  const cfg = configs.find(c => c.chave === chave);
  const ativa = cfg?.ativa === true;
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
      <div className="flex-1">
        <Label className="cursor-pointer font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
      </div>
      <Switch
        checked={ativa}
        disabled={loading}
        onCheckedChange={() => onToggle(chave, cfg, !ativa)}
      />
    </div>
  );
}

// Item local (sem persistência no banco — visual apenas)
function OpcoesItem({ label, checked, onChange, descricao }) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
      <div className="flex-1">
        <Label className="cursor-pointer font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function IntegracaoVidaFinanceira() {
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['configuracoes_rh'],
    queryFn: () => client.entities.ConfiguracoesRH.list(),
    staleTime: 10_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ chave, cfg, novoValor, descricaoConfig }) => {
      if (cfg?.id) {
        await client.entities.ConfiguracoesRH.update(cfg.id, { ativa: novoValor });
      } else {
        await client.entities.ConfiguracoesRH.create({
          chave,
          descricao: descricaoConfig || chave,
          ativa: novoValor,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracoes_rh'] });
    },
  });

  const handleToggle = (chave, cfg, novoValor, descricaoConfig) => {
    toggleMutation.mutate({ chave, cfg, novoValor, descricaoConfig });
  };

  const vidaAtiva = configs.find(c => c.chave === 'vida_financeira')?.ativa === true;

  return (
    <div className="space-y-6">
      {/* Status Principal */}
      <Card>
        <CardHeader>
          <CardTitle>Integração com Vida Financeira</CardTitle>
          <CardDescription>
            Controle quais dados financeiros os colaboradores podem visualizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2">
            <div>
              <Label className="text-base font-semibold cursor-pointer">Ativar Vida Financeira</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {vidaAtiva
                  ? '✅ Colaboradores verão o módulo de Vida Financeira'
                  : '❌ Colaboradores não verão nada'}
              </p>
            </div>
            <Switch
              checked={vidaAtiva}
              disabled={isLoading || toggleMutation.isPending}
              onCheckedChange={(v) => handleToggle('vida_financeira', configs.find(c => c.chave === 'vida_financeira'), v, 'Módulo Vida Financeira')}
            />
          </div>

          {!vidaAtiva && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Se desativado, os colaboradores não terão acesso a nenhum dado da Vida Financeira.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {vidaAtiva && (
        <>
          {/* Comissões no Portal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comissões no Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <OpcoesRH
                chave="exibir_calculo_comissao_detalhado"
                label="📊 Relatório Detalhado do Cálculo de Comissão"
                descricao="Funcionários podem ver como a comissão foi calculada: dias trabalhados, proporção aplicada e descontos por ausência"
                configs={configs}
                onToggle={(chave, cfg, v) => handleToggle(chave, cfg, v, 'Relatório Detalhado do Cálculo de Comissão')}
                loading={isLoading || toggleMutation.isPending}
              />
            </CardContent>
          </Card>

          {/* Entradas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entradas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <OpcoesRH
                chave="exibir_comissao_vida_financeira"
                label="Comissão"
                descricao="Comissões calculadas pelo RH aparecem no módulo financeiro"
                configs={configs}
                onToggle={(chave, cfg, v) => handleToggle(chave, cfg, v, 'Exibir Comissão na Vida Financeira')}
                loading={isLoading || toggleMutation.isPending}
              />
              <OpcoesRH
                chave="receitas_extras_vida_financeira"
                label="Receitas Extras"
                descricao="Bônus, prêmios e outras receitas"
                configs={configs}
                onToggle={(chave, cfg, v) => handleToggle(chave, cfg, v, 'Receitas Extras')}
                loading={isLoading || toggleMutation.isPending}
              />
            </CardContent>
          </Card>

          {/* Resumo */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-base">✅ Status da Integração</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-green-900">
              <p>Módulo Vida Financeira ativo. Configure acima o que os colaboradores podem visualizar.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}