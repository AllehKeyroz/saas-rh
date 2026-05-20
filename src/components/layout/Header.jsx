import React, { useState } from 'react';
import { Bell, Menu, X, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { client } from '@/api/client';
import { useUserRole } from '@/lib/useUserRole';
import { cn } from '@/lib/utils';

export default function Header({ onMobileMenuToggle, mobileMenuOpen }) {
  const { user } = useUserRole();
  const [showProfile, setShowProfile] = useState(false);

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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
          </Button>

          {/* Profile Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProfile(!showProfile)}
              className="hidden sm:flex items-center gap-2"
            >
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-4"
                  onClick={() => setShowProfile(false)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start px-4 text-destructive hover:text-destructive"
                  onClick={() => client.auth.logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMobileMenuToggle}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}