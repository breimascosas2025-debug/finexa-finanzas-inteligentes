import React, { useState } from 'react';
import { Account, DebtItem, Transaction } from '../../types';
import { getDebtStatus } from '../../utils/finance';
import { formatCRC } from '../../utils/formatters';
import { syncDebtReminderToGoogle } from '../../services/calendarService';
import { getCachedCalendarToken } from '../../lib/firebase';

interface DeudasViewProps {
  debts: DebtItem[];
  transactions: Transaction[];
  accounts: Account[];
  onOpenQuickAdd: (mode?: any) => void;
  onDeleteDebt?: (debtId: string) => void;
  onUpdateDebt?: (debt: DebtItem) => void;
}

export const DeudasView: React.FC<DeudasViewProps> = ({
  debts,
  transactions,
  accounts,
  onOpenQuickAdd,
  onDeleteDebt,
  onUpdateDebt,
}) => {
  const [filter, setFilter] = useState<'todas' | 'pendientes' | 'pagadas'>('pendientes');
  const [syncingDebtId, setSyncingDebtId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleSyncCalendar = async (debt: DebtItem) => {
    const token = getCachedCalendarToken();
    if (!token) {
      onOpenQuickAdd('calendario');
      return;
    }
    setSyncingDebtId(debt.id);
    try {
      const res = await syncDebtReminderToGoogle(token, debt);
      if (res?.id && onUpdateDebt) {
        onUpdateDebt({ ...debt, calendarEventId: res.id });
      }
      setSyncMessage(`¡Recordatorio de "${debt.name}" sincronizado con Google Calendar!`);
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message || 'No se pudo sincronizar'}`);
      setTimeout(() => setSyncMessage(null), 3500);
    } finally {
      setSyncingDebtId(null);
    }
  };

  // Compute total aggregates
  const totalDebtsAmount = debts.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalPaidAmount = debts.reduce((sum, d) => sum + getDebtStatus(d, transactions).paidAmount, 0);
  const totalRemainingAmount = Math.max(0, totalDebtsAmount - totalPaidAmount);
  const overallPercentage = totalDebtsAmount > 0 ? Math.round((totalPaidAmount / totalDebtsAmount) * 100) : 100;

  const filteredDebts = debts.filter((d) => {
    const status = getDebtStatus(d, transactions);
    if (filter === 'pendientes') return !status.isPaid;
    if (filter === 'pagadas') return status.isPaid;
    return true;
  });

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* Hero Card: Resumen Consolidado de Deudas */}
      <section className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#181c24] via-[#1c2028] to-[#0a0e16] border border-[#3c4a42]/40 shadow-xl">
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-[#ffb4ab]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#ffb4ab] text-[18px]">
                  balance
                </span>
                <span className="text-[11px] font-bold text-[#86948a] uppercase tracking-wider">
                  Deuda Total Pendiente
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {formatCRC(totalRemainingAmount)}
                </span>
              </div>
              <p className="text-[11px] text-[#86948a]">
                Total inicial: {formatCRC(totalDebtsAmount)} • Pagado: {formatCRC(totalPaidAmount)}
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ffb4ab]/15 border border-[#ffb4ab]/30">
              <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
              <span className="text-[11px] font-bold text-[#ffb4ab]">
                {overallPercentage}% Pagado
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 rounded-full bg-[#0f131c] overflow-hidden p-0.5 border border-[#3c4a42]/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#4edea3] transition-all duration-500"
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#86948a]">
              <span>Amortización total</span>
              <span>{overallPercentage}% liquidado</span>
            </div>
          </div>

          {/* Quick buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#3c4a42]/30">
            <button
              type="button"
              onClick={() => onOpenQuickAdd('pago_deuda')}
              className="py-2 px-3 rounded-xl bg-[#10b981] text-[#003824] font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">payments</span>
              <span>Abonar a Deuda</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('deuda')}
              className="py-2 px-3 rounded-xl bg-[#262a33] text-[#ffb4ab] border border-[#ffb4ab]/30 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all hover:bg-[#31353e]"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nueva Deuda</span>
            </button>
          </div>
        </div>
      </section>

      {syncMessage && (
        <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <section className="flex bg-[#181c24] p-1 rounded-2xl border border-[#3c4a42]/30 text-xs">
        {(['pendientes', 'todas', 'pagadas'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all capitalize ${
              filter === tab
                ? 'bg-[#262a33] text-white border border-[#3c4a42] shadow'
                : 'text-[#86948a] hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </section>

      {/* Lista de Deudas */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Mis Deudas Registradas
          </h3>
          <span className="text-[11px] text-[#86948a]">
            {filteredDebts.length} {filteredDebts.length === 1 ? 'deuda' : 'deudas'}
          </span>
        </div>

        {filteredDebts.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#ffb4ab]/15 text-[#ffb4ab] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[20px]">credit_card</span>
            </div>
            <h4 className="text-xs font-bold text-white">
              {filter === 'pendientes' ? '¡No tienes deudas pendientes!' : 'No hay deudas en esta lista'}
            </h4>
            <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
              Registra deudas (ej: &quot;Deuda de iglesia&quot;, &quot;Préstamo personal&quot;) para planificar tus amortizaciones.
            </p>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('deuda')}
              className="px-3.5 py-2 rounded-xl bg-[#ffb4ab] text-[#690005] font-bold text-xs inline-flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Registrar una Deuda</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDebts.map((debt) => {
              const status = getDebtStatus(debt, transactions);
              const payments = transactions.filter((t) => t.type === 'pago_deuda' && t.debtId === debt.id);

              return (
                <div
                  key={debt.id}
                  className="p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/40 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{debt.name}</h4>
                        {status.isPaid ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] text-[9px] font-bold">
                            SALDADA
                          </span>
                        ) : status.isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-900/40 text-rose-300 text-[9px] font-bold border border-rose-700/40">
                            VENCIDA
                          </span>
                        ) : status.isDueToday ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-[#ffb95f] text-[9px] font-bold border border-amber-700/40">
                            VENCE HOY
                          </span>
                        ) : status.daysRemaining !== null ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#262a33] text-[#86948a] text-[9px] font-bold">
                            Vence en {status.daysRemaining} días
                          </span>
                        ) : null}
                      </div>

                      {debt.creditorOrNote && (
                        <p className="text-[11px] text-[#86948a] mt-0.5">
                          {debt.creditorOrNote}
                        </p>
                      )}
                    </div>

                    {onDeleteDebt && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar la deuda "${debt.name}"?`)) {
                            onDeleteDebt(debt.id);
                          }
                        }}
                        className="text-[#86948a] hover:text-rose-400 p-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>

                  {/* Amounts row */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/30">
                    <div>
                      <span className="text-[10px] text-[#86948a] block">Saldo Pendiente:</span>
                      <strong className={`text-sm font-extrabold ${status.isPaid ? 'text-[#10b981]' : 'text-[#ffb4ab]'}`}>
                        {formatCRC(status.remainingAmount)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#86948a] block">Monto Total:</span>
                      <strong className="text-sm font-extrabold text-white">
                        {formatCRC(debt.totalAmount)}
                      </strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full h-2 rounded-full bg-[#0f131c] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#10b981] transition-all"
                        style={{ width: `${status.percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#86948a]">
                      <span>Pagado: {formatCRC(status.paidAmount)}</span>
                      <span>{status.percentage}%</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {!status.isPaid && (
                      <button
                        type="button"
                        onClick={() => onOpenQuickAdd('pago_deuda')}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow"
                      >
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span>Abonar</span>
                      </button>
                    )}
                    {debt.dueDate && (
                      <button
                        type="button"
                        disabled={syncingDebtId === debt.id}
                        onClick={() => handleSyncCalendar(debt)}
                        title={debt.calendarEventId ? 'Sincronizado en Google Calendar (clic para refrescar)' : 'Agendar recordatorio en Google Calendar'}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          debt.calendarEventId
                            ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 hover:bg-blue-900/50'
                            : 'bg-[#262a33] border-[#3c4a42] text-[#86948a] hover:text-white hover:border-[#10b981]'
                        } ${!status.isPaid ? 'flex-initial' : 'w-full'}`}
                      >
                        <span className={`material-symbols-outlined text-[16px] ${syncingDebtId === debt.id ? 'animate-spin' : ''}`}>
                          {debt.calendarEventId ? 'event_available' : 'calendar_month'}
                        </span>
                        <span className="text-[11px]">
                          {syncingDebtId === debt.id
                            ? 'Sincronizando...'
                            : debt.calendarEventId
                            ? 'Calendar listo'
                            : 'Agendar'}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Payments history for this debt */}
                  {payments.length > 0 && (
                    <div className="pt-2 border-t border-[#3c4a42]/30 space-y-1">
                      <span className="text-[10px] font-bold text-[#86948a] uppercase">
                        Abonos realizados ({payments.length}):
                      </span>
                      <div className="space-y-1">
                        {payments.map((p) => {
                          const acc = accounts.find((a) => a.id === p.accountId);
                          return (
                            <div key={p.id} className="flex items-center justify-between text-[11px] text-[#dfe2ee]">
                              <span>
                                {p.date} {acc && <strong className="text-[#10b981]">({acc.name})</strong>}
                              </span>
                              <strong className="text-[#10b981]">-{formatCRC(p.amount)}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
