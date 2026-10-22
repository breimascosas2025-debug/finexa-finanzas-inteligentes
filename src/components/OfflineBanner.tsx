import React, { useState, useEffect } from 'react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnectedToast(true);
      const timer = setTimeout(() => {
        setShowReconnectedToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnectedToast(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnectedToast) {
    return (
      <div className="bg-[#10b981]/20 border-b border-[#10b981]/40 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#10b981] transition-all">
        <span className="material-symbols-outlined text-[15px]">wifi</span>
        <span>Conexión restablecida • Finexa en línea</span>
      </div>
    );
  }

  if (!isOffline) return null;

  return (
    <div className="bg-[#ee9800]/15 border-b border-[#ee9800]/30 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#ffc978] transition-all">
      <span className="material-symbols-outlined text-[15px] animate-pulse">wifi_off</span>
      <span>Modo sin WiFi activo • Finexa funciona al 100% sin conexión</span>
    </div>
  );
};
