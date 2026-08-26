import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA / Capacitor)
    const isApp = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    if (isApp) return;

    // Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for Chrome / Android beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user dismissed recently
      const dismissed = localStorage.getItem('nexus_pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        alert("To install NEXUS on iOS:\n1. Tap the Share button in Safari\n2. Scroll down and tap 'Add to Home Screen'");
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error('PWA install error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('nexus_pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-[74px] md:bottom-md left-md right-md sm:left-auto sm:right-md z-50 max-w-sm bg-ink text-white p-md rounded-xl shadow-2xl border border-white/10 flex items-center justify-between gap-md animate-slide-up">
      <div className="flex items-center gap-sm">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white shrink-0 shadow-md">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="space-y-[2px]">
          <div className="font-semibold text-[13px] leading-tight">Install NEXUS App</div>
          <div className="text-[11px] text-white/70">Install for faster offline access & notifications</div>
        </div>
      </div>

      <div className="flex items-center gap-xs shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-sm py-[6px] bg-primary hover:bg-primary-focus text-white text-[12px] font-semibold rounded-md flex items-center gap-xs active:scale-95 transition-all shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-[6px] text-white/60 hover:text-white rounded-md hover:bg-white/10 transition"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
