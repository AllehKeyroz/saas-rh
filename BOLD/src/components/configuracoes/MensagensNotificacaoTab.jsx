import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Save, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const MENSAGENS_PADRAO = {
  limite_vale_atingido: {
    label: '🚫 100% do limite de vale',
    assunto: '🚫 Limite de vales esgotado — {nome}',
    corpo: `Olá, {nome}!

Informamos que você utilizou {percentual} (R$ {total_usado}) do seu limite mensal de vales de R$ {limite} referente ao mês {mes_referencia}.

Seu limite foi totalmente atingido. Novos vales ou adiantamentos poderão não ser autorizados.

Atenciosamente,
Equipe RH`,
  },
  limite_vale_80_atingido: {
    label: '⚠️ 80% do limite de vale',
    assunto: '⚠️ Atenção: você usou 80% do limite de vales — {nome}',
    corpo: `Olá, {nome}!

Você já utilizou {percentual} (R$ {total_usado}) do seu limite mensal de vales de R$ {limite} referente ao mês {mes_referencia}.

Fique atento para não ultrapassar o limite.

Atenciosamente,
Equipe RH`,
  },
  limite_vale_50_atingido: {
    label: '📊 50% do limite de vale',
    assunto: '📊 Você usou metade do limite de vales — {nome}',
    corpo: `Olá, {nome}!

Você utilizou {percentual} (R$ {total_usado}) do seu limite mensal de vales de R$ {limite} referente ao mês {mes_referencia}.

Este é um aviso informativo. Você ainda tem 50% do limite disponível.

Atenciosamente,
Equipe RH`,
  },
  aniversario_funcionario: {
    label: '🎂 Aniversário de funcionário',
    assunto: '🎂 Feliz Aniversário, {nome}!',
    corpo: `Olá, {nome}!

A toda equipe deseja a você um feliz aniversário! 🎉

Que este novo ano de vida seja repleto de realizações, saúde e muitas conquistas.

Atenciosamente,
Equipe RH`,
  },
  backup_gerado: {
    label: 'Backup gerado',
    assunto: 'Backup gerado com sucesso',
    corpo: `Olá,

Um novo backup do sistema foi gerado com sucesso.

Arquivo: {nome_arquivo}
Data: {data}
Total de arquivos: {total_arquivos}

O backup estará disponível por 60 dias.

Atenciosamente,
Sistema RH`,
  },
  backup_falhou: {
    label: 'Backup falhou',
    assunto: 'Erro ao gerar backup do sistema',
    corpo: `Olá,

Ocorreu um erro ao tentar gerar o backup do sistema.

Detalhes do erro: {erro}
Data: {data}

Por favor, verifique o sistema e tente novamente.

Atenciosamente,
Sistema RH`,
  },
  fechamento_processado: {
    label: 'Fechamento processado',
    assunto: 'Fechamento mensal processado — {mes_referencia}',
    corpo: `Olá,

O fechamento mensal de {mes_referencia} foi processado com sucesso.

Total de funcionários processados: {total_funcionarios}

Acesse o sistema para visualizar os detalhes do fechamento.

Atenciosamente,
Sistema RH`,
  },
};

export default function MensagensNotificacaoTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [eventoAtivo, setEventoAtivo] = useState('limite_vale_50_atingido');
  const [saving, setSaving] = useState(false);
  const [editando, setEditando] = useState({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['mensagens-notificacao'],
    queryFn: () => base44.entities.ConfiguracaoNotificacao.list(),
  });

  // Pega a primeira config do evento (ou cria uma nova)
  const configEvento = configs.find(c => c.evento === eventoAtivo);
  const padrao = MENSAGENS_PADRAO[eventoAtivo];

  const assuntoAtual = editando[eventoAtivo]?.assunto !== undefined
    ? editando[eventoAtivo].assunto
    : (configEvento?.mensagem_assunto ?? padrao.assunto);

  const corpoAtual = editando[eventoAtivo]?.corpo !== undefined
    ? editando[eventoAtivo].corpo
    : (configEvento?.mensagem_corpo ?? padrao.corpo);

  const setField = (field, value) => {
    setEditando(prev => ({
      ...prev,
      [eventoAtivo]: { ...prev[eventoAtivo], [field]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      mensagem_assunto: assuntoAtual,
      mensagem_corpo: corpoAtual,
    };
    if (configEvento) {
      await base44.entities.ConfiguracaoNotificacao.update(configEvento.id, data);
    } else {
      // Cria uma config base para o evento só com a mensagem customizada
      await base44.entities.ConfiguracaoNotificacao.create({
        evento: eventoAtivo,
        destinatarios: '',
        ativo: false,
        ...data,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['mensagens-notificacao'] });
    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    setEditando(prev => { const n = { ...prev }; delete n[eventoAtivo]; return n; });
    setSaving(false);
    toast({ title: 'Mensagem salva com sucesso!' });
  };

  const handleReset = () => {
    setEditando(prev => ({
      ...prev,
      [eventoAtivo]: { assunto: padrao.assunto, corpo: padrao.corpo }
    }));
  };

  const temAlteracoes = editando[eventoAtivo] !== undefined;

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Personalize o assunto e o corpo de cada e-mail de notificação. Use as variáveis entre chaves para inserir dados dinâmicos.
        </p>
      </div>

      {/* Tabs de eventos */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(MENSAGENS_PADRAO).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setEventoAtivo(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              eventoAtivo === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-muted'
            }`}
          >
            {val.label}
            {editando[key] && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="space-y-4 border rounded-xl p-4 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">{padrao.label}</span>
            {!temAlteracoes && configEvento?.mensagem_assunto && (
              <Badge variant="outline" className="text-xs">Personalizada</Badge>
            )}
            {!temAlteracoes && !configEvento?.mensagem_assunto && (
              <Badge variant="secondary" className="text-xs">Padrão</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="w-3 h-3" /> Restaurar padrão
          </Button>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Assunto do e-mail</Label>
          <input
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={assuntoAtual}
            onChange={e => setField('assunto', e.target.value)}
          />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Corpo do e-mail</Label>
          <Textarea
            value={corpoAtual}
            onChange={e => setField('corpo', e.target.value)}
            rows={12}
            className="font-mono text-xs resize-none"
          />
        </div>

        {/* Variáveis disponíveis */}
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis disponíveis:</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(padrao.corpo.match(/\{[^}]+\}/g)?.reduce((acc, v) => { acc[v] = true; return acc; }, {}) || {}).map(v => (
              <code key={v} className="text-xs bg-background border rounded px-1.5 py-0.5 text-primary">{v}</code>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" disabled={saving || !temAlteracoes} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar mensagem
          </Button>
        </div>
      </div>
    </div>
  );
}