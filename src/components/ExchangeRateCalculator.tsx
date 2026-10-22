import React, { useState } from 'react';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../utils/formatters';

interface ExchangeRateCalculatorProps {
  onUseAmount?: (amount: number, currency: string) => void;
  compact?: boolean;
}

// Tasas de cambio base referenciales comunes (actualizables por el usuario)
const DEFAULT_RATES: Record<string, number> = {
  // Base USD
  'USD_CRC': 515.00,
  'CRC_USD': 1 / 515.00,
  'USD_EUR': 0.92,
  'EUR_USD': 1.087,
  'EUR_CRC': 560.50,
  'CRC_EUR': 1 / 560.50,
  'USD_DOP': 60.50,
  'DOP_USD': 1 / 60.50,
  'CRC_DOP': 0.1175,
  'DOP_CRC': 8.51,
  'USD_MXN': 18.20,
  'MXN_USD': 1 / 18.20,
  'USD_COP': 4150.00,
  'COP_USD': 1 / 4150.00,
};

export const ExchangeRateCalculator: React.FC<ExchangeRateCalculatorProps> = ({
  onUseAmount,
  compact = false,
}) => {
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('CRC');
  const [fromAmount, setFromAmount] = useState<string>('100');
  const [customRate, setCustomRate] = useState<string>('');
  const [isCustomRateActive, setIsCustomRateActive] = useState(false);
  const [copied, setCopied] = useState(false);

  // Obtener la tasa de cambio actual entre las dos monedas
  const getStandardRate = (from: string, to: string): number => {
    if (from === to) return 1;
    const pair = `${from}_${to}`;
    if (DEFAULT_RATES[pair]) return DEFAULT_RATES[pair];

    // Cruzar por USD
    const fromToUSD = from === 'USD' ? 1 : DEFAULT_RATES[`${from}_USD`] || (1 / (DEFAULT_RATES[`USD_${from}`] || 1));
    const usdToTarget = to === 'USD' ? 1 : DEFAULT_RATES[`USD_${to}`] || (1 / (DEFAULT_RATES[`${to}_USD`] || 1));
    return fromToUSD * usdToTarget;
  };

  const activeRate = isCustomRateActive && parseFloat(customRate) > 0
    ? parseFloat(customRate)
    : getStandardRate(fromCurrency, toCurrency);

  const numFromAmount = parseFloat(fromAmount.replace(/,/g, '')) || 0;
  const calculatedToAmount = numFromAmount * activeRate;

  const handleSwapCurrencies = () => {
    const oldFrom = fromCurrency;
    const oldTo = toCurrency;
    setFromCurrency(oldTo);
    setToCurrency(oldFrom);
    if (isCustomRateActive && activeRate > 0) {
      setCustomRate((1 / activeRate).toFixed(4));
    }
  };

  const handleCopyResult = () => {
    navigator.clipboard?.writeText(calculatedToAmount.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const quickPresets = fromCurrency === 'USD' || fromCurrency === 'EUR'
    ? [10, 20, 50, 100, 500, 1000]
    : fromCurrency === 'CRC'
    ? [5000, 10000, 25000, 50000, 100000]
    : [100, 500, 1000, 5000];

  const getCurrencySymbol = (code: string) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
    return found ? found.symbol : code;
  };

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/50 shadow-xl'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Conversor & Tasa de Cambio
            </h3>
            <p className="text-[10px] text-[#86948a]">
              Conversión en tiempo real con tasa editable
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsCustomRateActive(!isCustomRateActive);
            if (!isCustomRateActive) {
              setCustomRate(activeRate.toFixed(4));
            }
          }}
          className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-all ${
            isCustomRateActive
              ? 'bg-[#ee9800]/20 border-[#ee9800] text-[#ffc978]'
              : 'bg-[#262a33] border-[#3c4a42]/60 text-[#86948a] hover:text-white'
          }`}
        >
          {isCustomRateActive ? '✎ Tasa Personalizada' : 'Tasa Automática'}
        </button>
      </div>

      {/* Main Conversion Panel */}
      <div className="space-y-3">
        {/* Moneda Origen */}
        <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#86948a]">
            <span>Tú envías / Tienes</span>
            <span className="font-bold text-[#10b981]">{getCurrencySymbol(fromCurrency)}</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="bg-[#181c24] border border-[#3c4a42]/70 text-white font-bold text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#10b981]"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0"
              step="any"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-right text-xl font-extrabold text-white focus:outline-none placeholder:text-[#86948a]"
            />
          </div>
        </div>

        {/* Swap Button & Rate Tag */}
        <div className="relative flex items-center justify-center my-1">
          <div className="absolute inset-x-0 h-px bg-[#3c4a42]/40" />
          <div className="relative z-10 flex items-center gap-2 bg-[#181c24] px-3 py-1 rounded-full border border-[#3c4a42]/60">
            <button
              type="button"
              onClick={handleSwapCurrencies}
              className="w-7 h-7 rounded-full bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] flex items-center justify-center active:scale-95 transition-all"
              title="Invertir monedas"
            >
              <span className="material-symbols-outlined text-[16px]">swap_vert</span>
            </button>
            <span className="text-[11px] font-mono text-[#dfe2ee]">
              1 {fromCurrency} = <strong className="text-[#10b981]">{activeRate.toLocaleString('es-CR', { maximumFractionDigits: 4 })}</strong> {toCurrency}
            </span>
          </div>
        </div>

        {/* Moneda Destino */}
        <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#10b981]/40 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#86948a]">
            <span>Tú recibes / Equivale a</span>
            <span className="font-bold text-[#10b981]">{getCurrencySymbol(toCurrency)}</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="bg-[#181c24] border border-[#3c4a42]/70 text-white font-bold text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-[#10b981]"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>

            <div className="flex-1 text-right">
              <span className="text-2xl font-black text-[#10b981] tracking-tight">
                {formatCurrency(calculatedToAmount, toCurrency, getCurrencySymbol(toCurrency))}
              </span>
            </div>
          </div>
        </div>

        {/* Rate Editor (if custom is active) */}
        {isCustomRateActive && (
          <div className="p-3 rounded-xl bg-[#262a33]/60 border border-[#ee9800]/40 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#ffc978] uppercase">
                Tasa manual personalizada: 1 {fromCurrency} en {toCurrency}
              </label>
              <button
                type="button"
                onClick={() => setCustomRate(getStandardRate(fromCurrency, toCurrency).toFixed(4))}
                className="text-[10px] text-[#86948a] hover:text-white underline"
              >
                Restablecer estándar
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={customRate}
              onChange={(e) => setCustomRate(e.target.value)}
              placeholder={`Ej: ${getStandardRate(fromCurrency, toCurrency)}`}
              className="w-full bg-[#0f131c] border border-[#3c4a42] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#ee9800]"
            />
          </div>
        )}

        {/* Quick Amount Chips */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider block">
            Montos rápidos ({fromCurrency}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setFromAmount(String(amt))}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                  parseFloat(fromAmount) === amt
                    ? 'bg-[#10b981] text-[#003824] border-[#10b981]'
                    : 'bg-[#0f131c] border-[#3c4a42]/60 text-[#dfe2ee] hover:border-[#10b981]/50'
                }`}
              >
                {getCurrencySymbol(fromCurrency)} {amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyResult}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-[#3c4a42]/50 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">content_copy</span>
            <span>{copied ? '¡Copiado!' : 'Copiar Resultado'}</span>
          </button>

          {onUseAmount && calculatedToAmount > 0 && (
            <button
              type="button"
              onClick={() => onUseAmount(calculatedToAmount, toCurrency)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#10b981]/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Usar este Monto</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
