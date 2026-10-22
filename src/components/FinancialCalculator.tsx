import React, { useState, useEffect } from 'react';
import { formatCRC } from '../utils/formatters';
import { ExchangeRateCalculator } from './ExchangeRateCalculator';

export interface CalcHistoryItem {
  id: string;
  expression: string;
  result: number;
  timestamp: string;
}

interface FinancialCalculatorProps {
  onUseForExpense?: (amount: number) => void;
  onUseForIncome?: (amount: number) => void;
}

export const FinancialCalculator: React.FC<FinancialCalculatorProps> = ({
  onUseForExpense,
  onUseForIncome,
}) => {
  const [expression, setExpression] = useState('');
  const [currentResult, setCurrentResult] = useState<number | null>(null);
  const [history, setHistory] = useState<CalcHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('finexa_calculator_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeTab, setActiveTab] = useState<'calculator' | 'exchange' | 'history'>('calculator');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('finexa_calculator_history', JSON.stringify(history));
    } catch {
      // storage quota or private mode
    }
  }, [history]);

  // Safe evaluation of basic math expressions
  const evaluateExpression = (expr: string): number | null => {
    if (!expr.trim()) return null;

    // Sanitize: allow only numbers, operators, spaces, decimals, percentages, parentheses
    const sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/,/g, '');

    // Percentage handling: e.g. "100 + 13%" => "100 + (100 * 0.13)" or standard "%" as "/ 100"
    // Let's replace any number followed by % with (number / 100)
    let processed = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

    if (!/^[\d+\-*/().\s]+$/.test(processed)) {
      return null;
    }

    try {
      // Safe function evaluation restricted to math
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${processed})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 100) / 100;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Live calculation preview
  useEffect(() => {
    if (!expression) {
      setCurrentResult(null);
      return;
    }
    const evaluated = evaluateExpression(expression);
    if (evaluated !== null) {
      setCurrentResult(evaluated);
    }
  }, [expression]);

  const handleInput = (val: string) => {
    setExpression((prev) => {
      // Avoid two consecutive operators
      const operators = ['+', '-', '×', '÷'];
      const lastChar = prev.slice(-1);

      if (operators.includes(val) && operators.includes(lastChar)) {
        return prev.slice(0, -1) + val;
      }

      if (val === '.' && (lastChar === '.' || prev.split(/[+\-×÷]/).pop()?.includes('.'))) {
        return prev;
      }

      return prev + val;
    });
  };

  const handleClear = () => {
    setExpression('');
    setCurrentResult(null);
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleEquals = () => {
    if (!expression) return;
    const finalResult = evaluateExpression(expression);
    if (finalResult !== null) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 
        ' • ' + now.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' });

      const newHistoryItem: CalcHistoryItem = {
        id: `calc-${Date.now()}`,
        expression,
        result: finalResult,
        timestamp: timeStr,
      };

      setHistory((prev) => [newHistoryItem, ...prev.slice(0, 49)]);
      setExpression(String(finalResult));
      setCurrentResult(finalResult);
    }
  };

  const handleCopyResult = () => {
    const valueToCopy = currentResult !== null ? String(currentResult) : expression;
    if (valueToCopy) {
      navigator.clipboard?.writeText(valueToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Deseas vaciar todo el historial de la calculadora?')) {
      setHistory([]);
    }
  };

  const handleSelectHistoryItem = (item: CalcHistoryItem) => {
    setExpression(String(item.result));
    setCurrentResult(item.result);
    setActiveTab('calculator');
  };

  return (
    <div className="space-y-3">
      {/* Sub-Tabs: Calculadora / Tasa de Cambio / Historial */}
      <div className="flex items-center justify-between p-1 bg-[#0f131c] rounded-2xl border border-[#3c4a42]/50 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('calculator')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'calculator'
              ? 'bg-[#10b981] text-[#003824] shadow'
              : 'text-[#86948a] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">calculate</span>
          <span>Calculadora</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('exchange')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'exchange'
              ? 'bg-[#10b981] text-[#003824] shadow'
              : 'text-[#86948a] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">currency_exchange</span>
          <span>Tasa Cambio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'history'
              ? 'bg-[#10b981] text-[#003824] shadow'
              : 'text-[#86948a] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">history</span>
          <span>Historial</span>
          {history.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeTab === 'history' ? 'bg-[#003824] text-[#10b981]' : 'bg-[#262a33] text-[#10b981]'
            }`}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'exchange' && (
        <div className="animate-in fade-in duration-150">
          <ExchangeRateCalculator
            compact={true}
            onUseAmount={(amt) => {
              if (onUseForExpense) onUseForExpense(amt);
              else if (onUseForIncome) onUseForIncome(amt);
            }}
          />
        </div>
      )}

      {activeTab === 'calculator' && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Pantalla / Display */}
          <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 text-right space-y-1 relative">
            <div className="min-h-[22px] text-xs font-mono text-[#86948a] overflow-x-auto whitespace-nowrap no-scrollbar">
              {expression || '0'}
            </div>

            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline justify-end gap-1 overflow-x-auto no-scrollbar">
              <span className="text-lg text-[#10b981] font-bold">₡</span>
              <span>
                {currentResult !== null ? formatCRC(currentResult).replace('₡', '').trim() : '0'}
              </span>
            </div>

            {/* Acciones rápidas de la pantalla */}
            <div className="flex items-center justify-between pt-1 border-t border-[#3c4a42]/30 text-[11px]">
              <span className="text-[10px] text-[#86948a]">
                {expression ? 'Presiona = para registrar en historial' : 'Digita los montos y operaciones'}
              </span>
              <button
                type="button"
                onClick={handleCopyResult}
                className="text-[10px] font-bold text-[#10b981] hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Botones de acción directa con el resultado: Gasto / Ingreso */}
          {currentResult !== null && currentResult > 0 && (
            <div className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-[#262a33]/60 border border-[#3c4a42]/40">
              {onUseForExpense && (
                <button
                  type="button"
                  onClick={() => onUseForExpense(currentResult)}
                  className="py-2 px-2.5 rounded-xl bg-[#ffb95f]/15 hover:bg-[#ffb95f]/25 border border-[#ffb95f]/30 text-[#ffb95f] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">remove</span>
                  <span>Usar en Gasto</span>
                </button>
              )}
              {onUseForIncome && (
                <button
                  type="button"
                  onClick={() => onUseForIncome(currentResult)}
                  className="py-2 px-2.5 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/30 text-[#10b981] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Usar en Ingreso</span>
                </button>
              )}
            </div>
          )}

          {/* Teclado de la Calculadora */}
          <div className="grid grid-cols-4 gap-2">
            {/* Fila 1 */}
            <button
              type="button"
              onClick={handleClear}
              className="p-3.5 rounded-xl bg-[#31353e] hover:bg-[#3c4a42] text-[#ffb4ab] font-bold text-sm active:scale-95 transition-all"
            >
              C
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="p-3.5 rounded-xl bg-[#31353e] hover:bg-[#3c4a42] text-[#dfe2ee] font-bold text-sm flex items-center justify-center active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">backspace</span>
            </button>
            <button
              type="button"
              onClick={() => handleInput('%')}
              className="p-3.5 rounded-xl bg-[#31353e] hover:bg-[#3c4a42] text-[#10b981] font-bold text-sm active:scale-95 transition-all"
            >
              %
            </button>
            <button
              type="button"
              onClick={() => handleInput('÷')}
              className="p-3.5 rounded-xl bg-[#00523b] hover:bg-[#10b981] hover:text-[#003824] text-[#10b981] font-bold text-lg active:scale-95 transition-all"
            >
              ÷
            </button>

            {/* Fila 2 */}
            <button
              type="button"
              onClick={() => handleInput('7')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              7
            </button>
            <button
              type="button"
              onClick={() => handleInput('8')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              8
            </button>
            <button
              type="button"
              onClick={() => handleInput('9')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              9
            </button>
            <button
              type="button"
              onClick={() => handleInput('×')}
              className="p-3.5 rounded-xl bg-[#00523b] hover:bg-[#10b981] hover:text-[#003824] text-[#10b981] font-bold text-lg active:scale-95 transition-all"
            >
              ×
            </button>

            {/* Fila 3 */}
            <button
              type="button"
              onClick={() => handleInput('4')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              4
            </button>
            <button
              type="button"
              onClick={() => handleInput('5')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              5
            </button>
            <button
              type="button"
              onClick={() => handleInput('6')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              6
            </button>
            <button
              type="button"
              onClick={() => handleInput('-')}
              className="p-3.5 rounded-xl bg-[#00523b] hover:bg-[#10b981] hover:text-[#003824] text-[#10b981] font-bold text-lg active:scale-95 transition-all"
            >
              −
            </button>

            {/* Fila 4 */}
            <button
              type="button"
              onClick={() => handleInput('1')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleInput('2')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleInput('3')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              3
            </button>
            <button
              type="button"
              onClick={() => handleInput('+')}
              className="p-3.5 rounded-xl bg-[#00523b] hover:bg-[#10b981] hover:text-[#003824] text-[#10b981] font-bold text-lg active:scale-95 transition-all"
            >
              +
            </button>

            {/* Fila 5 */}
            <button
              type="button"
              onClick={() => handleInput('00')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-sm active:scale-95 transition-all"
            >
              00
            </button>
            <button
              type="button"
              onClick={() => handleInput('0')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleInput('.')}
              className="p-3.5 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-white font-bold text-base active:scale-95 transition-all"
            >
              .
            </button>
            <button
              type="button"
              onClick={handleEquals}
              className="p-3.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xl shadow-lg shadow-[#10b981]/20 active:scale-95 transition-all"
            >
              =
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        /* Vista de Historial de Operaciones */
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#86948a] font-medium">
              Operaciones registradas ({history.length})
            </span>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-[11px] text-rose-400 hover:underline font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Vaciar historial
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#262a33] text-[#86948a] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[24px]">history</span>
              </div>
              <p className="text-xs font-bold text-white">No hay cálculos en el historial</p>
              <p className="text-[11px] text-[#86948a] max-w-xs mx-auto">
                Realiza operaciones con el botón &quot;=&quot; para guardarlas aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 hover:border-[#10b981]/40 transition-all flex items-center justify-between group"
                >
                  <button
                    type="button"
                    onClick={() => handleSelectHistoryItem(item)}
                    className="text-left space-y-1 flex-1 pr-2"
                  >
                    <div className="text-[11px] font-mono text-[#86948a] group-hover:text-[#dfe2ee]">
                      {item.expression} =
                    </div>
                    <div className="text-base font-extrabold text-[#10b981]">
                      {formatCRC(item.result)}
                    </div>
                    <div className="text-[9px] text-[#86948a]">
                      {item.timestamp}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {onUseForExpense && (
                      <button
                        type="button"
                        onClick={() => onUseForExpense(item.result)}
                        title="Usar como monto de gasto"
                        className="p-2 rounded-xl bg-[#ffb95f]/15 hover:bg-[#ffb95f]/30 text-[#ffb95f] text-[10px] font-bold"
                      >
                        Gasto
                      </button>
                    )}
                    {onUseForIncome && (
                      <button
                        type="button"
                        onClick={() => onUseForIncome(item.result)}
                        title="Usar como monto de ingreso"
                        className="p-2 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/30 text-[#10b981] text-[10px] font-bold"
                      >
                        Ingreso
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
