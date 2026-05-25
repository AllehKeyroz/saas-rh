import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Calculator, MessageSquare,
  ClipboardList, Sliders, ChevronDown, ChevronRight, LogOut, FolderOpen,
  Calendar, AlertCircle, TrendingUp, Clock, DollarSign, Settings, Bell, PenLine, LayoutTemplate,
  Building2, Briefcase, Tags, Palette, HardDrive, FileWarning, ShieldCheck, Eye, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { client } from '@/api/client';

const menuStructure = [
  {
    category: 'Dashboard', icon: LayoutDashboard,
    items: [
      { path: '/', label: 'Dashboard RH', icon: LayoutDashboard }
    ]
  },
  {
    category: 'Folha de Pagamento', icon: Calculator,
    items: [
      { path: '/fechamento', label: 'Fechamento Mensal', icon: Calculator },
      { path: '/lancamentos', label: 'Lançamentos', icon: FileText },
      { path: '/logs-financeiros', label: 'Logs de Erro', icon: FileText }
    ]
  },
  {
    category: 'Funcionários', icon: Users,
    items: [
      { path: '/funcionarios', label: 'Gerenciar', icon: Users },
      { path: '/espelho-portal', label: 'Espelho do Portal', icon: Eye }
    ]
  },
  {
    category: 'Comissões', icon: TrendingUp,
    items: [
      { path: '/comissoes', label: 'Comissões' }
    ]
  },
  {
    category: 'Solicitações', icon: ClipboardList,
    items: [
      { path: '/solicitacoes', label: 'Solicitações' }
    ]
  },
  {
    category: 'Comunicação', icon: MessageSquare,
    items: [
      { path: '/comunicacao', label: 'Comunicação' }
    ]
  },
  {
    category: 'Centro de Controle', icon: Sliders,
    items: [
      { path: '/centro-controle-rh', label: 'Centro de Controle' }
    ]
  },
  {
    category: 'Assinaturas Digitais', icon: PenLine,
    items: [
      { path: '/assinaturas-digitais', label: 'Assinaturas' },
      { path: '/auditoria-documentos', label: 'Auditoria de Documentos', icon: ShieldCheck },
    ]
  },
  {
    category: 'Administração', icon: ShieldCheck,
    items: [
      { path: '/modelos-documentos', label: 'Modelos de Documentos', icon: LayoutTemplate },
      { path: '/auditoria', label: 'Auditoria', icon: FileText },
      { path: '/usuarios', label: 'Usuários', icon: Users },
    ]
  },
  {
    category: 'Configurações', icon: Settings,
    items: [
      { path: '/configuracoes', label: 'Setores', icon: Building2 },
      { path: '/configuracoes', label: 'Funções', icon: Briefcase, filters: 'tab=funcoes' },
      { path: '/configuracoes', label: 'Tipos de Lançamento', icon: Tags, filters: 'tab=tipos' },
      { path: '/configuracoes', label: 'Aparência', icon: Palette, filters: 'tab=aparencia' },
      { path: '/configuracoes', label: 'Notificações', icon: Bell, filters: 'tab=notificacoes' },
      { path: '/configuracoes', label: 'Modelos de Advertência', icon: FileWarning, filters: 'tab=modelos-advertencia' },
      { path: '/configuracoes', label: 'Modelos de Documentos', icon: LayoutTemplate, filters: 'tab=modelos-documentos' },
      { path: '/configuracoes', label: 'Assinatura GovBR', icon: PenLine, filters: 'tab=govbr' },
      { path: '/configuracoes', label: `Limite de Vales (40%)`, icon: Wallet, filters: 'tab=limite-vales' },
      { path: '/configuracoes', label: 'Backups', icon: HardDrive, filters: 'tab=backups' },
    ]
  }
];

