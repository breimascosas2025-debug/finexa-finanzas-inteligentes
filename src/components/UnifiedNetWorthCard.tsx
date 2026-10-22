import React, { useState } from 'react';
import { Account, DebtItem, SavingsGoal, Transaction } from '../types';
import { calculateAccountBalance } from '../utils/finance';
import { formatCRC } from '../utils/formatters';

interface UnifiedNetWorthCardProps {
  accounts: Account[];
  debts: DebtItem[];
  transactions: Transaction[];
  savingsGoals?: SavingsGoal[];
  onOpenQuickAdd?: () => void;
  onNavigate?: (screen: any) => void;
}

export const UnifiedNetWorthCard: React.FC<UnifiedNetWorthCardProps> = ({
  accounts,
  debts,
  transactions,
  savingsGoals = [],
  onOpenQuickAdd,
  onNavigate,
}) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 1. Calcular Activos Totales (Suma de saldos de todas las cuentas + dinero en metas de ahorro)
  const totalAccountAssets = accounts.reduce((sum, acc) => {
    return sum + calculateAccountBalance(acc, transactions);
  }, 0);

  const totalSavingsAssets = savingsGoals.reduce((sum, goal) => {
    return sum + (Number(goal.currentAmount) || 0);
  }, 0);

  const totalAssets = totalAccountAssets + totalSavingsAssets;

  // 2. Calcular Pasivos Totales (Deudas restantes)
  const totalLiabilities = debts.reduce((sum, debt) => {
    const paidForDebt = transactions
      .filter((t) => t.debtId === debt.id && t.type === 'gasto')
      .reduce((tSum, t) => tSum + t.amount, 0);
    const remaining = Math.max(0, debt.totalAmount - paidForDebt);
    return sum + remaining;
  }, 0);

  // 3. Patrimonio Neto Unificado
  const netWorth = totalAssets - totalLiabilities;

  // 4. Ratio de Endeudamiento y Salud Financiera
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : totalLiabilities > 0 ? 100 : 0;

  let healthStatus = {
    label: 'Excelente',
    color: 'text-[#10b981]',
    bgColor: 'bg-[#10b981]/15',
    borderColor: 'border-[#10b981]/40',
    icon: 'verified',
    description: 'Tus activos superan con solidez a tus pasivos.',
  };

  if (totalLiabilities === 0 && totalAssets > 0) {
    healthStatus = {
      label: 'Sin Deudas (100% Libre)',
      color: 'text-[#10b981]',
      bgColor: 'bg-[#10b981]/20',
      borderColor: 'border-[#10b981]/50',
      icon: 'military_tech',
      description: '¡Felicidades! Todo tu dinero es patrimonio limpio.',
    };
  } else if (debtRatio > 70 || (totalAssets <= 0 && totalLiabilities > 0)) {
    healthStatus = {
      label: 'Alto Endeudamiento',
      color: 'text-[#ff5c5c]',
      bgColor: 'bg-[#ff5c5c]/15',
      borderColor: 'border-[#ff5c5c]/40',
      icon: 'warning',
      description: 'Tus deudas comprometen más del 70% de tus activos.',
    };
  } else if (debtRatio > 35) {
    healthStatus = {
      label: 'Moderado',
      color: 'text-[#ffc978]',
      bgColor: 'bg-[#ee9800]/15',
      borderColor: 'border-[#ee9800]/40',
      icon: 'info',
      description: 'Nivel de deuda manejable pero requiere atención.',
    };
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#181c24] via-[#1c202a] to-[#12161f] border border-[#3c4a42]/50 p-5 shadow-xl relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#10b981]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#4285F4]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Patrimonio Unificado
            </h3>
            <p className="text-[10px] text-[#86948a]">
              Balance global consolidado (Activos vs Pasivos)
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${healthStatus.bgColor} ${healthStatus.color} ${healthStatus.borderColor}`}
        >
          <span className="material-symbols-outlined text-[12px]">{healthStatus.icon}</span>
          <span>{healthStatus.label}</span>
        </span>
      </div>

      {/* Main Net Worth Metric */}
      <div className="my-3 text-center relative z-10">
        <span className="text-[11px] font-medium text-[#86948a] uppercase tracking-wider block">
          Patrimonio Neto Real (Activos − Deudas)
        </span>
        <div
          className={`text-3xl sm:text-4xl font-black tracking-tight mt-1 ${
            netWorth >= 0 ? 'text-[#10b981]' : 'text-[#ff5c5c]'
          }`}
        >
          {formatCRC(netWorth)}
        </div>
      </div>

      {/* Activos vs Pasivos Dual Pillar */}
      <div className="grid grid-cols-2 gap-3 my-4 relative z-10">
        {/* Activos Totales */}
        <div className="p-3 rounded-2xl bg-[#0f131c]/80 border border-[#10b981]/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[#10b981] font-bold">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              Activos
            </span>
            <span className="text-[10px] text-[#86948a]">{accounts.length} Cuentas</span>
          </div>
          <div className="mt-2">
            <div className="text-sm sm:text-base font-extrabold text-white truncate">
              {formatCRC(totalAssets)}
            </div>
            <span className="text-[9px] text-[#86948a] block mt-0.5">
              Cuentas + Ahorros
            </span>
          </div>
        </div>

        {/* Pasivos Totales */}
        <div className="p-3 rounded-2xl bg-[#0f131c]/80 border border-[#ff5c5c]/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[#ff5c5c] font-bold">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              Pasivos
            </span>
            <span className="text-[10px] text-[#86948a]">{debts.length} Deudas</span>
          </div>
          <div className="mt-2">
            <div className="text-sm sm:text-base font-extrabold text-white truncate">
              {formatCRC(totalLiabilities)}
            </div>
            <span className="text-[9px] text-[#86948a] block mt-0.5">
              Compromisos por pagar
            </span>
          </div>
        </div>
      </div>

      {/* Visual Debt-to-Asset Ratio Bar */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#86948a] font-medium">
            Nivel de Compromiso de Deuda:
          </span>
          <span className="font-bold text-white">
            {totalAssets > 0 ? `${debtRatio.toFixed(1)}%` : totalLiabilities > 0 ? '100%' : '0%'}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#0f131c] overflow-hidden flex border border-[#3c4a42]/40">
          <div
            style={{ width: `${Math.min(100, Math.max(0, 100 - debtRatio))}%` }}
            className="h-full bg-gradient-to-r from-[#10b981] to-[#4edea3] transition-all duration-500"
            title="Patrimonio Libre"
          />
          <div
            style={{ width: `${Math.min(100, Math.max(0, debtRatio))}%` }}
            className="h-full bg-gradient-to-r from-[#ee9800] to-[#ff5c5c] transition-all duration-500"
            title="Deuda comprometida"
          />
        </div>
        <div className="flex items-center justify-between text-[9px] text-[#86948a]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Patrimonio libre
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff5c5c]" /> Deudas
          </span>
        </div>
      </div>

      {/* Toggle Detail Button */}
      <div className="pt-3 border-t border-[#3c4a42]/40 mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsDetailOpen(!isDetailOpen)}
          className="text-[11px] font-bold text-[#10b981] hover:text-[#4edea3] flex items-center gap-1 transition-colors"
        >
          <span>{isDetailOpen ? 'Ocultar desglose detallado' : 'Ver desglose por cuenta y deuda'}</span>
          <span className="material-symbols-outlined text-[14px]">
            {isDetailOpen ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('ingresos')}
            className="text-[10px] text-[#86948a] hover:text-white transition-colors"
          >
            Administrar Cuentas →
          </button>
        )}
      </div>

      {/* Detailed Breakdown Accordion */}
      {isDetailOpen && (
        <div className="mt-3 pt-3 border-t border-[#3c4a42]/30 space-y-3 animate-in fade-in duration-200">
          {/* Cuentas */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider block">
              Activos (Cuentas Registradas):
            </span>
            {accounts.length === 0 ? (
              <p className="text-[11px] text-[#86948a] italic">No tienes cuentas registradas aún.</p>
            ) : (
              <div className="space-y-1">
                {accounts.map((acc) => {
                  const bal = calculateAccountBalance(acc, transactions);
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{acc.type === 'bancaria' ? '🏦' : acc.type === 'efectivo' ? '💵' : acc.type === 'salario' ? '💼' : '👛'}</span>
                        <span className="text-white font-medium">{acc.name}</span>
                      </div>
                      <span className={`font-bold ${bal >= 0 ? 'text-[#10b981]' : 'text-[#ff5c5c]'}`}>
                        {formatCRC(bal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Metas de Ahorro */}
          {savingsGoals.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#4285F4] uppercase tracking-wider block">
                Fondos de Ahorro Activos:
              </span>
              <div className="space-y-1">
                {savingsGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#0f131c] border border-[#4285F4]/30 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span>{g.icon || '🎯'}</span>
                      <span className="text-white font-medium">{g.title}</span>
                    </div>
                    <span className="font-bold text-[#4285F4]">
                      {formatCRC(g.currentAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deudas */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#ff5c5c] uppercase tracking-wider block">
              Pasivos (Deudas y Préstamos):
            </span>
            {debts.length === 0 ? (
              <p className="text-[11px] text-[#86948a] italic">¡Excelente! No tienes deudas registradas.</p>
            ) : (
              <div className="space-y-1">
                {debts.map((d) => {
                  const paid = transactions
                    .filter((t) => t.debtId === d.id && t.type === 'gasto')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const remaining = Math.max(0, d.totalAmount - paid);
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-[#0f131c] border border-[#ff5c5c]/30 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">💳</span>
                        <span className="text-white font-medium">{d.name}</span>
                      </div>
                      <span className="font-bold text-[#ff5c5c]">
                        {formatCRC(remaining)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
