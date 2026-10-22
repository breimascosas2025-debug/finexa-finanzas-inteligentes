import React, { useState, useEffect } from 'react';
import { Account, DebtItem, SecurityConfig, Transaction, UserProfile } from '../../types';
import { AvatarSelector } from '../AvatarSelector';
import { PasskeysSecurityModal } from '../PasskeysSecurityModal';
import {
  fetchGoogleCalendars,
  GoogleCalendarItem,
  DEFAULT_CALENDAR_SCOPES,
} from '../../services/calendarService';
import {
  exportToGoogleSheetsFull,
  getStoredSheetsConfig,
  saveStoredSheetsConfig,
  GoogleSheetsConfig,
} from '../../services/workspaceAppsService';
import {
  getStoredNvidiaConfig,
  testNvidiaConnection,
  checkServerPrivateAiStatus,
  NvidiaAiConfig,
} from '../../services/nvidiaAiService';
import { signInWithGoogleCalendar, setCachedCalendarToken, getCachedCalendarToken } from '../../lib/firebase';
import { isPasskeySupported, getStoredPasskeys } from '../../services/webauthnService';
import { SiriOrb } from '../SiriOrb';

interface PerfilViewProps {
  user: UserProfile;
  security: SecurityConfig;
  accounts?: Account[];
  transactions?: Transaction[];
  debts?: DebtItem[];
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onOpenPinSetup: () => void;
  onLockApp: () => void;
  onLogout: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
  onOpenPrivacyTerms?: (tab?: any) => void;
  onOpenPermissions?: () => void;
  onOpenAiAssistant?: () => void;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onForceSync?: () => void;
  onPushToCloud?: () => Promise<void>;
  onPullFromCloud?: () => Promise<void>;
}

