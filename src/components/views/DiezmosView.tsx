import React from 'react';
import { Account, Transaction } from '../../types';
import { calculateTotalIncome } from '../../utils/finance';
import { formatCRC } from '../../utils/formatters';

interface DiezmosViewProps {
  accounts: Account[];
  transactions: Transaction[];
  onOpenQuickAdd: (mode?: any) => void;
  onDeleteTransaction?: (txId: string) => void;
}

export const DiezmosView: React.FC<DiezmosViewProps> = ({
  accounts,
  transactions,
  onOpenQuickAdd,
  onDeleteTransaction,
}) => {
  const totalIncome = calculateTotalIncome(transactions);
  const titheExpected = Math.round(totalIncome * 0.10);

  const titheTransactions = transactions.filter(
    (t) => t.type === 'diezmo' || (t.category === 'Iglesia' && t.type === 'gasto')
  );

  const totalTithesPaid = titheTransactions.reduce((sum, t) => sum + t.amount, 0);
  const tithePending = Math.max(0, titheExpected - totalTithesPaid);
  const percentage = titheExpected > 0 ? Math.min(100, Math.round((totalTithesPaid / titheExpected) * 100)) : 100;

  return (
    <div className="space-y-4 pb-28 select-none">
      {/* Hero Card: Aporte Mensual Acumulado */}
      <section className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-[#181c24] via-[#1c2028] to-[#0a0e16] border border-[#3c4a42]/40 shadow-xl">
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#c0c1ff]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c0c1ff] text-[18px]">
                  church
                </span>
                <span className="text-[11px] font-bold text-[#86948a] uppercase tracking-wider">
                  Diezmo & Aportes de Fidelidad (10%)
                </span>
              </div>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {formatCRC(totalTithesPaid)}
                </span>
              </div>
              <p className="text-xs text-[#86948a] pt-0.5">
                {totalIncome > 0 ? (
                  <>
                    Basado en <strong>{formatCRC(totalIncome)}</strong> de ingresos registrados (10% sugerido: {formatCRC(titheExpected)})
                  </>
                ) : (
                  'Registra tus ingresos para calcular el 10% automáticamente'
                )}
              </p>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-[#c0c1ff]/15 border border-[#c0c1ff]/30 text-[#c0c1ff] text-[11px] font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#c0c1ff]" />
              <span>{percentage}% Cumplido</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-[#0f131c] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#3c4a42]/30">
              <div
                className="bg-gradient-to-r from-[#c0c1ff] to-[#10b981] h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#86948a]">
              <span>Aportado: {formatCRC(totalTithesPaid)}</span>
              <span>{tithePending > 0 ? `Pendiente: ${formatCRC(tithePending)}` : '¡Al día!'}</span>
            </div>
          </div>

          {/* Quick Register Tithe Button */}
          <div className="pt-2 border-t border-[#3c4a42]/30">
            <button
              type="button"
              onClick={() => onOpenQuickAdd('diezmo')}
              className="w-full py-2.5 px-4 rounded-xl bg-[#c0c1ff] hover:bg-[#a8aaff] text-[#1c2028] font-extrabold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow"
            >
              <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
              <span>Registrar Aporte / Diezmo</span>
            </button>
          </div>
        </div>
      </section>

      {/* Historial de Aportes */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-white tracking-tight">
            Historial de Aportes Realizados
          </h3>
          <button
            type="button"
            onClick={() => onOpenQuickAdd('diezmo')}
            className="text-[11px] text-[#c0c1ff] font-bold hover:underline flex items-center gap-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Registrar</span>
          </button>
        </div>

        {titheTransactions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#c0c1ff]/15 text-[#c0c1ff] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[20px]">church</span>
            </div>
            <h4 className="text-xs font-bold text-white">Sin aportes de diezmo aún</h4>
            <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
              Cuando registres un aporte a tu congregación o diezmo, se descontará automáticamente de la cuenta que elijas.
            </p>
            <button
              type="button"
              onClick={() => onOpenQuickAdd('diezmo')}
              className="px-3.5 py-2 rounded-xl bg-[#c0c1ff] text-[#1c2028] font-bold text-xs inline-flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Registrar Diezmo Ahora</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {titheTransactions.map((tx) => {
              const account = accounts.find((a) => a.id === tx.accountId);
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#c0c1ff]/20 text-[#c0c1ff] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">church</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{tx.title}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-[#86948a]">
                        <span>{tx.date}</span>
                        {account && (
                          <>
                            <span>•</span>
                            <span className="text-[#c0c1ff] font-semibold">
                              De: {account.name}
                            </span>
                          </>
                        )}
                        {tx.note && <span>• {tx.note}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#c0c1ff]">
                      -{formatCRC(tx.amount)}
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
