import React, { useState } from 'react';
import { Account, SavingsGoal, Transaction } from '../types';
import { formatCRC } from '../utils/formatters';

interface SavingsGoalsSectionProps {
  savingsGoals: SavingsGoal[];
  accounts: Account[];
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdateGoalAmount: (goalId: string, addedAmount: number, sourceAccountId?: string) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddTransaction?: (tx: Omit<Transaction, 'id'>) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Emergencia': '🛡️',
  'Vehículo': '🚗',
  'Viajes': '✈️',
  'Hogar': '🏠',
  'Educación': '🎓',
  'Inversión': '📈',
  'Tecnología': '💻',
  'Otro': '🎯',
};

export const SavingsGoalsSection: React.FC<SavingsGoalsSectionProps> = ({
  savingsGoals,
  accounts,
  onAddGoal,
  onUpdateGoalAmount,
  onDeleteGoal,
  onAddTransaction,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<SavingsGoal | null>(null);

  // New Goal Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [category, setCategory] = useState('Emergencia');
  const [deadline, setDeadline] = useState('');

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState('');
  const [depositAccountId, setDepositAccountId] = useState(accounts[0]?.id || '');
  const [deductFromAccount, setDeductFromAccount] = useState(true);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount.replace(/\D/g, ''));
    const initial = parseFloat(initialAmount.replace(/\D/g, '')) || 0;
    if (!title.trim() || !target || target <= 0) return;

    onAddGoal({
      title: title.trim(),
      targetAmount: target,
      currentAmount: initial,
      category,
      icon: CATEGORY_ICONS[category] || '🎯',
      deadline: deadline || undefined,
      currency: 'CRC',
      currencySymbol: '₡',
    });

    setTitle('');
    setTargetAmount('');
    setInitialAmount('');
    setDeadline('');
    setIsAddModalOpen(false);
  };

  const handleApplyDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForDeposit) return;
    const amount = parseFloat(depositAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) return;

    onUpdateGoalAmount(
      selectedGoalForDeposit.id,
      amount,
      deductFromAccount && depositAccountId ? depositAccountId : undefined
    );

    // Si se eligió descontar de una cuenta bancaria/efectivo, registrar la transacción de gasto/transferencia
    if (deductFromAccount && depositAccountId && onAddTransaction) {
      onAddTransaction({
        title: `Aporte a Meta: ${selectedGoalForDeposit.title}`,
        amount,
        type: 'gasto',
        category: 'Ahorro' as any,
        accountId: depositAccountId,
        date: new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        note: `Ahorro para meta "${selectedGoalForDeposit.title}"`,
      });
    }

    setDepositAmount('');
    setSelectedGoalForDeposit(null);
  };

  // Calcular métricas globales de ahorro
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* Header with Title and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">savings</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Metas de Ahorro & Progreso
            </h3>
            <p className="text-[10px] text-[#86948a]">
              {savingsGoals.length} meta{savingsGoals.length === 1 ? '' : 's'} activa{savingsGoals.length === 1 ? '' : 's'} • {overallPercentage}% logrado
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="py-1.5 px-3 rounded-full bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs flex items-center gap-1 shadow-md shadow-[#10b981]/20 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Nueva Meta</span>
        </button>
      </div>

      {/* Global Progress Bar (if goals exist) */}
      {savingsGoals.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#181c24] border border-[#3c4a42]/50 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#86948a] font-medium">Progreso Global de Ahorro:</span>
            <span className="font-extrabold text-[#10b981] text-sm">{overallPercentage}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#0f131c] overflow-hidden border border-[#3c4a42]/40">
            <div
              style={{ width: `${overallPercentage}%` }}
              className="h-full bg-gradient-to-r from-[#10b981] to-[#4edea3] rounded-full transition-all duration-700"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#dfe2ee] font-mono">
            <span>Ahorrado: <strong className="text-[#10b981]">{formatCRC(totalSaved)}</strong></span>
            <span className="text-[#86948a]">Meta Total: {formatCRC(totalTarget)}</span>
          </div>
        </div>
      )}

      {/* Goals List */}
      {savingsGoals.length === 0 ? (
        <div className="p-6 rounded-3xl bg-[#181c24]/80 border border-dashed border-[#3c4a42] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#262a33] text-[#10b981] mx-auto flex items-center justify-center text-2xl">
            🎯
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Crea tu primera Meta de Ahorro</h4>
            <p className="text-xs text-[#86948a] max-w-xs mx-auto mt-1">
              Fondo de emergencia, vacaciones, compra de vehículo o proyectos personales con seguimiento visual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="py-2 px-4 rounded-xl bg-[#262a33] hover:bg-[#323640] text-[#10b981] border border-[#10b981]/40 font-bold text-xs inline-flex items-center gap-1 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Crear Meta Ahora
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {savingsGoals.map((goal) => {
            const percentage = goal.targetAmount > 0
              ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
              : 0;
            const isCompleted = goal.currentAmount >= goal.targetAmount;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

            return (
              <div
                key={goal.id}
                className="p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/60 hover:border-[#10b981]/50 shadow-lg space-y-3 transition-all"
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-center text-xl shrink-0">
                      {goal.icon || '🎯'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {goal.title}
                        </h4>
                        {isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40">
                            ¡Completada! 🎉
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#86948a] mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#262a33] text-[#dfe2ee]">
                          {goal.category || 'Ahorro'}
                        </span>
                        {goal.deadline && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                            {goal.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Eliminar la meta "${goal.title}"?`)) {
                        onDeleteGoal(goal.id);
                      }
                    }}
                    className="text-[#86948a] hover:text-[#ff5c5c] p-1 transition-colors"
                    title="Eliminar meta"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#86948a] text-[11px]">Progreso de la meta:</span>
                    <span className="font-extrabold text-[#10b981] text-xs font-mono">{percentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-[#0f131c] overflow-hidden p-0.5 border border-[#3c4a42]/40">
                    <div
                      style={{ width: `${percentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-[#10b981] via-[#4edea3] to-[#80ffc8]'
                          : 'bg-gradient-to-r from-[#10b981] to-[#4edea3]'
                      }`}
                    />
                  </div>
                </div>

                {/* Balance & Actions Row */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div>
                    <span className="text-[10px] text-[#86948a] block">Ahorrado actual:</span>
                    <span className="font-bold text-white text-sm">
                      {formatCRC(goal.currentAmount)}
                    </span>
                    <span className="text-[10px] text-[#86948a] ml-1 font-mono">
                      / {formatCRC(goal.targetAmount)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedGoalForDeposit(goal)}
                    className="py-1.5 px-3 rounded-xl bg-[#262a33] hover:bg-[#10b981]/20 text-[#10b981] font-bold text-xs flex items-center gap-1 border border-[#3c4a42]/70 hover:border-[#10b981]/60 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>+ Aportar</span>
                  </button>
                </div>

                {!isCompleted && (
                  <p className="text-[10px] text-[#86948a] italic">
                    Te faltan {formatCRC(remaining)} para alcanzar el 100%.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Nueva Meta */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-[#181c24] border border-[#3c4a42] rounded-3xl p-5 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/40">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-sm font-bold text-white">Nueva Meta de Ahorro</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#262a33] text-[#86948a] hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#86948a] uppercase block mb-1">
                  Nombre o Propósito de la Meta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Fondo de Emergencia, Vacaciones, Computadora"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#86948a] uppercase block mb-1">
                    Meta Total (₡)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="100.000"
                    value={targetAmount}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setTargetAmount(digits ? parseInt(digits, 10).toLocaleString('es-CR') : '');
                    }}
                    className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#86948a] uppercase block mb-1">
                    Monto Inicial (₡)
                  </label>
                  <input
                    type="text"
                    placeholder="0 (Opcional)"
                    value={initialAmount}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      setInitialAmount(digits ? parseInt(digits, 10).toLocaleString('es-CR') : '');
                    }}
                    className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-[#86948a] uppercase block mb-1">
                    Categoría
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  >
                    {Object.keys(CATEGORY_ICONS).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_ICONS[cat]} {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#86948a] uppercase block mb-1">
                    Fecha Límite
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-md shadow-[#10b981]/20 active:scale-95 transition-all"
                >
                  Guardar Meta de Ahorro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Aportar Dinero a una Meta */}
      {selectedGoalForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setSelectedGoalForDeposit(null)}
          />
          <div className="relative w-full max-w-sm bg-[#181c24] border border-[#3c4a42] rounded-3xl p-5 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/40">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedGoalForDeposit.icon || '💰'}</span>
                <div>
                  <h3 className="text-sm font-bold text-white">Aportar Ahorro</h3>
                  <p className="text-[10px] text-[#86948a] truncate max-w-[200px]">
                    Meta: {selectedGoalForDeposit.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGoalForDeposit(null)}
                className="w-7 h-7 rounded-full bg-[#262a33] text-[#86948a] hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleApplyDeposit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#86948a] uppercase block mb-1">
                  Monto a Aportar (₡)
                </label>
                <input
                  type="text"
                  required
                  placeholder="5.000"
                  value={depositAmount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setDepositAmount(digits ? parseInt(digits, 10).toLocaleString('es-CR') : '');
                  }}
                  className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3.5 py-2.5 text-base text-white font-mono font-bold focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {/* Botones de montos rápidos */}
              <div className="flex flex-wrap gap-1.5">
                {[2000, 5000, 10000, 25000, 50000].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setDepositAmount(quick.toLocaleString('es-CR'))}
                    className="px-2.5 py-1 rounded-lg bg-[#0f131c] border border-[#3c4a42]/60 text-[11px] text-[#dfe2ee] font-mono hover:border-[#10b981]"
                  >
                    +₡{quick.toLocaleString()}
                  </button>
                ))}
              </div>

              {accounts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#3c4a42]/30">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                    <input
                      type="checkbox"
                      checked={deductFromAccount}
                      onChange={(e) => setDeductFromAccount(e.target.checked)}
                      className="rounded bg-[#0f131c] border-[#3c4a42] text-[#10b981] focus:ring-0"
                    />
                    <span>Descontar este monto de una cuenta</span>
                  </label>

                  {deductFromAccount && (
                    <select
                      value={depositAccountId}
                      onChange={(e) => setDepositAccountId(e.target.value)}
                      className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-md shadow-[#10b981]/20 active:scale-95 transition-all"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
