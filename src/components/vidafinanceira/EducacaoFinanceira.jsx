import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

const ARTIGOS = [
  {
    titulo: 'Como montar uma reserva de emergência',
    categoria: 'Fundamentos',
    cor: 'bg-blue-100 text-blue-700',
    resumo: 'A reserva de emergência é a base de toda saúde financeira. Deve cobrir de 3 a 6 meses de despesas.',
    conteudo: `**O que é:** Dinheiro guardado para imprevistos (desemprego, saúde, reparos).

**Quanto guardar:** O ideal é ter de 3 a 6 meses do seu custo de vida mensal.

**Onde guardar:** Aplicações com liquidez diária e rendimento acima da poupança, como CDBs 100% CDI com liquidez diária ou Tesouro Selic.

**Como chegar lá:**
- Defina o valor total da sua reserva
- Separe 10% a 20% do salário todo mês
- Automatize a transferência logo após receber
- Não use a reserva para desejos, apenas emergências reais

**Dica:** Comece pequeno. R$ 50/mês já é um começo. O hábito é mais importante que o valor.`,
  },
  {
    titulo: 'Como sair do vermelho',
    categoria: 'Dívidas',
    cor: 'bg-red-100 text-red-700',
    resumo: 'Estar endividado não é o fim. Com planejamento e disciplina, é possível se organizar e quitar tudo.',
    conteudo: `**1. Liste todas as dívidas:** Nome, valor, juros e vencimento.

**2. Priorize pelos juros:** Pague primeiro as com maiores taxas (ex: cartão de crédito pode cobrar 300%+ ao ano).

**3. Negocie:** Ligue para a instituição. Muitas oferecem descontos de até 60% para quitar à vista ou negociar parcelas menores.

**4. Evite novos débitos:** Corte cartão de crédito se necessário. Use débito ou dinheiro.

**5. Corte gastos temporariamente:** Streaming, delivery, lazer — tudo vira combustível para quitar dívidas mais rápido.

**6. Método bola de neve:** Quite a menor dívida primeiro para criar momentum e motivação.`,
  },
  {
    titulo: 'Como controlar assinaturas',
    categoria: 'Gastos',
    cor: 'bg-purple-100 text-purple-700',
    resumo: 'Assinaturas pequenas somam muito. Aprenda a auditar e cortar os serviços que não usa.',
    conteudo: `**O problema:** R$ 20 aqui, R$ 35 ali... no final do mês você pode ter R$ 300+ em assinaturas.

**Como auditar:**
- Liste todas as cobranças recorrentes no extrato
- Pergunte: usei isso nos últimos 30 dias?
- Se não usou, cancele imediatamente

**Regra dos 5 minutos:** Se você ficou mais de 5 minutos tentando lembrar para que serve o serviço, cancele.

**Compartilhe contas:** Muitos serviços permitem compartilhamento familiar, reduzindo o custo individual.

**Rodízio:** Assine um serviço por vez e cancele quando terminar o que quer assistir/usar.

**Dica:** Revise as assinaturas a cada 3 meses. Preços aumentam e hábitos mudam.`,
  },
  {
    titulo: 'Como organizar gastos variáveis',
    categoria: 'Orçamento',
    cor: 'bg-green-100 text-green-700',
    resumo: 'Gastos variáveis são os mais difíceis de controlar. Veja como definir limites e não extrapolar.',
    conteudo: `**O que são gastos variáveis:** Mercado, delivery, lazer, roupas, farmácia — valores que mudam a cada mês.

**Método do envelope:** Defina um valor fixo para cada categoria (ex: R$ 400 mercado, R$ 100 lazer). Quando acabar, acabou.

**Regra 50/30/20:**
- 50% da renda para necessidades (fixos)
- 30% para desejos (variáveis)
- 20% para poupança/investimentos

**Como registrar:**
- Use o módulo "Meus Gastos" todo dia
- Lance tudo, mesmo pequenas compras
- Revise o total toda semana

**Dica:** Planeje as compras de mercado com lista e evite ir com fome. Reduz o gasto em até 30%.`,
  },
  {
    titulo: 'Como evitar juros do cartão',
    categoria: 'Dívidas',
    cor: 'bg-orange-100 text-orange-700',
    resumo: 'O cartão de crédito pode ser aliado ou vilão. Tudo depende do seu uso.',
    conteudo: `**A armadilha:** Pagar o mínimo do cartão parece aliviar, mas os juros rotativos (média de 20% a.m.) fazem a dívida crescer absurdamente.

**Regra de ouro:** Nunca pague menos que o total da fatura.

**Se não pode pagar tudo:** Pare de usar o cartão imediatamente e ligue para negociar um parcelamento sem juros adicionais.

**Use o cartão a seu favor:**
- Pague contas recorrentes no cartão e quite sempre o total
- Aproveite pontos/cashback sem parcelar
- Use o prazo do cartão como 30 dias grátis sem juros

**Limite saudável:** Seu gasto no cartão não deve ultrapassar 30% do salário.

**Dica:** Configure avisos de gasto no app do banco para não perder o controle.`,
  },
  {
    titulo: 'Investindo com pouco dinheiro',
    categoria: 'Investimentos',
    cor: 'bg-yellow-100 text-yellow-700',
    resumo: 'Você não precisa de muito para começar a investir. R$ 30 já é suficiente para dar o primeiro passo.',
    conteudo: `**Mito:** "Preciso ter muito dinheiro para investir."
**Realidade:** Você pode começar com R$ 30 em Tesouro Selic.

**Opções para iniciantes:**
- **Tesouro Direto (Selic):** Seguro, rentável, liquidez diária. A partir de R$ 30.
- **CDB de liquidez diária:** Rende mais que poupança, resgate a qualquer hora.
- **Poupança:** Rendimento baixo, mas melhor que nada se começando.

**Prioridade antes de investir:**
1. Quite dívidas com juros altos
2. Monte reserva de emergência
3. Depois comece a investir

**Regra básica:** Nunca invista dinheiro que pode precisar em menos de 1 ano em renda variável.

**Dica:** Comece com R$ 50/mês. O hábito vale mais que o valor inicial.`,
  },
];

