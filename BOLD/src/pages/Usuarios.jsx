import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUserRole } from '@/lib/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { User, Shield, Search, UserCog, Eye, UserPlus, UserX, UserCheck, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

const ROLE_CONFIG = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total ao sistema',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: Shield,
  },
  user: {
    label: 'Recursos Humanos',
    description: 'Cria/edita funcionários e lançamentos',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: UserCog,
  },
  consulta: {
    label: 'Consulta',
    description: 'Somente visualização',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: Eye,
  },
  funcionario: {
    label: 'Funcionário',
    description: 'Acesso ao portal do funcionário',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: User,
  },
  inativo: {
    label: 'Inativo',
    description: 'Conta desativada',
    color: 'bg-gray-100 text-gray-400 border-gray-200',
    icon: UserX,
  },
};

export default function Usuarios() {
  const { isAdmin, loading: loadingRole, user: me } = useUserRole();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [showConvidar, setShowConvidar] = useState(false);
  const [conviteEmail, setConviteEmail] = useState('');
  const [conviteRole, setConviteRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list(),
  });

  const filtered = usuarios.filter(u =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setNewRole(u.role || 'user');
  };

  const handleSaveRole = async () => {
     setSaving(true);
     try {
       const updateData = { role: newRole };
       // Se a role é funcionário, vincula ao portal com o email do usuário
       if (newRole === 'funcionario') {
         const { data: funcionarios } = await base44.entities.Funcionarios.filter({ email: editingUser.email });
         if (funcionarios && funcionarios.length > 0) {
           await base44.entities.Funcionarios.update(funcionarios[0].id, { user_email_portal: editingUser.email });
         }
       }
       await base44.entities.User.update(editingUser.id, updateData);
       queryClient.invalidateQueries({ queryKey: ['usuarios'] });
       queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
       toast({ title: 'Permissão atualizada com sucesso!' });
       setEditingUser(null);
     } catch (err) {
       toast({ title: 'Erro ao salvar', description: err?.message || 'Tente novamente.', variant: 'destructive' });
     } finally {
       setSaving(false);
     }
   };

  const handleConvidar = async () => {
     if (!conviteEmail) return;
     setSaving(true);
     try {
       // Se a role é funcionário, vincula o email ao funcionário antes de convidar
       if (conviteRole === 'funcionario') {
         const funcionarios = await base44.entities.Funcionarios.filter({ email: conviteEmail });
         if (!funcionarios || funcionarios.length === 0) {
           toast({ title: 'Erro', description: 'Nenhum funcionário encontrado com este e-mail.', variant: 'destructive' });
           setSaving(false);
           return;
         }
         await base44.entities.Funcionarios.update(funcionarios[0].id, { user_email_portal: conviteEmail });
       }
       await base44.users.inviteUser(conviteEmail, conviteRole);
       toast({ title: 'Convite enviado!', description: `Um e-mail foi enviado para ${conviteEmail}. O usuário aparecerá na lista após aceitar o convite e fazer o primeiro acesso.` });
       setConviteEmail('');
       setConviteRole('user');
       setShowConvidar(false);
       queryClient.invalidateQueries({ queryKey: ['usuarios'] });
       queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
     } catch (err) {
       toast({ title: 'Erro ao enviar convite', description: err?.message || 'Tente novamente.', variant: 'destructive' });
     } finally {
       setSaving(false);
     }
   };

  const handleToggleInativo = async (u) => {
    const novoRole = u.role === 'inativo' ? 'user' : 'inativo';
    const acao = novoRole === 'inativo' ? 'inativada' : 'reativada';
    try {
      await base44.entities.User.update(u.id, { role: novoRole });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({ title: `Conta ${acao} com sucesso!` });
    } catch (err) {
      toast({ title: 'Erro ao atualizar conta', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    }
  };

  if (loadingRole || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
        <Shield className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Somente administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">{usuarios.length} usuário(s) cadastrado(s)</p>
        </div>
        <Button onClick={() => setShowConvidar(true)}>
          <UserPlus className="w-4 h-4" />
          Convidar Usuário
        </Button>
      </div>

      {/* Legenda de papéis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={role} className="border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">{cfg.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de usuários */}
      <div className="space-y-3">
        {filtered.map(u => {
          const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.user;
          const Icon = cfg.icon;
          const isMe = u.email === me?.email;

          return (
            <Card key={u.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{u.full_name || u.email}</p>
                      {isMe && <Badge variant="outline" className="text-xs">Você</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <Badge className={`${cfg.color} border text-xs flex items-center gap-1`}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </Badge>
                    {!isMe && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(u)}
                          disabled={u.role === 'inativo'}
                        >
                          <UserCog className="w-3.5 h-3.5" />
                          Permissão
                        </Button>
                        <Button
                          size="sm"
                          variant={u.role === 'inativo' ? 'outline' : 'ghost'}
                          className={u.role === 'inativo' ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-destructive hover:text-destructive'}
                          onClick={() => handleToggleInativo(u)}
                        >
                          {u.role === 'inativo' ? (
                            <><UserCheck className="w-3.5 h-3.5" /> Reativar</>
                          ) : (
                            <><UserX className="w-3.5 h-3.5" /> Inativar</>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de alteração de papel */}
      <AlertDialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar permissão</AlertDialogTitle>
            <AlertDialogDescription>
              Defina o nível de acesso de <strong>{editingUser?.full_name || editingUser?.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {Object.entries(ROLE_CONFIG).filter(([role]) => !['inativo'].includes(role)).map(([role, cfg]) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex flex-col">
                      <span>{cfg.label}</span>
                      <span className="text-xs text-muted-foreground">{cfg.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveRole} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de convite */}
      <Dialog open={showConvidar} onOpenChange={setShowConvidar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Convidar Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                placeholder="colaborador@empresa.com"
                value={conviteEmail}
                onChange={e => setConviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Permissão *</Label>
              <Select value={conviteRole} onValueChange={setConviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                   {Object.entries(ROLE_CONFIG).filter(([role]) => !['inativo', 'consulta'].includes(role)).map(([role, cfg]) => (
                     <SelectItem key={role} value={role}>
                       <div className="flex flex-col">
                         <span>{cfg.label}</span>
                         <span className="text-xs text-muted-foreground">{cfg.description}</span>
                       </div>
                     </SelectItem>
                   ))}
                 </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvidar(false)}>Cancelar</Button>
            <Button onClick={handleConvidar} disabled={!conviteEmail || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}