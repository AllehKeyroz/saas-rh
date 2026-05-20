import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, FileText, Calculator, BarChart3, 
  LayoutDashboard, Menu, X, ChevronRight, LogOut, UserCog, ShieldCheck, Settings, Award,
  MessageSquare, ClipboardList, Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { client } from '@/api/client';
import { useUserRole } from '@/lib/useUserRole';

const navItems = [
  { path: '/', label: 'Painel', icon: LayoutDashboard },
  { path: '/funcionarios', label: 'Funcionários', icon: Users },
  { path: '/lancamentos', label: 'Lançamentos', icon: FileText },
  { path: '/fechamento', label: 'Fechamento Mensal', icon: Calculator },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { path: '/comissoes', label: 'Comissões', icon: Award },
  { path: '/comunicacao', label: 'Comunicação', icon: MessageSquare },
  { path: '/solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { path: '/centro-controle-rh', label: 'Centro de Controle', icon: Sliders },
  { path: '/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
  { path: '/auditoria', label: 'Auditoria', icon: ShieldCheck, adminOnly: true },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useUserRole();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-bold text-lg text-sidebar-foreground tracking-tight">RH System</span>}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.filter(item => !item.adminOnly || isAdmin).map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive(path)
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
            {!collapsed && isActive(path) && <ChevronRight className="w-4 h-4 ml-auto" />}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => client.auth.logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full bg-sidebar z-40 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[68px]" : "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", collapsed ? "" : "rotate-180")} />
        </button>
      </aside>

      {/* Spacer */}
      <div className={cn("hidden lg:block shrink-0 transition-all duration-300", collapsed ? "w-[68px]" : "w-64")} />
    </>
  );
}