// Alertas automáticos de férias (painel do RH) — linha discreta de pílulas.
// Cada pílula mostra um indicador (ícone + contagem); o detalhe abre só ao clicar.
// 1) Período aquisitivo pendente (período fechado e férias não concedidas)
// 2) Concessão vencida (prazo de concessão expirado — art. 137 dobra)
// 3) Período aquisitivo completado (novo direito ainda não programado)
// 4) Conflito de setor (ausências simultâneas >= limite configurável por setor)
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Sparkles, Users, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { addDays, differenceInDays } from 'date-fns';
import {
  calcularSituacaoFerias, calcularPeriodosAquisitivos, getStatusFerias,
  FERIAS_STATUS, contarAusenciasSetor,
} from '@/lib/ferias';
import { formatDate } from '@/lib/formatters';

const LIMITE_AUSENCIAS_PADRAO = 2;

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function computeAlerts(funcionarios, todasFerias, limiteSetor) {
  const hoje = new Date();
  const ativos = (funcionarios || []).filter(f => f.ativo !== false && !f.data_demissao);
  const aquisitivos = [];
  const concessaoVencida = [];
  const novosDireitos = [];

  for (const f of ativos) {
    const feriasFunc = (todasFerias || []).filter(x => x.funcionario_id === f.id);
    const situacao = calcularSituacaoFerias(f.data_admissao, feriasFunc);
    if (!situacao || situacao.todosConsumidos) continue;

    const pendente = situacao.periodoAquisitivo;
    const temProgramada = feriasFunc.some(r =>
      r.periodo_aquisitivo === pendente && getStatusFerias(r) !== FERIAS_STATUS.CONCLUIDA
    );

    // Aquisitivo pendente: período aquisitivo fechado e férias ainda não concedidas
    if (situacao.vencido && !temProgramada) {
      if (situacao.concessaoVencida) {
        // Concessão vencida: prazo de concessão expirado → dobra (art. 137)
        concessaoVencida.push({ func: f, periodosPendentes: situacao.periodosPendentes });
      } else {
        aquisitivos.push({
          func: f,
          periodosPendentes: situacao.periodosPendentes,
          diasParaVencer: situacao.diasParaVencer,
        });
      }
    }

    // Novo direito: primeiro período aquisitivo terminou há até 90 dias e nada foi programado
    const periodos = calcularPeriodosAquisitivos(f.data_admissao);
    const primeiro = periodos[0];
    if (primeiro && !temProgramada) {
      const diasAposFim = differenceInDays(hoje, primeiro.fim);
      if (diasAposFim >= 0 && diasAposFim <= 90) {
        novosDireitos.push({ func: f, diasAposFim });
      }
    }
  }

  // Conflito por setor: ausências simultâneas >= limite em qualquer dia dos próximos 14
  const conflitos = [];
  const setores = [...new Set(ativos.map(f => f.setor).filter(Boolean))];
  for (const setor of setores) {
    const limite = limiteSetor?.[setor] ?? LIMITE_AUSENCIAS_PADRAO;
    for (let i = 0; i <= 14; i++) {
      const iso = toISO(addDays(hoje, i));
      const n = contarAusenciasSetor(setor, iso, todasFerias, ativos);
      if (n >= limite) {
        conflitos.push({ setor, n, limite, dataISO: iso });
        break;
      }
    }
  }

  return { aquisitivos, concessaoVencida, novosDireitos, conflitos };
}

const TONES = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
  red: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100',
  orange: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100',
};

export default function FeriasAlertas() {
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(null);

  const { data: funcionarios = [], isLoading: l1 } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });
  const { data: todasFerias = [], isLoading: l2 } = useQuery({
    queryKey: ['ferias_dashboard'],
    queryFn: () => client.entities.Ferias.list(),
  });
  const { data: configs = [] } = useQuery({
    queryKey: ['limite_ausencias_setor'],
    queryFn: () => client.entities.ConfiguracoesRH.filter({ chave: 'limite_ausencias_setor' }),
  });
  const limiteSetor = configs[0]?.valor || {};

  const alertas = useMemo(
    () => computeAlerts(funcionarios, todasFerias, limiteSetor),
    [funcionarios, todasFerias, limiteSetor]
  );

  if (l1 || l2) return <Skeleton className="h-10 rounded-lg" />;

  const categorias = [
    { key: 'aquisitivos', items: alertas.aquisitivos, icon: AlertTriangle, tone: 'amber', rotulo: n => `${n} aquisitivo${n > 1 ? 's' : ''} pendente${n > 1 ? 's' : ''}` },
    { key: 'concessao', items: alertas.concessaoVencida, icon: AlertTriangle, tone: 'red', rotulo: n => `${n} concessão(ões) vencida(s) · dobra` },
    { key: 'novos', items: alertas.novosDireitos, icon: Sparkles, tone: 'blue', rotulo: n => `${n} novo(s) direito(s)` },
    { key: 'conflitos', items: alertas.conflitos, icon: Users, tone: 'orange', rotulo: n => `${n} conflito(s) de setor` },
  ].filter(c => c.items.length > 0);

  if (categorias.length === 0) return null;

  const nome = (f) => f?.nome || '—';
  const periodosTxt = (n) => (n > 1 ? `${n} períodos` : '1 período');
  const catAberta = categorias.find(c => c.key === aberto) || null;

  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {categorias.map(c => (
          <button
            key={c.key}
            onClick={() => setAberto(aberto === c.key ? null : c.key)}
            title="Clique para ver os detalhes"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${TONES[c.tone]}`}
          >
            <c.icon className="w-3.5 h-3.5 shrink-0" />
            {c.rotulo(c.items.length)}
            {aberto === c.key ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />}
          </button>
        ))}
        <button
          onClick={() => navigate('/ferias')}
          className="inline-flex items-center gap-0.5 px-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Calendário de Férias <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {catAberta && (
        <div className="mt-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs space-y-1 max-h-44 overflow-y-auto">
          {catAberta.key === 'aquisitivos' && catAberta.items.map((a, i) => (
            <p key={i} className="flex items-center justify-between gap-2">
              <span>• {nome(a.func)}{a.func?.setor ? ` (${a.func.setor})` : ''} — {periodosTxt(a.periodosPendentes)}</span>
              {a.diasParaVencer <= 90 && (
                <span className="font-semibold text-orange-700 shrink-0">concessão em {a.diasParaVencer}d</span>
              )}
            </p>
          ))}
          {catAberta.key === 'concessao' && catAberta.items.map((a, i) => (
            <p key={i}>• {nome(a.func)}{a.func?.setor ? ` (${a.func.setor})` : ''} — {periodosTxt(a.periodosPendentes)} · dobra (art. 137)</p>
          ))}
          {catAberta.key === 'novos' && catAberta.items.map((a, i) => (
            <p key={i}>• {nome(a.func)} — há {a.diasAposFim} dia(s)</p>
          ))}
          {catAberta.key === 'conflitos' && catAberta.items.map((c, i) => (
            <p key={i}>• Setor "{c.setor}" — {c.n} de férias simultâneas em {formatDate(c.dataISO)} (limite {c.limite})</p>
          ))}
          <button onClick={() => navigate('/ferias')} className="mt-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
            Ver no calendário <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
