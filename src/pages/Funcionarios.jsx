import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, User, Briefcase, Building2, FolderOpen, ArrowUpDown, Upload, ShieldCheck, Calendar, FileText, Clock, Users as UsersIcon, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import FuncionarioForm from '@/components/funcionarios/FuncionarioForm';
import PastaDocumentos from '@/components/funcionarios/PastaDocumentos';
import ImportarFuncionarios from '@/components/importacao/ImportarFuncionarios';
import PermissoesPortalDialog from '@/components/funcionarios/PermissoesPortalDialog';
import DocumentosFuncionarioTab from '@/components/funcionarios/DocumentosFuncionarioTab';
import FeriasBancoHorasTab from '@/components/funcionarios/FeriasBancoHorasTab';
import AdvertenciaForm from '@/components/advertencias/AdvertenciaForm';

const ABAS = [
  { id: 'cadastro', label: 'Cadastro', icon: UsersIcon },
  { id: 'documentos', label: 'Documentos', icon: FileText },
  { id: 'ferias', label: 'Férias e BH', icon: Calendar },
  { id: 'advertencias', label: 'Advertências', icon: AlertCircle },
];

function FuncionarioCard({ func, canEdit, onEdit, onPasta, onPermissoes }) {
  const navigate = useNavigate();
  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {func.foto ? (
              <img src={func.foto} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/funcionarios/${func.id}/360`)}>{func.nome}</h3>
            {func.funcao && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Briefcase className="w-3.5 h-3.5 shrink-0" />{func.funcao}</p>}
            {func.setor && <p className="text-sm text-muted-foreground flex items-center gap-1"><Building2 className="w-3.5 h-3.5 shrink-0" />{func.setor}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {func.data_admissao && <span>Admissão: {formatDate(func.data_admissao)}</span>}
              {func.data_demissao && <span className="text-red-500">Demissão: {formatDate(func.data_demissao)}</span>}
              {func.salario_base != null && <span>Sal: {formatCurrency(func.salario_base)}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {canEdit && <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" title="Editar" onClick={() => onEdit(func)}><Pencil className="w-4 h-4" /></Button>}
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-primary" title="Documentos" onClick={() => onPasta(func)}><FolderOpen className="w-4 h-4" /></Button>
            {canEdit && <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-accent" title="Permissões do Portal" onClick={() => onPermissoes(func)}><ShieldCheck className="w-4 h-4" /></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterBar({ search, setSearch, setores, setorFiltro, setSetorFiltro, ordenacao, setOrdenacao, statusFiltro, setStatusFiltro, periodoDe, setPeriodoDe, periodoAte, setPeriodoAte }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, função ou setor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>
      {setores.length > 0 && (
        <Select value={setorFiltro} onValueChange={setSetorFiltro}>
          <SelectTrigger className="w-44"><Building2 className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value={statusFiltro} onValueChange={setStatusFiltro}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="ativos">Ativos</SelectItem>
          <SelectItem value="inativos">Inativos</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2 items-center">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <Input type="date" value={periodoDe} onChange={e => setPeriodoDe(e.target.value)} className="w-32 text-sm" placeholder="De" />
        <span className="text-muted-foreground text-sm">até</span>
        <Input type="date" value={periodoAte} onChange={e => setPeriodoAte(e.target.value)} className="w-32 text-sm" placeholder="Até" />
      </div>
      <Select value={ordenacao} onValueChange={setOrdenacao}>
        <SelectTrigger className="w-44"><ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="nome">Ordenar por Nome</SelectItem>
          <SelectItem value="admissao">Ordenar por Admissão</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function FuncionarioGrid({ list, isLoading, emptyMsg, canEdit, onEdit, onPasta, onPermissoes }) {
  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}</div>;
  if (list.length === 0) return <div className="text-center py-16 text-muted-foreground">{emptyMsg}</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {list.map(func => <FuncionarioCard key={func.id} func={func} canEdit={canEdit} onEdit={onEdit} onPasta={onPasta} onPermissoes={onPermissoes} />)}
    </div>
  );
}

function AdvertenciasTabContent() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: funcionarios = [] } = useQuery({ queryKey: ['funcionarios'], queryFn: () => client.entities.Funcionarios.list() });
  const { data: advertencias = [], isLoading } = useQuery({ queryKey: ['advertencias'], queryFn: () => client.entities.Advertencias?.list?.() || [] });

  const filtered = advertencias.filter(a => !search || (a.funcionario_nome || '').toLowerCase().includes(search.toLowerCase()));
  const handleDelete = async (id) => { await client.entities.Advertencias.delete(id); qc.invalidateQueries({ queryKey: ['advertencias'] }); };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AlertCircle className="w-7 h-7 text-primary" />Advertências
          </h1>
          <p className="text-muted-foreground mt-1">Registro de advertências e ocorrências</p>
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nova Advertência</Button>
      </div>

      {isLoading ? <Skeleton className="h-32" /> : (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por funcionário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>Nenhuma advertência registrada</p></div>
          ) : (
            <div className="space-y-3">
              {filtered.map(a => {
                const func = funcionarios.find(f => f.id === a.funcionario_id);
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><AlertCircle className="w-4 h-4 text-red-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{a.funcionario_nome || func?.nome}</p>
                          <p className="text-xs text-muted-foreground">{a.tipo || a.motivo}{a.data_ocorrencia ? ` — ${formatDate(a.data_ocorrencia)}` : ''}</p>
                          {a.descricao && <p className="text-xs text-muted-foreground mt-1">{a.descricao}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4" /></Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {formOpen && <AdvertenciaForm open={formOpen} onClose={() => setFormOpen(false)} funcionarios={funcionarios} onSaved={() => { qc.invalidateQueries({ queryKey: ['advertencias'] }); setFormOpen(false); setEditing(null); }} advertencia={editing} />}
    </>
  );
}

const HEADER_CONFIG = {
  cadastro: {
    title: 'Funcionários',
    subtitle: (total, inativos) => `${total - inativos} ativos • ${inativos} inativos`,
    showFilters: true,
    showActions: true,
  },
  documentos: {
    title: 'Documentos por Funcionário',
    subtitle: () => 'Visualize e gerencie documentos de cada funcionário',
    showFilters: false,
    showActions: false,
  },
  ferias: {
    title: 'Férias e Banco de Horas',
    subtitle: () => 'Acompanhamento de férias e banco de horas dos funcionários',
    showFilters: false,
    showActions: false,
  },
};

export default function Funcionarios() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'cadastro';
  const [aba, setAba] = useState(tabParam);

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pastaFunc, setPastaFunc] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [permissoesFunc, setPermissoesFunc] = useState(null);
  const [setorFiltro, setSetorFiltro] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [periodoDe, setPeriodoDe] = useState('');
  const [periodoAte, setPeriodoAte] = useState('');
  const [ordenacao, setOrdenacao] = useState('nome');
  const queryClient = useQueryClient();

  const { data: funcionarios = [], isLoading } = useQuery({
    queryKey: ['funcionarios'],
    queryFn: () => client.entities.Funcionarios.list(),
  });

  const canEdit = true;
  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
  const setores = useMemo(() => [...new Set(funcionarios.map(f => f.setor).filter(Boolean))].sort(), [funcionarios]);
  const isInativo = (f) => f.ativo === false || !!f.data_demissao;

  const handleAbaChange = (v) => {
    setAba(v);
    setSearchParams(v === 'cadastro' ? {} : { tab: v });
  };

  const applyFilters = (list) => list
    .filter(f => {
      const searchMatch = !search || f.nome?.toLowerCase().includes(search.toLowerCase()) || f.funcao?.toLowerCase().includes(search.toLowerCase()) || f.setor?.toLowerCase().includes(search.toLowerCase());
      const setorMatch = setorFiltro === 'todos' || f.setor === setorFiltro;
      const statusMatch = statusFiltro === 'todos' || (statusFiltro === 'ativos' && !isInativo(f)) || (statusFiltro === 'inativos' && isInativo(f));
      const periodoMatch = (!periodoDe || (f.data_admissao && f.data_admissao >= periodoDe)) && (!periodoAte || (f.data_admissao && f.data_admissao <= periodoAte));
      return searchMatch && setorMatch && statusMatch && periodoMatch;
    })
    .sort((a, b) => ordenacao === 'admissao' ? (a.data_admissao || '').localeCompare(b.data_admissao || '') : (a.nome || '').localeCompare(b.nome || ''));

  const ativos = applyFilters(funcionarios.filter(f => !isInativo(f)));
  const inativosL = applyFilters(funcionarios.filter(f => isInativo(f)));
  const header = HEADER_CONFIG[aba];

  return (
    <div className="space-y-6">
      {/* Título fixo acima do navbar */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
      </div>

      {/* Navbar de abas */}
      <Tabs value={aba} onValueChange={handleAbaChange}>
        <TabsList>
          {ABAS.map(a => (
            <TabsTrigger key={a.id} value={a.id} className="gap-2">
              <a.icon className="w-4 h-4" />
              {a.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Aba: Cadastro */}
        <TabsContent value="cadastro" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-muted-foreground">{funcionarios.filter(f => !isInativo(f)).length} ativos • {funcionarios.filter(f => isInativo(f)).length} inativos</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-2" />Importar</Button>
              <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-2" />Novo Funcionário</Button>
            </div>
          </div>

          <FilterBar search={search} setSearch={setSearch} setores={setores} setorFiltro={setorFiltro} setSetorFiltro={setSetorFiltro}
            statusFiltro={statusFiltro} setStatusFiltro={setStatusFiltro} periodoDe={periodoDe} setPeriodoDe={setPeriodoDe}
            periodoAte={periodoAte} setPeriodoAte={setPeriodoAte} ordenacao={ordenacao} setOrdenacao={setOrdenacao} />

          <Tabs defaultValue="ativos">
            <TabsList>
              <TabsTrigger value="ativos">Ativos <Badge className="ml-2 bg-green-100 text-green-700 text-xs">{ativos.length}</Badge></TabsTrigger>
              <TabsTrigger value="inativos">Inativos <Badge className="ml-2 bg-gray-100 text-gray-600 text-xs">{inativosL.length}</Badge></TabsTrigger>
            </TabsList>
            <TabsContent value="ativos" className="mt-4">
              <FuncionarioGrid list={ativos} isLoading={isLoading} emptyMsg="Nenhum funcionário ativo encontrado" canEdit={canEdit} onEdit={(f) => { setEditing(f); setFormOpen(true); }} onPasta={setPastaFunc} onPermissoes={setPermissoesFunc} />
            </TabsContent>
            <TabsContent value="inativos" className="mt-4">
              <FuncionarioGrid list={inativosL} isLoading={isLoading} emptyMsg="Nenhum funcionário inativo" canEdit={canEdit} onEdit={(f) => { setEditing(f); setFormOpen(true); }} onPasta={setPastaFunc} onPermissoes={setPermissoesFunc} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Aba: Documentos */}
        <TabsContent value="documentos" className="mt-6">
          <DocumentosFuncionarioTab funcionarios={funcionarios} />
        </TabsContent>

        {/* Aba: Férias e Banco de Horas */}
        <TabsContent value="ferias" className="mt-6">
          <FeriasBancoHorasTab funcionarios={funcionarios} />
        </TabsContent>

        {/* Aba: Advertências */}
        <TabsContent value="advertencias" className="mt-6">
          <AdvertenciasTabContent />
        </TabsContent>
      </Tabs>

      {formOpen && <FuncionarioForm open={formOpen} onClose={() => setFormOpen(false)} funcionario={editing} onSaved={handleSaved} />}
      {pastaFunc && <PastaDocumentos open={!!pastaFunc} onClose={() => setPastaFunc(null)} funcionario={pastaFunc} />}
      <ImportarFuncionarios open={importOpen} onClose={() => setImportOpen(false)} onSaved={handleSaved} />
      {permissoesFunc && <PermissoesPortalDialog open={!!permissoesFunc} onClose={() => setPermissoesFunc(null)} funcionario={permissoesFunc} onSaved={handleSaved} />}
    </div>
  );
}
