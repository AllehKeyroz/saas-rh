import React, { useState, useMemo, useEffect } from 'react';
import { client } from '@/api/client';
import { registrarAuditoria } from '@/lib/audit';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Loader2, Calculator, Info } from 'lucide-react';
import { formatCurrency, LIMITE_PERCENTUAL } from '@/lib/formatters';
import { toast } from 'sonner';
import { getCurrentTenantId } from '@/firebase/auth';

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

export default function FuncionarioForm({ open, onClose, funcionario, onSaved }) {
  const isEdit = !!funcionario;
  const hojeStr = getHojeStrBR()
  const [form, setForm] = useState(funcionario || {
    nome: '', email: '', telefone: '', funcao: '', setor: '', data_admissao: '', data_demissao: '', data_nascimento: '', salario_base: '', limite_vales: '', ativo: true, foto: '', apto_comissao: false, data_inicio_comissao: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  // Busca último fechamento do funcionário (para cálculo do limite 40%)
  const { data: fechamentos = [] } = useQuery({
    queryKey: ['fechamentos_limite', funcionario?.id],
    queryFn: () => client.entities.FechamentoMensal.filter({ funcionario_id: funcionario.id }),
    enabled: isEdit,
  });

  const ultimoFechamento = useMemo(() => {
    if (!fechamentos.length) return null;
    return [...fechamentos].sort((a, b) => (b.mes_referencia || '').localeCompare(a.mes_referencia || ''))[0];
  }, [fechamentos]);

  // Busca comissão do último mês fechado
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

  // Busca lançamentos do mês atual para mostrar uso do limite
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

  // Cálculo do limite
  const salarioBaseCalc = Number(form.salario_base) || 0;
  const baseCalculoLimite = salarioBaseCalc + comissaoUltimoMes;
  const limiteCalculado = baseCalculoLimite * (LIMITE_PERCENTUAL / 100);

  // Auto-preenche o limite sempre (a menos que o RH tenha editado manualmente)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dados = {
      ...form,
      salario_base: form.salario_base ? Number(form.salario_base) : null,
      limite_vales: form.limite_vales ? Number(form.limite_vales) : null,
      ativo: form.data_demissao ? false : form.ativo,
    }

    const erros = validar({ ...dados, salario_base: dados.salario_base || '' })
    setErrors(erros)
    if (Object.keys(erros).length > 0) return

    setSaving(true);
    const data = {
      ...form,
      salario_base: form.salario_base ? Number(form.salario_base) : null,
      limite_vales: form.limite_vales ? Number(form.limite_vales) : null,
      // Se preencheu data de demissão, marca como inativo automaticamente
      ativo: form.data_demissao ? false : form.ativo,
    };
    if (isEdit) {
      await client.entities.Funcionarios.update(funcionario.id, data);
      await registrarAuditoria({
        acao: 'editar',
        modulo: 'funcionario',
        entidade_id: funcionario.id,
        descricao: `Funcionário "${data.nome}" atualizado`,
        dados_anteriores: funcionario,
        dados_novos: data,
      });
    } else {
      const criado = await client.entities.Funcionarios.create(data);
      // Cria convite automaticamente se tiver email
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
        acao: 'criar',
        modulo: 'funcionario',
        entidade_id: criado?.id,
        descricao: `Funcionário "${data.nome}" cadastrado`,
        dados_novos: data,
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Demissão</Label>
              <Input type="date" max={hojeStr} value={form.data_demissao || ''} onChange={e => handleChange('data_demissao', e.target.value)} />
              {errors.data_demissao && <p className="text-xs text-destructive mt-1">{errors.data_demissao}</p>}
              {form.data_demissao && !errors.data_demissao && (
                <p className="text-xs text-amber-600 mt-1">Funcionário será marcado como inativo</p>
              )}
            </div>
          </div>

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
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentualUso >= 100 ? 'bg-red-500' : percentualUso >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(percentualUso, 100)}%` }}
                    />
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
                  . Preencha o campo ao lado para definir ou deixe em branco para sem limite.
                </span>
              </div>
            </div>
          )}

          {!form.data_demissao && (
            <div className="flex items-center gap-3">
              <Switch checked={form.ativo !== false} onCheckedChange={v => handleChange('ativo', v)} />
              <Label>Funcionário ativo</Label>
            </div>
          )}

          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Comissões</p>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.apto_comissao === true}
                onCheckedChange={v => handleChange('apto_comissao', v)}
              />
              <Label className="text-sm">Apto para receber comissão</Label>
            </div>
            {!form.apto_comissao && (
              <div>
                <Label className="text-xs text-muted-foreground">Data programada para início da comissão</Label>
                <Input
                  type="date"
                  value={form.data_inicio_comissao || ''}
                  onChange={e => handleChange('data_inicio_comissao', e.target.value)}
                />
                {comissaoAtivaByData && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ A data programada já passou — considere marcar como apto manualmente.</p>
                )}
                {form.data_inicio_comissao && !comissaoAtivaByData && (
                  <p className="text-xs text-blue-600 mt-1">ℹ️ Funcionário passará a receber comissão em {form.data_inicio_comissao}.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}