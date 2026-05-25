import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { client } from '@/api/client';
import { getCurrentTenantId } from '@/firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUserRole } from '@/lib/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { User, Shield, Search, UserCog, Eye, UserPlus, UserX, UserCheck, Loader2, EyeOff, Eye as EyeIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const ROLE_CONFIG = {
  admin: { label: 'Administrador', description: 'Acesso total ao sistema', color: 'bg-red-100 text-red-700 border-red-200', icon: Shield },
  user: { label: 'Recursos Humanos', description: 'Cria/edita funcionários e lançamentos', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: UserCog },
  consulta: { label: 'Consulta', description: 'Somente visualização', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Eye },
  funcionario: { label: 'Funcionário', description: 'Acesso ao portal do funcionário', color: 'bg-green-100 text-green-700 border-green-200', icon: User },
  inativo: { label: 'Inativo', description: 'Conta desativada', color: 'bg-gray-100 text-gray-400 border-gray-200', icon: UserX },
};

export default function Usuarios() {
  const { isAdmin, loading: loadingRole, user: me } = useUserRole();
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [showCriar, setShowCriar] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'user' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => client.entities.users.filter({ tenant_id: getCurrentTenantId() }),
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
      await client.entities.users.update(editingUser.id, { role: newRole });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Permissão atualizada com sucesso!');
      setEditingUser(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleCriarUsuario = async () => {
    if (!form.email || !form.password) { toast.error('Preencha email e senha'); return; }
    if (form.password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return; }
    setSaving(true);
    const adminTenantId = getCurrentTenantId();
    let tempApp = null;
    try {
      if (!adminTenantId) {
        toast.error('Sessão sem tenant. Tente recarregar a página.');
        setSaving(false);
        return;
      }

      // Cria um app temporário para não afetar a sessão do admin
      tempApp = initializeApp(auth.app.options, 'tempUserCreation');
      const tempAuth = getAuth(tempApp);

      const cred = await createUserWithEmailAndPassword(tempAuth, form.email, form.password);
      const uid = cred.user.uid;

      // Escreve no Firestore usando a sessão do admin (não foi trocada)
      await setDoc(doc(db, 'users', uid), {
        full_name: form.fullName || form.email,
        email: form.email,
        role: form.role,
        tenant_id: adminTenantId,
        created_date: new Date().toISOString(),
        ativo: true,
      });

      await authSignOut(tempAuth);

      toast.success(`Usuário criado com sucesso!`);
      setShowCriar(false);
      setForm({ email: '', password: '', fullName: '', role: 'user' });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    } catch (err) {
      const code = err?.code || '';
      const msg = err?.message || '';
      console.error('Erro ao criar usuário:', code, msg);
      if (code === 'auth/email-already-in-use') toast.error('Este email já está em uso');
      else if (code === 'auth/invalid-email') toast.error('Email inválido. Verifique o formato.');
      else if (code === 'auth/weak-password') toast.error('Senha muito fraca. Mínimo 6 caracteres.');
      else if (code === 'auth/network-request-failed') toast.error('Erro de rede. Verifique sua conexão.');
      else toast.error(msg || 'Erro ao criar usuário');
    } finally {
      if (tempApp) {
        try { await tempApp.delete(); } catch {}
      }
      setSaving(false);
    }
  };

  const handleToggleInativo = async (u) => {
    const novoRole = u.role === 'inativo' ? 'user' : 'inativo';
    try {
      await client.entities.users.update(u.id, { role: novoRole });
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(`Conta ${novoRole === 'inativo' ? 'inativada' : 'reativada'} com sucesso!`);
    } catch (err) {
      toast.error(err?.message || 'Erro ao atualizar');
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
        <Button onClick={() => setShowCriar(true)}>
          <UserPlus className="w-4 h-4 mr-2" />Criar Usuário
        </Button>
      </div>

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

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
                        <Button size="sm" variant="outline" onClick={() => handleOpenEdit(u)} disabled={u.role === 'inativo'}>
                          <UserCog className="w-3.5 h-3.5 mr-1" />Permissão
                        </Button>
                        <Button size="sm" variant={u.role === 'inativo' ? 'outline' : 'ghost'}
                          className={u.role === 'inativo' ? 'text-green-600 border-green-300 hover:bg-green-50' : 'text-destructive hover:text-destructive'}
                          onClick={() => handleToggleInativo(u)}>
                          {u.role === 'inativo' ? <><UserCheck className="w-3.5 h-3.5 mr-1" />Reativar</> : <><UserX className="w-3.5 h-3.5 mr-1" />Inativar</>}
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

      <AlertDialog open={!!editingUser} onOpenChange={open => !open && setEditingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Permissão</AlertDialogTitle>
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
                {Object.entries(ROLE_CONFIG).filter(([r]) => ['admin', 'user'].includes(r)).map(([r, cfg]) => (
                  <SelectItem key={r} value={r}>
                    <span>{cfg.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveRole} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCriar} onOpenChange={setShowCriar}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Criar Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome completo</Label>
              <Input placeholder="Nome do usuário" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" placeholder="colaborador@empresa.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label>Senha *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Permissão *</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {Object.entries(ROLE_CONFIG).filter(([r]) => ['admin', 'user'].includes(r)).map(([r, cfg]) => (
                    <SelectItem key={r} value={r}>
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
            <Button variant="outline" onClick={() => setShowCriar(false)}>Cancelar</Button>
            <Button onClick={handleCriarUsuario} disabled={!form.email || !form.password || saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {saving ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
