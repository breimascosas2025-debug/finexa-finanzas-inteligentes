import React, { useState, useEffect, useRef } from 'react';
import { SiriOrb } from './SiriOrb';
import {
  getStoredNvidiaConfig,
  saveStoredNvidiaConfig,
  testNvidiaConnection,
  queryFinexaPlus,
  checkServerPrivateAiStatus,
  NvidiaAiConfig,
} from '../services/nvidiaAiService';
import { Transaction, Account, DebtItem, BudgetConfig } from '../types';
import { calculateAccountBalance, calculateTotalBalance } from '../utils/finance';

interface FinexaPlusAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  accounts: Account[];
  debts: DebtItem[];
  currencySymbol?: string;
  dollarRates?: { buy: number; sell: number };
  budgetConfig?: BudgetConfig;
}

interface Message {
  id: string;
  sender: 'user' | 'finexa';
  text: string;
  time: string;
}

export const FinexaPlusAssistantModal: React.FC<FinexaPlusAssistantModalProps> = ({
  isOpen,
  onClose,
  transactions,
  accounts,
  debts,
  currencySymbol = '₡',
  dollarRates = { buy: 505, sell: 512 },
  budgetConfig,
}) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('finexa_plus_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'welcome',
        sender: 'finexa',
        text: 'Hola, soy el asistente de Finexa Plus. ¿En qué puedo ayudarte?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Guardar historial en localStorage
  useEffect(() => {
    localStorage.setItem('finexa_plus_chat_history', JSON.stringify(messages));
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Verificar estado del servidor privado
  useEffect(() => {
    if (isOpen) {
      checkServerPrivateAiStatus();
    }
  }, [isOpen]);

  // Reconocimiento de voz en navegadores compatibles
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'es-CR';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
          handleSendMessage(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  if (!isOpen) return null;

  // Generar contexto financiero detallado, exacto y estructurado del usuario
  const buildFinancialContext = (): string => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Mes actual
    const currentMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const incomeThisMonth = currentMonthTx
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseThisMonth = currentMonthTx
      .filter((t) => t.type === 'gasto' || t.type === 'pago_deuda' || t.type === 'diezmo')
      .reduce((sum, t) => sum + t.amount, 0);

    // Mes anterior para comparativas
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const prevMonthTx = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const incomeLastMonth = prevMonthTx
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenseLastMonth = prevMonthTx
      .filter((t) => t.type === 'gasto' || t.type === 'pago_deuda' || t.type === 'diezmo')
      .reduce((sum, t) => sum + t.amount, 0);

    // Saldos por cuenta y total disponible calculado
    const totalLiquidAvailable = calculateTotalBalance(accounts, transactions, 'CRC');

    const accountsSummary = accounts
      .map((a) => {
        const bal = calculateAccountBalance(a, transactions);
        return `- ${a.name} (${a.type}): ${a.currencySymbol || currencySymbol}${bal.toLocaleString()} (Saldo inicial: ${a.currencySymbol || currencySymbol}${a.initialBalance.toLocaleString()})`;
      })
      .join('\n');

    // Deudas pendientes y amortizaciones
    const debtsSummary = debts
      .map((d) => {
        const paid = transactions
          .filter((t) => t.type === 'pago_deuda' && t.debtId === d.id)
          .reduce((sum, t) => sum + t.amount, 0);
        const remaining = Math.max(0, d.totalAmount - paid);
        return `- ${d.name}: Total ${currencySymbol}${d.totalAmount.toLocaleString()} | Abonado: ${currencySymbol}${paid.toLocaleString()} | Pendiente: ${currencySymbol}${remaining.toLocaleString()} (Vencimiento: ${d.dueDate || 'Sin fecha fija'})`;
      })
      .join('\n');

    const totalDebtsRemaining = debts.reduce((sum, d) => {
      const paid = transactions
        .filter((t) => t.type === 'pago_deuda' && t.debtId === d.id)
        .reduce((s, t) => s + t.amount, 0);
      return sum + Math.max(0, d.totalAmount - paid);
    }, 0);

    // Desglose de gastos por categoría este mes
    const categoryTotals: { [key: string]: number } = {};
    currentMonthTx
      .filter((t) => t.type === 'gasto')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, amt]) => `- ${cat}: ${currencySymbol}${amt.toLocaleString()}`)
      .join('\n');

    // Últimos 8 movimientos para explicar transacciones
    const recentTxList = transactions.slice(0, 8).map((t) => 
      `- ${t.date.split('T')[0]}: ${t.type.toUpperCase()} | ${t.title} | ${currencySymbol}${t.amount.toLocaleString()} (${t.category})`
    ).join('\n');

    return `
RESUMEN DISPONIBLE Y GENERAL:
- Moneda principal: ${currencySymbol}
- Dinero total disponible en cuentas: ${currencySymbol}${totalLiquidAvailable.toLocaleString()}
- Tipo de Cambio Dólar hoy: Compra ₡${dollarRates.buy} | Venta ₡${dollarRates.sell}

COMPARATIVA DE MESES:
- Mes actual: Ingresos ${currencySymbol}${incomeThisMonth.toLocaleString()} | Gastos ${currencySymbol}${expenseThisMonth.toLocaleString()} | Balance neto: ${currencySymbol}${(incomeThisMonth - expenseThisMonth).toLocaleString()}
- Mes anterior: Ingresos ${currencySymbol}${incomeLastMonth.toLocaleString()} | Gastos ${currencySymbol}${expenseLastMonth.toLocaleString()} | Balance neto: ${currencySymbol}${(incomeLastMonth - expenseLastMonth).toLocaleString()}

CUENTAS Y SALDOS REALES:
${accountsSummary || 'No hay cuentas registradas'}

DEUDAS Y PAGOS PENDIENTES:
- Total pendiente en deudas: ${currencySymbol}${totalDebtsRemaining.toLocaleString()}
${debtsSummary || 'Sin deudas registradas'}

GASTOS POR CATEGORÍA MES ACTUAL:
${categoryBreakdown || 'No hay gastos registrados este mes'}

ÚLTIMOS MOVIMIENTOS REGISTRADOS:
${recentTxList || 'Sin transacciones recientes'}
    `.trim();
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: Message = {
      id: aiMsgId,
      sender: 'finexa',
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setInputText('');
    setIsLoading(true);

    const historyForAi = messages.slice(-6).map((m) => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

    const financialContext = buildFinancialContext();

    const res = await queryFinexaPlus({
      userPrompt: textToSend,
      financialContext,
      history: historyForAi,
      onStreamChunk: (_delta, fullText) => {
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, text: fullText } : m))
        );
      },
    });

    setIsLoading(false);

    if (res.error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                text: `🔒 ${res.error}\n\nPara activar Finexa Plus, asegúrate de configurar la variable NVIDIA_API_KEY en las variables de entorno de tu proyecto en Vercel (Settings > Environment Variables).`,
              }
            : m
        )
      );
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, text: res.reply } : m))
      );
    }
  };

  const handleToggleVoice = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleClearChat = () => {
    if (window.confirm('¿Deseas reiniciar la conversación con Finexa Plus?')) {
      const resetMsgs: Message[] = [
        {
          id: 'welcome_new',
          sender: 'finexa',
          text: 'Hola, soy el asistente de Finexa Plus. ¿En qué puedo ayudarte?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(resetMsgs);
      localStorage.setItem('finexa_plus_chat_history', JSON.stringify(resetMsgs));
    }
  };

  const samplePrompts = [
    '📊 ¿Cómo van mis gastos este mes?',
    '💵 ¿Cuánto dinero disponible tengo en mis cuentas?',
    '💳 ¿Cómo puedo organizar mis deudas y pagos?',
    '📈 Compara mis gastos con el mes anterior',
    '🎯 ¿Cómo puedo crear un presupuesto efectivo?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-xl bg-[#0e1219] border border-[#3c4a42]/60 rounded-3xl shadow-2xl flex flex-col h-[90vh] max-h-[720px] overflow-hidden">
        {/* Top Header */}
        <div className="px-4 py-3.5 bg-[#141923] border-b border-[#3c4a42]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <SiriOrb size={36} isThinking={isLoading || isListening} />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white tracking-wide">Finexa Plus</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-[#86948a]">
                Asistente Financiero Inteligente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClearChat}
              title="Reiniciar chat"
              className="w-8 h-8 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#86948a] hover:text-white flex items-center justify-center text-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#262a33] hover:bg-rose-950/40 text-[#86948a] hover:text-rose-400 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          {messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 max-w-[88%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {!isUser && (
                  <div className="shrink-0 mt-0.5">
                    <SiriOrb size={26} />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 ${
                    isUser
                      ? 'bg-gradient-to-br from-[#10b981] to-[#059669] text-white font-medium rounded-tr-sm shadow-md'
                      : 'bg-[#181d28] border border-[#3c4a42]/50 text-[#dfe2ee] rounded-tl-sm shadow'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text || (isLoading ? 'Escribiendo respuesta...' : '')}</p>
                  <div
                    className={`flex items-center gap-1.5 text-[9px] pt-1 ${
                      isUser ? 'text-white/80 justify-end' : 'text-[#86948a]'
                    }`}
                  >
                    <span>{m.time}</span>
                    {!isUser && m.text && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(m.text)}
                        title="Copiar respuesta"
                        className="hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-[#181d28]/70 border border-[#3c4a42]/40 rounded-2xl w-fit">
              <SiriOrb size={26} isThinking={true} />
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-400 animate-pulse">
                  Finexa Plus respondiendo...
                </span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-[#0c0f16] border-t border-[#3c4a42]/30 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1 rounded-full bg-[#181d28] hover:bg-[#262a33] text-[11px] font-medium text-[#c2c7d0] hover:text-white border border-[#3c4a42]/40 shrink-0 active:scale-95 transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#141923] border-t border-[#3c4a42]/40 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {speechSupported && (
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListening ? 'Detener micrófono' : 'Hablar con Finexa Plus'}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-amber-400 text-white animate-pulse shadow-lg shadow-fuchsia-500/40 ring-2 ring-cyan-400/80'
                    : 'bg-[#262a33] text-[#86948a] hover:text-[#10b981] hover:bg-[#31353e]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isListening ? 'mic' : 'mic_none'}
                </span>
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pregúntale a Finexa Plus sobre tus finanzas..."
              className="flex-1 bg-[#181d28] border border-[#3c4a42]/60 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#10b981] transition-all"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                inputText.trim() && !isLoading
                  ? 'bg-gradient-to-tr from-[#10b981] to-[#059669] text-white shadow-lg shadow-emerald-500/25 active:scale-90 hover:scale-105'
                  : 'bg-[#262a33] text-[#86948a] cursor-not-allowed opacity-50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
