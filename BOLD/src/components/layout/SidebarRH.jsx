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
import { base44 } from '@/api/base44Client';

const menuStructure = [
  {
    category: 'Dashboard',
    items: [
      { path: '/', label: 'Dashboard RH', icon: LayoutDashboard }
    ]
  },
  {
    category: 'Folha de Pagamento',
    items: [
      { path: '/fechamento', label: 'Fechamento Mensal', icon: Calculator },
      { path: '/lancamentos', label: 'Todos os Lançamentos', icon: FileText },
      { path: '/lancamentos', label: 'Consignados', icon: TrendingUp, filters: 'tipo=consignado' },
      { path: '/lancamentos', label: 'Convênios', icon: ClipboardList, filters: 'tipo=convenio' },
      { path: '/lancamentos', label: 'Consumo', icon: DollarSign, filters: 'tipo=consumo' },
      { path: '/lancamentos', label: 'Vales Parcelados', icon: Clock, filters: 'tipo=vale_parcelado' },
      { path: '/logs-financeiros', label: 'Histórico de Fechamentos', icon: FolderOpen }
    ]
  },
  {
    category: 'Funcionários',
    items: [
      { path: '/funcionarios', label: 'Cadastro', icon: Users },
      { path: '/funcionarios', label: 'Visão 360° (por funcionário)', icon: TrendingUp },
      { path: '/funcionarios', label: 'Documentos', icon: FileText, filters: 'tab=documentos' },
      { path: '/advertencias', label: 'Advertências', icon: AlertCircle },
      { path: '/funcionarios', label: 'Férias e Banco de Horas', icon: Calendar, filters: 'tab=ferias' },
      { path: '/espelho-portal', label: 'Espelho do Portal', icon: Eye }
    ]
  },
  {
    category: 'Comissões',
    items: [
      { path: '/comissoes', label: 'Lançar', icon: Calendar, filters: 'tab=lancar' },
      { path: '/comissoes', label: 'Setores', icon: Settings, filters: 'tab=setores' },
      { path: '/comissoes', label: 'Histórico', icon: FolderOpen, filters: 'tab=historico' },
      { path: '/comissoes', label: 'Relatório', icon: TrendingUp, filters: 'tab=relatorio' }
    ]
  },
  {
    category: 'Solicitações',
    items: [
      { path: '/solicitacoes', label: 'Pendentes', icon: Clock, filters: 'status=pendente' },
      { path: '/solicitacoes', label: 'Aprovadas', icon: ClipboardList, filters: 'status=aprovado' },
      { path: '/solicitacoes', label: 'Recusadas', icon: AlertCircle, filters: 'status=recusado' },
      { path: '/solicitacoes', label: 'Todas', icon: Calculator }
    ]
  },
  {
    category: 'Comunicação',
    items: [
      { path: '/comunicacao', label: 'Enviar Mensagem', icon: MessageSquare, filters: 'tab=enviar' },
      { path: '/comunicacao', label: 'Histórico', icon: FolderOpen, filters: 'tab=historico' },
      { path: '/comunicacao', label: 'Relatório', icon: Bell, filters: 'tab=relatorio' }
    ]
  },
  {
    category: 'Centro de Controle',
    items: [
      { path: '/centro-controle-rh', label: 'Permissões', icon: Users, filters: 'tab=permissoes' },
      { path: '/centro-controle-rh', label: 'Alertas Automáticos', icon: AlertCircle, filters: 'tab=alertas' },
      { path: '/centro-controle-rh', label: 'Permissões', icon: Users, filters: 'tab=permissoes' },
      { path: '/centro-controle-rh', label: 'Módulos', icon: Sliders, filters: 'tab=modulos' },
      { path: '/centro-controle-rh', label: 'Vida Financeira', icon: DollarSign, filters: 'tab=vida-financeira' }
    ]
  },
  {
    category: 'Assinaturas Digitais',
    items: [
      { path: '/assinaturas-digitais', label: 'Enviar Documento', icon: PenLine },
      { path: '/assinaturas-digitais', label: 'Acompanhar Status', icon: Clock, filters: 'tab=acompanhar' },
      { path: '/assinaturas-digitais', label: 'Documentos Assinados', icon: FileText, filters: 'tab=assinados' },
      { path: '/assinaturas-digitais', label: 'Histórico', icon: FolderOpen, filters: 'tab=historico' },
      { path: '/auditoria-documentos', label: 'Auditoria de Documentos', icon: ShieldCheck },
    ]
  },
  {
    category: 'Administração',
    items: [
      { path: '/modelos-documentos', label: 'Modelos de Documentos', icon: LayoutTemplate },
      { path: '/auditoria', label: 'Auditoria', icon: FileText },
      { path: '/usuarios', label: 'Usuários', icon: Users },
    ]
  },
  {
    category: 'Configurações',
    items: [
      { path: '/configuracoes', label: 'Setores', icon: Building2 },
      { path: '/configuracoes', label: 'Funções', icon: Briefcase, filters: 'tab=funcoes' },
      { path: '/configuracoes', label: 'Tipos de Lançamento', icon: Tags, filters: 'tab=tipos' },
      { path: '/configuracoes', label: 'Aparência', icon: Palette, filters: 'tab=aparencia' },
      { path: '/configuracoes', label: 'Notificações', icon: Bell, filters: 'tab=notificacoes' },
      { path: '/configuracoes', label: 'Modelos de Advertência', icon: FileWarning, filters: 'tab=modelos-advertencia' },
      { path: '/configuracoes', label: 'Modelos de Documentos', icon: LayoutTemplate, filters: 'tab=modelos-documentos' },
      { path: '/configuracoes', label: 'Assinatura GovBR', icon: PenLine, filters: 'tab=govbr' },
      { path: '/configuracoes', label: 'Limite de Vales (40%)', icon: Wallet, filters: 'tab=limite-vales' },
      { path: '/configuracoes', label: 'Backups', icon: HardDrive, filters: 'tab=backups' },
    ]
  }
];

const CategorySection = ({ category, items, collapsed, isActive }) => {
  const [open, setOpen] = useState(!collapsed && isActive);
  const location = useLocation();

  const isCategoryActive = items.some(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  });

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all",
          isCategoryActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        <span className={collapsed ? "hidden" : "inline"}>{category}</span>
        {!collapsed && <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />}
      </button>

      {open && !collapsed && (
        <div className="pl-2 mt-1 space-y-0.5">
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  isItemActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
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
            items={section.items}
            collapsed={collapsed}
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
            base44.auth.logout();
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

        {/* Collapse button - Desktop only */}
        <button
          onClick={onToggle}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground items-center justify-center shadow-lg hover:scale-110 transition-transform"
        >
          <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", !collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Spacer - Desktop only */}
      <div className={cn("hidden lg:block shrink-0 transition-all duration-300", collapsed ? "w-[68px]" : "w-64")} />
    </>
  );
}