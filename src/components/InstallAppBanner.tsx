import React, { useState, useEffect } from 'react';

export const InstallAppBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone / PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('finexa_install_banner_dismissed');
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSince < 48) {
        setIsDismissed(true);
      }
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Show iOS / manual browser guide
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('finexa_install_banner_dismissed', Date.now().toString());
  };

  if (isInstalled || isDismissed) return null;

  return (
    <>
      <div className="mx-3 sm:mx-4 mt-2 mb-3">
        <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-r from-[#181c24] to-[#12241e] border border-[#10b981]/40 shadow-xl flex items-center justify-between gap-3 relative overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#10b981]/10 blur-xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#10b981] text-[#003824] flex items-center justify-center font-extrabold shadow-lg shadow-[#10b981]/20 flex-shrink-0">
              <span className="material-symbols-outlined text-[24px]">install_mobile</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-extrabold text-white">Instala Finexa en tu Pantalla</h4>
                <span className="px-1.5 py-0.5 rounded-md bg-[#10b981]/20 text-[#10b981] text-[9px] font-bold">
                  App Rápida
                </span>
              </div>
              <p className="text-[10px] text-[#dfe2ee]/80 mt-0.5">
                Acceso directo sin barra de navegador, rápido y con soporte 100% offline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="py-2 px-3.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Instalar</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              title="Cerrar aviso"
              className="w-8 h-8 rounded-full bg-[#262a33] text-[#86948a] hover:text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guía iOS o navegadores que requieren añadir manualmente */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#181c24] border border-[#3c4a42]/60 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[28px]">phone_iphone</span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Cómo Instalar Finexa</h3>
              <p className="text-xs text-[#86948a] mt-1">
                Sigue estos sencillos pasos para agregar Finexa a la pantalla de inicio de tu iPhone, iPad o navegador:
              </p>
            </div>

            <div className="text-left space-y-2.5 p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-xs text-[#dfe2ee]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Toca el botón <strong className="text-white">Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra inferior de Safari o navegador.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Desliza hacia abajo y selecciona <strong className="text-white">"Agregar al inicio" (Add to Home Screen)</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Toca <strong className="text-[#10b981]">"Agregar"</strong> en la esquina superior derecha ¡y listo!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#10b981] text-[#003824] font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
