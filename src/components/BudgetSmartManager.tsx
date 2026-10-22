import React, { useState } from 'react';
import { BudgetConfig, Transaction, Account } from '../types';
import { formatCRC } from '../utils/formatters';

interface BudgetSmartManagerProps {
  transactions: Transaction[];
  accounts: Account[];
  budgetConfig: BudgetConfig;
  onSaveBudgetConfig: (config: BudgetConfig) => void;
  onOpenQuickExpense?: () => void;
}

export const BudgetSmartManager: React.FC<BudgetSmartManagerProps> = ({
  transactions,
  budgetConfig,
  onSaveBudgetConfig,
  onOpenQuickExpense,
}) => {
  // Mes actual (YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  // Filtrar transacciones del mes en curso
  const currentMonthTransactions = transactions.filter((t) =>
    t.date.startsWith(currentMonthStr)
  );

  const currentMonthIncome = currentMonthTransactions
    .filter((t) => t.type === 'ingreso')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthExpenses = currentMonthTransactions
    .filter((t) => t.type === 'gasto' || t.type === 'pago_deuda')
    .reduce((sum, t) => sum + t.amount, 0);

  // Desglose 50/30/20 según categorías
  // Necesidades (50%): Comida, Servicios, Transporte, Deudas
  const needsSpent = currentMonthTransactions
    .filter(
      (t) =>
        (t.type === 'gasto' || t.type === 'pago_deuda') &&
        ['Comida', 'Servicios', 'Transporte', 'Deudas'].includes(t.category)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // Deseos / Ocio (30%): Personal, Otros
  const wantsSpent = currentMonthTransactions
    .filter(
      (t) =>
        t.type === 'gasto' &&
        ['Personal', 'Otros'].includes(t.category)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  // Ahorro e Inversión (20%): Diezmo o traslados
  const savingsSpent = currentMonthTransactions
    .filter((t) => t.type === 'diezmo')
    .reduce((sum, t) => sum + t.amount, 0);

  // Estado local para configuración
  const [monthlyLimit, setMonthlyLimit] = useState<string>(
    budgetConfig.monthlyLimit > 0 ? String(budgetConfig.monthlyLimit) : String(currentMonthIncome || 350000)
  );
  const [isEditing, setIsEditing] = useState<boolean>(budgetConfig.monthlyLimit === 0);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const numLimit = parseFloat(monthlyLimit.replace(/,/g, '')) || 0;

  // Montos teóricos de la regla 50/30/20
  const theoreticalNeeds = Math.round(numLimit * 0.50);
  const theoreticalWants = Math.round(numLimit * 0.30);
  const theoreticalSavings = Math.round(numLimit * 0.20);

  // Porcentaje general consumido
  const totalPercentUsed = numLimit > 0 ? Math.min(200, Math.round((currentMonthExpenses / numLimit) * 100)) : 0;
  const remainingBudget = Math.max(0, numLimit - currentMonthExpenses);

  const handleSave = () => {
    const newConfig: BudgetConfig = {
      ...budgetConfig,
      monthlyLimit: numLimit,
      needsPercent: 50,
      wantsPercent: 30,
      savingsPercent: 20,
    };
    onSaveBudgetConfig(newConfig);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAutoSuggest = () => {
    if (currentMonthIncome > 0) {
      setMonthlyLimit(String(Math.round(currentMonthIncome * 0.85))); // 85% de ingresos para dejar margen
    } else {
      setMonthlyLimit('350000');
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#047857] text-[#003824] flex items-center justify-center font-black shadow-lg shadow-[#10b981]/20">
            <span className="material-symbols-outlined text-[24px]">pie_chart</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Presupuesto Mensual Inteligente
              </h3>
              <span className="text-[9px] bg-[#10b981]/20 text-[#10b981] font-bold px-1.5 py-0.2 rounded">
                Regla 50/30/20
              </span>
            </div>
            <p className="text-[10px] text-[#86948a]">
              Control de límites y distribución equilibrada de tus gastos del mes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="px-2.5 py-1.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[15px]">
            {isEditing ? 'close' : 'tune'}
          </span>
          <span className="text-[10px]">{isEditing ? 'Cancelar' : 'Ajustar'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-2xl bg-[#10b981]/20 border border-[#10b981] text-[#10b981] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>¡Presupuesto actualizado y guardado correctamente!</span>
        </div>
      )}

      {/* Editor de Presupuesto */}
      {isEditing && (
        <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#10b981]/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#10b981]">edit_calendar</span>
              <span>Definir Presupuesto Límite del Mes</span>
            </span>
            <button
              type="button"
              onClick={handleAutoSuggest}
              className="text-[10px] text-[#10b981] hover:underline font-bold"
            >
              Autocalcular sugerido
            </button>
          </div>

          <div>
            <label className="text-[10px] font-semibold text-[#86948a] block mb-1">
              Monto total mensual a presupuestar (₡):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#86948a]">
                ₡
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                placeholder="350000"
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl pl-8 pr-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-xl bg-[#262a33] text-[#86948a] text-xs font-bold hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] text-xs font-black shadow-md active:scale-95"
            >
              Guardar Presupuesto
            </button>
          </div>
        </div>
      )}

      {/* Tarjeta Principal: Semáforo y Consumo General */}
      <div className="p-4 rounded-3xl bg-[#0f131c]/80 border border-[#3c4a42]/50 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#86948a]">
              Consumo del Mes en Curso
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {formatCRC(currentMonthExpenses)}
              </span>
              <span className="text-xs text-[#86948a] font-bold">
                de {formatCRC(numLimit)}
              </span>
            </div>
          </div>

          <div
            className={`px-3 py-1.5 rounded-2xl border text-xs font-black flex items-center gap-1.5 ${
              totalPercentUsed > 90
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                : totalPercentUsed > 70
                ? 'bg-[#eab308]/20 border-[#eab308] text-[#eab308]'
                : 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                totalPercentUsed > 90 ? 'bg-[#ef4444] animate-ping' : totalPercentUsed > 70 ? 'bg-[#eab308]' : 'bg-[#10b981]'
              }`}
            />
            <span>{totalPercentUsed}% Usado</span>
          </div>
        </div>

        {/* Barra de progreso visual con semáforo */}
        <div className="w-full bg-[#181c24] h-3.5 rounded-full overflow-hidden p-0.5 border border-[#3c4a42]/40">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              totalPercentUsed > 90
                ? 'bg-gradient-to-r from-[#eab308] to-[#ef4444]'
                : totalPercentUsed > 70
                ? 'bg-gradient-to-r from-[#10b981] to-[#eab308]'
                : 'bg-gradient-to-r from-[#059669] to-[#10b981]'
            }`}
            style={{ width: `${Math.min(100, totalPercentUsed)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-[#86948a]">
            Disponible restante: <strong className="text-white font-bold">{formatCRC(remainingBudget)}</strong>
          </span>
          <span className="text-[#86948a]">
            {totalPercentUsed > 100 ? '⚠️ Excedido en ' + formatCRC(currentMonthExpenses - numLimit) : 'En rango óptimo'}
          </span>
        </div>
      </div>

      {/* Desglose de la Regla 50/30/20 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#86948a] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">balance</span>
            <span>Desglose por Pilares (50 / 30 / 20)</span>
          </span>
          <span className="text-[9px] text-[#86948a]">Recomendación financiera</span>
        </div>

        {/* 1. Pilar Necesidades 50% */}
        <div className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#3b82f6]/20 text-[#60a5fa] flex items-center justify-center font-bold text-xs">
                50%
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Necesidades Básicas</h4>
                <p className="text-[9px] text-[#86948a]">Comida, Servicios, Transporte, Deudas</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-white">{formatCRC(needsSpent)}</span>
              <span className="text-[9px] text-[#86948a] block">Meta: {formatCRC(theoreticalNeeds)}</span>
            </div>
          </div>
          <div className="w-full bg-[#0f131c] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                needsSpent > theoreticalNeeds ? 'bg-[#ef4444]' : 'bg-[#3b82f6]'
              }`}
              style={{
                width: `${theoreticalNeeds > 0 ? Math.min(100, (needsSpent / theoreticalNeeds) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* 2. Pilar Deseos 30% */}
        <div className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#eab308]/20 text-[#facc15] flex items-center justify-center font-bold text-xs">
                30%
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Deseos y Calidad de Vida</h4>
                <p className="text-[9px] text-[#86948a]">Salidas, Ropa, Gustos personales, Ocio</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-white">{formatCRC(wantsSpent)}</span>
              <span className="text-[9px] text-[#86948a] block">Meta: {formatCRC(theoreticalWants)}</span>
            </div>
          </div>
          <div className="w-full bg-[#0f131c] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                wantsSpent > theoreticalWants ? 'bg-[#ef4444]' : 'bg-[#eab308]'
              }`}
              style={{
                width: `${theoreticalWants > 0 ? Math.min(100, (wantsSpent / theoreticalWants) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* 3. Pilar Ahorro e Inversión 20% */}
        <div className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold text-xs">
                20%
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Ahorro, Inversión & Fondo</h4>
                <p className="text-[9px] text-[#86948a]">Fondo de emergencia, aportes y metas</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-black text-white">{formatCRC(savingsSpent)}</span>
              <span className="text-[9px] text-[#86948a] block">Meta: {formatCRC(theoreticalSavings)}</span>
            </div>
          </div>
          <div className="w-full bg-[#0f131c] h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#10b981]"
              style={{
                width: `${theoreticalSavings > 0 ? Math.min(100, (savingsSpent / theoreticalSavings) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {onOpenQuickExpense && (
        <button
          type="button"
          onClick={onOpenQuickExpense}
          className="w-full p-3 rounded-2xl bg-[#262a33] hover:bg-[#31353e] text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px] text-[#10b981]">add_circle</span>
          <span>Registrar Gasto para computar en el Presupuesto</span>
        </button>
      )}
    </div>
  );
};
