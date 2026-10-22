import React, { useState } from 'react';
import { Transaction } from '../types';
import { formatCRC } from '../utils/formatters';

interface RegisterExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

export const RegisterExpenseModal: React.FC<RegisterExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
}) => {
  const [amount, setAmount] = useState<number>(18500);
  const [category, setCategory] = useState<'Comida' | 'Iglesia' | 'Deudas' | 'Salarios' | 'Transporte' | 'Servicios'>('Comida');
  const [description, setDescription] = useState('Auto Mercado Plaza del Sol');
  const [paymentMethod, setPaymentMethod] = useState('BAC Credomatic (•••• 4821)');
  const [isRecurring, setIsRecurring] = useState(false);
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleAddChip = (val: number) => {
    setAmount((prev) => prev + val);
  };

  const handleSave = (andNew = false) => {
    if (amount <= 0 || !description.trim()) return;

    onAddTransaction({
      title: description.trim(),
      amount: -Math.abs(amount),
      category: category as any,
      date: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      paymentMethod,
      note: note.trim() || undefined,
    });

    if (andNew) {
      setAmount(5000);
      setDescription('');
      setNote('');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 animate-in fade-in select-none">
      <div className="w-full max-w-md bg-[#181c24] border border-[#3c4a42]/50 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/30">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Registrar Gasto
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] text-[10px] font-bold">
                Nuevo
              </span>
            </div>
            <p className="text-[11px] text-[#86948a]">
              Moneda: Colones (CRC ₡)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262a33] text-[#86948a] hover:text-white flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Monto del Débito */}
        <div className="text-center py-2 space-y-2 bg-[#0f131c] rounded-2xl p-3 border border-[#3c4a42]/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#86948a]">
            Monto del Débito
          </span>
          <div className="flex items-baseline justify-center gap-1 text-2xl sm:text-3xl font-bold text-[#4edea3]">
            <span className="text-xl">₡</span>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="bg-transparent text-center font-bold text-white focus:outline-none w-44 tracking-tight"
            />
            <span className="text-[#86948a] text-sm">,00</span>
          </div>

          {/* Quick Increment Chips */}
          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
            <button
              type="button"
              onClick={() => handleAddChip(1000)}
              className="px-2.5 py-1 rounded-full bg-[#262a33] hover:bg-[#31353e] text-[11px] font-bold text-[#dfe2ee] border border-[#3c4a42]/40 active:scale-95 transition-transform"
            >
              +₡1.000
            </button>
            <button
              type="button"
              onClick={() => handleAddChip(5000)}
              className="px-2.5 py-1 rounded-full bg-[#262a33] hover:bg-[#31353e] text-[11px] font-bold text-[#dfe2ee] border border-[#3c4a42]/40 active:scale-95 transition-transform"
            >
              +₡5.000
            </button>
            <button
              type="button"
              onClick={() => handleAddChip(20000)}
              className="px-2.5 py-1 rounded-full bg-[#262a33] hover:bg-[#31353e] text-[11px] font-bold text-[#dfe2ee] border border-[#3c4a42]/40 active:scale-95 transition-transform"
            >
              +₡20.000
            </button>
            <button
              type="button"
              onClick={() => setAmount(0)}
              className="px-2 py-1 rounded-full bg-[#93000a]/20 text-rose-300 text-[10px] font-semibold"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Categoría Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#86948a] block">
            Categoría
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'Comida', label: 'Comida & Súper', icon: 'restaurant' },
              { id: 'Iglesia', label: 'Iglesia & Diezmos', icon: 'church' },
              { id: 'Deudas', label: 'Cuotas & Deudas', icon: 'credit_card' },
              { id: 'Transporte', label: 'Transporte & Gas', icon: 'directions_car' },
              { id: 'Servicios', label: 'Servicios Básicos', icon: 'bolt' },
            ].map((cat) => {
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    isSelected
                      ? 'bg-[#10b981]/20 border-2 border-[#10b981] text-[#10b981]'
                      : 'bg-[#262a33] border border-[#3c4a42]/30 text-[#86948a] hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comercio / Descripción */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#86948a] block">
            Comercio / Descripción
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. Auto Mercado, Soda El Parque, etc."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 text-xs text-white focus:outline-none focus:border-[#10b981]"
          />
        </div>

        {/* Método de Pago */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#86948a] block">
            Método de Pago
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'BAC Credomatic (•••• 4821)', label: 'BAC Credomatic', sub: '•••• 4821', icon: 'credit_card' },
              { id: 'SINPE Móvil', label: 'SINPE Móvil', sub: 'Tel. 8842-9012', icon: 'smartphone' },
              { id: 'Efectivo', label: 'Efectivo', sub: 'Billetera física', icon: 'payments' },
              { id: 'Banco Nacional (BNCR)', label: 'Débito BNCR', sub: 'Cuenta Ahorro', icon: 'account_balance' },
            ].map((m) => {
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-2.5 rounded-xl text-left border flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-[#10b981]/15 border-[#10b981] text-white'
                      : 'bg-[#262a33]/60 border-[#3c4a42]/30 text-[#86948a] hover:bg-[#262a33]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isSelected ? 'text-[#10b981]' : 'text-[#86948a]'
                    }`}
                  >
                    {m.icon}
                  </span>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold truncate text-white leading-tight">
                      {m.label}
                    </div>
                    <div className="text-[9px] text-[#86948a] truncate">
                      {m.sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Fecha & Recurrente */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#86948a] text-[18px]">
              calendar_today
            </span>
            <div>
              <span className="text-[9px] font-semibold text-[#86948a] block">FECHA</span>
              <span className="text-xs font-bold text-white">Hoy, 18 Sep</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-semibold text-[#86948a] block">RECURRENCIA</span>
              <span className="text-xs font-bold text-white">Mensual</span>
            </div>
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded text-[#10b981] bg-[#181c24] border-[#3c4a42] focus:ring-[#10b981]"
            />
          </div>
        </div>

        {/* Nota opcional */}
        <div className="space-y-1">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[#86948a] text-[18px]">
              attach_file
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota opcional o adjuntar comprobante"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 text-xs text-white placeholder-[#86948a]/60 focus:outline-none focus:border-[#10b981]"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] active:scale-[0.98] text-[#003824] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#10b981]/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Guardar Gasto ({formatCRC(amount)})</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            className="w-full py-2 text-center text-xs text-[#86948a] hover:text-white font-semibold"
          >
            + Guardar y Registrar Otro
          </button>
        </div>
      </div>
    </div>
  );
};
