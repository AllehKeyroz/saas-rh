import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
import { TIPO_LABELS, formatCurrency } from '@/lib/formatters';

const TIPOS_DESCONTO_FORM = ['vale', 'adiantamento', 'convenio', 'consumo', 'credito_consignado'];
const TIPOS_ADICIONAL_FORM = ['adicional', 'ajuste'];
const TIPO_COMISSAO = 'comissao';
const TIPOS_PARCELAVEIS = ['vale', 'credito_consignado'];

export default function LancamentoForm({ open, onClose, onSaved, funcionarios }) {
  const [form, setForm] = useState({
    funcionario_id: '', tipo_lancamento: '', valor: '', data_lancamento: new Date().toISOString().split('T')[0],
    descricao: '', comprovante: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [limiteAlert, setLimiteAlert] = useState(null);
  const [parcelado, setParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos'],
    queryFn: () => base44.entities.FichaFinanceira.list(),
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    handleChange('comprovante', file_url);
    setUploading(false);
  };

  // Calcula o aviso de limite em tempo real
  const limiteInfo = (() => {
    if (!['vale', 'adiantamento'].includes(form.tipo_lancamento)) return null;
    const func = funcionarios.find(f => f.id === form.funcionario_id);
    if (!func || func.limite_vales == null) return null;

    const dataLanc = new Date(form.data_lancamento);
    const mes = dataLanc.getMonth();
    const ano = dataLanc.getFullYear();

    const totalMes = lancamentos
      .filter(l =>
        l.funcionario_id === form.funcionario_id &&
        ['vale', 'adiantamento'].includes(l.tipo_lancamento) &&
        l.data_lancamento
      )
      .filter(l => {
        const d = new Date(l.data_lancamento);
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
    if (!form.funcionario_id || !form.tipo_lancamento || !form.valor || Number(form.valor) <= 0) return;

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

    if (parcelado && TIPOS_PARCELAVEIS.includes(form.tipo_lancamento) && numParcelas >= 2) {
      const valorParcela = Number((Number(form.valor) / numParcelas).toFixed(2));
      const dataBase = new Date(form.data_lancamento);
      for (let i = 0; i < numParcelas; i++) {
        const dataParcela = new Date(dataBase.getFullYear(), dataBase.getMonth() + i, dataBase.getDate());
        const dataStr = dataParcela.toISOString().split('T')[0];
        const descricao = `${form.descricao ? form.descricao + ' — ' : ''}Parcela ${i + 1}/${numParcelas}`;
        const payload = { ...form, valor: valorParcela, data_lancamento: dataStr, descricao, funcionario_nome: func?.nome || '' };
        const criado = await base44.entities.FichaFinanceira.create(payload);
        await registrarAuditoria({
          acao: 'criar', modulo: 'lancamento', entidade_id: criado?.id,
          descricao: `Vale parcelado ${i + 1}/${numParcelas} de R$ ${valorParcela.toFixed(2)} para ${func?.nome || 'funcionário'}`,
          dados_novos: payload,
        });
      }
    } else {
      const payload = { ...form, valor: Number(form.valor), funcionario_nome: func?.nome || '' };
      const criado = await base44.entities.FichaFinanceira.create(payload);
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

  const ativosOnly = funcionarios.filter(f => f.ativo !== false && !f.data_demissao);

  // Separar tipos em grupos para o select
  const tiposDescontos = TIPOS_DESCONTO_FORM;
  const tiposAdicionais = TIPOS_ADICIONAL_FORM;

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
                  {tiposDescontos.filter(k => k !== 'credito_consignado').map(k => (
                    <SelectItem key={k} value={k}>{TIPO_LABELS[k]}</SelectItem>
                  ))}
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">Consignado</div>
                  <SelectItem value="credito_consignado">
                    <span className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      {TIPO_LABELS.credito_consignado}
                    </span>
                  </SelectItem>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-1">Adicionais</div>
                  {tiposAdicionais.map(k => (
                    <SelectItem key={k} value={k}>{TIPO_LABELS[k]}</SelectItem>
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

            {/* Opção de parcelamento — vale e crédito consignado */}
            {TIPOS_PARCELAVEIS.includes(form.tipo_lancamento) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="parcelado"
                    checked={parcelado}
                    onCheckedChange={v => setParcelado(!!v)}
                  />
                  <label htmlFor="parcelado" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    Parcelar {form.tipo_lancamento === 'credito_consignado' ? 'crédito consignado' : 'vale'}
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
                            {[2,3,4,5,6,8,10,12].map(n => (
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
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lançar
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