const CategorySection = ({ category, icon: CatIcon, items, collapsed, isActive, isOpen, onToggle }) => {
  const open = isOpen;
  const setOpen = onToggle;
  const location = useLocation();

  const isCategoryActive = items.some(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  });

  // Categoria com item único: link direto, sem dropdown
  if (items.length === 1) {
    const { path, label, icon: ItemIcon, filters } = items[0];
    const Icon = ItemIcon || CatIcon;
    const fullPath = filters ? `${path}?${filters}` : path;
    return (
      <div className="mb-1">
        <Link
          to={fullPath}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            isCategoryActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          {Icon && <Icon className="w-5 h-5 shrink-0" />}
          {!collapsed && <span>{label}</span>}
        </Link>
      </div>
    );
  }

  const categoriaAtiva = isCategoryActive;
  const temSubItemAtivo = open && items.some(({ path, filters }) => {
    const fullPath = filters ? `${path}?${filters}` : path;
    const currentFull = location.pathname + location.search;
    return filters ? currentFull === fullPath : location.pathname === path && !location.search;
  });

  return (
    <div className="mb-1">
      <button
        onClick={() => onToggle()}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all",
          categoriaAtiva || temSubItemAtivo
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {CatIcon && <CatIcon className="w-5 h-5 shrink-0" />}
          <span className={cn(collapsed ? "hidden" : "inline truncate")}>{category}</span>
        </div>
        {!collapsed && <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", open && "rotate-180")} />}
      </button>

      {open && !collapsed && (
        <div className="pl-3 mt-1 space-y-0.5">
          {items.map(({ path, label, icon: Icon, filters }) => {
            const fullPath = filters ? `${path}?${filters}` : path;
            const currentFull = location.pathname + location.search;
            const isItemActive = filters
              ? currentFull === fullPath
              : location.pathname === path && !location.search;
            return (
              <Link
                key={label}
                to={fullPath}
                className={cn(
                  "flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  isItemActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default function SidebarRH({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const location = useLocation();
  const [openCategory, setOpenCategory] = useState(null);

  const NavContent = () => {
    const navigate = useNavigate();
    
    return (
    <div className="flex flex-col h-full">
      {/* Header - Click to go to dashboard */}
      <button
        onClick={() => navigate('/')}
        className="p-4 flex items-center gap-3 border-b border-border hover:bg-accent/50 transition-colors rounded-lg mx-2 mt-2"
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="text-left">
            <h2 className="font-bold text-sm text-foreground">RH</h2>
            <p className="text-xs text-muted-foreground">Gestão</p>
          </div>
        )}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuStructure.map((section) => (
          <CategorySection
            key={section.category}
            category={section.category}
            icon={section.icon}
            items={section.items}
            collapsed={collapsed}
            isOpen={openCategory === section.category}
            onToggle={() => setOpenCategory(openCategory === section.category ? null : section.category)}
            isActive={section.items.some(item => {
              if (item.path === '/') return location.pathname === '/';
              return location.pathname.startsWith(item.path);
            })}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => {
            client.auth.logout();
            onMobileClose?.();
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Sair" : ""}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
      </div>
      );
      };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 left-0 bottom-0 bg-card border-r border-border z-40 transition-all duration-300 overflow-hidden",
          collapsed ? "w-[68px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:top-0"
        )}
      >
        <NavContent />
      </aside>

      {/* Collapse button - Desktop only (fora do sidebar p/ evitar overflow clipping) */}
      <button
        onClick={onToggle}
        className={cn(
          "hidden lg:flex fixed top-1/2 -translate-y-1/2 z-50 w-7 h-7 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg hover:scale-110 transition-all duration-300"
        )}
        style={{ left: collapsed ? '54px' : '242px' }}
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform", !collapsed && "rotate-180")} />
      </button>

      {/* Spacer - Desktop only */}
      <div className={cn("hidden lg:block shrink-0 transition-all duration-300", collapsed ? "w-[68px]" : "w-64")} />
    </>
  );
}