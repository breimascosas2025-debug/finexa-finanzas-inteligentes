import React from 'react';
import { AppNotification, AppScreen } from '../types';
import { getNotificationPermission, requestNotificationPermission } from '../utils/systemNotifications';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNavigate: (screen: AppScreen) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigate,
}) => {
  const [permission, setPermission] = React.useState(getNotificationPermission());

  if (!isOpen) return null;

  const handleActivateNotifications = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-in fade-in">
      <div className="w-full max-w-md bg-[#181c24] border border-[#3c4a42]/60 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Notificaciones & Recordatorios
              </h3>
              <p className="text-[11px] text-[#86948a]">
                Obligaciones y alertas financieras
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262a33] text-[#86948a] hover:text-white flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Device Notifications Status & Request */}
        <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#10b981]">
              {permission === 'granted' ? 'notifications_active' : 'notifications'}
            </span>
            <div>
              <p className="text-xs font-bold text-white">
                {permission === 'granted' ? 'Alertas del dispositivo activas' : 'Notificaciones del dispositivo'}
              </p>
              <p className="text-[10px] text-[#86948a]">
                {permission === 'granted'
                  ? 'Recibirás avisos para pagar deudas y gastos'
                  : 'Permite avisos automáticos en tu navegador o móvil'}
              </p>
            </div>
          </div>
          {permission !== 'granted' && (
            <button
              type="button"
              onClick={handleActivateNotifications}
              className="py-1 px-2.5 rounded-lg bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-[10px] font-extrabold active:scale-95 transition-all shrink-0"
            >
              Activar
            </button>
          )}
        </div>

        {/* List of notifications */}
        <div className="space-y-2.5">
          {notifications.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/30 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#10b981]/15 text-[#10b981] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[26px]">verified</span>
              </div>
              <h4 className="text-xs font-bold text-white">¡Todo al día!</h4>
              <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
                No tienes compromisos vencidos ni deudas próximas a vencer. Finexa te avisará automáticamente cuando tengas obligaciones pendientes.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isWarning = notif.type === 'warning';
              const isDue = notif.type === 'due';
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.targetScreen) {
                      onNavigate(notif.targetScreen);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isWarning
                      ? 'bg-[#93000a]/15 border-[#ffb4ab]/30 hover:border-[#ffb4ab]'
                      : isDue
                      ? 'bg-[#ee9800]/15 border-[#ffb95f]/30 hover:border-[#ffb95f]'
                      : 'bg-[#0f131c] border-[#3c4a42]/30 hover:border-[#10b981]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          isWarning ? 'text-[#ffb4ab]' : isDue ? 'text-[#ffb95f]' : 'text-[#10b981]'
                        }`}
                      >
                        {isWarning ? 'error' : isDue ? 'event_busy' : 'schedule'}
                      </span>
                      <h5 className="text-xs font-bold text-white">{notif.title}</h5>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        isWarning
                          ? 'bg-[#93000a]/30 text-[#ffb4ab]'
                          : isDue
                          ? 'bg-[#ee9800]/30 text-[#ffb95f]'
                          : 'bg-[#262a33] text-[#86948a]'
                      }`}
                    >
                      {notif.date}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#86948a] mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.targetScreen && (
                    <div className="flex justify-end pt-1">
                      <span className="text-[10px] font-bold text-[#10b981] flex items-center gap-0.5">
                        <span>Ver detalle</span>
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
