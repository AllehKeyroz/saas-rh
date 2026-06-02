import React, { useState, useMemo, useEffect } from 'react';
import { client } from '@/api/client';
import { registrarAuditoria } from '@/lib/audit';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Loader2, Calculator, Info, Plus, Trash2, UserX, UserCheck } from 'lucide-react';
import { formatCurrency, LIMITE_PERCENTUAL } from '@/lib/formatters';
import { toast } from 'sonner';
import { getCurrentTenantId } from '@/firebase/auth';

const PARENTESCOS = ['filho(a)', 'cônjuge', 'companheiro(a)', 'enteado(a)', 'menor tutelado', 'outros'];

function getHojeBR() {
  const str = new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  return new Date(str)
}

function getHojeStrBR() {
  const d = getHojeBR()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcularIdade(dataNascimento) {
  const nasc = new Date(dataNascimento + 'T00:00:00')
  const hoje = getHojeBR()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const mes = hoje.getMonth() - nasc.getMonth()
  if (mes < 0 || (mes === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

const DEFAULT_FORM = {
  nome: '', email: '', telefone: '', funcao: '', setor: '',
  data_admissao: '', data_demissao: '', data_nascimento: '',
  salario_base: '', limite_vales: '', ativo: true, foto: '',
  apto_comissao: false, data_inicio_comissao: '',
  // Documentos
  cpf: '', rg: '', rg_orgao: '', rg_uf: '', ctps: '', ctps_serie: '',
  pis: '', titulo_eleitor: '', reservista: '', cnh: '',
  nacionalidade: 'brasileiro(a)', naturalidade: '', estado_civil: '',
  nome_mae: '', genero: '', pcd: false,
  // Endereço
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', uf: '',
  // Dados bancários
  banco: '', agencia: '', agencia_dv: '', conta: '', conta_dv: '', tipo_conta: '',
  chave_pix: '',
  // Dependentes
  dependentes: [],
  historico_contratos: [],
  motivo_demissao: '',
  // Benefícios
  vale_transporte: false, vale_transporte_valor: '',
  vale_refeicao: false, plano_saude: '', plano_odontologico: false,
  seguro_vida: false,
  // Escolaridade
  nivel_instrucao: '',
};

const TABS = [
  { id: 'cadastro', label: 'Cadastro' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'bancario', label: 'Dados Bancários' },
  { id: 'dependentes', label: 'Dependentes' },
  { id: 'beneficios', label: 'Benefícios' },
];

export default function FuncionarioForm({ open, onClose, funcionario, onSaved }) {
  const isEdit = !!funcionario;
  const hojeStr = getHojeStrBR()
  const [tab, setTab] = useState('cadastro');
  const [form, setForm] = useState(funcionario ? { ...DEFAULT_FORM, ...funcionario } : { ...DEFAULT_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [novoDependente, setNovoDependente] = useState({ nome: '', cpf: '', data_nascimento: '', parentesco: '' });
  const [showDemitir, setShowDemitir] = useState(false);
  const [demitirForm, setDemitirForm] = useState({ data_demissao: hojeStr, motivo_demissao: '' });
  const [showRecontratar, setShowRecontratar] = useState(false);
  const [recontratarData, setRecontratarData] = useState(hojeStr);

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => client.entities.Setor.list(),
  });

  const { data: funcoes = [] } = useQuery({
    queryKey: ['funcoes'],
    queryFn: () => client.entities.Funcao.list(),
  });

  const comissaoAtivaByData = form.data_inicio_comissao && form.data_inicio_comissao <= hojeStr;
  const [limiteEditado, setLimiteEditado] = useState(false);

  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos_limite', funcionario?.id],
    queryFn: () => client.entities.FechamentoMensal.filter({ funcionario_id: funcionario.id }),
    enabled: isEdit,
  });

  const ultimoFechamento = useMemo(() => {
    if (!fechamentos.length) return null;
    return [...fechamentos].sort((a, b) => (b.mes_referencia || '').localeCompare(a.mes_referencia || ''))[0];
  }, [fechamentos]);

  const { data: comissoesUltimo = [] } = useQuery({
    queryKey: ['comissoes_limite', funcionario?.id, ultimoFechamento?.mes_referencia],
    queryFn: () => client.entities.ComissaoPorFuncionario.filter({
      funcionario_id: funcionario.id,
      mes_referencia: ultimoFechamento.mes_referencia,
    }),
    enabled: isEdit && !!ultimoFechamento?.mes_referencia,
  });

  const comissaoUltimoMes = useMemo(() => {
    return comissoesUltimo
      .filter(c => c.apto)
      .reduce((s, c) => s + (c.valor_individual_final ?? c.valor_individual ?? 0), 0);
  }, [comissoesUltimo]);

  const hoje = new Date();
  const mesAtual = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
  const { data: lancamentosUso = [] } = useQuery({
    queryKey: ['lancamentos_uso_limite', funcionario?.id, mesAtual],
    queryFn: () => client.entities.FichaFinanceira.filter({ funcionario_id: funcionario.id }),
    enabled: isEdit,
  });

  const totalUsadoMes = useMemo(() => {
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();
    return lancamentosUso
      .filter(l => l.data_lancamento)
      .filter(l => {
        const d = new Date(l.data_lancamento);
        return d.getMonth() === mes && d.getFullYear() === ano;
      })
      .filter(l => ['vale', 'adiantamento'].includes(l.tipo_lancamento))
      .reduce((s, l) => s + (l.valor || 0), 0);
  }, [lancamentosUso]);

  const salarioBaseCalc = Number(form.salario_base) || 0;
  const baseCalculoLimite = salarioBaseCalc + comissaoUltimoMes;
  const limiteCalculado = baseCalculoLimite * (LIMITE_PERCENTUAL / 100);

  useEffect(() => {
    if (!isEdit) return;
    if (limiteEditado) return;
    if (!limiteCalculado || limiteCalculado <= 0) return;
    setForm(prev => ({ ...prev, limite_vales: limiteCalculado.toFixed(2) }));
  }, [limiteCalculado, isEdit]);

  const percentualUso = (() => {
    const lim = Number(form.limite_vales) || 0;
    if (!lim) return null;
    return Math.min((totalUsadoMes / lim) * 100, 100);
  })();

  const validar = (dados) => {
    const erros = {}
    if (!dados.nome.trim()) erros.nome = 'Nome é obrigatório'
    if (!dados.data_admissao) erros.data_admissao = 'Data de admissão é obrigatória'
    if (dados.data_admissao && dados.data_admissao > hojeStr) erros.data_admissao = 'Data de admissão não pode ser futura'
    if (dados.data_nascimento) {
      if (dados.data_nascimento > hojeStr) erros.data_nascimento = 'Data de nascimento não pode ser futura'
      else if (calcularIdade(dados.data_nascimento) < 14) erros.data_nascimento = 'Funcionário deve ter no mínimo 14 anos'
    }
    if (!dados.salario_base || Number(dados.salario_base) <= 0) erros.salario_base = 'Salário base é obrigatório'
    if (dados.data_demissao && dados.data_admissao && dados.data_demissao < dados.data_admissao) erros.data_demissao = 'Demissão não pode ser anterior à admissão'
    return erros
  }

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
  }

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await client.integrations.Core.UploadFile({ file });
    handleChange('foto', file_url);
    setUploading(false);
  };

  const adicionarDependente = () => {
    if (!novoDependente.nome.trim()) return;
    setForm(prev => ({
      ...prev,
      dependentes: [...(prev.dependentes || []), { ...novoDependente, id: Date.now() }],
    }));
    setNovoDependente({ nome: '', cpf: '', data_nascimento: '', parentesco: '' });
  };

  const removerDependente = (id) => {
    setForm(prev => ({
      ...prev,
      dependentes: (prev.dependentes || []).filter(d => d.id !== id),
    }));
  };

  const normalizeData = (d) => ({
    ...d,
    salario_base: d.salario_base ? Number(d.salario_base) : null,
    limite_vales: d.limite_vales ? Number(d.limite_vales) : null,
    ativo: d.data_demissao ? false : d.ativo,
    vale_transporte_valor: d.vale_transporte_valor ? Number(d.vale_transporte_valor) : null,
    dependentes: d.dependentes || [],
    historico_contratos: d.historico_contratos || [],
  });

  const confirmDemissao = async () => {
    if (!demitirForm.data_demissao) return;
    if (!isEdit || !funcionario?.id) return;
    setSaving(true);
    try {
      const snapshot = {
        data_admissao: funcionario.data_admissao || form.data_admissao,
        data_demissao: demitirForm.data_demissao,
        motivo_demissao: demitirForm.motivo_demissao || '',
        salario_base: Number(funcionario.salario_base || form.salario_base) || null,
        funcao: funcionario.funcao || form.funcao,
        setor: funcionario.setor || form.setor,
      };
      const historico = [...(funcionario.historico_contratos || []), snapshot];
      await client.entities.Funcionarios.update(funcionario.id, {
        data_demissao: demitirForm.data_demissao,
        motivo_demissao: demitirForm.motivo_demissao || '',
        ativo: false,
        historico_contratos: historico,
      });
      await registrarAuditoria({
        acao: 'editar', modulo: 'funcionario',
        entidade_id: funcionario.id,
        descricao: `Funcionário "${form.nome}" demitido`,
        dados_anteriores: funcionario,
        dados_novos: { data_demissao: demitirForm.data_demissao, ativo: false },
      });
      toast.success('Funcionário demitido com sucesso!');
      setShowDemitir(false);
      setDemitirForm({ data_demissao: hojeStr, motivo_demissao: '' });
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Erro ao demitir');
    } finally {
      setSaving(false);
    }
  };

  const confirmRecontratar = async (novaAdmissao) => {
    if (!isEdit || !funcionario?.id) return;
    setSaving(true);
    try {
      await client.entities.Funcionarios.update(funcionario.id, {
        data_admissao: novaAdmissao,
        data_demissao: '',
        motivo_demissao: '',
        ativo: true,
      });
      await registrarAuditoria({
        acao: 'editar', modulo: 'funcionario',
        entidade_id: funcionario.id,
        descricao: `Funcionário "${form.nome}" recontratado em ${novaAdmissao}`,
        dados_anteriores: funcionario,
        dados_novos: { data_admissao: novaAdmissao, data_demissao: '', ativo: true },
      });
      toast.success('Funcionário recontratado com sucesso!');
      setShowRecontratar(false);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Erro ao recontratar');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dados = normalizeData(form);
    const erros = validar(dados)
    setErrors(erros)
    if (Object.keys(erros).length > 0) { setTab('cadastro'); return }

    setSaving(true);
    let data = normalizeData(form);

    // Detecta demissão: data_demissao foi preenchida agora (estava vazia antes)
    if (isEdit && form.data_demissao && !funcionario.data_demissao) {
      const snapshot = {
        data_admissao: funcionario.data_admissao || form.data_admissao,
        data_demissao: form.data_demissao,
        motivo_demissao: form.motivo_demissao || '',
        salario_base: funcionario.salario_base ? Number(funcionario.salario_base) : null,
        funcao: funcionario.funcao || form.funcao,
        setor: funcionario.setor || form.setor,
      };
      data = { ...data, historico_contratos: [...(funcionario.historico_contratos || []), snapshot] };
    }

    // Detecta recontratação: data_demissao foi limpa (estava preenchida antes)
    if (isEdit && !form.data_demissao && funcionario.data_demissao) {
      data = { ...data, ativo: true };
    }

    try {
      if (isEdit) {
        await client.entities.Funcionarios.update(funcionario.id, data);
        await registrarAuditoria({
          acao: 'editar', modulo: 'funcionario',
          entidade_id: funcionario.id,
          descricao: `Funcionário "${data.nome}" atualizado`,
          dados_anteriores: funcionario, dados_novos: data,
        });
      } else {
        const criado = await client.entities.Funcionarios.create(data);
        if (data.email) {
          try {
            await client.entities.convites.create({
              email: data.email,
              funcionario_id: criado?.id,
              funcionario_nome: data.nome,
              status: 'pendente',
              tenant_id: getCurrentTenantId() || '',
              created_date: new Date().toISOString(),
            });
            toast.success('Convite criado para o funcionário!');
          } catch (e) {
            console.error('Erro ao criar convite:', e);
            toast.error('Erro ao criar convite: ' + e.message);
          }
        }
        await registrarAuditoria({
          acao: 'criar', modulo: 'funcionario',
          entidade_id: criado?.id,
          descricao: `Funcionário "${data.nome}" cadastrado`,
          dados_novos: data,
        });
      }
      setSaving(false);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar');
      setSaving(false);
    }
  };

  const TabNav = () => (
    <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide mb-4 -mx-1 px-1">
      {TABS.map(t => (
        <button key={t.id} type="button" onClick={() => setTab(t.id)}
          className={`whitespace-nowrap px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
            tab === t.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  );

  const renderCadastro = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {form.foto ? (
            <img src={form.foto} alt="" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <Label>Foto (opcional)</Label>
          <Input type="file" accept="image/*" onChange={handlePhoto} disabled={uploading} />
          {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
        </div>
      </div>

      <div>
        <Label>Nome *</Label>
        <Input value={form.nome} onChange={e => handleChange('nome', e.target.value)} placeholder="Nome completo" required />
        {errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>E-mail</Label>
          <Input type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="funcionario@empresa.com" />
        </div>
        <div>
          <Label>Telefone / WhatsApp</Label>
          <Input type="tel" value={form.telefone || ''} onChange={e => handleChange('telefone', e.target.value)} placeholder="11999998888" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Função</Label>
          {funcoes.length > 0 ? (
            <Select value={form.funcao || ''} onValueChange={v => handleChange('funcao', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {funcoes.filter(f => f.ativo !== false).map(f => (
                  <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.funcao || ''} onChange={e => handleChange('funcao', e.target.value)} placeholder="Ex: Operador" />
          )}
        </div>
        <div>
          <Label>Setor</Label>
          {setores.length > 0 ? (
            <Select value={form.setor || ''} onValueChange={v => handleChange('setor', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {setores.filter(s => s.ativo !== false).map(s => (
                  <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.setor || ''} onChange={e => handleChange('setor', e.target.value)} placeholder="Ex: Produção" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data de Nascimento</Label>
          <Input type="date" max={hojeStr} value={form.data_nascimento || ''} onChange={e => handleChange('data_nascimento', e.target.value)} />
          {errors.data_nascimento && <p className="text-xs text-destructive mt-1">{errors.data_nascimento}</p>}
        </div>
        <div>
          <Label>Data Admissão *</Label>
          <Input type="date" max={hojeStr} value={form.data_admissao || ''} onChange={e => handleChange('data_admissao', e.target.value)} required />
          {errors.data_admissao && <p className="text-xs text-destructive mt-1">{errors.data_admissao}</p>}
        </div>
      </div>

      {/* Demissão / Recontratação */}
      {form.data_demissao ? (
        <div className="border rounded-lg p-4 space-y-2 bg-red-50 border-red-200">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-sm text-red-700">
              <p className="font-medium">Demitido em {new Date(form.data_demissao + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              {form.motivo_demissao && <p className="text-xs">Motivo: {form.motivo_demissao}</p>}
            </div>
            <Button type="button" size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-100" onClick={() => { setRecontratarData(hojeStr); setShowRecontratar(true); }}>
              <UserCheck className="w-3.5 h-3.5 mr-1" />Recontratar
            </Button>
          </div>
        </div>
      ) : isEdit ? (
        <div>
          <Button type="button" variant="outline" className="border-red-300 text-red-700 hover:bg-red-100" onClick={() => { setDemitirForm({ data_demissao: hojeStr, motivo_demissao: '' }); setShowDemitir(true); }}>
            <UserX className="w-4 h-4 mr-2" />Demitir Funcionário
          </Button>
        </div>
      ) : null}

      {/* Histórico de contratos anteriores */}
      {isEdit && (form.historico_contratos || []).length > 0 && (
        <div className="border rounded-lg p-3 space-y-2 bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold text-slate-600">📋 Contratos anteriores</p>
          <div className="space-y-1.5">
            {form.historico_contratos.map((c, i) => (
              <div key={i} className="text-[11px] text-slate-500 flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>
                  <strong>{c.funcao || 'Sem função'}</strong>
                  {' · '}Adm: {c.data_admissao ? new Date(c.data_admissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  {' → '}Dem: {c.data_demissao ? new Date(c.data_demissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  {c.motivo_demissao && <span> ({c.motivo_demissao})</span>}
                  {c.salario_base && <span> · Sal: {formatCurrency(c.salario_base)}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Salário Base *</Label>
          <Input type="number" step="0.01" min="0" value={form.salario_base || ''} onChange={e => { setLimiteEditado(false); handleChange('salario_base', e.target.value); }} placeholder="0,00" required />
          {errors.salario_base && <p className="text-xs text-destructive mt-1">{errors.salario_base}</p>}
        </div>
        <div>
          <Label>Limite de Vales ({LIMITE_PERCENTUAL}%)</Label>
          <Input type="number" step="0.01" min="0" value={form.limite_vales || ''} onChange={e => { setLimiteEditado(true); handleChange('limite_vales', e.target.value); }} placeholder="Sem limite" />
        </div>
      </div>

      {isEdit && Number(form.limite_vales) > 0 && (
        <div className="border rounded-lg p-3 space-y-2 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 mb-1">
            <Calculator className="w-3.5 h-3.5" />
            Cálculo do Limite de Vales ({LIMITE_PERCENTUAL}%)
          </div>
          <div className="text-xs text-blue-600 space-y-1">
            <p>
              Salário base: <strong>{formatCurrency(salarioBaseCalc)}</strong>
              {ultimoFechamento && (
                <> + Comissão ({ultimoFechamento.mes_referencia}): <strong>{formatCurrency(comissaoUltimoMes)}</strong></>
              )}
              {!ultimoFechamento && isEdit && (
                <> + Comissão: <strong>R$ 0,00</strong> <span className="text-blue-400">(sem fechamento anterior)</span></>
              )}
            </p>
            <p>
              Base de cálculo: <strong>{formatCurrency(baseCalculoLimite)}</strong>
              {' × '}{LIMITE_PERCENTUAL}% = <strong className="text-blue-800">{formatCurrency(limiteCalculado)}</strong>
            </p>
          </div>
          {percentualUso !== null && (
            <div className="pt-1.5 border-t border-blue-200">
              <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                <span>Usado neste mês:</span>
                <span>
                  <strong>{formatCurrency(totalUsadoMes)}</strong> de {formatCurrency(Number(form.limite_vales) || 0)}
                  {' — '}
                  <span className={percentualUso >= 100 ? 'text-red-600 font-semibold' : percentualUso >= 80 ? 'text-amber-600 font-semibold' : ''}>
                    {percentualUso.toFixed(0)}%
                  </span>
                </span>
              </div>
              <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${percentualUso >= 100 ? 'bg-red-500' : percentualUso >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(percentualUso, 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {isEdit && (!form.limite_vales || Number(form.limite_vales) === 0) && baseCalculoLimite > 0 && (
        <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2 text-xs text-blue-700">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Limite de {LIMITE_PERCENTUAL}% calculado automaticamente: <strong>{formatCurrency(limiteCalculado)}</strong>
              {ultimoFechamento && <> (salário + comissão de {ultimoFechamento.mes_referencia})</>}
              .
            </span>
          </div>
        </div>
      )}

      {!isEdit && (
        <div className="flex items-center gap-3">
          <Switch checked={form.ativo !== false} onCheckedChange={v => handleChange('ativo', v)} />
          <Label>Funcionário ativo</Label>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <p className="text-sm font-medium">Comissões</p>
        <div className="flex items-center gap-3">
          <Switch checked={form.apto_comissao === true} onCheckedChange={v => handleChange('apto_comissao', v)} />
          <Label className="text-sm">Apto para receber comissão</Label>
        </div>
        {!form.apto_comissao && (
          <div>
            <Label className="text-xs text-muted-foreground">Data programada para início da comissão</Label>
            <Input type="date" value={form.data_inicio_comissao || ''} onChange={e => handleChange('data_inicio_comissao', e.target.value)} />
            {comissaoAtivaByData && <p className="text-xs text-amber-600 mt-1">⚠️ A data programada já passou — considere marcar como apto manualmente.</p>}
            {form.data_inicio_comissao && !comissaoAtivaByData && <p className="text-xs text-blue-600 mt-1">ℹ️ Funcionário passará a receber comissão em {form.data_inicio_comissao}.</p>}
          </div>
        )}
      </div>
    </div>
  );

  const renderDocumentos = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>CPF</Label><Input value={form.cpf || ''} onChange={e => handleChange('cpf', e.target.value)} placeholder="000.000.000-00" /></div>
        <div><Label>PIS / PASEP</Label><Input value={form.pis || ''} onChange={e => handleChange('pis', e.target.value)} placeholder="000.00000.00-0" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1"><Label>RG</Label><Input value={form.rg || ''} onChange={e => handleChange('rg', e.target.value)} placeholder="Número" /></div>
        <div><Label>Órgão Emissor</Label><Input value={form.rg_orgao || ''} onChange={e => handleChange('rg_orgao', e.target.value)} placeholder="SSP" /></div>
        <div><Label>UF</Label><Input value={form.rg_uf || ''} onChange={e => handleChange('rg_uf', e.target.value)} placeholder="SP" maxLength={2} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>CTPS</Label><Input value={form.ctps || ''} onChange={e => handleChange('ctps', e.target.value)} placeholder="Número" /></div>
        <div><Label>Série CTPS</Label><Input value={form.ctps_serie || ''} onChange={e => handleChange('ctps_serie', e.target.value)} placeholder="Série" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Título de Eleitor</Label><Input value={form.titulo_eleitor || ''} onChange={e => handleChange('titulo_eleitor', e.target.value)} /></div>
        <div><Label>CNH</Label><Input value={form.cnh || ''} onChange={e => handleChange('cnh', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Certificado Reservista</Label><Input value={form.reservista || ''} onChange={e => handleChange('reservista', e.target.value)} /></div>
        <div><Label>Nacionalidade</Label><Input value={form.nacionalidade || 'brasileiro(a)'} onChange={e => handleChange('nacionalidade', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Naturalidade (cidade/UF)</Label><Input value={form.naturalidade || ''} onChange={e => handleChange('naturalidade', e.target.value)} placeholder="São Paulo/SP" /></div>
        <div>
          <Label>Estado Civil</Label>
          <Select value={form.estado_civil || ''} onValueChange={v => handleChange('estado_civil', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {['solteiro(a)', 'casado(a)', 'divorciado(a)', 'viúvo(a)', 'união estável'].map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Gênero</Label>
          <Select value={form.genero || ''} onValueChange={v => handleChange('genero', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {['masculino', 'feminino', 'não informar'].map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Nome da Mãe</Label><Input value={form.nome_mae || ''} onChange={e => handleChange('nome_mae', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nível de Instrução</Label>
          <Select value={form.nivel_instrucao || ''} onValueChange={v => handleChange('nivel_instrucao', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {['analfabeto', 'fundamental incompleto', 'fundamental completo', 'médio incompleto', 'médio completo', 'superior incompleto', 'superior completo', 'pós-graduação', 'mestrado', 'doutorado'].map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={form.pcd === true} onCheckedChange={v => handleChange('pcd', v)} />
          <Label>PCD (deficiência)</Label>
        </div>
      </div>
    </div>
  );

  const renderEndereco = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div><Label>CEP</Label><Input value={form.cep || ''} onChange={e => handleChange('cep', e.target.value)} placeholder="00000-000" /></div>
        <div className="col-span-2"><Label>Logradouro</Label><Input value={form.logradouro || ''} onChange={e => handleChange('logradouro', e.target.value)} placeholder="Rua, Av, etc." /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Número</Label><Input value={form.numero || ''} onChange={e => handleChange('numero', e.target.value)} placeholder="Nº" /></div>
        <div><Label>Complemento</Label><Input value={form.complemento || ''} onChange={e => handleChange('complemento', e.target.value)} placeholder="Apto, Bloco" /></div>
        <div><Label>Bairro</Label><Input value={form.bairro || ''} onChange={e => handleChange('bairro', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Cidade</Label><Input value={form.cidade || ''} onChange={e => handleChange('cidade', e.target.value)} /></div>
        <div><Label>UF</Label><Input value={form.uf || ''} onChange={e => handleChange('uf', e.target.value)} placeholder="SP" maxLength={2} /></div>
      </div>
    </div>
  );

  const renderBancario = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div><Label>Banco</Label><Input value={form.banco || ''} onChange={e => handleChange('banco', e.target.value)} placeholder="Código" /></div>
        <div><Label>Agência</Label><Input value={form.agencia || ''} onChange={e => handleChange('agencia', e.target.value)} placeholder="0000" /></div>
        <div><Label>Dígito</Label><Input value={form.agencia_dv || ''} onChange={e => handleChange('agencia_dv', e.target.value)} placeholder="0" maxLength={1} /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1"><Label>Conta</Label><Input value={form.conta || ''} onChange={e => handleChange('conta', e.target.value)} placeholder="00000-0" /></div>
        <div><Label>Dígito</Label><Input value={form.conta_dv || ''} onChange={e => handleChange('conta_dv', e.target.value)} placeholder="0" maxLength={1} /></div>
        <div>
          <Label>Tipo</Label>
          <Select value={form.tipo_conta || ''} onValueChange={v => handleChange('tipo_conta', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {['corrente', 'poupança', 'salário'].map(o => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Chave PIX</Label><Input value={form.chave_pix || ''} onChange={e => handleChange('chave_pix', e.target.value)} placeholder="CPF, email, telefone ou chave aleatória" /></div>
    </div>
  );

  const renderDependentes = () => {
    const dependentes = form.dependentes || [];
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Registre os dependentes para fins de IRRF (imposto de renda).</p>

        {/* Novo dependente */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Adicionar Dependente</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label>
              <Input value={novoDependente.nome} onChange={e => setNovoDependente(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div><Label>CPF</Label>
              <Input value={novoDependente.cpf} onChange={e => setNovoDependente(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data de Nascimento</Label>
              <Input type="date" value={novoDependente.data_nascimento} onChange={e => setNovoDependente(p => ({ ...p, data_nascimento: e.target.value }))} />
            </div>
            <div><Label>Parentesco</Label>
              <Select value={novoDependente.parentesco} onValueChange={v => setNovoDependente(p => ({ ...p, parentesco: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PARENTESCOS.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="button" size="sm" onClick={adicionarDependente} disabled={!novoDependente.nome.trim()}>
            <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
          </Button>
        </div>

        {/* Lista */}
        {dependentes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum dependente cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {dependentes.map(d => (
              <div key={d.id} className="flex items-center gap-3 border rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.parentesco}{d.cpf ? ` · ${d.cpf}` : ''}{d.data_nascimento ? ` · ${d.data_nascimento}` : ''}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removerDependente(d.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderBeneficios = () => (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={form.vale_transporte === true} onCheckedChange={v => handleChange('vale_transporte', v)} />
          <Label>Vale Transporte</Label>
        </div>
        {form.vale_transporte && (
          <div>
            <Label className="text-xs text-muted-foreground">Valor da contribuição do funcionário (opcional)</Label>
            <Input type="number" step="0.01" min="0" value={form.vale_transporte_valor || ''} onChange={e => handleChange('vale_transporte_valor', e.target.value)} placeholder="0,00" />
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={form.vale_refeicao === true} onCheckedChange={v => handleChange('vale_refeicao', v)} />
          <Label>Vale Refeição / Alimentação</Label>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <Label>Plano de Saúde</Label>
        <Select value={form.plano_saude || ''} onValueChange={v => handleChange('plano_saude', v)}>
          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
          <SelectContent>
            {['Nenhum', 'Unimed', 'Amil', 'Bradesco', 'SulAmérica', 'NotreDame', 'Outro'].map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={form.plano_odontologico === true} onCheckedChange={v => handleChange('plano_odontologico', v)} />
          <Label>Plano Odontológico</Label>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={form.seguro_vida === true} onCheckedChange={v => handleChange('seguro_vida', v)} />
          <Label>Seguro de Vida</Label>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TabNav />

          {tab === 'cadastro' && renderCadastro()}
          {tab === 'documentos' && renderDocumentos()}
          {tab === 'endereco' && renderEndereco()}
          {tab === 'bancario' && renderBancario()}
          {tab === 'dependentes' && renderDependentes()}
          {tab === 'beneficios' && renderBeneficios()}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Modal de Demissão */}
      <Dialog open={showDemitir} onOpenChange={setShowDemitir}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="w-5 h-5" />Demitir Funcionário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Confirme os dados da demissão de <strong>{form.nome}</strong>.
            </p>
            <div>
              <Label>Data da Demissão *</Label>
              <Input type="date" max={hojeStr} value={demitirForm.data_demissao} onChange={e => setDemitirForm(p => ({ ...p, data_demissao: e.target.value }))} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Select value={demitirForm.motivo_demissao} onValueChange={v => setDemitirForm(p => ({ ...p, motivo_demissao: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {['Pediu demissão', 'Dispensa sem justa causa', 'Dispensa por justa causa', 'Término de contrato', 'Aposentadoria', 'Acordo entre as partes', 'Falecimento', 'Outro'].map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {demitirForm.motivo_demissao === 'Outro' && (
              <div>
                <Label>Descreva o motivo</Label>
                <Input value={demitirForm.motivo_demissao} onChange={e => setDemitirForm(p => ({ ...p, motivo_demissao: e.target.value }))} placeholder="Especifique..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDemitir(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDemissao} disabled={!demitirForm.data_demissao}>
              Confirmar Demissão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recontratação */}
      <Dialog open={showRecontratar} onOpenChange={setShowRecontratar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />Recontratar Funcionário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Confirme a recontratação de <strong>{form.nome}</strong>.
            </p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Um novo período aquisitivo de férias será iniciado. O contrato anterior permanecerá no histórico.
            </p>
            <div>
              <Label>Nova Data de Admissão *</Label>
              <Input type="date" max={hojeStr} value={recontratarData} onChange={e => setRecontratarData(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecontratar(false)}>Cancelar</Button>
            <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => {
              if (!recontratarData) { toast.error('Informe a nova data de admissão'); return; }
              confirmRecontratar(recontratarData);
            }}>
              Confirmar Recontratação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
