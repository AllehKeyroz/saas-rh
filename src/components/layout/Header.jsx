import React, { useState, useRef, useEffect } from 'react';
import { Bell, Menu, X, LogOut, User, Settings, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { client } from '@/api/client';
import { useUserRole } from '@/lib/useUserRole';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const STATUS_ICONS = {
  pendente: { icon: Clock, color: 'text-yellow-600' },
  aprovado: { icon: CheckCircle2, color: 'text-green-600' },
  recusado: { icon: XCircle, color: 'text-red-600' },
};

export default function Header({ onMobileMenuToggle, mobileMenuOpen }) {
  const { user } = useUserRole();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState(0);
  const [ultimasSolicitacoes, setUltimasSolicitacoes] = useState([]);

  useEffect(() => {
    client.entities.SolicitacoesFuncionario.filter({ status: 'pendente' }, '-created_date', 5).then(data => {
      setUltimasSolicitacoes(data || []);
      setSolicitacoesPendentes((data || []).length);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    }
    if (showNotif) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showNotif]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40 lg:left-64">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Logo/Title - Desktop */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">RH</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">Gestão de RH</h1>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <Button variant="ghost" size="icon" className="relative" onClick={() => setShowNotif(!showNotif)}>
              <Bell className="w-5 h-5 text-muted-foreground" />
              {solicitacoesPendentes > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {solicitacoesPendentes}
                </span>
              )}
            </Button>

            {showNotif && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                <div className="p-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-foreground">Notificações</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {ultimasSolicitacoes.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                      Nenhuma pendência
                    </div>
                  ) : (
                    ultimasSolicitacoes.map(s => {
                      const Icon = STATUS_ICONS[s.status]?.icon || AlertCircle;
                      return (
                        <button
                          key={s.id}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-gray-100 last:border-0"
                          onClick={() => { setShowNotif(false); navigate('/solicitacoes'); }}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${STATUS_ICONS[s.status]?.color || 'text-muted-foreground'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {s.funcionario_nome || 'Funcionário'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {s.tipo_solicitacao === 'ferias' ? 'Férias' :
                                 s.tipo_solicitacao === 'vale' ? 'Vale' :
                                 s.tipo_solicitacao === 'banco_horas' ? 'Banco de Horas' :
                                 s.tipo_solicitacao === 'atestado' ? 'Atestado' :
                                 s.tipo_solicitacao === 'documento' ? 'Documento' : 'Solicitação'}
                                {' — '}Aguardando resposta
                              </p>
                            </div>
                            <Clock className="w-3 h-3 text-yellow-500 shrink-0 mt-1" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                {ultimasSolicitacoes.length > 0 && (
                  <div className="p-2 border-t border-gray-200">
                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setShowNotif(false); navigate('/solicitacoes'); }}>
                      Ver todas
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <Button variant="ghost" size="sm" onClick={() => setShowProfile(!showProfile)} className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground hidden md:inline">
                {user?.full_name?.split(' ')[0] || 'Usuário'}
              </span>
            </Button>

            {showProfile && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="ghost" size="sm" className="w-full justify-start px-4" onClick={() => setShowProfile(false)}>
                  <Settings className="w-4 h-4 mr-2" />Configurações
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start px-4 text-destructive hover:text-destructive" onClick={() => client.auth.logout()}>
                  <LogOut className="w-4 h-4 mr-2" />Sair
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileMenuToggle}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
