import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Pencil, User, Briefcase, Building2, FolderOpen, ArrowUpDown, Upload, ShieldCheck, Calendar, FileText, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import FuncionarioForm from '@/components/funcionarios/FuncionarioForm';
import PastaDocumentos from '@/components/funcionarios/PastaDocumentos';
import ImportarFuncionarios from '@/components/importacao/ImportarFuncionarios';
import PermissoesPortalDialog from '@/components/funcionarios/PermissoesPortalDialog';
import DocumentosFuncionarioTab from '@/components/funcionarios/DocumentosFuncionarioTab';
import FeriasBancoHorasTab from '@/components/funcionarios/FeriasBancoHorasTab';

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
            {func.funcao && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Briefcase className="w-3.5 h-3.5 shrink-0" />{func.funcao}
              </p>
            )}
            {func.setor && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 shrink-0" />{func.setor}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {func.data_admissao && <span>Admissão: {formatDate(func.data_admissao)}</span>}
              {func.data_demissao && <span className="text-red-500">Demissão: {formatDate(func.data_demissao)}</span>}
              {func.salario_base != null && <span>Sal: {formatCurrency(func.salario_base)}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar"
                onClick={() => onEdit(func)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-primary"
              title="Documentos"
              onClick={() => onPasta(func)}
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-accent"
                title="Permissões do Portal"
                onClick={() => onPermissoes(func)}
              >
                <ShieldCheck className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterBar({ 
  search, setSearch, setores, setorFiltro, setSetorFiltro, 
  ordenacao, setOrdenacao, statusFiltro, setStatusFiltro,
  periodoDe, setPeriodoDe, periodoAte, setPeriodoAte 
}) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, função ou setor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      {setores.length > 0 && (
        <Select value={setorFiltro} onValueChange={setSetorFiltro}>
          <SelectTrigger className="w-44">
            <Building2 className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value={statusFiltro} onValueChange={setStatusFiltro}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="ativos">Ativos</SelectItem>
          <SelectItem value="inativos">Inativos</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2 items-center">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
        <Input
          type="date"
          value={periodoDe}
          onChange={e => setPeriodoDe(e.target.value)}
          className="w-32 text-sm"
          placeholder="De"
        />
        <span className="text-muted-foreground text-sm">até</span>
        <Input
          type="date"
          value={periodoAte}
          onChange={e => setPeriodoAte(e.target.value)}
          className="w-32 text-sm"
          placeholder="Até"
        />
      </div>
      <Select value={ordenacao} onValueChange={setOrdenacao}>
        <SelectTrigger className="w-44">
          <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="nome">Ordenar por Nome</SelectItem>
          <SelectItem value="admissao">Ordenar por Admissão</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function FuncionarioGrid({ list, isLoading, emptyMsg, canEdit, onEdit, onPasta, onPermissoes }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
      </div>
    );
  }
  if (list.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">{emptyMsg}</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {list.map(func => (
        <FuncionarioCard
          key={func.id}
          func={func}
          canEdit={canEdit}
          onEdit={onEdit}
          onPasta={onPasta}
          onPermissoes={onPermissoes}
        />
      ))}
    </div>
  );
}

