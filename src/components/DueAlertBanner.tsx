import React, { useState } from 'react';
import { AppNotification } from '../types';

interface DueAlertBannerProps {
  notifications: AppNotification[];
  onNavigateToScreen: (screen: any) => void;
  onQuickPayDebt?: () => void;
  onRequestNotifications?: () => void;
  notificationPermission?: string;
}

export const DueAlertBanner: React.FC<DueAlertBannerProps> = ({
  notifications,
  onNavigateToScreen,
  onQuickPayDebt,
  onRequestNotifications,
  notificationPermission,
}) => {
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Filtrar notificaciones de deudas, gastos e ingresos que no hayan sido descartadas
  const activeAlerts = notifications.filter(
    (n) => !dismissed.includes(n.id) && (n.type === 'due' || n.type === 'warning' || n.date === 'Gastos')
  );

  if (activeAlerts.length === 0 && notificationPermission !== 'default') {
    return null;
  }

  const currentAlert = activeAlerts[0];

  return (
    <div className="space-y-2 mb-3">
      {/* Banner de alerta de deuda / gasto / ingreso pendiente */}
      {currentAlert && (
        <div
          className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            currentAlert.type === 'warning'
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              : currentAlert.type === 'due'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                currentAlert.type === 'warning'
                  ? 'bg-rose-500/20 text-rose-400'
                  : currentAlert.type === 'due'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {currentAlert.type === 'warning' ? 'warning' : currentAlert.type === 'due' ? 'schedule' : 'notifications_active'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{currentAlert.title}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold bg-black/40">
                  {currentAlert.date}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-200 opacity-90">
                {currentAlert.message}
              </p>

              {/* Botón de acción rápida */}
              <div className="pt-1 flex items-center gap-2">
                {currentAlert.targetScreen === 'deudas' && onQuickPayDebt && (
                  <button
                    type="button"
                    onClick={onQuickPayDebt}
                    className="py-1 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 text-[10px] font-extrabold shadow-sm active:scale-95 transition-all"
                  >
                    Abonar a Deuda Ahora
                  </button>
                )}
                {currentAlert.targetScreen && (
                  <button
                    type="button"
                    onClick={() => onNavigateToScreen(currentAlert.targetScreen)}
                    className="py-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold active:scale-95 transition-all"
                  >
                    Ver detalles
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed((prev) => [...prev, currentAlert.id])}
            aria-label="Cerrar aviso"
            className="text-slate-400 hover:text-white p-1"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Sugerencia para activar notificaciones del dispositivo si no las tiene activas */}
      {notificationPermission === 'default' && onRequestNotifications && (
        <div className="p-3 rounded-2xl bg-[#161a23] border border-[#3c4a42]/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#10b981]/20 text-[#10b981] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px]">notifications</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Activar recordatorios en el dispositivo</p>
              <p className="text-[10px] text-[#86948a]">Recibe avisos automáticos de pagos de deudas y gastos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequestNotifications}
            className="py-1.5 px-2.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-[10px] font-bold shrink-0 active:scale-95 transition-all"
          >
            Activar
          </button>
        </div>
      )}
    </div>
  );
};
