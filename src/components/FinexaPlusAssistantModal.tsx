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
import { Transaction, Account, DebtItem } from '../types';

interface FinexaPlusAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  accounts: Account[];
  debts: DebtItem[];
  currencySymbol?: string;
  dollarRates?: { buy: number; sell: number };
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
}) => {
  const [config, setConfig] = useState<NvidiaAiConfig>(getStoredNvidiaConfig());
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey || '');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('finexa_plus_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'welcome',
        sender: 'finexa',
        text: '¡Hola! Soy Finexa-Plus, tu copiloto financiero inteligente con motor neural GLM 5-3. Conozco tus cuentas, gastos y deudas en tiempo real. ¿En qué te puedo asesorar hoy?',
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

  // Verificar si la clave de NVIDIA está configurada privadamente en el servidor (.env)
  useEffect(() => {
    if (isOpen) {
      checkServerPrivateAiStatus().then((res) => {
        if (res.configured) {
          setConfig((prev) => ({
            ...prev,
            status: 'connected',
            isServerPrivate: true,
          }));
        }
      });
    }
  }, [isOpen]);

  // Chequeo de soporte para reconocimiento de voz tipo Siri
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

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  if (!isOpen) return null;

  // Generar contexto financiero del usuario
  const buildFinancialContext = (): string => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome = monthlyTransactions
      .filter((t) => t.type === 'ingreso')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = monthlyTransactions
      .filter((t) => t.type === 'gasto')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebtsRemaining = debts.reduce((sum, d) => sum + d.totalAmount, 0);

    // Gastos por categoría
    const categoryTotals: { [key: string]: number } = {};
    monthlyTransactions
      .filter((t) => t.type === 'gasto')
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
      });

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, amt]) => `- ${cat}: ${currencySymbol}${amt.toLocaleString()}`)
      .join('\n');

    const accountsList = accounts
      .map(
        (a) =>
          `- ${a.name} (${a.type}): ${a.currencySymbol || currencySymbol}${a.initialBalance.toLocaleString()}`
      )
      .join('\n');

    const debtsList = debts
      .map(
        (d) =>
          `- ${d.name}: ${currencySymbol}${d.totalAmount.toLocaleString()} (Vence: ${d.dueDate || 'Sin fecha'})`
      )
      .join('\n');

    return `
- Moneda principal: ${currencySymbol}
- Tipo de Cambio Dólar hoy: Compra ₡${dollarRates.buy} | Venta ₡${dollarRates.sell}
- Ingresos este mes: ${currencySymbol}${totalIncome.toLocaleString()}
- Gastos este mes: ${currencySymbol}${totalExpense.toLocaleString()}
- Balance neto del mes: ${currencySymbol}${(totalIncome - totalExpense).toLocaleString()}
- Total en deudas pendientes: ${currencySymbol}${totalDebtsRemaining.toLocaleString()}

CUENTAS Y SALDOS ACTIVOS:
${accountsList || 'No hay cuentas registradas'}

GASTOS POR CATEGORÍA ESTE MES:
${categoryBreakdown || 'No hay gastos registrados este mes'}

DEUDAS REGISTRADAS:
${debtsList || 'Sin deudas registradas'}
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

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const historyForAi = messages.slice(-5).map((m) => ({
      role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

    const financialContext = buildFinancialContext();

    const res = await queryFinexaPlus({
      userPrompt: textToSend,
      financialContext,
      history: historyForAi,
    });

    setIsLoading(false);

    if (res.error) {
      if (res.error.includes('NVIDIA_API_KEY') || res.error.includes('servidor')) {
        setShowConfigPanel(true);
      }
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'finexa',
        text: `🔒 ${res.error}\n\nPara máxima privacidad, guarda tu clave en el archivo .env del servidor como NVIDIA_API_KEY="nvapi-..." o abre el panel de ajustes.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } else {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'finexa',
        text: res.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
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
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setKeyFeedback('Ingresa una API Key válida.');
      return;
    }

    setIsTestingKey(true);
    setKeyFeedback(null);

    const updated = saveStoredNvidiaConfig({
      apiKey: apiKeyInput.trim(),
      model: 'glm-5-3',
      displayName: 'Finexa-Plus',
    });
    setConfig(updated);

    const testRes = await testNvidiaConnection(updated);
    setIsTestingKey(false);

    if (testRes.success) {
      setKeyFeedback('¡Conectado exitosamente con NVIDIA NIM!');
      setTimeout(() => setShowConfigPanel(false), 1200);
    } else {
      setKeyFeedback(testRes.message);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('¿Deseas reiniciar la conversación con Finexa-Plus?')) {
      const resetMsgs: Message[] = [
        {
          id: 'welcome_new',
          sender: 'finexa',
          text: 'Conversación reiniciada. ¿Qué consulta financiera deseas hacer ahora?',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(resetMsgs);
      localStorage.setItem('finexa_plus_chat_history', JSON.stringify(resetMsgs));
    }
  };

  const samplePrompts = [
    '📊 ¿Cómo van mis gastos este mes?',
    '💳 ¿Qué deudas debo priorizar?',
    '💰 ¿Cuál es mi balance general?',
    '🎯 ¿Cómo puedo ahorrar más dinero?',
    '💵 ¿Cuánto me queda disponible?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0e1219] border border-[#3c4a42]/60 rounded-3xl shadow-2xl flex flex-col h-[90vh] max-h-[720px] overflow-hidden">
        {/* Top Header con Siri Orb estilo iOS */}
        <div className="px-4 py-3.5 bg-[#141923] border-b border-[#3c4a42]/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <SiriOrb size={36} isThinking={isLoading || isListening} />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-white tracking-wide">Finexa-Plus</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-[#00d2ff]/20 to-[#ec4899]/20 text-[#00d2ff] border border-[#00d2ff]/30">
                  GLM 5-3
                </span>
              </div>
              <p className="text-[10px] text-[#86948a] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Asistente Financiero en Línea</span>
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
                className={`flex gap-2.5 max-w-[85%] ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {!isUser && (
                  <div className="shrink-0 mt-0.5">
                    <SiriOrb size={26} />
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed space-y-1 ${
                    isUser
                      ? 'bg-gradient-to-br from-[#10b981] to-[#059669] text-white font-medium rounded-tr-sm shadow-md'
                      : 'bg-[#181d28] border border-[#3c4a42]/50 text-[#dfe2ee] rounded-tl-sm shadow'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <div
                    className={`flex items-center gap-1.5 text-[9px] pt-1 ${
                      isUser ? 'text-white/80 justify-end' : 'text-[#86948a]'
                    }`}
                  >
                    <span>{m.time}</span>
                    {!isUser && (
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
                <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] to-[#ec4899] animate-pulse">
                  Finexa-Plus analizando con motor GLM 5-3...
                </span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce" style={{ animationDelay: '300ms' }} />
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

        {/* Input Bar con Micrófono tipo Siri y Botón Enviar */}
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
                title={isListening ? 'Detener micrófono' : 'Hablar con Finexa-Plus'}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-gradient-to-r from-[#ec4899] to-[#f43f5e] text-white animate-pulse shadow-lg shadow-rose-500/30'
                    : 'bg-[#262a33] text-[#86948a] hover:text-[#00d2ff] hover:bg-[#31353e]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isListening ? 'mic_active' : 'mic'}
                </span>
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? 'Escuchando tu voz...' : 'Pregúntale lo que sea a Finexa-Plus...'}
              className="flex-1 bg-[#0a0d14] border border-[#3c4a42]/60 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-[#68736d] focus:outline-none focus:border-[#00d2ff] transition-all"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00d2ff] via-[#3b82f6] to-[#8b5cf6] text-white flex items-center justify-center disabled:opacity-40 disabled:scale-100 hover:scale-105 active:scale-95 transition-all shadow-md shadow-[#00d2ff]/20"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