export default function Funcionarios() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab'); // 'documentos' | 'ferias' | null

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

  // canEdit: admins e users comuns podem editar, funcionários não
  const canEdit = true; // será controlado pelo AppLayout/role no componente raiz

  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ['funcionarios'] });

  const setores = useMemo(() => {
    const s = new Set(funcionarios.map(f => f.setor).filter(Boolean));
    return [...s].sort();
  }, [funcionarios]);

  const isInativo = (f) => f.ativo === false || !!f.data_demissao;

  const applyFilters = (list) => {
    return list
      .filter(f => {
        const searchMatch = !search ||
          f.nome?.toLowerCase().includes(search.toLowerCase()) ||
          f.funcao?.toLowerCase().includes(search.toLowerCase()) ||
          f.setor?.toLowerCase().includes(search.toLowerCase());
        const setorMatch = setorFiltro === 'todos' || f.setor === setorFiltro;
        const statusMatch = statusFiltro === 'todos' ||
          (statusFiltro === 'ativos' && !isInativo(f)) ||
          (statusFiltro === 'inativos' && isInativo(f));
        const periodoMatch = (!periodoDe || (f.data_admissao && f.data_admissao >= periodoDe)) &&
          (!periodoAte || (f.data_admissao && f.data_admissao <= periodoAte));
        return searchMatch && setorMatch && statusMatch && periodoMatch;
      })
      .sort((a, b) => {
        if (ordenacao === 'admissao') {
          const da = a.data_admissao || '';
          const db = b.data_admissao || '';
          return da < db ? -1 : da > db ? 1 : 0;
        }
        return (a.nome || '').localeCompare(b.nome || '');
      });
  };

  const ativos = applyFilters(funcionarios.filter(f => !isInativo(f)));
  const inativos = applyFilters(funcionarios.filter(f => isInativo(f)));

  const handleEdit = (func) => { setEditing(func); setFormOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground mt-1">
            {funcionarios.filter(f => !isInativo(f)).length} ativos • {funcionarios.filter(f => isInativo(f)).length} inativos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />Importar
          </Button>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Novo Funcionário
          </Button>
        </div>
      </div>

      <FilterBar
        search={search}
        setSearch={setSearch}
        setores={setores}
        setorFiltro={setorFiltro}
        setSetorFiltro={setSetorFiltro}
        statusFiltro={statusFiltro}
        setStatusFiltro={setStatusFiltro}
        periodoDe={periodoDe}
        setPeriodoDe={setPeriodoDe}
        periodoAte={periodoAte}
        setPeriodoAte={setPeriodoAte}
        ordenacao={ordenacao}
        setOrdenacao={setOrdenacao}
      />

      {tabParam === 'documentos' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Documentos por Funcionário</h2>
          </div>
          <DocumentosFuncionarioTab funcionarios={funcionarios} />
        </div>
      ) : tabParam === 'ferias' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Férias e Banco de Horas</h2>
          </div>
          <FeriasBancoHorasTab funcionarios={funcionarios} />
        </div>
      ) : (
        <Tabs defaultValue="ativos">
          <TabsList>
            <TabsTrigger value="ativos">
              Ativos
              <Badge className="ml-2 bg-green-100 text-green-700 text-xs">{ativos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inativos">
              Inativos
              <Badge className="ml-2 bg-gray-100 text-gray-600 text-xs">{inativos.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativos" className="mt-4">
            <FuncionarioGrid
              list={ativos}
              isLoading={isLoading}
              emptyMsg="Nenhum funcionário ativo encontrado"
              canEdit={canEdit}
              onEdit={handleEdit}
              onPasta={setPastaFunc}
              onPermissoes={setPermissoesFunc}
            />
          </TabsContent>

          <TabsContent value="inativos" className="mt-4">
            <FuncionarioGrid
              list={inativos}
              isLoading={isLoading}
              emptyMsg="Nenhum funcionário inativo"
              canEdit={canEdit}
              onEdit={handleEdit}
              onPasta={setPastaFunc}
              onPermissoes={setPermissoesFunc}
            />
          </TabsContent>
        </Tabs>
      )}

      {formOpen && (
        <FuncionarioForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          funcionario={editing}
          onSaved={handleSaved}
        />
      )}

      {pastaFunc && (
        <PastaDocumentos
          open={!!pastaFunc}
          onClose={() => setPastaFunc(null)}
          funcionario={pastaFunc}
        />
      )}

      <ImportarFuncionarios
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSaved={handleSaved}
      />

      {permissoesFunc && (
        <PermissoesPortalDialog
          open={!!permissoesFunc}
          onClose={() => setPermissoesFunc(null)}
          funcionario={permissoesFunc}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}