import React, { useState } from 'react';
import { Transaction, Account, SavingsGoal } from '../types';
import { formatCRC } from '../utils/formatters';

interface EmergencyFundSimulatorProps {
  transactions: Transaction[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  onAddOrUpdateGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'> & { id?: string }) => void;
}

export const EmergencyFundSimulator: React.FC<EmergencyFundSimulatorProps> = ({
  transactions,
  accounts,
  savingsGoals,
  onAddOrUpdateGoal,
}) => {
  // Calcular gasto promedio mensual de los últimos meses
  const expenseTransactions = transactions.filter(
    (t) => t.type === 'gasto' || t.type === 'pago_deuda'
  );

  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Determinar meses distintos con transacciones
  const monthsSet = new Set(expenseTransactions.map((t) => t.date.slice(0, 7)));
  const totalMonthsRecorded = Math.max(1, monthsSet.size);
  const estimatedMonthlyExpense = Math.round(totalExpenses / totalMonthsRecorded) || 300000;

  // Estado local para meses de cobertura (3, 6, 9, 12)
  const [selectedMonths, setSelectedMonths] = useState<number>(6);
  const [customMonthlyCost, setCustomMonthlyCost] = useState<string>(String(estimatedMonthlyExpense));
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const monthlyBase = parseFloat(customMonthlyCost.replace(/,/g, '')) || estimatedMonthlyExpense;
  const targetFund = monthlyBase * selectedMonths;

  // Buscar si ya existe una meta de "Fondo de Emergencia"
  const existingGoal = savingsGoals.find((g) =>
    g.title.toLowerCase().includes('emergencia') || g.title.toLowerCase().includes('fondo')
  );

  // Dinero actual ahorrado en cuentas de tipo 'ahorro' o en la meta existente
  const savingsAccountsBalance = accounts
    .filter((a) => a.type === 'ahorro')
    .reduce((sum, a) => sum + (a.initialBalance || 0), 0);

  const currentSaved = existingGoal ? existingGoal.currentAmount : savingsAccountsBalance;
  const progressPercent = targetFund > 0 ? Math.min(100, Math.round((currentSaved / targetFund) * 100)) : 0;
  const monthsCoveredNow = monthlyBase > 0 ? (currentSaved / monthlyBase).toFixed(1) : '0';

  const handleCreateOrUpdateGoal = () => {
    onAddOrUpdateGoal({
      id: existingGoal?.id,
      title: 'Fondo de Emergencia',
      targetAmount: targetFund,
      currentAmount: currentSaved,
      currency: 'CRC',
      currencySymbol: '₡',
      category: 'Emergencia',
      color: '#06b6d4',
      icon: 'shield',
    });

    setToastMessage('¡Meta de Fondo de Emergencia sincronizada con éxito!');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#06b6d4] to-[#0891b2] text-white flex items-center justify-center font-black shadow-lg shadow-[#06b6d4]/20">
            <span className="material-symbols-outlined text-[24px]">shield</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Simulador de Fondo de Emergencia
              </h3>
              <span className="text-[9px] bg-[#06b6d4]/20 text-[#22d3ee] font-bold px-1.5 py-0.2 rounded">
                Respaldo Financiero
              </span>
            </div>
            <p className="text-[10px] text-[#86948a]">
              Calcula tu blindaje ante imprevistos, salud o desempleo
            </p>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-2xl bg-[#06b6d4]/20 border border-[#06b6d4] text-[#22d3ee] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tarjeta de Resumen del Fondo */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0c242c] via-[#121620] to-[#181c24] border border-[#06b6d4]/40 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#22d3ee]">
              Meta Recomendada ({selectedMonths} Meses de Cobertura)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
              {formatCRC(targetFund)}
            </div>
            <span className="text-[10px] text-[#86948a]">
              Basado en un gasto base de <strong className="text-white">{formatCRC(monthlyBase)}/mes</strong>
            </span>
          </div>

          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-[#86948a] block">Ahorro Actual</span>
            <span className="text-sm font-black text-[#10b981]">{formatCRC(currentSaved)}</span>
            <span className="text-[9px] text-[#86948a] block">
              {monthsCoveredNow} meses cubiertos
            </span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-[#86948a]">Progreso hacia el blindaje total:</span>
            <span className="text-[#22d3ee]">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#181c24] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#3c4a42]/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0891b2] to-[#22d3ee] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Selector de Meses de Cobertura */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-wider text-[#86948a] block px-0.5">
          Elige los meses de colchón financiero que deseas simular:
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { months: 3, label: '3 Meses', sub: 'Básico', color: '#10b981' },
            { months: 6, label: '6 Meses', sub: 'Recomendado', color: '#06b6d4' },
            { months: 9, label: '9 Meses', sub: 'Avanzado', color: '#a855f7' },
            { months: 12, label: '12 Meses', sub: 'Blindaje Total', color: '#f59e0b' },
          ].map((item) => (
            <button
              key={item.months}
              type="button"
              onClick={() => setSelectedMonths(item.months)}
              className={`p-2.5 rounded-2xl border text-center transition-all active:scale-95 ${
                selectedMonths === item.months
                  ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-white shadow-md'
                  : 'bg-[#181c24] border-[#3c4a42]/50 text-[#86948a] hover:border-[#86948a]'
              }`}
            >
              <div className="text-xs font-black">{item.label}</div>
              <div className="text-[9px] mt-0.5 opacity-80">{item.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Ajustar Gasto Mensual Base */}
      <div className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#06b6d4]">tune</span>
            <span>Ajustar Gasto Mensual Necesario</span>
          </span>
          <button
            type="button"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="text-[10px] text-[#06b6d4] hover:underline font-bold"
          >
            {isCustomizing ? 'Cerrar' : 'Personalizar monto'}
          </button>
        </div>

        {isCustomizing ? (
          <div className="pt-1 space-y-2">
            <p className="text-[10px] text-[#86948a]">
              Ingresa el monto mensual promedio que tú y tu familia necesitan para vivir (alimentación, servicios, techo y compromisos indispensables):
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#86948a]">
                ₡
              </span>
              <input
                type="number"
                value={customMonthlyCost}
                onChange={(e) => setCustomMonthlyCost(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl pl-8 pr-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#06b6d4]"
              />
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-[#86948a]">
            Calculado automáticamente en base a tu historial de gastos: <strong className="text-white">{formatCRC(monthlyBase)}/mes</strong>.
          </p>
        )}
      </div>

      {/* Botón de Acción Directa: Guardar o Vincular en Metas de Ahorro */}
      <button
        type="button"
        onClick={handleCreateOrUpdateGoal}
        className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:opacity-95 text-[#002830] text-xs font-black shadow-lg shadow-[#06b6d4]/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
        <span>
          {existingGoal
            ? 'Actualizar meta existente con este cálculo'
            : 'Crear Meta de "Fondo de Emergencia" con este valor'}
        </span>
      </button>

      {/* Consejo Financiero */}
      <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/30 flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[#06b6d4] text-[18px] shrink-0 mt-0.5">
          lightbulb
        </span>
        <p className="text-[10px] text-[#86948a] leading-relaxed">
          <strong>Regla de oro:</strong> Este fondo debe mantenerse en una cuenta líquida separada (con disponibilidad inmediata) y únicamente tocarse ante emergencias reales (médicas, mecánicas indispensables o cese laboral).
        </p>
      </div>
    </div>
  );
};
