import React, { useEffect, useState } from 'react';
import { Download, Share, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Detecta iOS (iPhone/iPad), inclusive iPadOS que se disfarça de Mac.
function isIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Já rodando como app instalado (standalone) — não faz sentido oferecer instalar.
function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

// Botão discreto de instalação do PWA.
// - Android/Chrome: usa o beforeinstallprompt (prompt nativo).
// - iOS/Safari: abre um diálogo com o passo a passo (Compartilhar → Adicionar à Tela de Início).
// - Só aparece quando online, quando não está instalado e quando é instalável.
export default function InstallAppButton({ className }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS não dispara beforeinstallprompt — mostra a opção com ajuda manual.
    if (isIOS()) setVisible(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!visible || !online) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setVisible(false);
      } catch {
        // usuário dispensou o prompt
      }
      setDeferredPrompt(null);
    } else if (isIOS()) {
      setIosHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        title="Instalar app no celular"
        aria-label="Instalar app"
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
          className
        )}
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline text-xs font-medium">Instalar</span>
      </button>

      <Dialog open={iosHelp} onOpenChange={setIosHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar o app no iPhone/iPad</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              No <strong>Safari</strong>, toque em <Share className="inline w-4 h-4 align-text-bottom" />
              <strong> Compartilhar</strong> (barra inferior) e depois em:
            </p>
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Plus className="w-4 h-4" /> Adicionar à Tela de Início
            </p>
            <p>O app aparecerá como um ícone, igual a um aplicativo nativo.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
