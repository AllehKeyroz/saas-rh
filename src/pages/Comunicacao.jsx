import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Send, MessageSquare, Bell, Trash2, Eye, Users } from 'lucide-react';
import { format } from 'date-fns';
import { registrarAuditoria } from '@/lib/audit';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import RelatorioLeitura from '@/components/comunicacoes/RelatorioLeitura';
import RelatorioLeituraDetalhado from '@/components/comunicacoes/RelatorioLeituraDetalhado';

const TIPO_LABELS = {
  motivacional: { label: 'Motivacional', color: 'bg-green-100 text-green-800' },
  aviso: { label: 'Aviso', color: 'bg-yellow-100 text-yellow-800' },
  comunicado: { label: 'Comunicado', color: 'bg-blue-100 text-blue-800' },
  meta: { label: 'Meta', color: 'bg-purple-100 text-purple-800' },
  financeiro: { label: 'Financeiro', color: 'bg-orange-100 text-orange-800' },
  geral: { label: 'Geral', color: 'bg-slate-100 text-slate-700' },
};

const INICIAL = {
  titulo: '',
  mensagem: '',
  tipo: 'geral',
  publico_alvo: 'todos',
  setor_alvo: '',
  funcionario_id_alvo: '',
  push_ativado: false,
};

export default function Comunicacao() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(INICIAL);
  const [saving, setSaving] = useState(false);
  const [mensagemSelecionada, setMensagemSelecionada] = useState(null);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ['mensagens_rh'],
    queryFn: () => client.entities.MensagensRH.list('-created_date', 100),
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const { data: setores = [] } = useQuery({
    queryKey: ['setores'],
    queryFn: () => client.entities.Setor.list(),
  });

  const { data: meUser } = useQuery({
    queryKey: ['me_user'],
    queryFn: () => client.auth.me(),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.mensagem.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        data_envio: new Date().toISOString(),
        enviado_por: meUser?.email || '',
        lidas_por: [],
      };
      await client.entities.MensagensRH.create(payload);
      await registrarAuditoria({
        acao: 'criar',
        modulo: 'funcionario',
        descricao: `Mensagem "${form.titulo}" enviada para ${form.publico_alvo} por ${meUser?.email}`,
        dados_novos: payload,
      });
      queryClient.invalidateQueries({ queryKey: ['mensagens_rh'] });
      setForm(INICIAL);
      toast.success('Mensagem enviada com sucesso!');
      } catch (e) {
      toast.error(`Erro ao enviar: ${e.message}`);
      } finally {
      setSaving(false);
      }
      };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await client.entities.MensagensRH.delete(deleteTarget);
    queryClient.invalidateQueries({ queryKey: ['mensagens_rh'] });
    toast.success('Mensagem excluída.');
    setDeleteTarget(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comunicação</h1>
        <p className="text-muted-foreground text-sm">Envie mensagens e avisos para os funcionários</p>
      </div>

      <Tabs defaultValue="enviar">
        <TabsList>
          <TabsTrigger value="enviar" className="gap-2"><Send className="w-4 h-4" />Enviar Mensagem</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2"><MessageSquare className="w-4 h-4" />Histórico</TabsTrigger>
          <TabsTrigger value="relatorio" className="gap-2"><Eye className="w-4 h-4" />Relatório de Leitura</TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="mt-4">
          <div className="bg-card border rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Título *</Label>
                  <Input value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Título da mensagem" required />
                </div>

                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Público-alvo</Label>
                  <Select value={form.publico_alvo} onValueChange={v => setForm(p => ({ ...p, publico_alvo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="setor">Por Setor</SelectItem>
                      <SelectItem value="funcionario">Funcionário Específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.publico_alvo === 'setor' && (
                  <div className="col-span-2">
                    <Label>Setor</Label>
                    <Select value={form.setor_alvo} onValueChange={v => setForm(p => ({ ...p, setor_alvo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                      <SelectContent>
                        {setores.filter(s => s.ativo !== false).map(s => (
                          <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.publico_alvo === 'funcionario' && (
                  <div className="col-span-2">
                    <Label>Funcionário</Label>
                    <Select value={form.funcionario_id_alvo} onValueChange={v => setForm(p => ({ ...p, funcionario_id_alvo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                      <SelectContent>
                        {funcionarios.filter(f => f.ativo !== false).map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="col-span-2">
                  <Label>Mensagem *</Label>
                  <Textarea value={form.mensagem} onChange={e => setForm(p => ({ ...p, mensagem: e.target.value }))} placeholder="Escreva a mensagem aqui..." rows={4} required />
                </div>

                <div className="col-span-2 flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-3">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ativar Push Notification</p>
                    <p className="text-xs text-muted-foreground">Envia notificação para os destinatários</p>
                  </div>
                  <Switch checked={form.push_ativado} onCheckedChange={v => setForm(p => ({ ...p, push_ativado: v }))} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar Mensagem
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
           {isLoading ? (
             <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
           ) : mensagens.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
               <p>Nenhuma mensagem enviada ainda</p>
             </div>
           ) : (
             <div className="space-y-4">
               <Input 
                 placeholder="Buscar por título ou data..." 
                 value={filtroBusca}
                 onChange={e => setFiltroBusca(e.target.value)}
                 className="mb-2"
               />
               <div className="space-y-3">
                 {mensagens.filter(m => {
                   const matchTitulo = m.titulo.toLowerCase().includes(filtroBusca.toLowerCase());
                   const matchData = m.data_envio && format(new Date(m.data_envio), 'dd/MM/yyyy').includes(filtroBusca);
                   return matchTitulo || matchData;
                 }).map(m => {
                   const tipo = TIPO_LABELS[m.tipo] || TIPO_LABELS.geral;
                   const lidas = m.lidas_por || [];
                   return (
                     <div key={m.id} className="bg-card border rounded-xl p-4 space-y-2">
                       <div className="flex items-start justify-between gap-3">
                         <div className="flex items-center gap-2 flex-wrap">
                           <span className="font-semibold text-sm">{m.titulo}</span>
                           <Badge className={`text-xs ${tipo.color}`}>{tipo.label}</Badge>
                           {m.push_ativado && <Badge className="text-xs bg-blue-100 text-blue-800"><Bell className="w-2.5 h-2.5 mr-1" />Push</Badge>}
                         </div>
                         <div className="flex gap-1 shrink-0">
                           <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-primary" onClick={() => setMensagemSelecionada(m)}>
                             <Eye className="w-3.5 h-3.5" />
                           </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(m.id)}>
                             <Trash2 className="w-3.5 h-3.5" />
                           </Button>
                         </div>
                       </div>
                       <p className="text-sm text-muted-foreground">{m.mensagem}</p>
                       <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                         <span>Para: {m.publico_alvo === 'todos' ? 'Todos' : m.publico_alvo === 'setor' ? `Setor: ${m.setor_alvo}` : `Funcionário específico`}</span>
                         {m.data_envio && <span>{format(new Date(m.data_envio), 'dd/MM/yyyy HH:mm')}</span>}
                         <span className="ml-auto font-medium text-foreground flex items-center gap-1"><Users className="w-3 h-3" />{lidas.length} leu</span>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}
        </TabsContent>

         <TabsContent value="relatorio" className="mt-4">
           <RelatorioLeituraDetalhado />
         </TabsContent>
         </Tabs>

         {/* Modal de leitura */}
      <Dialog open={!!mensagemSelecionada} onOpenChange={open => !open && setMensagemSelecionada(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visualizações — {mensagemSelecionada?.titulo}
            </DialogTitle>
          </DialogHeader>
          {mensagemSelecionada && (
            <div className="space-y-3">
              {(() => {
                const lidas = mensagemSelecionada.lidas_por || [];
                const leituras = mensagemSelecionada.leituras || [];
                const todasDisp = funcionarios.filter(f => {
                  if (mensagemSelecionada.publico_alvo === 'todos') return f.ativo !== false;
                  if (mensagemSelecionada.publico_alvo === 'setor') return f.setor === mensagemSelecionada.setor_alvo && f.ativo !== false;
                  if (mensagemSelecionada.publico_alvo === 'funcionario') return f.id === mensagemSelecionada.funcionario_id_alvo;
                  return false;
                });
                const naoLidas = todasDisp.filter(f => !lidas.includes(f.id));
                const getLeitura = (funcId) => leituras.find(l => l.funcionario_id === funcId);

                return (
                  <>
                    {lidas.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-green-700">✅ Lido ({lidas.length})</h4>
                        <div className="space-y-1">
                          {todasDisp.filter(f => lidas.includes(f.id)).map(f => {
                            const leitura = getLeitura(f.id);
                            return (
                              <div key={f.id} className="text-xs py-1 px-2 bg-green-50 rounded border border-green-200 text-green-900">
                                {f.nome}
                                {leitura?.data_leitura && (
                                  <span className="block text-green-600 font-normal">
                                    {new Date(leitura.data_leitura).toLocaleString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {naoLidas.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-orange-700">⏳ Não lido ({naoLidas.length})</h4>
                        <div className="space-y-1">
                          {naoLidas.map(f => (
                            <div key={f.id} className="text-xs py-1 px-2 bg-orange-50 rounded border border-orange-200 text-orange-900">
                              {f.nome}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
        </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta mensagem?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
        );
        }