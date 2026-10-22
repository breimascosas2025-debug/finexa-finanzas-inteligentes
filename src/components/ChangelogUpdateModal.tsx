import React from 'react';

interface ChangelogUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateConfirmed: () => void;
}

export const ChangelogUpdateModal: React.FC<ChangelogUpdateModalProps> = ({
  isOpen,
  onClose,
  onUpdateConfirmed,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#11141c] border border-[#10b981]/50 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col space-y-5">
        {/* Encabezado con insignia de actualización */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2b352e]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#10b981] to-[#047857] flex items-center justify-center text-[#003824] shadow-lg shadow-[#10b981]/30 font-black">
              <span className="material-symbols-outlined text-[24px]">system_update</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-[#10b981]/20 text-[#10b981] font-extrabold px-2 py-0.5 rounded-full border border-[#10b981]/40">
                  VERSION 3.2 PRO
                </span>
                <span className="text-[10px] text-[#86948a]">¡Disponible!</span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                Actualización del Sistema Finexa
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#181c24] hover:bg-[#28303f] text-[#86948a] hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Lista de cambios realizados (Changelog) */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          <p className="text-xs text-[#c0cbd4] leading-relaxed">
            Hemos lanzado una nueva actualización con potentes conexiones y mejoras en la seguridad de tus datos:
          </p>

          <div className="space-y-2.5">
            <div className="p-3 rounded-2xl bg-[#181c24] border border-[#2b352e] flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#1a73e8]/20 text-[#4285f4] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                📅
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Google Calendar Integrado</h4>
                <p className="text-[10px] text-[#86948a] mt-0.5">
                  Sincroniza fechas límite de deudas, cobros recurrentes de suscripciones y depósitos esperados directamente en tu calendario.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#181c24] border border-[#2b352e] flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                📊
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Google Sheets & Google Drive</h4>
                <p className="text-[10px] text-[#86948a] mt-0.5">
                  Exporta tus movimientos a Hojas de Cálculo y guarda respaldos encriptados directamente en tu Drive personal.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#181c24] border border-[#2b352e] flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#ea4335]/20 text-[#ea4335] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                ✉️
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Gmail & WhatsApp</h4>
                <p className="text-[10px] text-[#86948a] mt-0.5">
                  Conexión para lectura de recibos y recordatorios de pago instantáneos vía mensajería.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#181c24] border border-[#2b352e] flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-[#ffb95f]/20 text-[#ffb95f] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                🛡️
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Protección contra Pérdida de Caché</h4>
                <p className="text-[10px] text-[#86948a] mt-0.5">
                  Nuevo sistema de sincronización híbrida en la nube (Firestore) y opción de exportar copias de seguridad en un clic.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de acción para aplicar la actualización */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onUpdateConfirmed}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#047857] hover:from-[#059669] hover:to-[#065f46] text-[#003824] font-extrabold text-xs tracking-wide shadow-lg shadow-[#10b981]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>¡Actualizar y Aplicar Cambios!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
