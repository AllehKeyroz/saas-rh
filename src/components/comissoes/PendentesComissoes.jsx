import React, { useMemo, useState } from 'react';
import { client } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
import { formatPeriodo, publicarComissao } from '@/lib/comissoes';
import { AlertTriangle, Calendar, CheckCircle2, Clock, Loader2, Pencil, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

function resumoDaComissao(comissao) {
  const registros = comissao?.rascunho?.registros || [];
  const aptos = registros.filter(r => r.apto);
  const excluidos = registros.filter(r => !r.apto);
  const porSetor = {};
  aptos.forEach(r => {
    const setor = r.setor || 'Sem setor';
    porSetor[setor] = (porSetor[setor] || 0) + (r.valor_individual_final ?? r.valor_individual ?? 0);
  });

  return {
    total: comissao?.valor_total_periodo || 0,
    retido: comissao?.valor_empresa || 0,
    distribuido: aptos.reduce((s, r) => s + (r.valor_individual_final ?? r.valor_individual ?? 0), 0),
    aptos: aptos.length,
    excluidos: excluidos.length,
    excluidosLista: excluidos.map(r => ({
      nome: r.funcionario_nome,
      motivo: r.motivo_exclusao || 'Ausente no período',
    })),
    setores: Object.entries(porSetor).sort((a, b) => b[1] - a[1]),
    avisos: comissao?.rascunho?.avisos || {},
    creditosGerados: comissao?.rascunho?.creditos_gerados || [],
    creditosUsados: comissao?.rascunho?.creditos_usados || [],
    debitos: comissao?.debitos || comissao?.rascunho?.debitos || [],
  };
}

function AvisoRascunho({ resumo }) {
  const semAptos = resumo.avisos.setores_sem_aptos || [];
  const outros = resumo.avisos.outros || [];
  if (semAptos.length === 0 && outros.length === 0) return null;

  return (
    <div className="space-y-2">
      {semAptos.length > 0 && (
        <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Setor(es) sem ninguém apto — valor redistribuído:{' '}
            <strong>{semAptos.map(s => `${s.setor} (${formatCurrency(s.valor || 0)})`).join(', ')}</strong>.
          </span>
        </div>
      )}
      {outros.length > 0 && (
        <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-xs text-yellow-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>{outros.length}</strong> funcionário(s) sem setor mapeado foram agrupados em "Outros":{' '}
            {outros.map(o => o.nome).join(', ')}.
          </span>
        </div>
      )}
    </div>
  );
}

function CreditosRascunho({ resumo }) {
  const gerados = resumo.creditosGerados || [];
  const usados = resumo.creditosUsados || [];
  const debitos = resumo.debitos || [];
  if (gerados.length === 0 && usados.length === 0 && debitos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {gerados.map((c, i) => (
        <span key={`gerado-${i}`} className="text-amber-700">
          + Crédito gerado: <strong>{c.setor_nome}</strong> {formatCurrency(c.valor || 0)}
        </span>
      ))}
      {usados.map((c, i) => (
        <span key={`usado-${i}`} className="text-emerald-700">
          Crédito usado: <strong>{c.setor_nome}</strong> {formatCurrency(c.valor || 0)}
        </span>
      ))}
      {debitos.map((d, i) => (
        <span key={`debito-${i}`} className="text-red-700">
          Débito: <strong>{d.setor_nome || 'Setor'}</strong> {formatCurrency(d.valor || 0)}
          {d.observacao ? ` — ${d.observacao}` : ''}
        </span>
      ))}
    </div>
  );
}

export default function PendentesComissoes({ pendentes = [], onRefresh, onEditar }) {
  const [selecionados, setSelecionados] = useState([]);
  const [revisao, setRevisao] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [excluindo, setExcluindo] = useState(null);

  const ordenadas = useMemo(
    () => [...pendentes].sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || '')),
    [pendentes]
  );

  const todosSelecionados = ordenadas.length > 0 && selecionados.length === ordenadas.length;

  const toggle = (id) => {
    setSelecionados(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleTodos = () => {
    setSelecionados(todosSelecionados ? [] : ordenadas.map(c => c.id));
  };

  const handleExcluir = async (comissao) => {
    const ok = window.confirm(
      `Excluir o rascunho de ${formatPeriodo(comissao.periodo_inicio, comissao.periodo_fim)}? Esta ação não pode ser desfeita.`
    );
    if (!ok) return;
    setExcluindo(comissao.id);
    try {
      await client.entities.ComissoesGorjetas.delete(comissao.id);
      setSelecionados(prev => prev.filter(x => x !== comissao.id));
      toast.success('Rascunho excluído.');
      await onRefresh?.();
    } catch (e) {
      toast.error(e?.message || 'Erro ao excluir rascunho');
    } finally {
      setExcluindo(null);
    }
  };

  const handlePublicar = async () => {
    const lista = revisao || [];
    if (lista.length === 0) return;
    setPublicando(true);
    let publicadas = 0;
    try {
      for (const comissao of lista) {
        await publicarComissao(comissao);
        publicadas += 1;
      }
      toast.success(publicadas === 1 ? 'Comissão publicada!' : `${publicadas} comissões publicadas!`);
      setSelecionados([]);
      setRevisao(null);
      await onRefresh?.();
    } catch (e) {
      toast.error(`Publicadas ${publicadas} de ${lista.length}. Erro: ${e?.message || e}`);
      await onRefresh?.();
    } finally {
      setPublicando(false);
    }
  };

  if (ordenadas.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium">Nenhuma comissão pendente.</p>
        <p className="text-sm mt-1">Ao lançar uma comissão, salve como pendente para conferir antes de publicar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <strong>{ordenadas.length}</strong> lançamento(s) aguardando conferência. Publicar move a comissão para o
          histórico e para a ficha dos funcionários.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleTodos}>
            {todosSelecionados ? 'Desmarcar todas' : 'Selecionar todas'}
          </Button>
          <Button
            size="sm"
            disabled={selecionados.length === 0}
            onClick={() => setRevisao(ordenadas.filter(c => selecionados.includes(c.id)))}
          >
            <Send className="w-4 h-4 mr-2" />
            Publicar selecionadas ({selecionados.length})
          </Button>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        {ordenadas.map(comissao => {
          const resumo = resumoDaComissao(comissao);
          return (
            <Card key={comissao.id} className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Checkbox
                      checked={selecionados.includes(comissao.id)}
                      onCheckedChange={() => toggle(comissao.id)}
                      aria-label={`Selecionar comissão ${formatPeriodo(comissao.periodo_inicio, comissao.periodo_fim)}`}
                    />
                    <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">{formatPeriodo(comissao.periodo_inicio, comissao.periodo_fim)}</span>
                    <span className="text-muted-foreground font-normal text-xs">— {comissao.mes_referencia}</span>
                  </span>
                  <Badge variant="outline" className="text-amber-700 border-amber-300 shrink-0">
                    <Clock className="w-3 h-3 mr-1" />Pendente
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Total gorjetas</p>
                    <p className="font-bold">{formatCurrency(resumo.total)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">A distribuir</p>
                    <p className="font-semibold text-green-700">{formatCurrency(resumo.distribuido)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Aptos</p>
                    <p className="font-semibold">{resumo.aptos}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Excluídos</p>
                    <p className="font-semibold text-red-600">{resumo.excluidos}</p>
                  </div>
                </div>

                <AvisoRascunho resumo={resumo} />
                <CreditosRascunho resumo={resumo} />

                {comissao.observacao && (
                  <p className="text-xs text-muted-foreground italic">"{comissao.observacao}"</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setRevisao([comissao])}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Conferir e publicar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onEditar?.(comissao)}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Editar / reprocessar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    disabled={excluindo === comissao.id}
                    onClick={() => handleExcluir(comissao)}
                  >
                    {excluindo === comissao.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!revisao} onOpenChange={(open) => { if (!open && !publicando) setRevisao(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {revisao?.length === 1 ? 'Publicar comissão' : `Publicar ${revisao?.length || 0} comissões`}
            </DialogTitle>
            <DialogDescription>
              Confira o resumo abaixo. Ao publicar, os valores vão para o histórico e para a ficha dos
              funcionários — depois disso a comissão não pode mais ser editada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {(revisao || []).map(comissao => {
              const resumo = resumoDaComissao(comissao);
              return (
                <div key={comissao.id} className="border rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">
                      {formatPeriodo(comissao.periodo_inicio, comissao.periodo_fim)}
                      <span className="text-muted-foreground font-normal"> · {comissao.mes_referencia}</span>
                    </span>
                    <span className="font-bold">{formatCurrency(resumo.total)}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">A distribuir</p>
                      <p className="font-semibold text-green-700">{formatCurrency(resumo.distribuido)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Retido (empresa)</p>
                      <p className="font-semibold text-slate-500">{formatCurrency(resumo.retido)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Aptos</p>
                      <p className="font-semibold">{resumo.aptos}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Excluídos</p>
                      <p className="font-semibold text-red-600">{resumo.excluidos}</p>
                    </div>
                  </div>

                  {resumo.setores.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {resumo.setores.map(([setor, valor]) => (
                        <span key={setor}>
                          {setor}: <strong className="text-foreground">{formatCurrency(valor)}</strong>
                        </span>
                      ))}
                    </div>
                  )}

                  <AvisoRascunho resumo={resumo} />
                  <CreditosRascunho resumo={resumo} />

                  {resumo.excluidosLista.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-2 space-y-1">
                      {resumo.excluidosLista.map((e, i) => (
                        <div key={`${e.nome}-${i}`} className="flex justify-between gap-2 text-xs">
                          <span className="text-red-800 font-medium">{e.nome}</span>
                          <span className="text-red-600">{e.motivo}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRevisao(null)} disabled={publicando}>
              Cancelar
            </Button>
            <Button onClick={handlePublicar} disabled={publicando}>
              {publicando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {publicando ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