const DICAS = [
  { emoji: '💡', texto: 'Registre todos os seus gastos. O que não é medido não é gerenciado.' },
  { emoji: '📅', texto: 'Defina um "dia financeiro" toda semana para revisar seus números.' },
  { emoji: '🛒', texto: 'Faça lista de compras antes de ir ao mercado. Reduz o gasto em até 30%.' },
  { emoji: '📱', texto: 'Cancele assinaturas que não usa. Revise a cada 3 meses.' },
  { emoji: '💳', texto: 'Sempre pague o total da fatura do cartão. Nunca o mínimo.' },
  { emoji: '🎯', texto: 'Tenha uma meta financeira clara. Objetivos concretos motivam mais.' },
  { emoji: '⏰', texto: 'Antes de comprar algo por impulso, espere 48h. A vontade costuma passar.' },
  { emoji: '🐷', texto: 'Guarde primeiro, gaste depois. Pague a si mesmo antes de qualquer conta.' },
];

function ArtigoCard({ artigo }) {
  const [expandido, setExpandido] = useState(false);

  const renderConteudo = (texto) => {
    return texto.split('\n').map((linha, i) => {
      if (linha.startsWith('**') && linha.endsWith('**')) {
        return <p key={i} className="font-semibold text-sm mt-3 mb-1">{linha.replace(/\*\*/g, '')}</p>;
      }
      if (linha.startsWith('- ')) {
        return <li key={i} className="text-sm ml-4 text-muted-foreground">{linha.slice(2)}</li>;
      }
      if (linha.includes('**')) {
        const parts = linha.split(/\*\*(.*?)\*\*/g);
        return <p key={i} className="text-sm text-muted-foreground">{parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}</p>;
      }
      if (linha.trim() === '') return <br key={i} />;
      return <p key={i} className="text-sm text-muted-foreground">{linha}</p>;
    });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <button className="w-full text-left" onClick={() => setExpandido(!expandido)}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <Badge className={`${artigo.cor} border-0 text-xs mb-1`}>{artigo.categoria}</Badge>
              <p className="font-semibold text-sm">{artigo.titulo}</p>
              <p className="text-xs text-muted-foreground mt-1">{artigo.resumo}</p>
            </div>
            {expandido ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1 shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />}
          </div>
        </button>
        {expandido && (
          <div className="mt-3 pt-3 border-t space-y-1">
            {renderConteudo(artigo.conteudo)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function EducacaoFinanceira() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <p className="font-semibold text-sm">Educação Financeira</p>
      </div>

      {/* Dicas rápidas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" />Dicas Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DICAS.map((d, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b last:border-b-0">
                <span className="text-base">{d.emoji}</span>
                <p className="text-sm text-muted-foreground">{d.texto}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Artigos */}
      <div>
        <p className="text-sm font-semibold mb-3">Artigos</p>
        <div className="space-y-2">
          {ARTIGOS.map((a, i) => <ArtigoCard key={i} artigo={a} />)}
        </div>
      </div>
    </div>
  );
}