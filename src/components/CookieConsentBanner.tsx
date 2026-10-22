import React, { useState, useEffect } from 'react';

interface CookieConsentBannerProps {
  onOpenPrivacyModal: (tab?: 'privacy' | 'cookies' | 'terms' | 'permissions') => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPrivacyModal }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('finexa_cookie_consent_accepted');
    if (!hasAccepted) {
      // Delay slightly so it feels smooth upon entering
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('finexa_cookie_consent_accepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-slide-up">
      <div className="p-4 rounded-3xl bg-[#181c24]/95 backdrop-blur-md border border-[#10b981]/40 shadow-2xl shadow-black/80 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] flex-shrink-0">
            <span className="material-symbols-outlined text-[20px]">cookie</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Privacidad y Cookies en Finexa</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
              </h4>
              <button
                type="button"
                onClick={handleAccept}
                className="text-[#86948a] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <p className="text-[11px] text-[#dfe2ee]/90 mt-1 leading-relaxed">
              Utilizamos almacenamiento local y cookies técnicas para mantener seguras tus cuentas, saldos y PIN en tu dispositivo. No usamos trackers comerciales ni vendemos tus datos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 py-2 px-3 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-[11px] shadow transition-all active:scale-95 text-center"
          >
            Aceptar y Continuar
          </button>
          <button
            type="button"
            onClick={() => onOpenPrivacyModal('cookies')}
            className="py-2 px-3 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] font-semibold text-[11px] border border-[#3c4a42]/50 transition-all text-center"
          >
            Ver Política
          </button>
        </div>
      </div>
    </div>
  );
};
