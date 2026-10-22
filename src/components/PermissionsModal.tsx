import React, { useState, useEffect, useRef } from 'react';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose }) => {
  const [galleryGranted, setGalleryGranted] = useState(() => {
    return localStorage.getItem('finexa_perm_gallery') === 'granted';
  });
  const [cameraStatus, setCameraStatus] = useState<string>('prompt');
  const [notificationStatus, setNotificationStatus] = useState<string>('default');
  const [storagePersisted, setStoragePersisted] = useState(false);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  const testFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check notification status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationStatus(Notification.permission);
    }

    // Check storage persistence
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((persisted) => {
        setStoragePersisted(persisted);
      });
    }

    // Check camera permission if navigator.permissions is available
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions
        .query({ name: 'camera' as any })
        .then((res) => {
          setCameraStatus(res.state);
          res.onchange = () => setCameraStatus(res.state);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleRequestGallery = () => {
    setGalleryGranted(true);
    localStorage.setItem('finexa_perm_gallery', 'granted');
    testFileInputRef.current?.click();
  };

  const handleRequestCamera = async () => {
    setIsRequesting('camera');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraStatus('granted');
        localStorage.setItem('finexa_perm_camera', 'granted');
        // Stop stream immediately after granting
        stream.getTracks().forEach((track) => track.stop());
      } else {
        setCameraStatus('granted');
        localStorage.setItem('finexa_perm_camera', 'granted');
      }
    } catch (err) {
      console.warn('Cámara no autorizada o no disponible:', err);
      setCameraStatus('denied');
    } finally {
      setIsRequesting(null);
    }
  };

  const handleRequestNotifications = async () => {
    setIsRequesting('notifications');
    try {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        setNotificationStatus(result);
        if (result === 'granted') {
          new Notification('¡Notificaciones Finexa Activadas!', {
            body: 'Te avisaremos sobre pagos de deudas y saldos en colones.',
            icon: '/finexa-icon.png',
          });
        }
      }
    } catch (err) {
      console.warn('Error solicitando notificaciones:', err);
    } finally {
      setIsRequesting(null);
    }
  };

  const handleRequestStoragePersistence = async () => {
    setIsRequesting('storage');
    try {
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        setStoragePersisted(isPersisted);
        localStorage.setItem('finexa_perm_storage', isPersisted ? 'granted' : 'denied');
      } else {
        setStoragePersisted(true);
        localStorage.setItem('finexa_perm_storage', 'granted');
      }
    } catch (err) {
      console.warn('Error al solicitar persistencia de almacenamiento:', err);
    } finally {
      setIsRequesting(null);
    }
  };

  const handleGrantAll = async () => {
    handleRequestGallery();
    await handleRequestNotifications();
    await handleRequestStoragePersistence();
    await handleRequestCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-[#181c24] border border-[#3c4a42]/60 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Centro de Permisos</h3>
              <p className="text-[10px] text-[#86948a]">Control total de accesos y privacidad</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p className="text-xs text-[#dfe2ee]/90">
          Finexa solo solicita los permisos estrictamente necesarios para guardar tus fotos de perfil, comprobantes de pago, recordatorios de deudas y respaldo offline.
        </p>

        {/* Permissions list */}
        <div className="space-y-2.5 overflow-y-auto pr-1">
          {/* 1. Galería y Fotos */}
          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">photo_library</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Galería y Fotos</h4>
                <p className="text-[10px] text-[#86948a]">
                  Para elegir tu avatar y adjuntar comprobantes
                </p>
              </div>
            </div>

            <input
              ref={testFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={() => {
                setGalleryGranted(true);
                localStorage.setItem('finexa_perm_gallery', 'granted');
              }}
            />

            <button
              type="button"
              onClick={handleRequestGallery}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                galleryGranted
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                  : 'bg-[#262a33] hover:bg-[#31353e] text-white border border-[#3c4a42]/60'
              }`}
            >
              {galleryGranted ? (
                <>
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Concedido</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">touch_app</span>
                  <span>Probar</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Cámara */}
          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ffc978]/15 text-[#ffc978] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Cámara Fotográfica</h4>
                <p className="text-[10px] text-[#86948a]">
                  Captura directa de recibos o selfie de perfil
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestCamera}
              disabled={isRequesting === 'camera'}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                cameraStatus === 'granted'
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                  : 'bg-[#262a33] hover:bg-[#31353e] text-white border border-[#3c4a42]/60'
              }`}
            >
              {cameraStatus === 'granted' ? (
                <>
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Concedido</span>
                </>
              ) : isRequesting === 'camera' ? (
                <span>Pidendo...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">videocam</span>
                  <span>Permitir</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Notificaciones */}
          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Notificaciones</h4>
                <p className="text-[10px] text-[#86948a]">
                  Recordatorios de pagos, deudas y alertas
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestNotifications}
              disabled={isRequesting === 'notifications'}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                notificationStatus === 'granted'
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                  : 'bg-[#262a33] hover:bg-[#31353e] text-white border border-[#3c4a42]/60'
              }`}
            >
              {notificationStatus === 'granted' ? (
                <>
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Activadas</span>
                </>
              ) : isRequesting === 'notifications' ? (
                <span>Activando...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">notifications</span>
                  <span>Activar</span>
                </>
              )}
            </button>
          </div>

          {/* 4. Almacenamiento Persistente */}
          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">save</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Persistencia Offline</h4>
                <p className="text-[10px] text-[#86948a]">
                  Protege tus datos contra borrados automáticos
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestStoragePersistence}
              disabled={isRequesting === 'storage'}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                storagePersisted
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                  : 'bg-[#262a33] hover:bg-[#31353e] text-white border border-[#3c4a42]/60'
              }`}
            >
              {storagePersisted ? (
                <>
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Protegido</span>
                </>
              ) : isRequesting === 'storage' ? (
                <span>Protegiendo...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px]">security</span>
                  <span>Asegurar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 border-t border-[#3c4a42]/40 flex items-center gap-2">
          <button
            type="button"
            onClick={handleGrantAll}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-md transition-all active:scale-95 text-center"
          >
            Conceder Todos los Permisos
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-[#262a33] text-[#dfe2ee] font-bold text-xs hover:bg-[#31353e] transition-all"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
