import React from 'react';
import { client } from '@/api/client';
import {
  LayoutDashboard, User, LogOut, Menu, X, MessageSquare, ClipboardList, PenLine,
  Wallet, BarChart2, FolderOpen, Palmtree,
} from 'lucide-react';
import { useRHControl } from '@/lib/rhControl';
import { SECOES_PORTAL, secaoVisivel } from '@/lib/portalSecoes';
import VersionFooter from '@/components/layout/VersionFooter';

const ICONES = {
  'visao-geral': LayoutDashboard,
  'meus-dados': User,
  'financeiro': Wallet,
  'meus-documentos': FolderOpen,
  'minhas-ferias': Palmtree,
  'vida-financeira': BarChart2,
  'mensagens': MessageSquare,
  'solicitacoes': ClipboardList,
  'assinaturas': PenLine,
};

const ALL_NAV_ITEMS = SECOES_PORTAL.map(secao => ({
  ...secao,
  icon: ICONES[secao.id] || LayoutDashboard,
}));

export default function PortalSidebar({ aba, setAba, funcionario, mobileOpen, setMobileOpen, mensagensNaoLidas = 0, solicitacoesRespondidas = 0, avisosNaoLidos = 0 }) {
  const { isAtiva } = useRHControl();
  // Seções ocultadas pelo RH (Permissões do Portal) + módulos desligados no Centro de Controle
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(item =>
    secaoVisivel(funcionario, item.id) && (!item.chave || isAtiva(item.chave))
  );

  function NavItem({ item }) {
    const Icon = item.icon;
    const active = aba === item.id;
    return (
      <button
        onClick={() => { setAba(item.id); setMobileOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`}
      >
        <div className="relative">
          <Icon className="w-4 h-4 shrink-0" />
          {item.id === 'visao-geral' && avisosNaoLidos > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-red-500" />
          )}
        </div>
        <span className="flex-1">{item.label}</span>
        {item.id === 'mensagens' && mensagensNaoLidas > 0 && (
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shrink-0">
            {mensagensNaoLidas > 9 ? '9+' : mensagensNaoLidas}
          </span>
        )}
        {item.id === 'solicitacoes' && solicitacoesRespondidas > 0 && (
          <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0">
            {solicitacoesRespondidas > 9 ? '9+' : solicitacoesRespondidas}
          </span>
        )}
      </button>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-sm leading-tight">Portal do Funcionário</p>
          {funcionario && (
            <p className="text-xs text-sidebar-foreground/60 truncate">{funcionario.nome}</p>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Sair */}
      <div className="px-3 pb-5 border-t border-sidebar-border pt-3 space-y-2">
        <div className="px-4">
          <VersionFooter />
        </div>
        <button
          onClick={() => client.auth.logout()}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0">
        {sidebar}
      </aside>

      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-11 h-11 rounded-xl bg-sidebar text-sidebar-foreground flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-[280px] max-w-[85vw] h-full shadow-2xl">{sidebar}</div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}