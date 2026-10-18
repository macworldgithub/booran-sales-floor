'use client';

import { useEffect, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ios = (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !(window as Window & { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Check if user has dismissed it before
    let dismissed: string | null = null;
    try { dismissed = localStorage.getItem('pwa-install-dismissed'); } catch {}
    let bannerTimer: ReturnType<typeof setTimeout> | undefined;
    const dismissedAt = Number(dismissed) || 0;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    // On iOS, show banner after 2 seconds if not dismissed within 7 days
    if (ios && Date.now() - dismissedAt > sevenDays) {
      bannerTimer = setTimeout(() => setShowBanner(true), 2500);
    }

    // Listen for the native install prompt (Chrome/Android/Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (Date.now() - dismissedAt > sevenDays) {
        bannerTimer = setTimeout(() => setShowBanner(true), 2500);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect if installed via event
    const installed = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installed);

    return () => { clearTimeout(bannerTimer); window.removeEventListener('beforeinstallprompt', handler); window.removeEventListener('appinstalled', installed); };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setShowBanner(false);
      setDeferredPrompt(null);
      if (outcome === 'dismissed') {
        try { localStorage.setItem('pwa-install-dismissed', Date.now().toString()); } catch {}
      }
    } catch {
      setShowBanner(false);
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    try { localStorage.setItem('pwa-install-dismissed', Date.now().toString()); } catch {}
  };

  if (isInstalled || (!showBanner && !showIOSGuide)) return null;

  // iOS step-by-step guide
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <div
          className="w-full max-w-sm rounded-3xl overflow-hidden"
          style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/icon-72x72.png" alt="App icon" className="w-10 h-10 rounded-xl" />
                <div>
                  <p className="font-bold text-white text-sm">Install Booran Floor</p>
                  <p className="text-xs" style={{ color: '#8892a4' }}>Add to Home Screen</p>
                </div>
              </div>
              <button aria-label="Dismiss install prompt" onClick={handleDismiss} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { step: '1', icon: '⎋', label: 'Tap the Share button', sub: 'Bottom toolbar in Safari' },
                { step: '2', icon: '⊕', label: 'Scroll & tap "Add to Home Screen"', sub: 'In the share sheet options' },
                { step: '3', icon: '✓', label: 'Tap "Add" to confirm', sub: 'The app will appear on your home screen' },
              ].map(({ step, icon, label, sub }) => (
                <div key={step} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: '#e60012', color: '#fff' }}
                  >
                    {step}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#8892a4' }}>{sub}</p>
                  </div>
                  <span className="ml-auto text-2xl">{icon}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleDismiss}
              className="w-full mt-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard install banner (Android/Desktop)
  return (
    <div
      className="pwa-install fixed left-0 right-0 z-[45] flex items-center gap-4 px-4 py-4 lg:bottom-6 lg:left-auto lg:right-6 lg:max-w-sm lg:rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, #1e2330 0%, #252c3d 100%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(230,0,18,0.12)',
      }}
    >
      {/* Red accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-full lg:rounded-t-2xl" style={{ background: '#e60012' }} />

      {/* App Icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/icon-72x72.png" alt="Booran Floor App" className="w-12 h-12 rounded-2xl flex-shrink-0 shadow-lg" />

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm truncate">Install Booran Floor OS</p>
        <p className="text-xs truncate mt-0.5" style={{ color: '#8892a4' }}>
          {isIOS ? 'Add to your iPhone home screen' : 'Install as an app · Works offline'}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="p-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-label="Dismiss"
        >
          <X size={16} className="text-gray-400" />
        </button>
        <button
          onClick={handleInstall}
          disabled={installing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
          style={{
            background: '#e60012',
            color: '#fff',
            opacity: installing ? 0.7 : 1,
          }}
        >
          {isIOS ? <Smartphone size={15} /> : <Download size={15} />}
          {installing ? 'Installing…' : 'Install'}
        </button>
      </div>
    </div>
  );
}
