import React, { useState, useEffect } from 'react';
import { DollarRateData, BankRate, fetchLiveDollarRate, calculateBankRates } from '../services/exchangeRateService';

interface DollarExchangeMonitorProps {
  onUseAmount?: (amount: number, currency: string, isIncome: boolean) => void;
  compact?: boolean;
}

export const DollarExchangeMonitor: React.FC<DollarExchangeMonitorProps> = ({
  onUseAmount,
  compact = false,
}) => {
  const [rateData, setRateData] = useState<DollarRateData | null>(null);
  const [banks, setBanks] = useState<BankRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modo de conversión en la calculadora
  // 'buy': El usuario compra dólares (paga en CRC al precio de venta)
  // 'sell': El usuario vende dólares (recibe CRC al precio de compra)
  const [calcMode, setCalcMode] = useState<'buy' | 'sell'>('buy');
  const [inputAmount, setInputAmount] = useState<string>('100');
  const [selectedBank, setSelectedBank] = useState<string>('BCCR');
  const [customRate, setCustomRate] = useState<string>('');
  const [useCustomRate, setUseCustomRate] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const data = await fetchLiveDollarRate();
      setRateData(data);
      setBanks(calculateBankRates(data));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentBankRate = banks.find((b) => b.shortName === selectedBank) || banks[0];
  const activeCompra = useCustomRate && parseFloat(customRate) > 0 ? parseFloat(customRate) : (currentBankRate?.compra || 445.27);
  const activeVenta = useCustomRate && parseFloat(customRate) > 0 ? parseFloat(customRate) : (currentBankRate?.venta || 450.00);

  const numAmount = parseFloat(inputAmount.replace(/,/g, '')) || 0;

  // Si compra USD: ingresa cantidad de USD que quiere, o cantidad de CRC que tiene
  // Calculamos el costo en CRC = USD * Venta
  const crcNeededToBuyUSD = numAmount * activeVenta;

  // Si vende USD: ingresa USD que vende y recibe CRC = USD * Compra
  const crcReceivedFromSellingUSD = numAmount * activeCompra;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`space-y-4 ${compact ? '' : 'p-4 rounded-3xl bg-[#181c24] border border-[#3c4a42]/50 shadow-xl'}`}>
      {/* Header del Monitor de Dólar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#047857] text-[#003824] flex items-center justify-center font-black shadow-lg shadow-[#10b981]/20">
            <span className="material-symbols-outlined text-[24px]">attach_money</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Dólar Hoy en Costa Rica
              </h3>
              <span className="text-[9px] bg-[#10b981] text-[#003824] font-black px-1.5 py-0.2 rounded uppercase">
                Nueva
              </span>
            </div>
            <p className="text-[10px] text-[#86948a] flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${rateData?.isOnline ? 'bg-[#10b981] animate-pulse' : 'bg-[#eab308]'}`} />
              <span>
                {rateData?.source || 'BCCR'} • Refresco: {rateData?.fecha || 'Hoy'}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="px-2.5 py-1.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#86948a] hover:text-white text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
          title="Actualizar tasa en vivo"
        >
          <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin text-[#10b981]' : ''}`}>
            sync
          </span>
          <span className="text-[10px] hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-2">
          <span className="material-symbols-outlined text-3xl text-[#10b981] animate-spin">
            progress_activity
          </span>
          <p className="text-xs text-[#86948a]">Consultando tipo de cambio oficial BCCR...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas Principales: Compra y Venta */}
          <div className="grid grid-cols-2 gap-3">
            {/* Tarjeta de Compra */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0d281e] to-[#181c24] border border-[#10b981]/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                  <span>Compra</span>
                </span>
                <span className="text-[9px] bg-[#10b981]/20 text-[#10b981] px-1 rounded font-bold">
                  BCCR
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ₡{rateData?.compra?.toFixed(2) || '445.27'}
              </div>
              <p className="text-[9px] text-[#86948a] mt-1 leading-tight">
                El banco te paga esto por cada $1 USD que vendas
              </p>
            </div>

            {/* Tarjeta de Venta */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2b1f14] to-[#181c24] border border-[#ffb95f]/40 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#ffb95f] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                  <span>Venta</span>
                </span>
                <span className="text-[9px] bg-[#ffb95f]/20 text-[#ffb95f] px-1 rounded font-bold">
                  BCCR
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ₡{rateData?.venta?.toFixed(2) || '450.00'}
              </div>
              <p className="text-[9px] text-[#86948a] mt-1 leading-tight">
                El banco te cobra esto por cada $1 USD que compres
              </p>
            </div>
          </div>

          {/* Margen Cambiario / Spread Referencial */}
          <div className="px-3 py-2 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#86948a] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#10b981]">balance</span>
              <span>Diferencial Cambiario (Spread):</span>
            </span>
            <span className="font-extrabold text-white">
              ₡{((rateData?.venta || 450) - (rateData?.compra || 445.27)).toFixed(2)} por dólar
            </span>
          </div>

          {/* Calculadora / Conversor de Compra y Venta */}
          <div className="p-3.5 rounded-2xl bg-[#0f131c]/70 border border-[#3c4a42]/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#10b981]">calculate</span>
                <span>Calculadora de Cambio Rápido</span>
              </h4>

              {/* Selector de modo */}
              <div className="flex bg-[#181c24] p-0.5 rounded-xl border border-[#3c4a42]/60">
                <button
                  type="button"
                  onClick={() => setCalcMode('buy')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    calcMode === 'buy'
                      ? 'bg-[#ffb95f] text-[#3e2800] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  Comprar Dólares
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('sell')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    calcMode === 'sell'
                      ? 'bg-[#10b981] text-[#003824] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  Vender Dólares
                </button>
              </div>
            </div>

            {/* Input de cantidad */}
            <div>
              <label className="text-[10px] font-semibold text-[#86948a] block mb-1">
                {calcMode === 'buy'
                  ? 'Cantidad de Dólares ($ USD) que deseas comprar:'
                  : 'Cantidad de Dólares ($ USD) que deseas cambiar a Colones:'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#86948a]">
                  $
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  placeholder="100"
                  className="w-full bg-[#181c24] border border-[#3c4a42]/70 rounded-xl pl-8 pr-16 py-2 text-sm font-bold text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-[#86948a]">
                  USD
                </span>
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="flex flex-wrap gap-1.5">
              {[20, 50, 100, 200, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setInputAmount(String(amt))}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                    inputAmount === String(amt)
                      ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                      : 'bg-[#181c24] border-[#3c4a42]/50 text-[#86948a] hover:text-white'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Selección de Entidad Bancaria */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] font-bold text-[#86948a]">Entidad para la tasa:</span>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="bg-[#181c24] border border-[#3c4a42]/70 rounded-lg px-2 py-1 text-[11px] text-white font-bold focus:outline-none"
              >
                {banks.map((b) => (
                  <option key={b.shortName} value={b.shortName}>
                    {b.shortName} ({calcMode === 'buy' ? `Venta: ₡${b.venta}` : `Compra: ₡${b.compra}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Resultado del Cálculo */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#181c24] to-[#12161f] border border-[#3c4a42]/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#86948a] block">
                  {calcMode === 'buy' ? 'Debes pagar en Colones:' : 'Recibirás en Colones:'}
                </span>
                <span className="text-xl font-black text-white">
                  ₡{(calcMode === 'buy' ? crcNeededToBuyUSD : crcReceivedFromSellingUSD).toLocaleString('es-CR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[9px] text-[#86948a] block mt-0.5">
                  Tasa aplicada: ₡{calcMode === 'buy' ? activeVenta.toFixed(2) : activeCompra.toFixed(2)} por $1
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      (calcMode === 'buy' ? crcNeededToBuyUSD : crcReceivedFromSellingUSD).toFixed(2)
                    )
                  }
                  className="p-2 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] hover:text-white transition-all active:scale-95"
                  title="Copiar resultado"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>

                {onUseAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      const finalAmount = Math.round(calcMode === 'buy' ? crcNeededToBuyUSD : crcReceivedFromSellingUSD);
                      onUseAmount(finalAmount, 'CRC', calcMode === 'sell');
                    }}
                    className="px-2.5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] text-[11px] font-black flex items-center gap-1 active:scale-95 transition-all shadow-md"
                  >
                    <span>Usar monto</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tabla Comparativa de Bancos en Costa Rica */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#86948a] flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">account_balance</span>
                <span>Comparativa en Bancos de Costa Rica</span>
              </span>
              <span className="text-[9px] text-[#86948a]">Estimación ventanilla</span>
            </div>

            <div className="space-y-1.5">
              {banks.map((b) => (
                <div
                  key={b.shortName}
                  onClick={() => setSelectedBank(b.shortName)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedBank === b.shortName
                      ? 'bg-[#262a33] border-[#10b981]'
                      : 'bg-[#0f131c]/60 border-[#3c4a42]/40 hover:bg-[#181c24]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: b.color }}
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{b.name}</span>
                        {b.tag === 'official' && (
                          <span className="text-[8px] bg-[#10b981]/20 text-[#10b981] font-bold px-1 rounded">
                            Oficial
                          </span>
                        )}
                        {b.tag === 'best_sell' && (
                          <span className="text-[8px] bg-[#3b82f6]/20 text-[#60a5fa] font-bold px-1 rounded">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#86948a]">
                        Diferencial: ₡{b.spread.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[9px] text-[#10b981] font-semibold block">Compra</span>
                      <span className="text-xs font-bold text-white">₡{b.compra.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#ffb95f] font-semibold block">Venta</span>
                      <span className="text-xs font-bold text-white">₡{b.venta.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
