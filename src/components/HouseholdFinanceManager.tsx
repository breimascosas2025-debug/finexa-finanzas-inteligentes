import React, { useState } from 'react';
import { SharedHouseholdConfig, SharedExpenseItem, Account } from '../types';
import { formatCRC } from '../utils/formatters';

interface HouseholdFinanceManagerProps {
  householdConfig: SharedHouseholdConfig;
  accounts: Account[];
  onSaveConfig: (newConfig: SharedHouseholdConfig) => void;
  onRecordPersonalTransaction?: (data: { amount: number; title: string; category: any }) => void;
}

export const HouseholdFinanceManager: React.FC<HouseholdFinanceManagerProps> = ({
  householdConfig,
  accounts,
  onSaveConfig,
  onRecordPersonalTransaction,
}) => {
  const [partnerName, setPartnerName] = useState(householdConfig.partnerName || 'Mi Pareja');
  const [householdName, setHouseholdName] = useState(householdConfig.householdName || 'Hogar Compartido');
  const [splitRatioYo, setSplitRatioYo] = useState<number>(householdConfig.splitRatioYo || 50);

  // Formulario de nuevo gasto
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<'yo' | 'pareja'>('yo');
  const [category, setCategory] = useState('Comida');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/,/g, ''));
    if (!title.trim() || isNaN(num) || num <= 0) return;

    const newExpense: SharedExpenseItem = {
      id: `shared_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: title.trim(),
      amount: num,
      currency: 'CRC',
      paidBy,
      category,
      date: new Date().toISOString().split('T')[0],
      isSettled: false,
    };

    const updatedConfig: SharedHouseholdConfig = {
      ...householdConfig,
      isEnabled: true,
      partnerName,
      householdName,
      splitRatioYo,
      splitRatioPareja: 100 - splitRatioYo,
      expenses: [newExpense, ...(householdConfig.expenses || [])],
    };

    onSaveConfig(updatedConfig);
    setTitle('');
    setAmount('');
    setShowAddForm(false);
    showToast('¡Gasto compartido agregado al libro del hogar!');
  };

  const handleSettleBalances = () => {
    const updatedExpenses = (householdConfig.expenses || []).map((exp) => ({
      ...exp,
      isSettled: true,
    }));

    onSaveConfig({
      ...householdConfig,
      expenses: updatedExpenses,
    });
    showToast('¡Cuentas saldadas! El balance del hogar quedó en ₡0.');
  };

  // Cálculo de gastos pendientes de liquidar
  const activeExpenses = (householdConfig.expenses || []).filter((e) => !e.isSettled);

  const totalPaidByMe = activeExpenses
    .filter((e) => e.paidBy === 'yo')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPaidByPartner = activeExpenses
    .filter((e) => e.paidBy === 'pareja')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalShared = totalPaidByMe + totalPaidByPartner;

  // Cuánto le corresponde pagar a cada uno según el ratio (ej: 50%)
  const myTargetShare = (totalShared * splitRatioYo) / 100;
  const partnerTargetShare = (totalShared * (100 - splitRatioYo)) / 100;

  // Balance neto: si > 0, la pareja me debe; si < 0, yo le debo a la pareja
  const netBalance = totalPaidByMe - myTargetShare;

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f43f5e] to-[#be123c] text-white flex items-center justify-center font-black shadow-lg shadow-[#f43f5e]/20">
            <span className="material-symbols-outlined text-[24px]">diversity_1</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Finanzas en Pareja & Hogar
              </h3>
              <span className="text-[9px] bg-[#f43f5e]/20 text-[#fb7185] font-bold px-1.5 py-0.2 rounded">
                Compartido
              </span>
            </div>
            <p className="text-[10px] text-[#86948a]">
              Control de gastos de la casa, división equitativa y saldos mutuos
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] text-xs font-black flex items-center gap-1 transition-all active:scale-95 shadow-md"
        >
          <span className="material-symbols-outlined text-[16px]">
            {showAddForm ? 'close' : 'add'}
          </span>
          <span>{showAddForm ? 'Cerrar' : 'Nuevo Gasto'}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-2xl bg-[#10b981]/20 border border-[#10b981] text-[#10b981] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">favorite</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tarjeta de Balance del Hogar */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#2a131b] via-[#1a131e] to-[#181c24] border border-[#f43f5e]/30 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#fb7185]">
              Estado del Balance de Cuentas
            </span>
            <div className="text-xl sm:text-2xl font-black mt-0.5">
              {Math.abs(netBalance) < 1 ? (
                <span className="text-[#10b981]">¡Están al día! (₡0)</span>
              ) : netBalance > 0 ? (
                <span className="text-[#10b981]">{partnerName} te debe {formatCRC(netBalance)}</span>
              ) : (
                <span className="text-[#facc15]">Le debes a {partnerName} {formatCRC(Math.abs(netBalance))}</span>
              )}
            </div>
            <p className="text-[10px] text-[#86948a] mt-0.5">
              Total compartido acumulado: <strong className="text-white">{formatCRC(totalShared)}</strong> (División {splitRatioYo}% / {100 - splitRatioYo}%)
            </p>
          </div>

          {activeExpenses.length > 0 && Math.abs(netBalance) >= 1 && (
            <button
              type="button"
              onClick={handleSettleBalances}
              className="px-3 py-1.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white text-[11px] font-bold border border-[#3c4a42] flex items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[14px] text-[#10b981]">check_circle</span>
              <span>Saldar cuentas</span>
            </button>
          )}
        </div>

        {/* Comparativa visual de aportes */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-[#181c24]/90 border border-[#3c4a42]/40">
            <span className="text-[9px] uppercase font-bold text-[#86948a] block">Pagado por ti</span>
            <span className="text-xs font-black text-white">{formatCRC(totalPaidByMe)}</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#181c24]/90 border border-[#3c4a42]/40">
            <span className="text-[9px] uppercase font-bold text-[#86948a] block">
              Pagado por {partnerName}
            </span>
            <span className="text-xs font-black text-white">{formatCRC(totalPaidByPartner)}</span>
          </div>
        </div>
      </div>

      {/* Formulario de Registro de Gasto Compartido */}
      {showAddForm && (
        <form onSubmit={handleSaveExpense} className="p-4 rounded-3xl bg-[#0f131c] border border-[#f43f5e]/40 space-y-3 animate-in fade-in">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#f43f5e]">receipt_long</span>
            <span>Registrar Gasto de la Casa o Pareja</span>
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Concepto del gasto:</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej: Compras de súper, Alquiler"
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#f43f5e]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Monto Total (₡):</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="25000"
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#f43f5e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">¿Quién pagó la cuenta?</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaidBy('yo')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    paidBy === 'yo'
                      ? 'bg-[#10b981] text-[#003824] shadow-md'
                      : 'bg-[#181c24] text-[#86948a] border border-[#3c4a42]/50'
                  }`}
                >
                  Yo pagué
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy('pareja')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    paidBy === 'pareja'
                      ? 'bg-[#f43f5e] text-white shadow-md'
                      : 'bg-[#181c24] text-[#86948a] border border-[#3c4a42]/50'
                  }`}
                >
                  {partnerName}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Categoría:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="Comida">Comida / Supermercado</option>
                <option value="Servicios">Servicios de la casa</option>
                <option value="Personal">Salidas / Cenas</option>
                <option value="Transporte">Transporte / Gasolina</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl bg-[#262a33] text-[#86948a] text-xs font-bold hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#f43f5e] hover:bg-[#e11d48] text-white text-xs font-black shadow-md active:scale-95"
            >
              Guardar Gasto Compartido
            </button>
          </div>
        </form>
      )}

      {/* Ajustes del Hogar */}
      <div className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 space-y-2.5">
        <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider block">
          Configuración de la Pareja y Reparto:
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-[#86948a] block mb-0.5">Nombre de tu pareja:</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => {
                setPartnerName(e.target.value);
                onSaveConfig({ ...householdConfig, partnerName: e.target.value });
              }}
              placeholder="Nombre"
              className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#f43f5e]"
            />
          </div>

          <div>
            <label className="text-[9px] text-[#86948a] block mb-0.5">División de gastos:</label>
            <select
              value={splitRatioYo}
              onChange={(e) => {
                const ratio = parseInt(e.target.value, 10);
                setSplitRatioYo(ratio);
                onSaveConfig({
                  ...householdConfig,
                  splitRatioYo: ratio,
                  splitRatioPareja: 100 - ratio,
                });
              }}
              className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none"
            >
              <option value="50">50% Yo / 50% Pareja (Equitativo)</option>
              <option value="60">60% Yo / 40% Pareja</option>
              <option value="70">70% Yo / 30% Pareja</option>
              <option value="40">40% Yo / 60% Pareja</option>
            </select>
          </div>
        </div>
      </div>

      {/* Historial de Gastos Compartidos */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#86948a] px-0.5">
          Gastos Recientes del Hogar:
        </span>

        {(householdConfig.expenses || []).length === 0 ? (
          <div className="p-6 rounded-3xl bg-[#181c24]/50 border border-dashed border-[#3c4a42]/60 text-center space-y-2">
            <span className="material-symbols-outlined text-[32px] text-[#86948a]">favorite_border</span>
            <p className="text-xs text-[#86948a]">
              Aún no hay gastos registrados en el libro del hogar. Agrega la compra del súper o los recibos para llevar las cuentas claras y en paz.
            </p>
          </div>
        ) : (
          (householdConfig.expenses || []).slice(0, 10).map((exp) => (
            <div
              key={exp.id}
              className={`p-3 rounded-2xl bg-[#181c24] border flex items-center justify-between ${
                exp.isSettled ? 'border-[#3c4a42]/30 opacity-60' : 'border-[#3c4a42]/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    exp.paidBy === 'yo'
                      ? 'bg-[#10b981]/20 text-[#10b981]'
                      : 'bg-[#f43f5e]/20 text-[#fb7185]'
                  }`}
                >
                  {exp.paidBy === 'yo' ? 'Tú' : partnerName.slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{exp.title}</h4>
                  <p className="text-[9px] text-[#86948a]">
                    Pagó {exp.paidBy === 'yo' ? 'Tú' : partnerName} • {exp.date}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-white">{formatCRC(exp.amount)}</span>
                <span
                  className={`text-[9px] font-bold block ${
                    exp.isSettled ? 'text-[#86948a]' : 'text-[#10b981]'
                  }`}
                >
                  {exp.isSettled ? 'Saldado' : 'Pendiente'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
