import React, { useState, useMemo } from 'react';
import { client } from '@/api/client';
import { registrarAuditoria } from '@/lib/audit';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, Loader2, AlertTriangle, TrendingUp, Layers } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { TIPO_LABELS, formatCurrency, parseDateLocal, getMesRef } from '@/lib/formatters';
import { toast } from 'sonner';

const TIPOS_DESCONTO_FORM = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];
const TIPOS_ADICIONAL_FORM = ['adicional', 'ajuste'];
const TIPO_COMISSAO = 'comissao';
const TIPOS_PARCELAVEIS = ['vale'];
const HARDCODED_KEYS = Object.keys(TIPO_LABELS);

const MESES = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const ANOS = Array.from({length: 20}, (_, i) => 2020 + i);

function calcularMesFim(mesInicio, anoInicio, totalParcelas) {
  if (!mesInicio || !anoInicio || !totalParcelas) return null;
  const idx = MESES.indexOf(mesInicio.toUpperCase());
  if (idx === -1) return null;
  const totalIdx = idx + Number(totalParcelas) - 1;
  const anoFim = Number(anoInicio) + Math.floor(totalIdx / 12);
  const mesFim = MESES[totalIdx % 12];
  return { mes: mesFim, ano: anoFim, label: `${mesFim}/${anoFim}` };
}

function fileToBase64(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve('');
      r.readAsDataURL(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const maxW = 300;
      const scale = Math.min(maxW / img.width, maxW / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve('');
    img.src = URL.createObjectURL(file);
  });
}

