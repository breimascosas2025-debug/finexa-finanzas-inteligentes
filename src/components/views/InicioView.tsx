import React, { useState, useEffect } from 'react';
import { Account, AppNotification, AppScreen, DebtItem, Transaction, UserProfile } from '../../types';
import { ActionType } from '../QuickActionsModal';
import { calculateAccountBalance, calculateBalancesByCurrency, calculateTotalBalance, calculateTotalExpenses, calculateTotalIncome, getDebtStatus } from '../../utils/finance';
import { formatCRC, formatCurrency, SUPPORTED_CURRENCIES } from '../../utils/formatters';
import { DueAlertBanner } from '../DueAlertBanner';
import { fetchLiveDollarRate, DollarRateData } from '../../services/exchangeRateService';

interface InicioViewProps {
  user: UserProfile;
  accounts: Account[];
  transactions: Transaction[];
  debts: DebtItem[];
  notifications?: AppNotification[];
  onNavigate: (screen: AppScreen) => void;
  onOpenQuickAction: (action?: ActionType) => void;
  onOpenMenu: () => void;
  onRequestNotifications?: () => void;
  notificationPermission?: string;
}

export const InicioView: React.FC<InicioViewProps> = ({
  user,
  accounts,
  transactions,
  debts,
  notifications = [],
  onNavigate,
  onOpenQuickAction,
  onOpenMenu,
  onRequestNotifications,
  notificationPermission,
}) => {
  // Real dynamic balance calculations based purely on user data
  const totalBalance = calculateTotalBalance(accounts, transactions);
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpenses = calculateTotalExpenses(transactions);
  const balancesByCurrency = calculateBalancesByCurrency(accounts, transactions);

  // Debts calculation
  const totalDebtRemaining = debts.reduce((sum, d) => sum + getDebtStatus(d, transactions).remainingAmount, 0);
  const activeDebtsCount = debts.filter((d) => !getDebtStatus(d, transactions).isPaid).length;

  // Diezmo calculation (10% of total income)
  const titheExpected = Math.round(totalIncome * 0.10);
  const tithesPaid = transactions
    .filter((t) => t.type === 'diezmo' || (t.category === 'Iglesia' && t.type === 'gasto'))
    .reduce((sum, t) => sum + t.amount, 0);
  const tithePending = Math.max(0, titheExpected - tithesPaid);

  // Monitor del dólar en vivo
  const [liveDollar, setLiveDollar] = useState<DollarRateData | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveDollarRate().then((data) => {
      if (isMounted) setLiveDollar(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* User Greeting Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div
            onClick={() => onNavigate('perfil')}
            className="relative cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-[#10b981]/20 border-2 border-[#10b981] flex items-center justify-center text-[#10b981] font-bold text-sm overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10b981] rounded-full ring-2 ring-[#0f131c]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#86948a]">Bienvenido</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#181c24] border border-[#3c4a42]/60 text-[10px] text-[#10b981] font-semibold">
                CRC (₡)
              </span>
            </div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1">
              Hola, {user.name ? user.name.split(' ')[0] : 'Bienvenido'} <span className="text-sm">👋</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181c24] border border-[#3c4a42]/50 text-[#10b981] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>Finexa</span>
          </div>
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-9 h-9 rounded-full bg-[#181c24] border border-[#3c4a42]/50 text-[#dfe2ee] flex items-center justify-center hover:text-white active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">menu</span>
          </button>
        </div>
      </div>

      {/* Ticker Dinámico: Dólar Hoy (Compra y Venta en Costa Rica) */}
      <div
        onClick={() => onOpenQuickAction('dolar_hoy')}
        className="cursor-pointer p-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-[#181c24] via-[#14231b] to-[#181c24] hover:border-[#10b981] border border-[#10b981]/40 flex items-center justify-between transition-all active:scale-[0.99] group shadow-lg shadow-[#10b981]/5"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#10b981] text-[#003824] flex items-center justify-center font-black shadow-md">
            <span className="material-symbols-outlined text-[18px]">attach_money</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-white">Dólar Hoy</span>
              <span className="text-[8px] bg-[#10b981] text-[#003824] px-1 py-0.2 rounded font-black uppercase tracking-wider">
                Nueva
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-[#86948a]">
                Compra: <strong className="text-[#10b981] font-black">₡{liveDollar?.compra?.toFixed(2) || '445.27'}</strong>
              </span>
              <span className="text-[#3c4a42] font-black">•</span>
              <span className="text-[11px] text-[#86948a]">
                Venta: <strong className="text-[#ffb95f] font-black">₡{liveDollar?.venta?.toFixed(2) || '450.00'}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[#10b981] font-bold group-hover:translate-x-0.5 transition-transform shrink-0">
          <span className="hidden sm:inline">Calculadora & Bancos</span>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </div>
      </div>

      {/* Banner de Notificaciones de Deudas, Gastos e Ingresos */}
      <DueAlertBanner
        notifications={notifications}
        onNavigateToScreen={onNavigate}
        onQuickPayDebt={() => onOpenQuickAction('pago_deuda')}
        onRequestNotifications={onRequestNotifications}
        notificationPermission={notificationPermission}
      />

      {/* Hero Grid for Mobile & PC: Balance Disponible Total & Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <section className="md:col-span-2 relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#181c24] via-[#1c2028] to-[#0a0e16] border border-[#3c4a42]/40 shadow-2xl flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#10b981]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#ee9800]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-[11px] font-bold text-[#86948a] uppercase tracking-wider">
                    BALANCE TOTAL DISPONIBLE
                  </span>
                </div>
                <div className="flex items-baseline gap-1 pt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {formatCRC(totalBalance)}
                  </span>
                </div>
                <p className="text-[11px] text-[#86948a]">
                  {accounts.length} {accounts.length === 1 ? 'cuenta activa' : 'cuentas activas'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenQuickAction('cuenta')}
                className="px-3 py-1.5 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/40 text-[#10b981] text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>+ Cuentas</span>
              </button>
            </div>

            {/* Saldos Desglosados por Moneda */}
            {balancesByCurrency.length > 0 && (
              <div className="pt-2 border-t border-[#3c4a42]/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider">
                    Saldos por Moneda:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {balancesByCurrency.map((b) => (
                    <div
                      key={b.currency}
                      className="px-2.5 py-1 rounded-xl bg-[#0f131c]/80 border border-[#3c4a42]/50 flex items-center gap-1.5"
                    >
                      <span className="text-[10px] font-black text-[#10b981]">{b.currency}</span>
                      <span className="text-xs font-bold text-white">
                        {formatCurrency(b.total, b.currency, b.symbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Ingresos & Gastos Quick Cards */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
          <div
            onClick={() => onNavigate('ingresos')}
            className="p-3.5 rounded-2xl bg-[#181c24] border border-[#10b981]/20 cursor-pointer hover:border-[#10b981]/40 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[#10b981] text-[10px] font-bold uppercase">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>Ingresos</span>
              </div>
              <span className="text-[10px] text-[#86948a]">Ver</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-white block mt-1">
              {formatCRC(totalIncome)}
            </span>
          </div>

          <div
            onClick={() => onNavigate('comida')}
            className="p-3.5 rounded-2xl bg-[#181c24] border border-[#ffb95f]/20 cursor-pointer hover:border-[#ffb95f]/40 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[#ffb95f] text-[10px] font-bold uppercase">
                <span className="material-symbols-outlined text-[14px]">trending_down</span>
                <span>Gastos</span>
              </div>
              <span className="text-[10px] text-[#86948a]">Ver</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-white block mt-1">
              {formatCRC(totalExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Cuentas & Fuentes de Dinero */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Mis Fuentes de Dinero
            </h3>
            <span className="text-[10px] text-[#86948a]">
              ({accounts.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenQuickAction('cuenta')}
            className="text-[11px] text-[#10b981] font-bold hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Agregar Cuentas Diferentes</span>
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-4 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/15 text-[#10b981] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <h4 className="text-xs font-bold text-white">No tienes fuentes de dinero creadas</h4>
            <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
              Crea tus cuentas en Dólares ($), Euros (€) o Colones (₡) para que Finexa controle tus saldos automáticamente.
            </p>
            <button
              type="button"
              onClick={() => onOpenQuickAction('cuenta')}
              className="px-3 py-1.5 rounded-xl bg-[#10b981] text-[#003824] font-bold text-xs inline-flex items-center gap-1 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Agregar Cuentas Diferentes</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:overflow-visible no-scrollbar">
            {accounts.map((acc) => {
              const bal = calculateAccountBalance(acc, transactions);
              const currency = acc.currency || 'CRC';
              const symbol = acc.currencySymbol || (currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₡');
              return (
                <div
                  key={acc.id}
                  onClick={() => onNavigate('ingresos')}
                  className="min-w-[145px] md:min-w-0 p-3 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 hover:border-[#10b981]/50 cursor-pointer transition-all shrink-0 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-lg bg-[#262a33] text-[#10b981] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[14px]">wallet</span>
                    </span>
                    <span className="text-[9px] uppercase font-bold text-[#10b981] px-1.5 py-0.5 rounded bg-[#10b981]/15">
                      {currency}
                    </span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white truncate">{acc.name}</h5>
                    <span className={`text-xs font-extrabold block mt-0.5 ${bal < 0 ? 'text-rose-400' : 'text-[#10b981]'}`}>
                      {formatCurrency(bal, currency, symbol)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Quick add card */}
            <button
              type="button"
              onClick={() => onOpenQuickAction('cuenta')}
              className="min-w-[100px] md:min-w-0 p-3 rounded-2xl bg-[#181c24]/50 border border-dashed border-[#3c4a42] hover:border-[#10b981] text-[#86948a] hover:text-white flex flex-col items-center justify-center gap-1 shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] text-[#10b981]">add_circle</span>
              <span className="text-[10px] font-bold">+ Cuentas</span>
            </button>
          </div>
        )}
      </section>

      {/* Deudas & Diezmos Banners */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Deudas Box */}
        <div
          onClick={() => onNavigate('deudas')}
          className="p-3.5 rounded-2xl bg-[#181c24] border border-[#ffb4ab]/25 hover:border-[#ffb4ab]/50 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#ffb4ab] uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">credit_card</span>
              <span>Deudas</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#ffb4ab]/20 text-[#ffb4ab]">
              {activeDebtsCount} activas
            </span>
          </div>
          <div>
            <span className="text-xs text-[#86948a] block">Saldo pendiente:</span>
            <strong className="text-sm font-extrabold text-white">
              {formatCRC(totalDebtRemaining)}
            </strong>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenQuickAction('pago_deuda');
            }}
            className="w-full py-1.5 rounded-xl bg-[#ffb4ab]/15 text-[#ffb4ab] hover:bg-[#ffb4ab]/25 text-[10px] font-bold text-center block transition-colors"
          >
            Abonar a Deuda
          </button>
        </div>

        {/* Diezmos Box */}
        <div
          onClick={() => onNavigate('diezmos')}
          className="p-3.5 rounded-2xl bg-[#181c24] border border-[#c0c1ff]/25 hover:border-[#c0c1ff]/50 cursor-pointer transition-all space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#c0c1ff] uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">church</span>
              <span>Diezmos</span>
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#c0c1ff]/20 text-[#c0c1ff]">
              10%
            </span>
          </div>
          <div>
            <span className="text-xs text-[#86948a] block">
              {tithePending > 0 ? 'Por aportar:' : 'Al día:'}
            </span>
            <strong className="text-sm font-extrabold text-white">
              {formatCRC(tithePending > 0 ? tithePending : tithesPaid)}
            </strong>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenQuickAction('diezmo');
            }}
            className="w-full py-1.5 rounded-xl bg-[#c0c1ff]/15 text-[#c0c1ff] hover:bg-[#c0c1ff]/25 text-[10px] font-bold text-center block transition-colors"
          >
            Registrar Aporte
          </button>
        </div>
      </div>

      {/* Movimientos Recientes */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Movimientos Recientes
          </h3>
          {transactions.length > 0 && (
            <span className="text-[10px] text-[#86948a]">
              {transactions.length} registros
            </span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#262a33] text-[#86948a] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </div>
            <h4 className="text-xs font-bold text-white">Sin movimientos aún</h4>
            <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
              Tus ingresos, gastos y pagos de deudas aparecerán aquí cuando los registres con el botón &quot;+&quot;.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onOpenQuickAction('ingreso')}
                className="px-3 py-1.5 rounded-xl bg-[#10b981] text-[#003824] font-bold text-xs"
              >
                + Ingreso
              </button>
              <button
                type="button"
                onClick={() => onOpenQuickAction('gasto')}
                className="px-3 py-1.5 rounded-xl bg-[#ffb95f] text-[#3e2800] font-bold text-xs"
              >
                - Gasto
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {transactions.slice(0, 6).map((tx) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              const isIncome = tx.type === 'ingreso';
              const isDebt = tx.type === 'pago_deuda';
              const isTransfer = tx.type === 'transferencia';
              const isTithe = tx.type === 'diezmo';
              const txCurrency = tx.currency || account?.currency || 'CRC';
              const txSymbol = tx.currencySymbol || account?.currencySymbol || (txCurrency === 'USD' ? '$' : txCurrency === 'EUR' ? '€' : '₡');

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        isIncome
                          ? 'bg-[#10b981]/20 text-[#10b981]'
                          : isDebt
                          ? 'bg-[#ffb4ab]/20 text-[#ffb4ab]'
                          : isTithe
                          ? 'bg-[#c0c1ff]/20 text-[#c0c1ff]'
                          : isTransfer
                          ? 'bg-[#4edea3]/20 text-[#4edea3]'
                          : 'bg-[#ffb95f]/20 text-[#ffb95f]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isIncome
                          ? 'arrow_downward'
                          : isDebt
                          ? 'payments'
                          : isTithe
                          ? 'church'
                          : isTransfer
                          ? 'swap_horiz'
                          : 'arrow_upward'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white">{tx.title}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#86948a]">
                        <span>{tx.date}</span>
                        {account ? (
                          <>
                            <span>•</span>
                            <span className="text-[#10b981] font-semibold">{account.name}</span>
                            <span className="text-[9px] px-1 rounded bg-[#10b981]/15 text-[#10b981] font-bold">{account.currency || 'CRC'}</span>
                          </>
                        ) : tx.customOrigin ? (
                          <>
                            <span>•</span>
                            <span className="text-[#ffb95f] font-semibold">{tx.customOrigin}</span>
                          </>
                        ) : (
                          <>
                            <span>•</span>
                            <span className="text-[#86948a] italic">Sin cuenta</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-extrabold ${
                      isIncome ? 'text-[#10b981]' : 'text-[#dfe2ee]'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(tx.amount, txCurrency, txSymbol)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
