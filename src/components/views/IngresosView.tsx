import React, { useState } from 'react';
import { Account, Transaction } from '../../types';
import { calculateAccountBalance, calculateBalancesByCurrency, calculateTotalIncome } from '../../utils/finance';
import { formatCRC, formatCurrency, SUPPORTED_CURRENCIES } from '../../utils/formatters';

interface IngresosViewProps {
  accounts: Account[];
  transactions: Transaction[];
  onOpenQuickAdd: (mode?: any) => void;
  onDeleteAccount?: (accountId: string) => void;
  onDeleteTransaction?: (txId: string) => void;
}

export const IngresosView: React.FC<IngresosViewProps> = ({
  accounts,
  transactions,
  onOpenQuickAdd,
  onDeleteAccount,
  onDeleteTransaction,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const totalIncome = calculateTotalIncome(transactions);
  const incomeTransactions = transactions.filter((tx) => tx.type === 'ingreso');
  const balancesByCurrency = calculateBalancesByCurrency(accounts, transactions);

  const filteredIncomeTransactions = selectedAccountId
    ? incomeTransactions.filter((tx) => tx.accountId === selectedAccountId)
    : incomeTransactions;

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* Hero Card: Resumen Total de Ingresos */}
      <section className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#181c24] via-[#1c2028] to-[#0a0e16] border border-[#3c4a42]/40 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#10b981]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">
                  payments
                </span>
                <span className="text-[11px] font-bold text-[#86948a] uppercase tracking-wider">
                  Ingresos Totales Registrados
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {formatCRC(totalIncome)}
                </span>
              </div>
              <p className="text-xs text-[#86948a] pt-0.5">
                {accounts.length} {accounts.length === 1 ? 'cuenta configurada' : 'cuentas configuradas'}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenQuickAdd('ingreso')}
                className="px-3 py-1.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-bold flex items-center gap-1 shadow active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Ingreso</span>
              </button>
            </div>
          </div>

          {/* Resumen por divisas si existen cuentas en otras monedas */}
          {balancesByCurrency.length > 0 && (
            <div className="pt-2 border-t border-[#3c4a42]/30 flex flex-wrap gap-2">
              {balancesByCurrency.map((b) => (
                <div
                  key={b.currency}
                  className="px-2.5 py-1 rounded-xl bg-[#0f131c]/70 border border-[#3c4a42]/50 flex items-center gap-1.5"
                >
                  <span className="text-[10px] font-extrabold text-[#10b981]">{b.currency}:</span>
                  <span className="text-xs font-bold text-white">
                    {formatCurrency(b.total, b.currency, b.symbol)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cuentas & Fuentes de Dinero */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Cuentas & Fuentes de Dinero
            </h3>
            <p className="text-[11px] text-[#86948a]">
              Saldos en Dólares ($), Euros (€), Colones (₡) y más
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenQuickAdd('cuenta')}
            className="px-3 py-1.5 rounded-xl bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 hover:bg-[#10b981]/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Agregar Cuentas Diferentes</span>
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#10b981]/15 text-[#10b981] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <h4 className="text-xs font-bold text-white">Sin cuentas creadas todavía</h4>
            <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
              Crea tus cuentas personales o salariales en Dólares, Euros, Colones u otra divisa (ej: &quot;Trabajo David&quot;, &quot;Dalesca USD&quot;, &quot;Efectivo&quot;).
            </p>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('cuenta')}
              className="px-3.5 py-2 rounded-xl bg-[#10b981] text-[#003824] font-bold text-xs inline-flex items-center gap-1 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Agregar Cuentas Diferentes</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {accounts.map((acc) => {
              const bal = calculateAccountBalance(acc, transactions);
              const isSelected = selectedAccountId === acc.id;
              const currency = acc.currency || 'CRC';
              const symbol = acc.currencySymbol || (currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₡');
              const currencyMeta = SUPPORTED_CURRENCIES.find((c) => c.code === currency);

              return (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'bg-[#181c24] border-[#10b981] ring-1 ring-[#10b981]'
                      : 'bg-[#181c24] border-[#3c4a42]/40 hover:border-[#10b981]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-[#262a33] text-[#10b981] flex items-center justify-center font-bold text-xs">
                        {currencyMeta?.flag || <span className="material-symbols-outlined text-[18px]">wallet</span>}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">{acc.name}</h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-[#86948a] uppercase font-semibold">
                            {acc.type}
                          </span>
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#10b981]/20 text-[#10b981]">
                            {currency} ({symbol})
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap ${
                        bal < 0
                          ? 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                          : 'bg-[#10b981]/15 text-[#10b981]'
                      }`}
                    >
                      {formatCurrency(bal, currency, symbol)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#86948a] pt-1.5 border-t border-[#3c4a42]/30">
                    <span>
                      Saldo inicial: <strong className="text-white">{formatCurrency(acc.initialBalance || 0, currency, symbol)}</strong>
                    </span>
                    {onDeleteAccount && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Eliminar la cuenta "${acc.name}"?`)) {
                            onDeleteAccount(acc.id);
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[10px] font-bold hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Historial de Ingresos */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-tight">
              Historial de Ingresos
            </h3>
            {selectedAccountId && (
              <span className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/15 px-2 py-0.5 rounded-full">
                Filtrado por cuenta
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenQuickAdd('ingreso')}
            className="text-[11px] text-[#10b981] font-bold hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Registrar</span>
          </button>
        </div>

        {filteredIncomeTransactions.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center space-y-1.5">
            <p className="text-xs text-[#86948a]">No hay ingresos registrados {selectedAccountId ? 'para esta cuenta' : 'todavía'}.</p>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('ingreso')}
              className="px-3 py-1.5 rounded-xl bg-[#10b981] text-[#003824] font-bold text-xs"
            >
              + Registrar Ingreso
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredIncomeTransactions.map((tx) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              const txCurrency = tx.currency || account?.currency || 'CRC';
              const txSymbol = tx.currencySymbol || account?.currencySymbol || (txCurrency === 'USD' ? '$' : txCurrency === 'EUR' ? '€' : '₡');

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{tx.title}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#86948a]">
                        <span>{tx.date}</span>
                        {account ? (
                          <>
                            <span>•</span>
                            <span className="text-[#10b981] font-bold">{account.name}</span>
                            <span className="text-[9px] px-1 rounded bg-[#10b981]/15 text-[#10b981] font-extrabold">{account.currency || 'CRC'}</span>
                          </>
                        ) : tx.customOrigin ? (
                          <>
                            <span>•</span>
                            <span className="text-[#10b981] font-bold">{tx.customOrigin}</span>
                          </>
                        ) : (
                          <>
                            <span>•</span>
                            <span className="text-[#86948a] italic">Sin cuenta</span>
                          </>
                        )}
                        {tx.note && <span>• {tx.note}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#10b981]">
                      +{formatCurrency(tx.amount, txCurrency, txSymbol)}
                    </span>
                    {onDeleteTransaction && (
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="text-[#86948a] hover:text-rose-400 transition-colors p-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