export default function LancamentoForm({ open, onClose, onSaved, funcionarios }) {
  const [form, setForm] = useState({
    funcionario_id: '', tipo_lancamento: '', valor: '', data_lancamento: new Date().toISOString().split('T')[0],
    descricao: '', comprovante: '', comprovante_data: '',
    // Consignado fields
    numero_contrato: '', instituicao_financeira: '', valor_emprestimo: '',
    valor_parcela: '', total_parcelas: '',
    data_inicio_contrato: '', data_fim_contrato: '',
    mes_inicio_desconto: '', ano_inicio_desconto: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [limiteAlert, setLimiteAlert] = useState(null);
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => client.entities.FichaFinanceira.list(),
  });

  const { data: tiposPersonalizados = [] } = useQuery({
    queryKey: ['tipos-lancamento'],
    queryFn: () => client.entities.TipoLancamento.list(),
  });

  const tiposDescontoMerge = useMemo(() => {
    const extras = tiposPersonalizados
      .filter(t => t.ativo !== false && t.categoria === 'desconto' && !HARDCODED_KEYS.includes(t.nome))
      .map(t => ({ value: t.nome, label: t.nome, cor: t.cor }));
    return [...TIPOS_DESCONTO_FORM, ...extras.map(e => e.value)];
  }, [tiposPersonalizados]);

  const tiposAdicionalMerge = useMemo(() => {
    const extras = tiposPersonalizados
      .filter(t => t.ativo !== false && t.categoria === 'adicional' && !HARDCODED_KEYS.includes(t.nome))
      .map(t => ({ value: t.nome, label: t.nome, cor: t.cor }));
    return [...TIPOS_ADICIONAL_FORM, ...extras.map(e => e.value)];
  }, [tiposPersonalizados]);

  const customTipoMap = useMemo(() => {
    const map = {};
    for (const t of tiposPersonalizados) {
      if (t.nome && !HARDCODED_KEYS.includes(t.nome)) {
        map[t.nome] = t;
      }
    }
    return map;
  }, [tiposPersonalizados]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await client.integrations.Core.UploadFile({ file });
      handleChange('comprovante', file_url);
      const b64 = await fileToBase64(file);
      handleChange('comprovante_data', b64);
    } catch (err) {
      toast.error('Erro ao fazer upload do comprovante');
    } finally {
      setUploading(false);
    }
  };

  // Calcula o aviso de limite em tempo real
  const limiteInfo = (() => {
    if (!['vale', 'adiantamento'].includes(form.tipo_lancamento)) return null;
    const func = funcionarios.find(f => f.id === form.funcionario_id);
    if (!func || func.limite_vales == null) return null;

    const dataLanc = parseDateLocal(form.data_lancamento);
    const mes = dataLanc.getMonth();
    const ano = dataLanc.getFullYear();

    const totalMes = lancamentos
      .filter(l =>
        l.funcionario_id === form.funcionario_id &&
        ['vale', 'adiantamento'].includes(l.tipo_lancamento) &&
        l.data_lancamento
      )
      .filter(l => {
        const d = parseDateLocal(l.data_lancamento);
        return d.getMonth() === mes && d.getFullYear() === ano;
      })
      .reduce((s, l) => s + (l.valor || 0), 0);

    const novoTotal = totalMes + Number(form.valor || 0);
    const percentual = Math.min((novoTotal / func.limite_vales) * 100, 100);

    return { totalMes, novoTotal, limite: func.limite_vales, percentual, ultrapassado: novoTotal > func.limite_vales };
  })();

  const checkLimite = () => {
    if (!limiteInfo) return null;
    if (limiteInfo.ultrapassado) return { tipo: 'ultrapassado', ...limiteInfo };
    if (limiteInfo.totalMes >= limiteInfo.limite) return { tipo: 'atingido', ...limiteInfo };
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.funcionario_id || !form.tipo_lancamento) return;

    if (form.tipo_lancamento === 'credito_consignado') {
      if (!form.valor_parcela || Number(form.valor_parcela) <= 0) return;
      if (!form.total_parcelas || Number(form.total_parcelas) < 1) return;
      if (!form.mes_inicio_desconto || !form.ano_inicio_desconto) return;
    } else {
      if (!form.valor || Number(form.valor) <= 0) return;
    }

    const func = funcionarios.find(f => f.id === form.funcionario_id);
    if (func && func.ativo === false) {
      setLimiteAlert({ tipo: 'inativo' });
      return;
    }

    const limiteCheck = checkLimite();
    if (limiteCheck) {
      setLimiteAlert(limiteCheck);
      return;
    }

    await salvar();
  };

  const salvar = async () => {
    setSaving(true);
    const func = funcionarios.find(f => f.id === form.funcionario_id);

    if (form.tipo_lancamento === 'credito_consignado') {
      const mesIdx = MESES.indexOf(form.mes_inicio_desconto);
      const anoInicio = Number(form.ano_inicio_desconto);
      const totalParc = Number(form.total_parcelas || 0);
      const valorParcela = Number(form.valor_parcela);

      const fim = calcularMesFim(form.mes_inicio_desconto, form.ano_inicio_desconto, form.total_parcelas);

      // Cria TODOS os lançamentos na FichaFinanceira primeiro
      const fichaIds = [];
      const hoje = new Date();
      let passadas = 0;
      for (let i = 0; i < totalParc; i++) {
        const mesAtual = (mesIdx + i) % 12;
        const anoAtual = anoInicio + Math.floor((mesIdx + i) / 12);
        const dataLanc = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`;
        const payloadFF = {
          funcionario_id: form.funcionario_id,
          funcionario_nome: func?.nome || '',
          tipo_lancamento: 'credito_consignado',
          valor: valorParcela,
          data_lancamento: dataLanc,
          descricao: form.descricao || `Consignado — ${form.numero_contrato || ''} ${form.instituicao_financeira || ''} — Parcela ${i + 1}/${totalParc}`,
          comprovante: form.comprovante,
          comprovante_data: form.comprovante_data,
        };
        const criado = await client.entities.FichaFinanceira.create(payloadFF);
        fichaIds.push(criado?.id);
        // Conta parcelas já vencidas (data <= hoje)
        if (new Date(dataLanc) <= hoje) passadas++;
      }

      const parcelasPagasInicial = Math.min(passadas, totalParc);

      // Cria contrato Consignado com parcelas_pagas = contagem das já vencidas
      const consignadoPayload = {
        funcionario_id: form.funcionario_id,
        funcionario_nome: func?.nome || '',
        numero_contrato: form.numero_contrato,
        instituicao_financeira: form.instituicao_financeira,
        valor_emprestimo: Number(form.valor_emprestimo || 0),
        valor_parcela: valorParcela,
        total_parcelas: totalParc,
        parcelas_pagas: parcelasPagasInicial,
        data_inicio_contrato: form.data_inicio_contrato,
        data_fim_contrato: form.data_fim_contrato,
        mes_inicio_desconto: `${form.mes_inicio_desconto}/${form.ano_inicio_desconto}`,
        mes_fim_desconto: fim?.label || '',
        ativo: parcelasPagasInicial < totalParc,
        descricao: form.descricao,
      };
      await client.entities.Consignado.create(consignadoPayload);

      await registrarAuditoria({
        acao: 'criar', modulo: 'consignado',
        descricao: `Consignado nº ${form.numero_contrato} — ${totalParc}x de R$ ${valorParcela.toFixed(2)} (${fim?.label}) — ${passadas} vencidas para ${func?.nome || 'funcionário'}`,
        dados_novos: { ...consignadoPayload, fichaFinanceiraIds: fichaIds },
      });
    } else if (parcelado && TIPOS_PARCELAVEIS.includes(form.tipo_lancamento) && numParcelas >= 2) {
      const valorParcela = Number((Number(form.valor) / numParcelas).toFixed(2));
      const dataBase = parseDateLocal(form.data_lancamento);
      for (let i = 0; i < numParcelas; i++) {
        const dataParcela = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate());
        const dataStr = dataParcela.toISOString().split('T')[0];
        const descricao = `${form.descricao ? form.descricao + ' — ' : ''}Parcela ${i + 1}/${numParcelas}`;
        const payload = { ...form, tipo_lancamento: 'vale_parcelado', valor: valorParcela, data_lancamento: dataStr, descricao, funcionario_nome: func?.nome || '' };
        const criado = await client.entities.FichaFinanceira.create(payload);
        await registrarAuditoria({
          acao: 'criar', modulo: 'lancamento', entidade_id: criado?.id,
          descricao: `Vale parcelado ${i + 1}/${numParcelas} de R$ ${valorParcela.toFixed(2)} para ${func?.nome || 'funcionário'}`,
          dados_novos: payload,
        });
      }
    } else {
      const payload = { ...form, valor: Number(form.valor), funcionario_nome: func?.nome || '' };
      const criado = await client.entities.FichaFinanceira.create(payload);
      await registrarAuditoria({
        acao: 'criar', modulo: 'lancamento', entidade_id: criado?.id,
        descricao: `Lançamento de "${form.tipo_lancamento}" no valor de R$ ${Number(form.valor).toFixed(2)} para ${func?.nome || 'funcionário'}`,
        dados_novos: payload,
      });
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const ativosOnly = funcionarios.filter(f => f.ativo !== false && !f.data_demissao).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Funcionário *</Label>
              <Select value={form.funcionario_id} onValueChange={v => handleChange('funcionario_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ativosOnly.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo_lancamento} onValueChange={v => handleChange('tipo_lancamento', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Descontos</div>
                  {tiposDescontoMerge.filter(k => k !== 'credito_consignado').map(k => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        {customTipoMap[k]?.cor && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: customTipoMap[k].cor }} />}
                        {TIPO_LABELS[k] || k}
                      </span>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">Consignado</div>
                  <SelectItem value="credito_consignado">
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      {TIPO_LABELS.credito_consignado}
                    </span>
                  </SelectItem>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">Adicionais</div>
                  {tiposAdicionalMerge.map(k => (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        {customTipoMap[k]?.cor && <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: customTipoMap[k].cor }} />}
                        {TIPO_LABELS[k] || k}
                      </span>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">Comissão</div>
                  <SelectItem value={TIPO_COMISSAO}>
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      {TIPO_LABELS.comissao}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Comissão: campo extra de referência/percentual */}
            {form.tipo_lancamento === TIPO_COMISSAO && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Lançamento de Comissão
                </p>
                <p className="text-xs text-emerald-600">Informe o valor da comissão a ser creditada ao funcionário. Use a descrição para detalhar a base de cálculo ou período.</p>
              </div>
            )}

            {/* Valor e Data — ocultos para consignado (usa campos do contrato) */}
            {form.tipo_lancamento !== 'credito_consignado' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.valor}
                    onChange={e => handleChange('valor', e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.data_lancamento} onChange={e => handleChange('data_lancamento', e.target.value)} required />
                </div>
              </div>
            )}

            {/* Parcelamento — apenas para vale */}
            {form.tipo_lancamento === 'vale' && TIPOS_PARCELAVEIS.includes(form.tipo_lancamento) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="parcelado"
                    checked={parcelado}
                    onCheckedChange={v => setParcelado(!!v)}
                  />
                  <label htmlFor="parcelado" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    Parcelar vale
                  </label>
                </div>
                {parcelado && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Label className="text-xs">Número de parcelas</Label>
                        <Select value={String(numParcelas)} onValueChange={v => setNumParcelas(Number(v))}>
                          <SelectTrigger className="mt-1 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Valor por parcela</Label>
                        <div className="mt-1 h-8 flex items-center px-3 rounded-md border border-input bg-muted/40 text-sm font-medium">
                          {form.valor && Number(form.valor) > 0
                            ? `R$ ${(Number(form.valor) / numParcelas).toFixed(2)}`
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700">
                      Serão criados <strong>{numParcelas} lançamentos</strong>, um por mês a partir da data informada.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Crédito Consignado — campos do contrato */}
            {form.tipo_lancamento === 'credito_consignado' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Dados do Contrato Consignado
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Nº do Contrato</Label>
                    <Input value={form.numero_contrato} onChange={e => handleChange('numero_contrato', e.target.value)} placeholder="Ex: 000592353905" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Instituição Financeira</Label>
                    <Input value={form.instituicao_financeira} onChange={e => handleChange('instituicao_financeira', e.target.value)} placeholder="Ex: 389 - BANCO MERCANTIL DO BRASIL S A" />
                  </div>
                  <div>
                    <Label className="text-xs">Valor do Empréstimo</Label>
                    <Input type="number" step="0.01" value={form.valor_emprestimo} onChange={e => handleChange('valor_emprestimo', e.target.value)} placeholder="0,00" />
                  </div>
                  <div>
                    <Label className="text-xs">Valor da Parcela *</Label>
                    <Input type="number" step="0.01" value={form.valor_parcela} onChange={e => handleChange('valor_parcela', e.target.value)} placeholder="0,00" required />
                  </div>
                  <div>
                    <Label className="text-xs">Total de Parcelas</Label>
                    <Input type="number" min="1" value={form.total_parcelas} onChange={e => handleChange('total_parcelas', e.target.value)} placeholder="Ex: 36" />
                  </div>
                  <div>
                    <Label className="text-xs">Mês Início do Desconto *</Label>
                    <div className="flex gap-1">
                      <Select value={form.mes_inicio_desconto} onValueChange={v => handleChange('mes_inicio_desconto', v)}>
                        <SelectTrigger className="w-24"><SelectValue placeholder="Mês" /></SelectTrigger>
                        <SelectContent>
                          {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={form.ano_inicio_desconto} onValueChange={v => handleChange('ano_inicio_desconto', v)}>
                        <SelectTrigger className="w-24"><SelectValue placeholder="Ano" /></SelectTrigger>
                        <SelectContent>
                          {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Início do Contrato</Label>
                    <Input type="date" value={form.data_inicio_contrato} onChange={e => handleChange('data_inicio_contrato', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fim do Contrato</Label>
                    <Input type="date" value={form.data_fim_contrato} onChange={e => handleChange('data_fim_contrato', e.target.value)} />
                  </div>
                </div>

                {/* Resumo auto-calculado */}
                {(() => {
                  const fim = calcularMesFim(form.mes_inicio_desconto, form.ano_inicio_desconto, form.total_parcelas);
                  const parcela = Number(form.valor_parcela || 0);
                  const totalParcelas = Number(form.total_parcelas || 0);
                  if (!fim || !parcela || !totalParcelas) return null;
                  return (
                    <div className="bg-purple-100/50 rounded-lg px-3 py-2 text-xs space-y-0.5">
                      <p className="font-medium text-purple-800">
                        {totalParcelas}x de {formatCurrency(parcela)}
                        <span className="text-purple-600"> — Total: {formatCurrency(parcela * totalParcelas)}</span>
                      </p>
                      <p className="text-purple-600">
                        De {form.mes_inicio_desconto}/{form.ano_inicio_desconto} a {fim.label}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Aviso de limite em tempo real */}
            {limiteInfo && form.valor && Number(form.valor) > 0 && (
              <div className={`rounded-lg p-3 border text-sm ${limiteInfo.ultrapassado ? 'bg-red-50 border-red-300 text-red-700' : limiteInfo.percentual >= 80 ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">
                    {limiteInfo.ultrapassado
                      ? 'Limite ultrapassado!'
                      : limiteInfo.percentual >= 80
                        ? 'Atenção: próximo do limite'
                        : 'Limite de vales'}
                  </span>
                </div>
                <div className="w-full bg-white/60 rounded-full h-1.5 mb-1">
                  <div
                    className={`h-1.5 rounded-full transition-all ${limiteInfo.ultrapassado ? 'bg-red-500' : limiteInfo.percentual >= 80 ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(limiteInfo.percentual, 100)}%` }}
                  />
                </div>
                <p className="text-xs">
                  Já utilizado: <strong>{formatCurrency(limiteInfo.totalMes)}</strong> | Com este lançamento: <strong>{formatCurrency(limiteInfo.novoTotal)}</strong> | Limite: <strong>{formatCurrency(limiteInfo.limite)}</strong>
                </p>
              </div>
            )}

            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={e => handleChange('descricao', e.target.value)} placeholder={form.tipo_lancamento === TIPO_COMISSAO ? 'Ex: Comissão sobre vendas de abril — base R$ 10.000' : 'Descrição opcional...'} rows={2} />
            </div>

            <div>
              <Label>Comprovante</Label>
              <Input type="file" accept="image/*,.pdf" onChange={handleFile} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Enviando...</p>}
              {form.comprovante && <p className="text-xs text-green-600 mt-1">Arquivo anexado</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving || uploading}>
                {(saving || uploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {uploading ? 'Enviando comprovante...' : 'Lançar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!limiteAlert} onOpenChange={() => setLimiteAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {limiteAlert?.tipo === 'inativo' ? 'Funcionário Inativo' : 'Limite de Vales/Adiantamentos'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {limiteAlert?.tipo === 'inativo' && 'Não é possível lançar para funcionário inativo.'}
              {limiteAlert?.tipo === 'atingido' && `O funcionário já atingiu o limite mensal de ${formatCurrency(limiteAlert.limite)}. Total atual: ${formatCurrency(limiteAlert.totalMes)}.`}
              {limiteAlert?.tipo === 'ultrapassado' && `Limite mensal ultrapassado. Limite: ${formatCurrency(limiteAlert.limite)}. Com este lançamento o total será: ${formatCurrency(limiteAlert.novoTotal)}. Deseja continuar mesmo assim?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {limiteAlert?.tipo !== 'inativo' && (
              <AlertDialogAction onClick={salvar}>Continuar mesmo assim</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}