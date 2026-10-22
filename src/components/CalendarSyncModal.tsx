import React, { useState } from 'react';
import { DebtItem, SubscriptionItem } from '../types';
import {
  signInWithGoogleCalendar,
  getCachedCalendarToken,
  setCachedCalendarToken,
} from '../lib/firebase';
import {
  syncDebtReminderToGoogle,
  syncSubscriptionReminderToGoogle,
  syncDepositReminderToGoogle,
  generateIcsCalendar,
  downloadUniversalIcs,
  openGoogleCalendarWebEvent,
  openWhatsAppPaymentReminder,
} from '../services/calendarService';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  debts: DebtItem[];
  subscriptions: SubscriptionItem[];
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  debts,
  subscriptions,
}) => {
  const [activeTab, setActiveTab] = useState<'deudas' | 'suscripciones' | 'depositos'>('deudas');
  const [calendarToken, setCalendarToken] = useState<string | null>(getCachedCalendarToken());
  const [userGoogleEmail, setUserGoogleEmail] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Depósito manual personalizado para agendar en calendario
  const [depositTitle, setDepositTitle] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [depositNotes, setDepositNotes] = useState('');

  // Dialogo de confirmación explícita para sincronizar en lote
  const [pendingBulkAction, setPendingBulkAction] = useState<null | {
    title: string;
    description: string;
    onConfirm: () => void;
  }>(null);

  if (!isOpen) return null;

  const handleConnectGoogleCalendar = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    try {
      const res = await signInWithGoogleCalendar();
      setCalendarToken(res.token);
      setUserGoogleEmail(res.email || 'Conectado');
      setSuccessMessage('¡Google Calendar conectado exitosamente!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al conectar con Google Calendar.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    setCachedCalendarToken(null);
    setCalendarToken(null);
    setUserGoogleEmail(null);
    setSuccessMessage('Sesión de Google Calendar desconectada.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Sincronizar una deuda individual
  const handleSyncDebt = async (debt: DebtItem) => {
    setErrorMessage(null);
    const dueDate = debt.dueDate || new Date().toISOString().split('T')[0];
    const amount = debt.totalAmount || 0;
    if (!calendarToken) {
      // Si no tiene token directo, sugerir conectar o abrir en web
      openGoogleCalendarWebEvent({
        title: `Pago de Deuda: ${debt.name}`,
        date: dueDate,
        notes: `Monto pendiente: ₡${amount.toLocaleString()} | Detalle: ${debt.creditorOrNote || 'N/A'}`,
      });
      return;
    }

    setSyncingId(debt.id);
    try {
      await syncDebtReminderToGoogle(calendarToken, debt);
      setSuccessMessage(`¡Recordatorio de "${debt.name}" programado en tu Google Calendar!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('token')) {
        setCalendarToken(null);
        setErrorMessage('El permiso de Google Calendar expiró. Por favor reconecta tu cuenta.');
      } else {
        setErrorMessage(err.message || 'Error al agendar en Google Calendar.');
      }
    } finally {
      setSyncingId(null);
    }
  };

  // Sincronizar una suscripción individual
  const handleSyncSubscription = async (sub: SubscriptionItem) => {
    setErrorMessage(null);
    if (!calendarToken) {
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth(), sub.billingDay || 1).toISOString().split('T')[0];
      openGoogleCalendarWebEvent({
        title: `Pago recurrente: ${sub.name}`,
        date: targetDate,
        notes: `Cobro recurrente mensual de ${sub.currency === 'USD' ? '$' : '₡'}${sub.amount.toLocaleString()}`,
      });
      return;
    }

    setSyncingId(sub.id);
    try {
      await syncSubscriptionReminderToGoogle(calendarToken, sub);
      setSuccessMessage(`¡Cobro mensual de "${sub.name}" programado en tu Google Calendar!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al agendar en Google Calendar.');
    } finally {
      setSyncingId(null);
    }
  };

  // Sincronizar depósito
  const handleSyncDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositTitle.trim() || !depositAmount) {
      setErrorMessage('Por favor indica el título y el monto del depósito.');
      return;
    }

    const amt = parseFloat(depositAmount.replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Ingresa un monto válido.');
      return;
    }

    if (!calendarToken) {
      openGoogleCalendarWebEvent({
        title: `Depósito / Ingreso: ${depositTitle}`,
        date: depositDate,
        notes: `Depósito proyectado de ₡${amt.toLocaleString()}\n${depositNotes}`,
      });
      return;
    }

    setSyncingId('deposit-manual');
    try {
      await syncDepositReminderToGoogle(calendarToken, {
        title: depositTitle,
        amount: amt,
        date: depositDate,
        notes: depositNotes,
      });
      setSuccessMessage(`¡Depósito "${depositTitle}" agendado en tu Google Calendar!`);
      setDepositTitle('');
      setDepositAmount('');
      setDepositNotes('');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al agendar en Google Calendar.');
    } finally {
      setSyncingId(null);
    }
  };

  // Sincronizar todo en lote con confirmación obligatoria
  const triggerBulkSyncConfirm = () => {
    const totalItems = debts.length + subscriptions.length;
    if (totalItems === 0) {
      setErrorMessage('No tienes deudas ni suscripciones pendientes para sincronizar.');
      return;
    }

    setPendingBulkAction({
      title: '¿Sincronizar todos tus pagos con Google Calendar?',
      description: `Se crearán automáticamente ${debts.length} recordatorios de deudas y ${subscriptions.length} eventos recurrentes de suscripciones directamente en tu calendario principal.`,
      onConfirm: async () => {
        setPendingBulkAction(null);
        if (!calendarToken) {
          handleConnectGoogleCalendar();
          return;
        }

        setSyncingId('bulk-sync');
        let count = 0;
        try {
          for (const d of debts) {
            await syncDebtReminderToGoogle(calendarToken, d);
            count++;
          }
          for (const s of subscriptions) {
            await syncSubscriptionReminderToGoogle(calendarToken, s);
            count++;
          }
          setSuccessMessage(`¡Se sincronizaron exitosamente ${count} pagos en tu Google Calendar!`);
          setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
          setErrorMessage(err.message || 'Hubo un inconveniente durante la sincronización.');
        } finally {
          setSyncingId(null);
        }
      },
    });
  };

  // Exportar archivo .ics universal para iPhone, Outlook, Mac o Android
  const handleExportUniversalIcs = () => {
    const calendarEvents: any[] = [];

    debts.forEach((d) => {
      const amount = d.totalAmount || 0;
      const dueDate = d.dueDate || new Date().toISOString().split('T')[0];
      calendarEvents.push({
        id: `debt-${d.id}`,
        title: `💳 Pagar Deuda: ${d.name} (₡${amount.toLocaleString()})`,
        amount: amount,
        date: dueDate,
        notes: `Detalle: ${d.creditorOrNote || 'Personal'}`,
        type: 'deuda',
      });
    });

    subscriptions.forEach((s) => {
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth(), s.billingDay || 1).toISOString().split('T')[0];
      calendarEvents.push({
        id: `sub-${s.id}`,
        title: `🔄 Cobro: ${s.name} (${s.currency === 'USD' ? '$' : '₡'}${s.amount.toLocaleString()})`,
        amount: s.amount,
        date: targetDate,
        notes: `Suscripción mensual a ${s.name} (${s.category})`,
        type: 'suscripcion',
        recurrenceMonthly: true,
      });
    });

    if (calendarEvents.length === 0) {
      setErrorMessage('No hay deudas ni suscripciones para exportar.');
      return;
    }

    const icsString = generateIcsCalendar(calendarEvents);
    downloadUniversalIcs('Finexa_Pagos_Calendario.ics', icsString);
    setSuccessMessage('¡Archivo .ics descargado! Ábrelo en tu celular para agregarlo a tu calendario nativo.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#11141c] border border-[#2b352e] rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2b352e]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1a73e8] to-[#4285f4] flex items-center justify-center text-white shadow-lg shadow-[#1a73e8]/20">
              <span className="material-symbols-outlined text-[22px]">calendar_month</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Conectar con Calendario
                <span className="text-[10px] bg-[#1a73e8]/20 text-[#4285f4] px-2 py-0.5 rounded-full font-bold border border-[#1a73e8]/30">
                  Google & Móvil
                </span>
              </h2>
              <p className="text-[11px] text-[#86948a]">
                Programa alertas automáticas para pagos de deudas, suscripciones y depósitos
              </p>
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

        {/* Notificaciones de éxito o error */}
        {successMessage && (
          <div className="mt-3 p-3 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] text-xs flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-[#f43f5e]/15 border border-[#f43f5e]/40 text-[#f43f5e] text-xs flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Tarjeta de Estado de Google Calendar */}
        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-[#181f2c] via-[#141b26] to-[#181c24] border border-[#1a73e8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white">Google Calendar API</span>
                {calendarToken ? (
                  <span className="text-[9px] bg-[#10b981]/20 text-[#10b981] px-1.5 py-0.2 rounded font-bold border border-[#10b981]/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                    Conectado
                  </span>
                ) : (
                  <span className="text-[9px] bg-[#86948a]/20 text-[#86948a] px-1.5 py-0.2 rounded font-semibold">
                    No sincronizado
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#86948a]">
                {calendarToken
                  ? userGoogleEmail || 'Sincronización activa en tu calendario principal'
                  : 'Sincroniza tus fechas de pago en tu cuenta de Google'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {calendarToken ? (
              <button
                type="button"
                onClick={handleDisconnectGoogleCalendar}
                className="px-3 py-1.5 rounded-xl bg-[#28303f]/50 hover:bg-[#28303f] text-[#86948a] hover:text-white text-xs font-semibold transition-colors"
              >
                Desconectar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectGoogleCalendar}
                disabled={isConnecting}
                className="px-3 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Conectando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                    Conectar con Google
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Acciones Rápidas en Lote */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={triggerBulkSyncConfirm}
            disabled={syncingId === 'bulk-sync'}
            className="p-2.5 rounded-xl bg-[#1a73e8]/15 hover:bg-[#1a73e8]/25 border border-[#1a73e8]/40 text-left flex items-center gap-2.5 transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-[#1a73e8] text-white flex items-center justify-center shrink-0 shadow">
              <span className="material-symbols-outlined text-[16px]">all_inclusive</span>
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-white group-hover:text-[#4285f4] block truncate">
                Sincronizar Todo
              </span>
              <p className="text-[9px] text-[#86948a] truncate">Todas las deudas y cobros</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleExportUniversalIcs}
            className="p-2.5 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/40 text-left flex items-center gap-2.5 transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-[#10b981] text-[#003824] flex items-center justify-center shrink-0 shadow font-bold">
              <span className="material-symbols-outlined text-[16px]">download</span>
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-white group-hover:text-[#10b981] block truncate">
                Descargar .ICS
              </span>
              <p className="text-[9px] text-[#86948a] truncate">Apple / Outlook / Móvil</p>
            </div>
          </button>
        </div>

        {/* Pestañas de Secciones */}
        <div className="mt-4 flex border-b border-[#2b352e]">
          <button
            type="button"
            onClick={() => setActiveTab('deudas')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'deudas'
                ? 'border-[#10b981] text-[#10b981]'
                : 'border-transparent text-[#86948a] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">credit_card</span>
            Deudas ({debts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suscripciones')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'suscripciones'
                ? 'border-[#a855f7] text-[#c084fc]'
                : 'border-transparent text-[#86948a] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">event_repeat</span>
            Suscripciones ({subscriptions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('depositos')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'depositos'
                ? 'border-[#06b6d4] text-[#22d3ee]'
                : 'border-transparent text-[#86948a] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">payments</span>
            Depósitos
          </button>
        </div>

        {/* Contenido de cada pestaña */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5">
          {/* TAB 1: DEUDAS */}
          {activeTab === 'deudas' && (
            <div className="space-y-2">
              {debts.length === 0 ? (
                <div className="p-6 text-center text-[#86948a] text-xs">
                  <span className="material-symbols-outlined text-[32px] mb-1 opacity-50 block">check_circle</span>
                  No tienes deudas activas registradas. ¡Excelente trabajo!
                </div>
              ) : (
                debts.map((debt) => (
                  <div
                    key={debt.id}
                    className="p-3 rounded-2xl bg-[#181c24] border border-[#2b352e] hover:border-[#10b981]/40 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{debt.name}</h4>
                        <span className="text-[9px] bg-[#f43f5e]/15 text-[#f43f5e] font-bold px-1.5 py-0.2 rounded">
                          ₡{(debt.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#86948a] mt-0.5 flex items-center gap-1.5">
                        <span>📅 Vence: {debt.dueDate || 'Sin fecha'}</span>
                        {debt.creditorOrNote && <span>• {debt.creditorOrNote}</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Botón WhatsApp */}
                      <button
                        type="button"
                        title="Enviar recordatorio por WhatsApp"
                        onClick={() => openWhatsAppPaymentReminder(debt.name, debt.totalAmount || 0, debt.dueDate || '', debt.creditorOrNote)}
                        className="w-7 h-7 rounded-lg bg-[#25d366]/20 text-[#25d366] hover:bg-[#25d366] hover:text-white flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">chat</span>
                      </button>

                      {/* Botón Google Calendar */}
                      <button
                        type="button"
                        onClick={() => handleSyncDebt(debt)}
                        disabled={syncingId === debt.id}
                        className="px-2.5 py-1 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[11px] font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1 disabled:opacity-50"
                      >
                        {syncingId === debt.id ? (
                          <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[13px]">add_alert</span>
                        )}
                        Agendar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SUSCRIPCIONES */}
          {activeTab === 'suscripciones' && (
            <div className="space-y-2">
              {subscriptions.length === 0 ? (
                <div className="p-6 text-center text-[#86948a] text-xs">
                  <span className="material-symbols-outlined text-[32px] mb-1 opacity-50 block">event_busy</span>
                  Aún no has agregado suscripciones o servicios fijos recurrentes.
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-2xl bg-[#181c24] border border-[#2b352e] hover:border-[#a855f7]/40 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate">{sub.name}</h4>
                        <span className="text-[9px] bg-[#a855f7]/20 text-[#c084fc] font-bold px-1.5 py-0.2 rounded">
                          {sub.currency === 'USD' ? '$' : '₡'}{sub.amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#86948a] mt-0.5">
                        🔄 Cobro los días {sub.billingDay || 1} de cada mes ({sub.category})
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSyncSubscription(sub)}
                        disabled={syncingId === sub.id}
                        className="px-2.5 py-1 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-[11px] font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1 disabled:opacity-50"
                      >
                        {syncingId === sub.id ? (
                          <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
                        ) : (
                          <span className="material-symbols-outlined text-[13px]">event_repeat</span>
                        )}
                        Mensual
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: DEPÓSITOS PROGRAMADOS */}
          {activeTab === 'depositos' && (
            <form onSubmit={handleSyncDeposit} className="space-y-3 p-1">
              <div className="p-3 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#06b6d4] text-[11px] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>Programa recordatorios para depósitos bancarios, quincenas o transferencias que esperas recibir.</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86948a] mb-1">
                  Concepto del Depósito / Ingreso
                </label>
                <input
                  type="text"
                  placeholder="Ej: Pago de Salario, Quincena, Venta, Liquidación..."
                  value={depositTitle}
                  onChange={(e) => setDepositTitle(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#2b352e] focus:border-[#06b6d4] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5a6660] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86948a] mb-1">
                    Monto Proyectado (₡)
                  </label>
                  <input
                    type="number"
                    placeholder="Monto ₡"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-[#181c24] border border-[#2b352e] focus:border-[#06b6d4] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5a6660] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#86948a] mb-1">
                    Fecha del Depósito
                  </label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full bg-[#181c24] border border-[#2b352e] focus:border-[#06b6d4] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86948a] mb-1">
                  Notas o Banco Destino (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cuenta BAC en colones o transferencia sinpe"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full bg-[#181c24] border border-[#2b352e] focus:border-[#06b6d4] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5a6660] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={syncingId === 'deposit-manual'}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0891b2] to-[#06b6d4] hover:from-[#0e7490] hover:to-[#0891b2] text-white text-xs font-bold transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {syncingId === 'deposit-manual' ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    Guardando en calendario...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">add_task</span>
                    Agendar Depósito en Calendario
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Modal de Confirmación para Operaciones Mutables en Lote */}
        {pendingBulkAction && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
            <div className="bg-[#181c24] border border-[#1a73e8]/50 rounded-2xl p-4 max-w-sm w-full text-center space-y-3 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-[#1a73e8]/20 text-[#4285f4] mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">calendar_add_on</span>
              </div>
              <h3 className="text-sm font-bold text-white">{pendingBulkAction.title}</h3>
              <p className="text-xs text-[#86948a] leading-relaxed">
                {pendingBulkAction.description}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingBulkAction(null)}
                  className="flex-1 py-2 rounded-xl bg-[#28303f] hover:bg-[#343e50] text-white text-xs font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={pendingBulkAction.onConfirm}
                  className="flex-1 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold transition-colors shadow"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