export const PerfilView: React.FC<PerfilViewProps> = ({
  user,
  security,
  accounts = [],
  transactions = [],
  debts = [],
  onUpdateUser,
  onOpenPinSetup,
  onLockApp,
  onLogout,
  onExportData,
  onImportData,
  onResetData,
  onOpenPrivacyTerms,
  onOpenPermissions,
  onOpenAiAssistant,
  syncStatus = 'synced',
  onForceSync,
  onPushToCloud,
  onPullFromCloud,
}) => {
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editAvatar, setEditAvatar] = useState(user.avatarUrl || '💼');
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Passkeys & Security modal
  const [isPasskeysModalOpen, setIsPasskeysModalOpen] = useState(false);
  const [registeredPasskeysCount, setRegisteredPasskeysCount] = useState(0);

  // Google Calendar integration states
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [calendarList, setCalendarList] = useState<GoogleCalendarItem[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [calendarFeedback, setCalendarFeedback] = useState<string | null>(null);

  // Google Sheets integration states
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(getStoredSheetsConfig);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [sheetsFeedback, setSheetsFeedback] = useState<string | null>(null);
  const [lastSheetUrl, setLastSheetUrl] = useState<string | null>(null);

  // NVIDIA AI integration states
  const [nvidiaConfig, setNvidiaConfig] = useState<NvidiaAiConfig>(getStoredNvidiaConfig);
  const [isTestingNvidia, setIsTestingNvidia] = useState(false);
  const [nvidiaFeedback, setNvidiaFeedback] = useState<{ text: string; success: boolean } | null>(null);

  useEffect(() => {
    if (user.email) {
      const keys = getStoredPasskeys(user.email);
      setRegisteredPasskeysCount(keys.length);
    }
    const token = getCachedCalendarToken();
    if (token) {
      setCalendarConnected(true);
      setCalendarToken(token);
    }

    // Verificar si la clave de NVIDIA está configurada de forma privada en el servidor (.env)
    checkServerPrivateAiStatus().then((res) => {
      if (res.configured) {
        setNvidiaConfig((prev) => ({
          ...prev,
          status: 'connected',
          isServerPrivate: true,
        }));
      }
    });
  }, [user.email]);

  const handleManualPush = async () => {
    if (!onPushToCloud) return;
    setSyncFeedback('Subiendo datos a la nube...');
    try {
      await onPushToCloud();
      setSyncFeedback('¡Datos subidos a la nube con éxito! Ahora están disponibles en tu PC.');
    } catch {
      setSyncFeedback('Error al subir. Intenta de nuevo.');
    }
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleManualPull = async () => {
    if (!onPullFromCloud) return;
    setSyncFeedback('Descargando datos desde la nube...');
    try {
      await onPullFromCloud();
      setSyncFeedback('¡Datos descargados y actualizados desde la nube!');
    } catch {
      setSyncFeedback('Error al descargar. Intenta de nuevo.');
    }
    setTimeout(() => setSyncFeedback(null), 5000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdateUser({
      name: editName.trim(),
      email: editEmail.trim(),
      avatarUrl: editAvatar,
    });
    setIsEditingUser(false);
  };

  // Google Calendar handlers
  const handleConnectCalendar = async () => {
    setCalendarFeedback('Iniciando sesión con Google...');
    try {
      const { token } = await signInWithGoogleCalendar();
      setCalendarToken(token);
      setCalendarConnected(true);
      setCalendarFeedback('¡Google Calendar conectado con éxito!');
      // Fetch calendars automatically
      handleConsultCalendars(token);
    } catch (err: any) {
      setCalendarFeedback(`Error al conectar: ${err.message || 'Verificación cancelada'}`);
    }
  };

  const handleDisconnectCalendar = () => {
    setCachedCalendarToken(null);
    setCalendarToken(null);
    setCalendarConnected(false);
    setCalendarList([]);
    setCalendarFeedback('Conexión con Google Calendar desactivada.');
  };

  const handleConsultCalendars = async (tokenToUse?: string) => {
    const token = tokenToUse || calendarToken;
    if (!token) {
      setCalendarFeedback('Primero debes conectar tu cuenta de Google Calendar.');
      return;
    }
    setIsLoadingCalendars(true);
    setCalendarFeedback(null);
    try {
      const list = await fetchGoogleCalendars(token);
      setCalendarList(list);
      setCalendarFeedback(`Se encontraron ${list.length} calendarios en tu cuenta.`);
    } catch (err: any) {
      setCalendarFeedback(`Error al consultar calendarios: ${err.message}`);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  // Google Sheets handlers
  const handleExportSheets = async () => {
    let token = calendarToken || getCachedCalendarToken();
    if (!token) {
      setSheetsFeedback('Conectando con tu cuenta de Google...');
      try {
        const authResult = await signInWithGoogleCalendar();
        token = authResult.token;
        setCalendarToken(token);
      } catch (err: any) {
        setSheetsFeedback('Se requiere autorizar la cuenta de Google para exportar a Google Sheets.');
        return;
      }
    }

    setIsExportingSheets(true);
    setSheetsFeedback('Exportando estructura financiera a Google Sheets...');
    try {
      const res = await exportToGoogleSheetsFull(token, accounts, transactions, debts, {
        mode: sheetsConfig.mode,
        existingSpreadsheetId: sheetsConfig.spreadsheetId,
      });
      setLastSheetUrl(res.spreadsheetUrl);
      setSheetsFeedback(res.message);
      if (res.spreadsheetId && sheetsConfig.mode === 'create_new') {
        const updated = { ...sheetsConfig, spreadsheetId: res.spreadsheetId };
        setSheetsConfig(updated);
        saveStoredSheetsConfig(updated);
      }
    } catch (err: any) {
      setSheetsFeedback(`Error al sincronizar con Google Sheets: ${err.message}`);
    } finally {
      setIsExportingSheets(false);
    }
  };

  // NVIDIA AI handlers
  const handleTestNvidia = async () => {
    setIsTestingNvidia(true);
    setNvidiaFeedback(null);
    try {
      const res = await testNvidiaConnection(nvidiaConfig);
      setNvidiaFeedback({
        success: res.success,
        text: res.message,
      });
      setNvidiaConfig(getStoredNvidiaConfig());
    } finally {
      setIsTestingNvidia(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* TARJETA DE PERFIL DE USUARIO */}
      <section className="p-5 rounded-3xl bg-gradient-to-br from-[#181c24] via-[#1c2028] to-[#121620] border border-[#3c4a42]/40 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-[#10b981]/20 border-2 border-[#10b981] flex items-center justify-center text-2xl overflow-hidden shadow-lg shadow-[#10b981]/20">
              {user.avatarUrl && user.avatarUrl.length > 5 ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user.avatarUrl || '💼'}</span>
              )}
            </div>
            {user.isGoogleConnected && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md p-0.5" title="Cuenta Google vinculada">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </span>
            )}
          </div>

          <div className="overflow-hidden flex-1">
            <h3 className="text-base font-bold text-white truncate">{user.name}</h3>
            <p className="text-xs text-[#86948a] truncate">{user.email || 'Control financiero manual'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] text-[10px] font-bold border border-[#10b981]/25">
                Costa Rica (CRC ₡)
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditName(user.name);
                  setEditEmail(user.email);
                  setIsEditingUser(!isEditingUser);
                }}
                className="text-[10px] text-[#86948a] hover:text-white underline font-semibold"
              >
                {isEditingUser ? 'Cancelar' : 'Editar datos'}
              </button>
            </div>
          </div>
        </div>

        {/* Edit user form */}
        {isEditingUser && (
          <form onSubmit={handleSaveProfile} className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Nombre</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#262a33] border border-[#3c4a42]/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-[#262a33] border border-[#3c4a42]/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Foto o Icono de Perfil</label>
              <AvatarSelector selectedAvatar={editAvatar} onSelectAvatar={setEditAvatar} compact />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow transition-all active:scale-95"
            >
              Guardar Cambios de Perfil
            </button>
          </form>
        )}
      </section>

      {/* SECCIÓN SEGURIDAD MODERNA: PASSKEYS & PIN (Requisito 8) */}
      <section className="p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">security</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Seguridad & Métodos de Acceso</h4>
              <p className="text-[10px] text-[#86948a]">
                Passkeys (FIDO2), PIN de 4 dígitos y sesiones activas
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981]">
            {isPasskeySupported() ? 'WebAuthn Listo' : 'Protegido'}
          </span>
        </div>

        <div className="space-y-2 pt-1">
          {/* Botón Gestión de Passkeys y Sesiones */}
          <button
            type="button"
            onClick={() => setIsPasskeysModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/60 text-xs font-bold text-white flex items-center justify-between active:scale-95 transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#10b981] text-[18px]">fingerprint</span>
              <span>Configurar inicio de sesión con Passkey & Sesiones</span>
            </div>
            <div className="flex items-center gap-1">
              {registeredPasskeysCount > 0 && (
                <span className="text-[9px] bg-[#10b981] text-[#003824] px-1.5 py-0.2 rounded font-black">
                  {registeredPasskeysCount} Passkey(s)
                </span>
              )}
              <span className="material-symbols-outlined text-[#86948a] group-hover:text-white text-[16px]">
                chevron_right
              </span>
            </div>
          </button>

          {/* Botón PIN y Pregunta Secreta */}
          <button
            type="button"
            onClick={onOpenPinSetup}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/60 text-xs font-bold text-[#dfe2ee] flex items-center justify-between active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#ffb95f]">pin</span>
              <span>{security.isPinEnabled ? 'Modificar PIN de 4 dígitos y Pregunta Secreta' : 'Configurar PIN de Acceso'}</span>
            </div>
            <span className="material-symbols-outlined text-[#86948a] text-[16px]">chevron_right</span>
          </button>

          {security.isPinEnabled && (
            <button
              type="button"
              onClick={onLockApp}
              className="w-full py-2 rounded-xl bg-[#ffb95f]/15 hover:bg-[#ffb95f]/25 text-[#ffb95f] border border-[#ffb95f]/30 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span>Bloquear Aplicación Ahora</span>
            </button>
          )}
        </div>
      </section>

      {/* SECCIÓN INTEGRACIONES: GOOGLE CALENDAR, SHEETS & NVIDIA IA */}
      <section className="p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1a73e8]/20 text-[#4285f4] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">hub</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Integraciones Oficiales</h4>
              <p className="text-[10px] text-[#86948a]">
                Google Calendar, Google Sheets y Finexa-Plus
              </p>
            </div>
          </div>
          
          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Servidor Privado Activo</span>
          </span>
        </div>

        {/* 1. GOOGLE CALENDAR (Requisito 3) */}
        <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#4285f4] text-[20px]">calendar_month</span>
              <div>
                <h5 className="text-xs font-bold text-white">Google Calendar</h5>
                <p className="text-[10px] text-[#86948a]">
                  Recordatorios de deudas, suscripciones y depósitos
                </p>
              </div>
            </div>

            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              calendarConnected ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#262a33] text-[#86948a]'
            }`}>
              {calendarConnected ? 'CONECTADO' : 'DESCONECTADO'}
            </span>
          </div>

          <div className="text-[10px] text-[#86948a] bg-[#181c24] p-2.5 rounded-xl border border-[#3c4a42]/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Permisos otorgados:</span>
              <span className="text-[9px] text-[#10b981]">Mínimo necesario</span>
            </div>
            <code className="text-[9px] text-[#4285f4] block truncate">
              {DEFAULT_CALENDAR_SCOPES.join(', ')}
            </code>
            <p className="text-[9px]">
              Permite a Finexa leer, crear y actualizar eventos financieros en tu Google Calendar sin acceder a datos personales ajenos.
            </p>
          </div>

          {calendarFeedback && (
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px]">
              {calendarFeedback}
            </div>
          )}

          {/* Botones de acción de Google Calendar */}
          <div className="flex flex-wrap gap-2">
            {!calendarConnected ? (
              <button
                type="button"
                onClick={handleConnectCalendar}
                className="px-3.5 py-1.5 rounded-xl bg-[#4285f4] hover:bg-[#3367d6] text-white text-xs font-bold flex items-center gap-1.5 shadow active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Conectar Google Calendar</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleConsultCalendars()}
                  disabled={isLoadingCalendars}
                  className="px-3 py-1.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">event_available</span>
                  <span>{isLoadingCalendars ? 'Consultando...' : 'Consultar Calendarios'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectCalendar}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-bold border border-rose-900/40 active:scale-95 transition-all"
                >
                  Desconectar / Revocar
                </button>
              </>
            )}
          </div>

          {/* Lista de Calendarios Consultados */}
          {calendarList.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-white block">Tus Calendarios Detectados:</span>
              <div className="max-h-32 overflow-y-auto space-y-1 no-scrollbar">
                {calendarList.map((cal) => (
                  <div
                    key={cal.id}
                    className="p-2 rounded-xl bg-[#181c24] border border-[#3c4a42]/40 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4285f4]" />
                      <span className="font-bold text-white truncate">{cal.summary}</span>
                      {cal.primary && (
                        <span className="text-[8px] bg-[#10b981]/20 text-[#10b981] px-1 rounded font-bold">
                          Principal
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-[#86948a] shrink-0">{cal.timeZone || 'América/Costa_Rica'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. GOOGLE SHEETS (Requisito 9) */}
        <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#10b981] text-[20px]">table_chart</span>
              <div>
                <h5 className="text-xs font-bold text-white">Google Sheets (Hojas de Cálculo)</h5>
                <p className="text-[10px] text-[#86948a]">
                  Exporta e interactúa con Gastos, Ingresos, Deudas y Reportes
                </p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#86948a]">
            Genera automáticamente la estructura contable de Finexa en Google Drive con pestañas para <strong>Reporte Ejecutivo, Gastos, Ingresos, Deudas y Cuentas</strong>.
          </p>

          {sheetsFeedback && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px]">
              {sheetsFeedback}
            </div>
          )}

          {lastSheetUrl && (
            <a
              href={lastSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/30 flex items-center justify-between text-xs font-bold text-[#10b981] transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                <span className="truncate">Abrir Hoja de Cálculo en Google Sheets</span>
              </div>
              <span className="text-[10px] underline shrink-0">Ver hoja</span>
            </a>
          )}

          {/* Opciones de exportación */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
              sheetsConfig.mode === 'create_new' ? 'bg-[#10b981]/15 border-[#10b981] text-white' : 'bg-[#181c24] border-[#3c4a42] text-[#86948a]'
            }`}>
              <input
                type="radio"
                name="sheets_mode"
                checked={sheetsConfig.mode === 'create_new'}
                onChange={() => {
                  const upd = { ...sheetsConfig, mode: 'create_new' as const };
                  setSheetsConfig(upd);
                  saveStoredSheetsConfig(upd);
                }}
                className="hidden"
              />
              <span className="material-symbols-outlined text-[16px]">add_box</span>
              <span className="font-bold">Crear Hoja Nueva</span>
            </label>

            <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
              sheetsConfig.mode === 'existing_sheet' ? 'bg-[#10b981]/15 border-[#10b981] text-white' : 'bg-[#181c24] border-[#3c4a42] text-[#86948a]'
            }`}>
              <input
                type="radio"
                name="sheets_mode"
                checked={sheetsConfig.mode === 'existing_sheet'}
                onChange={() => {
                  const upd = { ...sheetsConfig, mode: 'existing_sheet' as const };
                  setSheetsConfig(upd);
                  saveStoredSheetsConfig(upd);
                }}
                className="hidden"
              />
              <span className="material-symbols-outlined text-[16px]">drive_file_rename_outline</span>
              <span className="font-bold">Usar Hoja Existente</span>
            </label>
          </div>

          {sheetsConfig.mode === 'existing_sheet' && (
            <div className="space-y-1">
              <label className="text-[9px] text-[#86948a] block">ID de la Hoja de Google Sheets existente:</label>
              <input
                type="text"
                value={sheetsConfig.spreadsheetId || ''}
                onChange={(e) => {
                  const upd = { ...sheetsConfig, spreadsheetId: e.target.value };
                  setSheetsConfig(upd);
                  saveStoredSheetsConfig(upd);
                }}
                placeholder="ej: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="w-full bg-[#181c24] border border-[#3c4a42] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          )}

          <button
            type="button"
            disabled={isExportingSheets}
            onClick={handleExportSheets}
            className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] font-black text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
            <span>{isExportingSheets ? 'Sincronizando con Google Sheets...' : 'Sincronizar Datos con Google Sheets'}</span>
          </button>
        </div>

        {/* 3. ARQUITECTURA DE IA FINEXA-PLUS (GLM 5-3 / NVIDIA NIM) */}
        <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#00d2ff]/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SiriOrb size={32} />
              <div>
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-black text-white">Finexa-Plus</h5>
                  <span className="text-[9px] bg-gradient-to-r from-[#00d2ff]/20 to-[#ec4899]/20 text-[#00d2ff] border border-[#00d2ff]/30 px-1.5 py-0.2 rounded-full font-bold">
                    GLM 5-3
                  </span>
                </div>
                <p className="text-[10px] text-[#86948a]">
                  Copiloto inteligente tipo Siri con servidor proxy privado
                </p>
              </div>
            </div>

            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ACTIVO
            </span>
          </div>

          <p className="text-[10px] text-[#86948a]">
            Finexa-Plus analiza automáticamente tus cuentas, gastos, deudas y metas de ahorro para responder todas tus dudas financieras al instante.
          </p>

          {/* Botón directo para abrir el asistente con Siri Orb */}
          {onOpenAiAssistant && (
            <button
              type="button"
              onClick={onOpenAiAssistant}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-[#00d2ff]/20 via-[#ec4899]/20 to-[#8b5cf6]/20 hover:from-[#00d2ff]/30 hover:to-[#8b5cf6]/30 border border-[#00d2ff]/40 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <SiriOrb size={22} />
              <span>Abrir Asistente Finexa-Plus (Hacer preguntas a la IA)</span>
            </button>
          )}

          {/* Selección de Modelo Único: Finexa-Plus */}
          <div>
            <label className="text-[10px] font-bold text-[#86948a] block mb-1">Modelo Activo:</label>
            <div className="p-2.5 rounded-xl bg-[#181c24] border border-[#00d2ff]/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00d2ff] animate-pulse" />
                <div>
                  <span className="text-xs font-black text-white block">Finexa-Plus</span>
                  <span className="text-[9px] text-[#86948a]">Motor Neural GLM 5-3 de alta precisión financiera</span>
                </div>
              </div>
              <span className="text-[9px] bg-[#00d2ff]/15 text-[#00d2ff] px-2 py-0.5 rounded-full font-black">
                ÚNICO MODELO
              </span>
            </div>
          </div>

          {nvidiaFeedback && (
            <div className={`p-2 rounded-xl text-[10px] flex items-center gap-1.5 ${
              nvidiaFeedback.success
                ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/40'
                : 'bg-rose-950/40 text-rose-300 border border-rose-900/40'
            }`}>
              <span className="material-symbols-outlined text-[14px]">
                {nvidiaFeedback.success ? 'check_circle' : 'error'}
              </span>
              <span>{nvidiaFeedback.text}</span>
            </div>
          )}

          <div className="flex justify-end items-center pt-1">
            <button
              type="button"
              disabled={isTestingNvidia}
              onClick={handleTestNvidia}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#00d2ff] to-[#009bbd] text-[#0a0d14] font-black text-xs shadow flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">sensors</span>
              <span>{isTestingNvidia ? 'Probando...' : 'Probar Conexión'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN COPIAS DE SEGURIDAD & DATOS MANUALES */}
      <section className="p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/40 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#262a33] text-[#10b981] flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Copias de Seguridad (Tus Datos)</h4>
            <p className="text-[10px] text-[#86948a]">
              Exporta o importa tus cuentas y movimientos en JSON
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30 text-xs text-[#10b981] space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span>¿Cómo evitar perder datos al borrar el caché?</span>
          </div>
          <p className="text-[10px] text-[#c0cbd4] leading-relaxed">
            Finexa sincroniza tus datos automáticamente en la nube (Firestore). Sin embargo, para tener absoluta tranquilidad ante limpieza profunda del navegador o cambio de dispositivo, te recomendamos usar <strong className="text-white">"Exportar Copia"</strong> una vez al mes para guardar un archivo <code className="bg-[#181c24] px-1 py-0.5 rounded text-[#10b981]">.json</code> de respaldo en tu celular o PC.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onExportData}
            className="py-2.5 px-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] text-xs font-bold text-white border border-[#3c4a42]/50 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow"
          >
            <span className="material-symbols-outlined text-[16px] text-[#10b981]">download</span>
            <span>Exportar Copia (.JSON)</span>
          </button>

          <label className="py-2.5 px-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] text-xs font-bold text-white border border-[#3c4a42]/50 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer text-center shadow">
            <span className="material-symbols-outlined text-[16px] text-[#10b981]">upload</span>
            <span>Restaurar Copia</span>
            <input type="file" accept=".json" onChange={onImportData} className="hidden" />
          </label>
        </div>

        <div className="pt-2 border-t border-[#3c4a42]/30">
          <button
            type="button"
            onClick={onResetData}
            className="w-full py-2 px-3 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 text-xs font-bold border border-rose-900/30 flex items-center justify-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reiniciar App Limpia (Borrar todos mis datos)</span>
          </button>
        </div>
      </section>

      {/* SECCIÓN TRANSPARENCIA, LEGAL Y PERMISOS */}
      <section className="p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/40 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#262a33] text-[#10b981] flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Centro Legal y Permisos</h4>
            <p className="text-[10px] text-[#86948a]">
              Términos, políticas de privacidad, cookies y seguridad
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenPrivacyTerms && onOpenPrivacyTerms('privacy')}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/60 text-xs font-bold text-[#dfe2ee] flex items-center justify-between active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#10b981]">shield</span>
              <span>Política de Privacidad y Tratamiento de Datos</span>
            </div>
            <span className="material-symbols-outlined text-[#86948a] text-[16px]">chevron_right</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPrivacyTerms && onOpenPrivacyTerms('terms')}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/60 text-xs font-bold text-[#dfe2ee] flex items-center justify-between active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#ffc978]">gavel</span>
              <span>Términos y Condiciones del Servicio</span>
            </div>
            <span className="material-symbols-outlined text-[#86948a] text-[16px]">chevron_right</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenPermissions && onOpenPermissions()}
            className="w-full py-2.5 px-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/60 text-xs font-bold text-[#dfe2ee] flex items-center justify-between active:scale-95 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-blue-400">tune</span>
              <span>Permisos del Sistema (Cámara, Notificaciones, Almacenamiento)</span>
            </div>
            <span className="material-symbols-outlined text-[#86948a] text-[16px]">chevron_right</span>
          </button>
        </div>
      </section>

      {/* Cerrar sesión */}
      <section className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-3 px-4 rounded-2xl bg-[#93000a]/20 hover:bg-[#93000a]/30 text-rose-300 border border-[#93000a]/30 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Cerrar Sesión de Finexa</span>
        </button>
      </section>

      {/* Modal de Passkeys y Sesiones */}
      <PasskeysSecurityModal
        isOpen={isPasskeysModalOpen}
        onClose={() => {
          setIsPasskeysModalOpen(false);
          if (user.email) {
            setRegisteredPasskeysCount(getStoredPasskeys(user.email).length);
          }
        }}
        user={user}
        security={security}
        onOpenPinSetup={() => {
          setIsPasskeysModalOpen(false);
          onOpenPinSetup();
        }}
      />
    </div>
  );
};
