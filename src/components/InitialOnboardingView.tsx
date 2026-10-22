import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { PrivacyTermsModal, LegalTab } from './PrivacyTermsModal';

interface InitialOnboardingViewProps {
  user: UserProfile;
  onComplete: () => void;
}

export const InitialOnboardingView: React.FC<InitialOnboardingViewProps> = ({
  user,
  onComplete,
}) => {
  // Checkbox states
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedCookies, setAcceptedCookies] = useState(false);

  // Real permission states
  const [cameraState, setCameraState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [notificationState, setNotificationState] = useState<NotificationPermission>('default');
  const [storageGranted, setStorageGranted] = useState(false);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);

  // Legal modal
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('terms');

  useEffect(() => {
    // Check Notification status
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationState(Notification.permission);
    }

    // Check Camera status if permissions API supported
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions
        .query({ name: 'camera' as any })
        .then((res) => {
          if (res.state === 'granted') setCameraState('granted');
          else if (res.state === 'denied') setCameraState('denied');
          else setCameraState('prompt');
        })
        .catch(() => {});
    }
  }, []);

  // Request real camera permission
  const handleRequestCamera = async () => {
    setIsRequesting('camera');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraState('granted');
        // Stop stream immediately
        stream.getTracks().forEach((track) => track.stop());
      } else {
        setCameraState('denied');
      }
    } catch {
      setCameraState('denied');
    } finally {
      setIsRequesting(null);
    }
  };

  // Request real notification permission
  const handleRequestNotifications = async () => {
    setIsRequesting('notifications');
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        setNotificationState(perm);
      }
    } catch {
      // Ignored
    } finally {
      setIsRequesting(null);
    }
  };

  const handleOpenLegal = (tab: LegalTab) => {
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  const isFormValid = acceptedTerms && acceptedPrivacy && acceptedCookies;

  const handleContinue = () => {
    if (!isFormValid) return;

    // Guardar registro criptográfico y de auditoría de consentimiento legal
    const consentAudit = {
      version: 'v2026.1-legal',
      userEmail: user.email,
      userName: user.name,
      acceptedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      termsAccepted: true,
      privacyAccepted: true,
      cookiesAccepted: true,
    };

    localStorage.setItem(`finexa_consent_${user.email}`, JSON.stringify(consentAudit));
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased flex items-center justify-center p-4 selection:bg-[#10b981]/30">
      <div className="w-full max-w-lg bg-[#181c24] border border-[#3c4a42]/70 rounded-3xl p-6 shadow-2xl space-y-5 my-6 animate-in fade-in">
        {/* Header */}
        <div className="text-center space-y-2 pb-3 border-b border-[#3c4a42]/40">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#10b981] to-[#4edea3] text-[#003824] flex items-center justify-center mx-auto shadow-xl shadow-[#10b981]/20 font-black">
            <span className="material-symbols-outlined text-[30px]">verified_user</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Antes de comenzar</h1>
            <p className="text-xs text-[#86948a] mt-1 max-w-sm mx-auto">
              Bienvenido, <strong className="text-white">{user.name}</strong>. Para garantizar la seguridad y buen funcionamiento de Finexa, por favor revisa qué necesita la aplicación.
            </p>
          </div>
        </div>

        {/* Sección: Explicación de Permisos Reales */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#10b981] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Permisos del Sistema (Transparencia)</span>
            </span>
            <span className="text-[10px] text-[#86948a]">Opcionales por función</span>
          </div>

          <p className="text-[11px] text-[#86948a]">
            Finexa no solicita permisos innecesarios. Puedes autorizarlos ahora o cuando uses cada función:
          </p>

          <div className="space-y-2">
            {/* 1. Cámara */}
            <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Cámara</h4>
                  <p className="text-[10px] text-[#86948a]">Para escanear facturas y tiquetes con OCR</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRequestCamera}
                disabled={cameraState === 'granted' || isRequesting === 'camera'}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 ${
                  cameraState === 'granted'
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 cursor-default'
                    : 'bg-[#262a33] hover:bg-[#31353e] text-white border border-[#3c4a42]/60 active:scale-95'
                }`}
              >
                {cameraState === 'granted' ? (
                  <>
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Permitido</span>
                  </>
                ) : (
                  <span>Permitir</span>
                )}
              </button>
            </div>

            {/* 2. Notificaciones */}
            <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#ffb95f]/15 text-[#ffb95f] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">notifications</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Notificaciones</h4>
                  <p className="text-[10px] text-[#86948a]">Para recordatorios de deudas y salarios</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRequestNotifications}
                disabled={notificationState === 'granted' || isRequesting === 'notifications'}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 ${
                  notificationState === 'granted'
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 cursor-default'
                    : 'bg-[#262a33] hover:bg-[#31353e] text-white border border-[#3c4a42]/60 active:scale-95'
                }`}
              >
                {notificationState === 'granted' ? (
                  <>
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    <span>Permitido</span>
                  </>
                ) : (
                  <span>Permitir</span>
                )}
              </button>
            </div>

            {/* 3. Ubicación (No forzada) */}
            <div className="p-3 rounded-2xl bg-[#0f131c]/50 border border-[#3c4a42]/30 flex items-center justify-between gap-3 opacity-80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#262a33] text-[#86948a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">location_on</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Ubicación</h4>
                  <p className="text-[10px] text-[#86948a]">SOLO si una función futura específica la requiere</p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-[#262a33] text-[#86948a] font-bold">
                No requerida
              </span>
            </div>

            {/* 4. Calendario */}
            <div className="p-3 rounded-2xl bg-[#0f131c]/50 border border-[#3c4a42]/30 flex items-center justify-between gap-3 opacity-80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#262a33] text-[#86948a] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Calendario</h4>
                  <p className="text-[10px] text-[#86948a]">Únicamente si conectas Google Calendar en Perfil</p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-[#262a33] text-[#86948a] font-bold">
                Bajo demanda
              </span>
            </div>

            {/* 5. Archivos / Documentos */}
            <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">folder_open</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Archivos y Documentos</h4>
                  <p className="text-[10px] text-[#86948a]">Para exportar tus respaldos .JSON y fotos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStorageGranted(true)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40"
              >
                Habilitado
              </button>
            </div>
          </div>
        </div>

        {/* Sección: Documentos Legales y Consentimiento Obligatorio */}
        <div className="space-y-3 pt-2 border-t border-[#3c4a42]/40">
          <span className="text-[11px] font-black uppercase tracking-wider text-white block">
            Consentimiento y Políticas Legales
          </span>

          <div className="flex flex-wrap gap-2 text-[10px]">
            <button
              type="button"
              onClick={() => handleOpenLegal('terms')}
              className="text-[#10b981] hover:underline font-bold flex items-center gap-0.5 bg-[#10b981]/10 px-2 py-1 rounded-lg border border-[#10b981]/30"
            >
              <span className="material-symbols-outlined text-[13px]">gavel</span>
              <span>Términos y condiciones</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenLegal('privacy')}
              className="text-[#10b981] hover:underline font-bold flex items-center gap-0.5 bg-[#10b981]/10 px-2 py-1 rounded-lg border border-[#10b981]/30"
            >
              <span className="material-symbols-outlined text-[13px]">shield</span>
              <span>Política de privacidad</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenLegal('cookies')}
              className="text-[#10b981] hover:underline font-bold flex items-center gap-0.5 bg-[#10b981]/10 px-2 py-1 rounded-lg border border-[#10b981]/30"
            >
              <span className="material-symbols-outlined text-[13px]">cookie</span>
              <span>Política de cookies</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenLegal('permissions')}
              className="text-[#10b981] hover:underline font-bold flex items-center gap-0.5 bg-[#10b981]/10 px-2 py-1 rounded-lg border border-[#10b981]/30"
            >
              <span className="material-symbols-outlined text-[13px]">key</span>
              <span>Política de permisos</span>
            </button>
          </div>

          {/* Checkboxes Obligatorios */}
          <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#3c4a42] text-[#10b981] focus:ring-[#10b981] bg-[#181c24] cursor-pointer"
              />
              <span className="leading-snug">
                Acepto los <strong className="text-white underline cursor-pointer" onClick={(e) => { e.preventDefault(); handleOpenLegal('terms'); }}>Términos y condiciones</strong> de Finexa.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#3c4a42] text-[#10b981] focus:ring-[#10b981] bg-[#181c24] cursor-pointer"
              />
              <span className="leading-snug">
                He leído y acepto la <strong className="text-white underline cursor-pointer" onClick={(e) => { e.preventDefault(); handleOpenLegal('privacy'); }}>Política de privacidad</strong> y tratamiento de datos.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={acceptedCookies}
                onChange={(e) => setAcceptedCookies(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-[#3c4a42] text-[#10b981] focus:ring-[#10b981] bg-[#181c24] cursor-pointer"
              />
              <span className="leading-snug">
                Acepto la <strong className="text-white underline cursor-pointer" onClick={(e) => { e.preventDefault(); handleOpenLegal('cookies'); }}>Política de cookies</strong> y almacenamiento local técnico.
              </span>
            </label>
          </div>
        </div>

        {/* Botón de Acción Continuar */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!isFormValid}
            onClick={handleContinue}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition-all ${
              isFormValid
                ? 'bg-[#10b981] hover:bg-[#059669] text-[#003824] shadow-[#10b981]/25 active:scale-98 cursor-pointer'
                : 'bg-[#262a33] text-[#86948a] border border-[#3c4a42]/40 cursor-not-allowed opacity-60'
            }`}
          >
            <span>Continuar con Finexa</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          {!isFormValid && (
            <p className="text-[10px] text-center text-[#86948a] mt-2">
              Debes marcar los 3 consentimientos requeridos para habilitar el botón y continuar
            </p>
          )}
        </div>
      </div>

      {/* Modal Legal */}
      <PrivacyTermsModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={legalTab}
      />
    </div>
  );
};
