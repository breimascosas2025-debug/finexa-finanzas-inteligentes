import React, { useState } from 'react';
import { SubscriptionItem, Account, Transaction } from '../types';
import { formatCRC } from '../utils/formatters';

interface SubscriptionsManagerProps {
  subscriptions: SubscriptionItem[];
  accounts: Account[];
  onAddSubscription: (sub: Omit<SubscriptionItem, 'id' | 'createdAt'>) => void;
  onUpdateSubscription: (id: string, updates: Partial<SubscriptionItem>) => void;
  onDeleteSubscription: (id: string) => void;
  onPaySubscription: (sub: SubscriptionItem, accountId?: string) => void;
}

const PRESET_SERVICES = [
  { name: 'Netflix', defaultAmount: 7500, category: 'Servicios', icon: 'tv', color: '#e50914' },
  { name: 'Spotify', defaultAmount: 4500, category: 'Servicios', icon: 'music_note', color: '#1db954' },
  { name: 'YouTube Premium', defaultAmount: 5200, category: 'Servicios', icon: 'smart_display', color: '#ff0000' },
  { name: 'Disney+', defaultAmount: 6000, category: 'Servicios', icon: 'movie', color: '#113ccf' },
  { name: 'Amazon Prime', defaultAmount: 3800, category: 'Servicios', icon: 'shopping_bag', color: '#00a8e1' },
  { name: 'Gimnasio', defaultAmount: 25000, category: 'Personal', icon: 'fitness_center', color: '#f59e0b' },
  { name: 'Internet Fibra', defaultAmount: 28000, category: 'Servicios', icon: 'wifi', color: '#3b82f6' },
  { name: 'Recibo Eléctrico (Luz)', defaultAmount: 22000, category: 'Servicios', icon: 'bolt', color: '#eab308' },
  { name: 'Agua (AyA)', defaultAmount: 9500, category: 'Servicios', icon: 'water_drop', color: '#06b6d4' },
  { name: 'Alquiler / Hipoteca', defaultAmount: 200000, category: 'Servicios', icon: 'home', color: '#8b5cf6' },
  { name: 'Telefonía Celular', defaultAmount: 12000, category: 'Servicios', icon: 'smartphone', color: '#10b981' },
];

