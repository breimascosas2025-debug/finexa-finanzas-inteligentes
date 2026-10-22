import React, { useState, useEffect } from 'react';
import { UserProfile, SecurityConfig } from '../types';
import {
  isPasskeySupported,
  registerPasskey,
  getStoredPasskeys,
  removeStoredPasskey,
  PasskeyCredential,
  getActiveSessions,
  logoutOtherSessions,
  ActiveSession,
} from '../services/webauthnService';

interface PasskeysSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  security: SecurityConfig;
  onOpenPinSetup: () => void;
}

export const PasskeysSecurityModal: React.FC<PasskeysSecurityModalProps> = ({
  isOpen,
  onClose,
  user,
  security,
  onOpenPinSetup,
}) => {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const supported = isPasskeySupported();

  useEffect(() => {
    if (isOpen && user.email) {
      setPasskeys(getStoredPasskeys(user.email));
      setSessions(getActiveSessions(user.email));
      setStatusMessage(null);
      setShowAddInput(false);
      setNewPasskeyName('');
    }
  }, [isOpen, user.email]);

  if (!isOpen) return null;

  const handleCreatePasskey = async () => {
    if (!user.email) return;
    setIsRegistering(true);
    setStatusMessage(null);

    try {
      const created = await registerPasskey(user.email, user.name, newPasskeyName.trim() || undefined);
      setPasskeys(getStoredPasskeys(user.email));
      setStatusMessage({
        type: 'success',
        text: `¡Passkey "${created.name}" creada con éxito mediante WebAuthn!`,
      });
      setShowAddInput(false);
      setNewPasskeyName('');
    } catch (err: any) {
      console.error('Error al registrar Passkey:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error al configurar Passkey en este dispositivo.',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePasskey = (id: string, name: string) => {
    if (confirm(`¿Deseas eliminar la Passkey "${name}"?`)) {
      removeStoredPasskey(user.email, id);
      setPasskeys(getStoredPasskeys(user.email));
      setStatusMessage({
        type: 'info',
        text: `Passkey "${name}" eliminada.`,
      });
    }
  };

  const handleLogoutOthers = () => {
    const updated = logoutOtherSessions(user.email);
    setSessions(updated);
    setStatusMessage({
      type: 'success',
      text: 'Se han cerrado todas las sesiones activas en otros dispositivos.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-[#181c24] border border-[#3c4a42]/70 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#3c4a42]/50 flex items-center justify-between bg-[#121620]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
              <span className="material-symbols-outlined text-[20px]">fingerprint</span>
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Métodos de Inicio de Sesión & Passkeys</h2>
              <p className="text-[10px] text-[#86948a]">
                FIDO2 / WebAuthn biométrico, sesiones y recuperación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262a33] text-[#dfe2ee] hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2.5 text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#10b981]/15 text-[#10b981] border-b border-[#10b981]/30'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 text-rose-300 border-b border-rose-900/40'
                : 'bg-blue-950/40 text-blue-300 border-b border-blue-900/40'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {statusMessage.type === 'success' ? 'check_circle' : statusMessage.type === 'error' ? 'error' : 'info'}
            </span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-[#dfe2ee]/90 max-h-[66vh]">
          {/* MÉTODOS DE INICIO DE SESIÓN DISPONIBLES */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#10b981]">
              Métodos de Inicio de Sesión Configurados
            </span>

            <div className="space-y-2">
              {/* 1. Contraseña / PIN */}
              <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-[#ffb95f]">pin</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">PIN de 4 Dígitos / Contraseña</h4>
                    <p className="text-[10px] text-[#86948a]">
                      {security.isPinEnabled ? 'Habilitado y activo' : 'No configurado'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenPinSetup}
                  className="px-2.5 py-1 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[10px] font-bold text-white"
                >
                  {security.isPinEnabled ? 'Modificar' : 'Configurar'}
                </button>
              </div>

              {/* 2. Google OAuth */}
              <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <div>
                    <h4 className="text-xs font-bold text-white">Cuenta de Google</h4>
                    <p className="text-[10px] text-[#86948a]">
                      {user.isGoogleConnected ? (user.email || 'Conectada') : 'No vinculada'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-bold">
                  {user.isGoogleConnected ? 'Activo' : 'Opcional'}
                </span>
              </div>

              {/* 3. Passkey (WebAuthn) */}
              <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#10b981]/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-[#10b981]">fingerprint</span>
                  <div>
                    <h4 className="text-xs font-bold text-white">Passkey (WebAuthn / FIDO2)</h4>
                    <p className="text-[10px] text-[#86948a]">
                      Huella dactilar, Face ID, Windows Hello o PIN de dispositivo
                    </p>
                  </div>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-[#10b981]/20 text-[#10b981] font-bold">
                  {passkeys.length > 0 ? `${passkeys.length} Activa(s)` : 'Disponible'}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN PASSKEYS REGISTRADAS */}
          <div className="space-y-3 pt-2 border-t border-[#3c4a42]/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                Tus Passkeys en este Dispositivo ({passkeys.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddInput(!showAddInput)}
                className="text-[10px] font-bold text-[#10b981] hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Agregar otra Passkey</span>
              </button>
            </div>

            {/* Formulario para agregar Passkey */}
            {showAddInput && (
              <div className="p-3 rounded-2xl bg-[#121620] border border-[#10b981]/50 space-y-2.5 animate-in fade-in">
                <label className="text-[10px] font-bold text-[#86948a] block">
                  Nombre descriptivo de la Passkey:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ej: iPhone Personal, Touch ID Mac"
                    value={newPasskeyName}
                    onChange={(e) => setNewPasskeyName(e.target.value)}
                    className="flex-1 bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                  <button
                    type="button"
                    disabled={isRegistering}
                    onClick={handleCreatePasskey}
                    className="px-4 py-1.5 rounded-xl bg-[#10b981] text-[#003824] font-bold text-xs active:scale-95 transition-all shadow"
                  >
                    {isRegistering ? 'Creando...' : 'Crear'}
                  </button>
                </div>
                <p className="text-[9px] text-[#86948a]">
                  Tu sistema operativo abrirá la ventana para validar tu huella, rostro o PIN local.
                </p>
              </div>
            )}

            {passkeys.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-center space-y-2">
                <span className="material-symbols-outlined text-[24px] text-[#86948a]">vpn_key</span>
                <p className="text-xs font-bold text-white">No tienes ninguna Passkey registrada</p>
                <p className="text-[10px] text-[#86948a] max-w-xs mx-auto">
                  Configura una Passkey para acceder al instante sin tener que escribir contraseñas.
                </p>
                <button
                  type="button"
                  onClick={handleCreatePasskey}
                  disabled={isRegistering || !supported}
                  className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] font-black text-xs inline-flex items-center gap-1.5 shadow active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                  <span>Configurar inicio de sesión con Passkey</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {passkeys.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">key</span>
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">{p.name}</h5>
                        <p className="text-[9px] text-[#86948a]">
                          {p.deviceType} • Creada: {new Date(p.createdAt).toLocaleDateString('es-CR')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePasskey(p.id, p.name)}
                      title="Eliminar esta Passkey"
                      className="w-8 h-8 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 flex items-center justify-center transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SESIONES Y DISPOSITIVOS ACTIVOS */}
          <div className="space-y-3 pt-2 border-t border-[#3c4a42]/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                Dispositivos y Sesiones Activas
              </span>
              <button
                type="button"
                onClick={handleLogoutOthers}
                className="text-[10px] font-bold text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                <span>Cerrar sesión en otros dispositivos</span>
              </button>
            </div>

            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#262a33] text-[#dfe2ee] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">devices</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-bold text-white">{s.deviceName}</h5>
                        {s.isCurrent && (
                          <span className="text-[8px] bg-[#10b981] text-[#003824] px-1 rounded font-black uppercase">
                            Este dispositivo
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-[#86948a]">
                        {s.browser} • {s.ipLocation} • {s.lastActive}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MÉTODO ALTERNATIVO DE RECUPERACIÓN */}
          <div className="p-4 rounded-2xl bg-[#0f131c] border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Método Alternativo de Recuperación</span>
            </div>
            <p className="text-[10px] text-[#86948a] leading-relaxed">
              Para evitar quedarte bloqueado si pierdes tu dispositivo o Passkey biométrica, Finexa siempre mantiene activa tu alternativa de acceso mediante <strong>PIN de 4 dígitos y Pregunta Secreta</strong> o inicio de sesión con tu cuenta de correo verificada.
            </p>
            <button
              type="button"
              onClick={onOpenPinSetup}
              className="text-xs text-[#10b981] hover:underline font-bold"
            >
              Configurar o cambiar pregunta de seguridad →
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3c4a42]/40 bg-[#121620] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-xs font-bold text-white"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
