import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, CalendarClock, Users, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentTenantId } from '@/firebase/auth';
import { ESCALA_PRESETS, ehDiaFolga, rotuloEscala, getEscalaEfetiva } from '@/lib/escalaFolga';
import { getHojeISO } from '@/lib/ferias';

const MESES_COMPLETOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIA_INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const DIAS_SEMANA = [
  { v: '0', l: 'Domingo' }, { v: '1', l: 'Segunda' }, { v: '2', l: 'Terça' },
  { v: '3', l: 'Quarta' }, { v: '4', l: 'Quinta' }, { v: '5', l: 'Sexta' }, { v: '6', l: 'Sábado' },
];

const CORES = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500'];

function diaDaSemana(iso) {
  const d = new Date(iso + 'T00:00:00');
  return DIAS_SEMANA[d.getDay()].l;
}

export default function ConfigurarEscalaDialog({ open, onClose, funcionarios, escalas, onSaved, funcionarioInicial }) {
  const queryClient = useQueryClient();
  const [modo, setModo] = useState('individual'); // individual | setor
  const [funcId, setFuncId] = useState('');
  const [setor, setSetor] = useState('');
  const [tipo, setTipo] = useState('ciclo');
  const [preset, setPreset] = useState('6x1');
  const [custom, setCustom] = useState(false);
  const [diasTrabalho, setDiasTrabalho] = useState(6);
  const [diasFolga, setDiasFolga] = useState(1);
  const [diaFixo, setDiaFixo] = useState('0');
  const [dataAncora, setDataAncora] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [offset, setOffset] = useState(0);
  const [cor, setCor] = useState(CORES[0]);
  const [diasFolgaPersonalizada, setDiasFolgaPersonalizada] = useState([]);
  const [mesCal, setMesCal] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [limparOpen, setLimparOpen] = useState(false);
  const [limparInicio, setLimparInicio] = useState('');
  const [limparFim, setLimparFim] = useState('');
  const [limpando, setLimpando] = useState(false);

  const func = funcionarios.find(f => f.id === funcId);
  const escalaExistente = func ? getEscalaEfetiva(escalas.filter(e => e.funcionario_id === func.id), getHojeISO()) : null;

  useEffect(() => {
    if (!open) return;
    setModo('individual');
    setFuncId(funcionarioInicial?.id || '');
    setSetor('');
    setTipo('ciclo');
    setPreset('6x1');
    setCustom(false);
    setDiasTrabalho(6);
    setDiasFolga(1);
    setDiaFixo('0');
    setDataAncora('');
    setDataFim('');
    setOffset(0);
    setCor(CORES[0]);
    setDiasFolgaPersonalizada([]);
    setMesCal(new Date());
  }, [open, funcionarioInicial]);

  // Ao aplicar a um setor, força o rodízio (folgas alternadas) — "fixa" faria todos folgarem no mesmo dia
  useEffect(() => {
    if (modo === 'setor') setTipo('ciclo');
  }, [modo]);

  // Ao selecionar um funcionário, pré-carrega a escala existente (ou admissão como âncora)
  useEffect(() => {
    if (!func) return;
    if (escalaExistente) {
      setTipo(escalaExistente.tipo || 'ciclo');
      setDiaFixo(String(escalaExistente.dia_semana_fixo ?? 0));
      setDiasTrabalho(escalaExistente.dias_trabalho || 6);
      setDiasFolga(escalaExistente.dias_folga || 1);
      setDataAncora(escalaExistente.data_ancora || '');
      setDataFim(escalaExistente.data_fim || '');
      setOffset(escalaExistente.offset || 0);
      setCor(escalaExistente.cor || CORES[0]);
      setDiasFolgaPersonalizada(Array.isArray(escalaExistente.dias_folga) ? escalaExistente.dias_folga : []);
      const p = ESCALA_PRESETS.find(x => x.dias_trabalho === escalaExistente.dias_trabalho && x.dias_folga === escalaExistente.dias_folga);
      setPreset(p?.id || '6x1');
      setCustom(!p);
    } else {
      setDataAncora(getHojeISO());
    }
  }, [func]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDiaFolga = (iso) => {
    setDiasFolgaPersonalizada(prev => prev.includes(iso) ? prev.filter(x => x !== iso) : [...prev, iso]);
  };

  const ciclo = tipo === 'ciclo' ? diasTrabalho + diasFolga : 1;
  const offsetMax = Math.max(0, ciclo - 1);

  // Preview: dia da folga desta semana (a partir de hoje)
  const previewFolga = useMemo(() => {
    const escala = {
      tipo, dia_semana_fixo: Number(diaFixo), dias_trabalho: diasTrabalho,
      dias_folga: tipo === 'personalizada' ? diasFolgaPersonalizada : diasFolga,
      data_ancora: dataAncora || getHojeISO(), offset, ativo: true,
    };
    const hoje = getHojeISO();
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoje + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (ehDiaFolga(escala, iso)) return diaDaSemana(iso);
    }
    return '—';
  }, [tipo, diaFixo, diasTrabalho, diasFolga, dataAncora, offset]);

  const setores = [...new Set(funcionarios.map(f => f.setor).filter(Boolean))];

  const montarPayload = (funcionario, offsetUsado) => ({
    funcionario_id: funcionario.id,
    tenant_id: getCurrentTenantId(),
    tipo,
    dia_semana_fixo: tipo === 'fixa' ? Number(diaFixo) : null,
    dias_trabalho: tipo === 'ciclo' ? diasTrabalho : null,
    dias_folga: tipo === 'personalizada' ? diasFolgaPersonalizada : (tipo === 'ciclo' ? diasFolga : null),
    data_ancora: dataAncora || getHojeISO(),
    data_fim: dataFim || null,
    offset: offsetUsado ?? offset,
    cor,
    ativo: true,
  });

  // Salva a escala de um funcionário com VERSIONAMENTO:
  // - Se a nova data de início for depois da escala que vale naquele dia, FECHA
  //   essa escala no dia anterior (mantém o passado) e cria um novo registro.
  // - Se for a mesma data de início, atualiza o registro atual.
  // - Nova escala sem substituir outra: não sobrepõe uma escala FUTURA (fecha a
  //   nova no dia anterior à futura, se não tiver data fim).
  const salvarEscalaFuncionario = async (func, payload) => {
    const escalasFunc = escalas.filter(e => e.funcionario_id === func.id && e.ativo !== false);
    const inicio = payload.data_ancora;

    // Escala que cobre a data de início (a que será substituída/ajustada)
    const atual = escalasFunc.find(e =>
      (e.data_ancora || '') <= inicio && (!e.data_fim || e.data_fim >= inicio)
    );

    if (atual && inicio > (atual.data_ancora || '')) {
      const d = new Date(inicio + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      const fimAnterior = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      await client.entities.EscalaFolga.update(atual.id, { data_fim: fimAnterior });
      await client.entities.EscalaFolga.create(payload);
      return 'criada';
    }
    if (atual && inicio === (atual.data_ancora || '')) {
      await client.entities.EscalaFolga.update(atual.id, payload);
      return 'atualizada';
    }

    // Nova escala: evita sobrepor uma escala futura (data_ancora > inicio)
    const futura = escalasFunc.find(e => (e.data_ancora || '') > inicio);
    let payloadFinal = payload;
    if (futura && !payload.data_fim) {
      const d = new Date(futura.data_ancora + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      payloadFinal = { ...payload, data_fim: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` };
    }
    await client.entities.EscalaFolga.create(payloadFinal);
    return 'criada';
  };

  const handleSave = async () => {
    if (modo === 'individual' && !func) { toast.error('Selecione o funcionário'); return; }
    if (modo === 'setor' && !setor) { toast.error('Selecione o setor'); return; }
    if (tipo === 'ciclo' && (diasTrabalho < 1 || diasFolga < 1)) { toast.error('Dias de trabalho e folga devem ser >= 1'); return; }
    if (tipo === 'ciclo' && !dataFim) { toast.error('Informe a data fim do ciclo'); return; }
    if (dataFim && dataAncora && dataFim < dataAncora) { toast.error('Data fim não pode ser anterior à data início'); return; }
    if (tipo === 'personalizada' && diasFolgaPersonalizada.length === 0) { toast.error('Selecione ao menos um dia de folga no calendário'); return; }
    setSaving(true);
    try {
      if (modo === 'individual') {
        const payload = montarPayload(func, offset);
        await salvarEscalaFuncionario(func, payload);
        toast.success(`Escala de ${func.nome} salva (${rotuloEscala(payload)})`);
      } else {
        // Aplica ao setor com offsets distribuídos (alternância das folgas)
        const doSetor = funcionarios.filter(f => f.setor === setor && f.ativo !== false && !f.data_demissao);
        if (doSetor.length === 0) { toast.error('Nenhum funcionário ativo neste setor'); setSaving(false); return; }
        let criados = 0, atualizados = 0;
        for (let i = 0; i < doSetor.length; i++) {
          const f = doSetor[i];
          const offsetUsado = tipo === 'ciclo' ? (i % ciclo) : 0;
          const payload = montarPayload(f, offsetUsado);
          const resultado = await salvarEscalaFuncionario(f, payload);
          if (resultado === 'criada') criados++; else atualizados++;
        }
        toast.success(`Escala aplicada a ${doSetor.length} funcionário(s) do setor (${criados} criados, ${atualizados} atualizados)`);
      }
      queryClient.invalidateQueries({ queryKey: ['escala_folga'] });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Erro ao salvar escala');
    } finally {
      setSaving(false);
    }
  };

  // Limpa a escala do funcionário em um período definido (início+fim ou início+todo o futuro).
  // Escalas que começam antes do início são TRUNCADAS no dia anterior; as que começam
  // dentro do período são DELETADAS. Ação irreversível.
  const handleLimpar = async () => {
    if (!func) return;
    if (!limparInicio) { toast.error('Informe a data de início'); return; }
    if (limparFim && limparFim < limparInicio) { toast.error('Data fim não pode ser anterior à data início'); return; }
    setLimpando(true);
    try {
      const escalasFunc = escalas.filter(e => e.funcionario_id === func.id);
      let deletadas = 0, truncadas = 0;
      for (const e of escalasFunc) {
        if (e.data_fim && e.data_fim < limparInicio) continue; // termina antes do período
        if (limparFim && e.data_ancora && e.data_ancora > limparFim) continue; // começa depois do período
        if (e.data_ancora && e.data_ancora < limparInicio) {
          // Começa antes do início → trunca no dia anterior (mantém o passado)
          const d = new Date(limparInicio + 'T00:00:00');
          d.setDate(d.getDate() - 1);
          const fimAnterior = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          await client.entities.EscalaFolga.update(e.id, { data_fim: fimAnterior });
          truncadas++;
        } else {
          await client.entities.EscalaFolga.delete(e.id);
          deletadas++;
        }
      }
      toast.success(`Escala limpa: ${deletadas} removida(s), ${truncadas} ajustada(s).`);
      queryClient.invalidateQueries({ queryKey: ['escala_folga'] });
      onSaved?.();
      setLimparOpen(false);
      setLimparInicio('');
      setLimparFim('');
    } catch (e) {
      toast.error(e?.message || 'Erro ao limpar escala');
    } finally {
      setLimpando(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Escala de Folga
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Aplicar para</Label>
            <Select value={modo} onValueChange={setModo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Um funcionário</SelectItem>
                <SelectItem value="setor">Todo o setor (folgas alternadas)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {modo === 'individual' ? (
            <div>
              <Label>Funcionário *</Label>
              <Select value={funcId} onValueChange={setFuncId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {[...funcionarios].sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}{f.setor ? ` — ${f.setor}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Setor *</Label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                As folgas serão distribuídas automaticamente em dias diferentes (rodízio).
              </p>
            </div>
          )}

          <div>
            <Label>Tipo de escala</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ciclo">Ciclo / rodízio (ex.: 6x1, 5x2)</SelectItem>
                <SelectItem value="fixa" disabled={modo === 'setor'}>Fixa semanal (folga no mesmo dia)</SelectItem>
                <SelectItem value="personalizada" disabled={modo === 'setor'}>Personalizada (escolher dias no calendário)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === 'fixa' ? (
            <div>
              <Label>Dia fixo da folga</Label>
              <Select value={diaFixo} onValueChange={setDiaFixo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map(d => <SelectItem key={d.v} value={d.v}>{d.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : tipo === 'personalizada' ? (
            <div>
              <Label>Escolha os dias de folga no calendário</Label>
              <div className="rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setMesCal(new Date(mesCal.getFullYear(), mesCal.getMonth() - 1, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-semibold">{MESES_COMPLETOS[mesCal.getMonth()]} {mesCal.getFullYear()}</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setMesCal(new Date(mesCal.getFullYear(), mesCal.getMonth() + 1, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DIA_INICIAIS.map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-muted-foreground">{d}</div>
                  ))}
                  {Array.from({ length: new Date(mesCal.getFullYear(), mesCal.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                    const iso = `${mesCal.getFullYear()}-${String(mesCal.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const passado = iso < getHojeISO();
                    const selecionado = diasFolgaPersonalizada.includes(iso);
                    return (
                      <button key={d} type="button" disabled={passado} onClick={() => toggleDiaFolga(iso)}
                        className={`h-8 rounded-md text-xs font-medium transition-colors ${selecionado ? 'bg-slate-400 text-white' : passado ? 'text-muted-foreground/30 cursor-not-allowed' : 'bg-muted/40 hover:bg-muted'}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {diasFolgaPersonalizada.length} dia(s) de folga selecionado(s) · clique para marcar/desmarcar
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <Label>Padrão do ciclo</Label>
                <Select value={custom ? 'custom' : preset} onValueChange={v => {
                  if (v === 'custom') { setCustom(true); return; }
                  setCustom(false);
                  setPreset(v);
                  const p = ESCALA_PRESETS.find(x => x.id === v);
                  if (p) { setDiasTrabalho(p.dias_trabalho); setDiasFolga(p.dias_folga); }
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESCALA_PRESETS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                    <SelectItem value="custom">Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {custom && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Dias de trabalho</Label>
                    <Input type="number" min="1" value={diasTrabalho} onChange={e => setDiasTrabalho(Number(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label>Dias de folga</Label>
                    <Input type="number" min="1" value={diasFolga} onChange={e => setDiasFolga(Number(e.target.value) || 1)} />
                  </div>
                </div>
              )}
            </>
          )}

          {tipo !== 'personalizada' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data início *</Label>
                <Input type="date" min={getHojeISO()} value={dataAncora} onChange={e => setDataAncora(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">A escala vale a partir desta data (presente/futuro).</p>
              </div>
              <div>
                <Label>Data fim {tipo === 'ciclo' ? '*' : ''}</Label>
                <Input type="date" min={dataAncora || getHojeISO()} value={dataFim} onChange={e => setDataFim(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">
                  {tipo === 'ciclo' ? 'Obrigatória para o ciclo.' : 'Opcional (sem fim = aberto).'}
                </p>
              </div>
            </div>
          )}
          {tipo === 'ciclo' && modo === 'individual' && (
            <div>
              <Label>Deslocamento (0 a {offsetMax})</Label>
              <Input type="number" min="0" max={offsetMax} value={offset} onChange={e => setOffset(Math.min(Math.max(Number(e.target.value) || 0, 0), offsetMax))} />
            </div>
          )}

          <div>
            <Label>Cor (identificação no calendário)</Label>
            <div className="flex gap-2">
              {CORES.map(c => (
                <button key={c} type="button" onClick={() => setCor(c)}
                  className={`w-6 h-6 rounded-full ${c} ${cor === c ? 'ring-2 ring-offset-2 ring-foreground' : ''}`} />
              ))}
            </div>
          </div>

          {modo === 'setor' ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              As folgas serão distribuídas automaticamente em dias diferentes (rodízio) para cada funcionário do setor.
            </div>
          ) : tipo === 'personalizada' ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              <strong>{diasFolgaPersonalizada.length}</strong> dia(s) de folga selecionado(s) no calendário.
            </div>
          ) : (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
              Folga desta semana: <strong>{previewFolga}</strong>
              {tipo === 'ciclo' && ciclo > 1 && offset > 0 && ` · deslocamento ${offset} de ${ciclo}`}
            </div>
          )}
        </div>
        <DialogFooter>
          {modo === 'individual' && func && (
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setLimparOpen(true)} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-2" />Limpar escala
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {modo === 'setor' ? 'Aplicar ao setor' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Confirmação de limpeza da escala */}
    <Dialog open={limparOpen} onOpenChange={(o) => { if (!o && !limpando) setLimparOpen(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Limpar escala de {func?.nome || ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <strong>Atenção:</strong> esta ação <strong>não pode ser desfeita</strong>. As escalas do período serão removidas (ou ajustadas até o dia anterior ao início).
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data início *</Label>
              <Input type="date" min={getHojeISO()} value={limparInicio} onChange={e => setLimparInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input type="date" min={limparInicio || getHojeISO()} value={limparFim} onChange={e => setLimparFim(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Vazio = todo o futuro.</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setLimparOpen(false)} disabled={limpando}>Cancelar</Button>
          <Button variant="destructive" onClick={handleLimpar} disabled={limpando || !limparInicio}>
            {limpando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Limpar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}