export const SubscriptionsManager: React.FC<SubscriptionsManagerProps> = ({
  subscriptions,
  accounts,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onPaySubscription,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'CRC' | 'USD'>('CRC');
  const [billingCycle, setBillingCycle] = useState<'mensual' | 'anual' | 'quincenal'>('mensual');
  const [billingDay, setBillingDay] = useState('5');
  const [category, setCategory] = useState('Servicios');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [reminderDays, setReminderDays] = useState('2');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApplyPreset = (preset: typeof PRESET_SERVICES[0]) => {
    setName(preset.name);
    setAmount(String(preset.defaultAmount));
    setCategory(preset.category);
    setShowAddForm(true);
  };

  const handleSaveNewSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/,/g, ''));
    if (!name.trim() || isNaN(numAmount) || numAmount <= 0) return;

    onAddSubscription({
      name: name.trim(),
      amount: numAmount,
      currency,
      billingCycle,
      billingDay: parseInt(billingDay, 10) || 1,
      category,
      accountId: selectedAccountId || undefined,
      isActive: true,
      reminderDaysBefore: parseInt(reminderDays, 10) || 2,
    });

    setName('');
    setAmount('');
    setShowAddForm(false);
    showToast('¡Suscripción añadida con éxito!');
  };

  // Cálculo de totales mensuales y anuales
  const activeSubs = subscriptions.filter((s) => s.isActive);
  const totalMonthlyCRC = activeSubs.reduce((sum, s) => {
    let monthlyVal = s.amount;
    if (s.billingCycle === 'anual') monthlyVal = s.amount / 12;
    if (s.billingCycle === 'quincenal') monthlyVal = s.amount * 2;
    // Si está en dólares, estimamos a ₡510
    if (s.currency === 'USD') monthlyVal = monthlyVal * 510;
    return sum + monthlyVal;
  }, 0);

  const totalYearlyCRC = totalMonthlyCRC * 12;

  // Calcular días para el próximo cobro
  const today = new Date();
  const currentDay = today.getDate();

  const getDaysUntilCharge = (subDay: number) => {
    if (subDay >= currentDay) {
      return subDay - currentDay;
    } else {
      const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      return daysInCurrentMonth - currentDay + subDay;
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7e22ce] text-white flex items-center justify-center font-black shadow-lg shadow-[#a855f7]/20">
            <span className="material-symbols-outlined text-[24px]">event_repeat</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Suscripciones y Pagos Fijos
              </h3>
              <span className="text-[9px] bg-[#a855f7]/20 text-[#c084fc] font-bold px-1.5 py-0.2 rounded">
                {activeSubs.length} activas
              </span>
            </div>
            <p className="text-[10px] text-[#86948a]">
              Control de débitos automáticos, fechas de corte y recordatorios
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
          <span>{showAddForm ? 'Cerrar' : 'Nueva'}</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-2xl bg-[#10b981]/20 border border-[#10b981] text-[#10b981] text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tarjeta de Resumen de Gastos Fijos */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#1c1b29] to-[#121620] border border-[#a855f7]/30 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-[#a855f7]">
            Costo Mensual Estimado
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
            {formatCRC(totalMonthlyCRC)}
          </div>
          <span className="text-[10px] text-[#86948a]">
            Proyección anual: <strong className="text-white">{formatCRC(totalYearlyCRC)}</strong>
          </span>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center text-[#c084fc]">
          <span className="material-symbols-outlined text-[28px]">calendar_month</span>
        </div>
      </div>

      {/* Catálogo de Presets Rápidos */}
      {!showAddForm && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider px-0.5">
            Añadir servicio común con 1 toque:
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {PRESET_SERVICES.slice(0, 7).map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-[#181c24] hover:bg-[#202530] border border-[#3c4a42]/50 text-white text-[11px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]" style={{ color: preset.color }}>
                  {preset.icon}
                </span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulario para Crear Nueva Suscripción */}
      {showAddForm && (
        <form onSubmit={handleSaveNewSubscription} className="p-4 rounded-3xl bg-[#0f131c] border border-[#a855f7]/40 space-y-3 animate-in fade-in">
          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#a855f7]">add_circle</span>
            <span>Registrar Nuevo Servicio o Pago Fijo</span>
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Nombre del Servicio:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Netflix, Gimnasio"
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Monto del Cobro:</label>
              <div className="flex gap-1">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-2 text-xs font-bold text-white focus:outline-none"
                >
                  <option value="CRC">₡ CRC</option>
                  <option value="USD">$ USD</option>
                </select>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Frecuencia:</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value as any)}
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="mensual">Mensual</option>
                <option value="quincenal">Quincenal</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Día de cobro:</label>
              <input
                type="number"
                min="1"
                max="31"
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-[#86948a] block mb-1">Avisarme antes:</label>
              <select
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="1">1 día antes</option>
                <option value="2">2 días antes</option>
                <option value="3">3 días antes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#86948a] block mb-1">
              Cuenta bancaria predeterminada de cobro:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
            >
              <option value="">Sin cuenta específica</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currencySymbol || '₡'})
                </option>
              ))}
            </select>
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
              className="px-4 py-1.5 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-black shadow-md active:scale-95"
            >
              Guardar Suscripción
            </button>
          </div>
        </form>
      )}

      {/* Lista de Suscripciones Activas */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#86948a] px-0.5">
          Tus Servicios y Fechas de Cobro:
        </span>

        {subscriptions.length === 0 ? (
          <div className="p-6 rounded-3xl bg-[#181c24]/50 border border-dashed border-[#3c4a42]/60 text-center space-y-2">
            <span className="material-symbols-outlined text-[32px] text-[#86948a]">event_busy</span>
            <p className="text-xs text-[#86948a]">
              Aún no tienes suscripciones registradas. Añade Netflix, el gimnasio o el recibo de la luz para nunca olvidar una fecha de cobro.
            </p>
          </div>
        ) : (
          subscriptions.map((sub) => {
            const daysLeft = getDaysUntilCharge(sub.billingDay);
            const isDueSoon = daysLeft <= sub.reminderDaysBefore;
            const isDueToday = daysLeft === 0;

            return (
              <div
                key={sub.id}
                className={`p-3.5 rounded-2xl bg-[#181c24] border transition-all ${
                  isDueToday
                    ? 'border-[#ef4444] bg-[#ef4444]/5'
                    : isDueSoon
                    ? 'border-[#eab308] bg-[#eab308]/5'
                    : 'border-[#3c4a42]/50 hover:border-[#a855f7]/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#262a33] text-white flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[20px] text-[#c084fc]">
                        subscriptions
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-extrabold text-white">{sub.name}</h4>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                            isDueToday
                              ? 'bg-[#ef4444] text-white animate-pulse'
                              : isDueSoon
                              ? 'bg-[#eab308] text-[#1c1917]'
                              : 'bg-[#262a33] text-[#86948a]'
                          }`}
                        >
                          {isDueToday ? '¡Cobro Hoy!' : `Cobro en ${daysLeft} días`}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#86948a] mt-0.5">
                        Día {sub.billingDay} de cada mes • {sub.billingCycle}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-white">
                      {sub.currency === 'USD' ? `$${sub.amount.toFixed(2)}` : formatCRC(sub.amount)}
                    </div>
                    <span className="text-[9px] text-[#86948a] block">
                      {sub.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#3c4a42]/30 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onPaySubscription(sub, sub.accountId);
                      showToast(`¡Pago de ${sub.name} registrado en tus gastos!`);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] font-bold text-[10px] flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[13px]">payments</span>
                    <span>Registrar pago este mes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteSubscription(sub.id)}
                    className="text-[#86948a] hover:text-[#ef4444] text-[10px] font-bold flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
