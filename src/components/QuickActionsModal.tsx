import React, { useState } from 'react';
import { Account, DebtItem, SavingsGoal, Transaction, BudgetConfig, SubscriptionItem, SharedHouseholdConfig } from '../types';
import { calculateAccountBalance } from '../utils/finance';
import { formatCRC, formatCurrency, SUPPORTED_CURRENCIES } from '../utils/formatters';
import { FinancialCalculator } from './FinancialCalculator';
import { UnifiedNetWorthCard } from './UnifiedNetWorthCard';
import { SavingsGoalsSection } from './SavingsGoalsSection';
import { ExpenseCategoryCharts } from './ExpenseCategoryCharts';
import { ExchangeRateCalculator } from './ExchangeRateCalculator';
import { DollarExchangeMonitor } from './DollarExchangeMonitor';
import { BudgetSmartManager } from './BudgetSmartManager';
import { SubscriptionsManager } from './SubscriptionsManager';
import { EmergencyFundSimulator } from './EmergencyFundSimulator';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { HouseholdFinanceManager } from './HouseholdFinanceManager';
import { CalendarSyncModal } from './CalendarSyncModal';

export type ActionType = 
  | 'menu' 
  | 'ingreso' 
  | 'gasto' 
  | 'cuenta' 
  | 'deuda' 
  | 'pago_deuda' 
  | 'transferencia' 
  | 'diezmo'
  | 'calculadora'
  | 'patrimonio'
  | 'metas_ahorro'
  | 'graficos_gastos'
  | 'tasa_cambio'
  | 'dolar_hoy'
  | 'presupuesto'
  | 'suscripciones'
  | 'fondo_emergencia'
  | 'escanear_factura'
  | 'finanzas_pareja'
  | 'calendario';

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  debts: DebtItem[];
  transactions: Transaction[];
  savingsGoals?: SavingsGoal[];
  budgetConfig?: BudgetConfig;
  onSaveBudgetConfig?: (config: BudgetConfig) => void;
  subscriptions?: SubscriptionItem[];
  onAddSubscription?: (sub: Omit<SubscriptionItem, 'id' | 'createdAt'>) => void;
  onUpdateSubscription?: (id: string, updates: Partial<SubscriptionItem>) => void;
  onDeleteSubscription?: (id: string) => void;
  onPaySubscription?: (sub: SubscriptionItem, accountId?: string) => void;
  householdConfig?: SharedHouseholdConfig;
  onSaveHouseholdConfig?: (config: SharedHouseholdConfig) => void;
  initialAction?: ActionType;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onAddAccount: (acc: Omit<Account, 'id' | 'createdAt'>) => void;
  onAddDebt: (debt: Omit<DebtItem, 'id' | 'createdAt'>) => void;
  onAddSavingsGoal?: (goal: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  onUpdateSavingsGoalAmount?: (goalId: string, addedAmount: number, sourceAccountId?: string) => void;
  onDeleteSavingsGoal?: (goalId: string) => void;
  onNavigate?: (screen: any) => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  isOpen,
  onClose,
  accounts,
  debts,
  transactions,
  savingsGoals = [],
  budgetConfig = { monthlyLimit: 0, currency: 'CRC', needsPercent: 50, wantsPercent: 30, savingsPercent: 20 },
  onSaveBudgetConfig = () => {},
  subscriptions = [],
  onAddSubscription = () => {},
  onUpdateSubscription = () => {},
  onDeleteSubscription = () => {},
  onPaySubscription = () => {},
  householdConfig = { isEnabled: false, householdName: 'Hogar', partnerName: 'Mi Pareja', splitRatioYo: 50, splitRatioPareja: 50, expenses: [] },
  onSaveHouseholdConfig = () => {},
  initialAction = 'menu',
  onAddTransaction,
  onAddAccount,
  onAddDebt,
  onAddSavingsGoal,
  onUpdateSavingsGoalAmount,
  onDeleteSavingsGoal,
  onNavigate,
}) => {
  const [currentMode, setCurrentMode] = useState<ActionType>(initialAction);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Comida');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [targetAccountId, setTargetAccountId] = useState<string>(accounts[1]?.id || '');
  const [selectedDebtId, setSelectedDebtId] = useState<string>(debts[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [accountType, setAccountType] = useState<Account['type']>('personal');
  const [accountCurrency, setAccountCurrency] = useState<string>('CRC');
  const [accountCurrencySymbol, setAccountCurrencySymbol] = useState<string>('₡');
  const [note, setNote] = useState('');

  // Source flexibility for expense & income (permite: cuenta de salario/personal, escribir algo o dejarlo en blanco)
  const [expenseSourceType, setExpenseSourceType] = useState<'account' | 'custom' | 'none'>('account');
  const [customOriginText, setCustomOriginText] = useState('');
  const [incomeSourceType, setIncomeSourceType] = useState<'account' | 'custom' | 'none'>('account');
  const [customIncomeOriginText, setCustomIncomeOriginText] = useState('');
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  // Reset states when opening or closing
  React.useEffect(() => {
    if (isOpen) {
      if (initialAction === 'calendario') {
        setIsCalendarModalOpen(true);
        setCurrentMode('menu');
      } else {
        setCurrentMode(initialAction || 'menu');
      }
      setAmount('');
      setTitle('');
      setNote('');
      setCustomOriginText('');
      setCustomIncomeOriginText('');
      setAccountCurrency('CRC');
      setAccountCurrencySymbol('₡');
      if (accounts.length > 0) {
        setExpenseSourceType('account');
        setIncomeSourceType('account');
        if (!selectedAccountId) {
          setSelectedAccountId(accounts[0].id);
        }
      } else {
        setExpenseSourceType('none');
        setIncomeSourceType('none');
      }
      if (debts.length > 0 && !selectedDebtId) {
        setSelectedDebtId(debts[0].id);
      }
    }
  }, [isOpen, initialAction, accounts, debts]);

  if (!isOpen) return null;

  const handleSelectMode = (mode: ActionType) => {
    setCurrentMode(mode);
    setAmount('');
    setTitle('');
    setNote('');
    setCustomOriginText('');
    setCustomIncomeOriginText('');
    if (mode === 'ingreso') {
      setCategory('Salarios');
    } else if (mode === 'gasto') {
      setCategory('Comida');
    } else if (mode === 'diezmo') {
      setCategory('Iglesia');
      setTitle('Diezmo / Aporte de fidelidad');
    }
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\D/g, ''));
    if (!numAmount || !title.trim()) return;

    let finalAccountId: string | undefined = undefined;
    let finalCustomOrigin: string | undefined = undefined;

    if (expenseSourceType === 'account' && selectedAccountId) {
      finalAccountId = selectedAccountId;
    } else if (expenseSourceType === 'custom' && customOriginText.trim()) {
      finalCustomOrigin = customOriginText.trim();
    } // Si es 'none', ambos quedan indefinidos (en blanco sin descontar de ninguna cuenta)

    onAddTransaction({
      title: title.trim(),
      amount: numAmount,
      type: 'gasto',
      category: category as any,
      accountId: finalAccountId,
      customOrigin: finalCustomOrigin,
      date: new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\D/g, ''));
    if (!numAmount || !title.trim()) return;

    let finalAccountId: string | undefined = undefined;
    let finalCustomOrigin: string | undefined = undefined;

    if (incomeSourceType === 'account' && selectedAccountId) {
      finalAccountId = selectedAccountId;
    } else if (incomeSourceType === 'custom' && customIncomeOriginText.trim()) {
      finalCustomOrigin = customIncomeOriginText.trim();
    } // Si es 'none', ambos quedan en blanco

    onAddTransaction({
      title: title.trim(),
      amount: numAmount,
      type: 'ingreso',
      category: category as any,
      accountId: finalAccountId,
      customOrigin: finalCustomOrigin,
      date: new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const cleanAmount = amount.replace(/[^\d.]/g, '');
    const initial = parseFloat(cleanAmount) || 0;

    onAddAccount({
      name: title.trim(),
      type: accountType,
      initialBalance: initial,
      currency: accountCurrency,
      currencySymbol: accountCurrencySymbol,
    });
    onClose();
  };

  const handleSaveDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(amount.replace(/\D/g, ''));
    if (!total || !title.trim()) return;

    onAddDebt({
      name: title.trim(),
      totalAmount: total,
      dueDate: dueDate || undefined,
      creditorOrNote: note.trim() || undefined,
    });
    onClose();
  };

  const handleSaveDebtPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\D/g, ''));
    if (!numAmount || !selectedDebtId || !selectedAccountId) return;

    const debt = debts.find((d) => d.id === selectedDebtId);

    onAddTransaction({
      title: `Abono a: ${debt?.name || 'Deuda'}`,
      amount: numAmount,
      type: 'pago_deuda',
      category: 'Deudas',
      debtId: selectedDebtId,
      accountId: selectedAccountId,
      date: new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\D/g, ''));
    if (!numAmount || !selectedAccountId || !targetAccountId || selectedAccountId === targetAccountId) return;

    const fromAcc = accounts.find((a) => a.id === selectedAccountId);
    const toAcc = accounts.find((a) => a.id === targetAccountId);

    onAddTransaction({
      title: `Transferencia: ${fromAcc?.name} → ${toAcc?.name}`,
      amount: numAmount,
      type: 'transferencia',
      category: 'Personal',
      accountId: selectedAccountId,
      toAccountId: targetAccountId,
      date: new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: note.trim() || undefined,
    });
    onClose();
  };

  const handleSaveTithe = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\D/g, ''));
    if (!numAmount || !selectedAccountId) return;

    onAddTransaction({
      title: title.trim() || 'Aporte / Diezmo',
      amount: numAmount,
      type: 'diezmo',
      category: 'Iglesia',
      accountId: selectedAccountId,
      date: new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-md md:max-w-xl bg-[#181c24] border border-[#3c4a42]/50 rounded-t-3xl sm:rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header with back navigation if in a subform */}
        <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/30">
          <div className="flex items-center gap-2">
            {currentMode !== 'menu' && (
              <button
                type="button"
                onClick={() => setCurrentMode('menu')}
                className="w-8 h-8 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors mr-1"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              </button>
            )}
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {currentMode === 'menu' && 'Acciones Financieras'}
                {currentMode === 'dolar_hoy' && 'Dólar Hoy: Compra y Venta'}
                {currentMode === 'presupuesto' && 'Presupuesto Mensual Inteligente'}
                {currentMode === 'suscripciones' && 'Suscripciones y Pagos Fijos'}
                {currentMode === 'fondo_emergencia' && 'Simulador de Fondo de Emergencia'}
                {currentMode === 'finanzas_pareja' && 'Finanzas en Pareja & Hogar'}
                {currentMode === 'calculadora' && 'Calculadora con Historial'}
                {currentMode === 'patrimonio' && 'Patrimonio Unificado'}
                {currentMode === 'metas_ahorro' && 'Metas de Ahorro & Progreso'}
                {currentMode === 'graficos_gastos' && 'Gráficos Visuales de Gastos'}
                {currentMode === 'tasa_cambio' && 'Calculadora de Tasa de Cambio'}
                {currentMode === 'ingreso' && 'Agregar Ingreso'}
                {currentMode === 'gasto' && 'Agregar Gasto'}
                {currentMode === 'cuenta' && 'Agregar Cuentas Diferentes (Dólares, Euros, Colones)'}
                {currentMode === 'deuda' && 'Registrar Deuda'}
                {currentMode === 'pago_deuda' && 'Abonar a Deuda'}
                {currentMode === 'transferencia' && 'Transferir entre Cuentas'}
                {currentMode === 'diezmo' && 'Registrar Diezmo / Aporte'}
              </h2>
              <p className="text-[11px] text-[#86948a]">
                {currentMode === 'dolar_hoy'
                  ? 'Tipo de cambio oficial en Costa Rica (BCCR), BAC, BCR, BNCR y calculadora'
                  : currentMode === 'presupuesto'
                  ? 'Control del límite mensual con la regla 50/30/20 y semáforo de consumo'
                  : currentMode === 'suscripciones'
                  ? 'Servicios recurrentes, fechas de corte y recordatorios de cobro'
                  : currentMode === 'fondo_emergencia'
                  ? 'Cálculo de blindaje y meses de respaldo financiero ante imprevistos'
                  : currentMode === 'finanzas_pareja'
                  ? 'División equitativa de gastos del hogar y liquidación mutua'
                  : currentMode === 'calculadora'
                  ? 'Historial de operaciones y uso directo en cuentas'
                  : currentMode === 'patrimonio'
                  ? 'Balance neto consolidado: Activos totales vs Pasivos y Deudas'
                  : currentMode === 'metas_ahorro'
                  ? 'Objetivos de ahorro con barras de progreso y registro de abonos'
                  : currentMode === 'graficos_gastos'
                  ? 'Distribución visual por categoría con gráficos de dona y barras'
                  : currentMode === 'tasa_cambio'
                  ? 'Conversor multidivisa en tiempo real (CRC ⇄ USD, EUR, BTC)'
                  : currentMode === 'cuenta'
                  ? 'Multidivisa: USD ($), EUR (€), CRC (₡), Efectivo y más'
                  : 'Finexa • Gestión financiera integral'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262a33] text-[#86948a] hover:text-white flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* 1. MENU PRINCIPAL DE ACCIONES ("+") */}
        {currentMode === 'menu' && (
          <div className="space-y-4 py-1">
            {/* NUEVAS FUNCIONES INTELIGENTES */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#10b981] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">stars</span>
                  <span>Nuevas Funciones</span>
                </span>
                <span className="text-[9px] bg-[#10b981] text-[#003824] px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                  Nuevas
                </span>
              </div>

              {/* Grid 2x2 para las nuevas herramientas principales */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Presupuesto Inteligente 50/30/20 */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('presupuesto')}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-[#10b981]/15 to-[#181c24] hover:bg-[#10b981]/25 border border-[#10b981]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#10b981] text-[#003824] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">pie_chart</span>
                    </div>
                    <span className="text-[8px] bg-[#10b981] text-[#003824] font-black px-1.5 py-0.2 rounded uppercase">
                      50/30/20
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-[#10b981]">
                      Presupuesto Mensual
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-2">
                      Semáforo de consumo y regla de necesidades, deseos y ahorro
                    </p>
                  </div>
                </button>

                {/* 2. Suscripciones y Pagos Fijos */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('suscripciones')}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-[#a855f7]/15 to-[#181c24] hover:bg-[#a855f7]/25 border border-[#a855f7]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#a855f7] text-white flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">event_repeat</span>
                    </div>
                    <span className="text-[8px] bg-[#a855f7] text-white font-black px-1.5 py-0.2 rounded uppercase">
                      Fijos
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-[#c084fc]">
                      Suscripciones & Débitos
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-2">
                      Netflix, gym, luz, agua con recordatorios y fechas de corte
                    </p>
                  </div>
                </button>

                {/* 3. Simulador Fondo de Emergencia */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('fondo_emergencia')}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-[#06b6d4]/15 to-[#181c24] hover:bg-[#06b6d4]/25 border border-[#06b6d4]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#06b6d4] text-[#002830] flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">shield</span>
                    </div>
                    <span className="text-[8px] bg-[#06b6d4] text-[#002830] font-black px-1.5 py-0.2 rounded uppercase">
                      Colchón
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-[#22d3ee]">
                      Fondo de Emergencia
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-2">
                      Calcula 3, 6 o 12 meses de blindaje ante imprevistos
                    </p>
                  </div>
                </button>

                {/* 4. Finanzas en Pareja & Hogar */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('finanzas_pareja')}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-[#f43f5e]/15 to-[#181c24] hover:bg-[#f43f5e]/25 border border-[#f43f5e]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group shadow-sm"
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-8 h-8 rounded-xl bg-[#f43f5e] text-white flex items-center justify-center font-bold">
                      <span className="material-symbols-outlined text-[18px]">diversity_1</span>
                    </div>
                    <span className="text-[8px] bg-[#f43f5e] text-white font-black px-1.5 py-0.2 rounded uppercase">
                      Pareja
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-[#fb7185]">
                      Finanzas en Pareja
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-2">
                      Gastos de la casa, reparto equitativo y balance mutuo
                    </p>
                  </div>
                </button>
              </div>

              {/* 5. Escaneo de Facturas o Tiquetes (Largo destacado) */}
              <button
                type="button"
                onClick={() => setIsReceiptScannerOpen(true)}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#0f1f18] via-[#181c24] to-[#121620] border border-[#10b981]/60 text-left flex items-center justify-between transition-all active:scale-[0.98] group hover:border-[#10b981]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[20px]">document_scanner</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-white group-hover:text-[#10b981]">
                        Escanear Factura o Tiquete de Compra
                      </h4>
                      <span className="text-[8px] bg-[#10b981] text-[#003824] px-1.5 py-0.2 rounded font-black uppercase">
                        Cámara / Foto
                      </span>
                    </div>
                    <p className="text-[9px] text-[#86948a]">
                      Sube una foto o tiquete de caja para registrar el gasto al instante
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#10b981] text-[20px] group-hover:translate-x-0.5 transition-transform shrink-0">
                  photo_camera
                </span>
              </button>

              {/* 6. Conectar con Calendario (Google & Móvil) */}
              <button
                type="button"
                onClick={() => setIsCalendarModalOpen(true)}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#111927] via-[#182234] to-[#121620] border border-[#1a73e8]/50 text-left flex items-center justify-between transition-all active:scale-[0.98] group hover:border-[#1a73e8]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1a73e8]/20 text-[#4285f4] flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black text-white group-hover:text-[#4285f4]">
                        Conectar con Calendario
                      </h4>
                      <span className="text-[8px] bg-[#1a73e8] text-white px-1.5 py-0.2 rounded font-black uppercase">
                        Google & Móvil
                      </span>
                    </div>
                    <p className="text-[9px] text-[#86948a]">
                      Programa pagos de deudas, cobros de suscripciones y depósitos
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#4285f4] text-[20px] group-hover:translate-x-0.5 transition-transform shrink-0">
                  event_upcoming
                </span>
              </button>
            </div>

            {/* SECCIÓN DE HERRAMIENTAS FINANCIERAS */}
            <div className="space-y-2 pt-1 border-t border-[#3c4a42]/30">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86948a] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">handyman</span>
                  <span>Herramientas Financieras</span>
                </span>
              </div>

              {/* Botón Dólar Hoy (Compra y Venta en Costa Rica) */}
              <button
                type="button"
                onClick={() => handleSelectMode('dolar_hoy')}
                className="w-full p-2.5 rounded-2xl bg-[#181c24] hover:bg-[#202530] border border-[#3c4a42]/50 text-left flex items-center justify-between transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold shrink-0">
                    <span className="material-symbols-outlined text-[18px]">attach_money</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#10b981]">
                      Dólar Hoy: Compra y Venta
                    </h4>
                    <p className="text-[9px] text-[#86948a]">
                      Tipo de cambio oficial en Costa Rica (BCCR), BAC, BCR, BNCR y calculadora
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#86948a] text-[18px] group-hover:text-white shrink-0">
                  chevron_right
                </span>
              </button>

              {/* Grid 2x2 para herramientas normales */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Calculadora con Historial */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('calculadora')}
                  className="p-3 rounded-2xl bg-[#181c24] hover:bg-[#202530] border border-[#3c4a42]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center font-bold mb-2">
                    <span className="material-symbols-outlined text-[18px]">calculate</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#10b981]">
                      Calculadora
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-1">
                      Con historial y uso de saldo
                    </p>
                  </div>
                </button>

                {/* 2. Patrimonio Unificado */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('patrimonio')}
                  className="p-3 rounded-2xl bg-[#181c24] hover:bg-[#202530] border border-[#3c4a42]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#4285F4]/20 text-[#4285F4] flex items-center justify-center font-bold mb-2">
                    <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#4285F4]">
                      Patrimonio
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-1">
                      Balance neto y activos
                    </p>
                  </div>
                </button>

                {/* 3. Metas de Ahorro */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('metas_ahorro')}
                  className="p-3 rounded-2xl bg-[#181c24] hover:bg-[#202530] border border-[#3c4a42]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#06b6d4]/20 text-[#06b6d4] flex items-center justify-center font-bold mb-2">
                    <span className="material-symbols-outlined text-[18px]">savings</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#06b6d4]">
                      Metas de Ahorro
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-1">
                      Objetivos y progreso
                    </p>
                  </div>
                </button>

                {/* 4. Gráficos Visuales */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('graficos_gastos')}
                  className="p-3 rounded-2xl bg-[#181c24] hover:bg-[#202530] border border-[#3c4a42]/50 text-left flex flex-col justify-between transition-all active:scale-[0.98] group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#a855f7]/20 text-[#a855f7] flex items-center justify-center font-bold mb-2">
                    <span className="material-symbols-outlined text-[18px]">donut_large</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#a855f7]">
                      Gráficos de Gastos
                    </h4>
                    <p className="text-[9px] text-[#86948a] mt-0.5 line-clamp-1">
                      Distribución por categorías
                    </p>
                  </div>
                </button>
              </div>

              {/* 5. Conversor y Tasas Multidivisa */}
              <button
                type="button"
                onClick={() => handleSelectMode('tasa_cambio')}
                className="w-full p-2.5 rounded-2xl bg-[#181c24] hover:bg-[#202530] border border-[#3c4a42]/50 text-left flex items-center justify-between transition-all active:scale-[0.98] group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#ffb95f]/20 text-[#ffb95f] flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#ffb95f]">
                      Conversor Multidivisa (EUR, BTC, USD, CRC)
                    </h4>
                    <p className="text-[9px] text-[#86948a]">
                      Tasas mundiales cruzadas y cálculo de equivalencias
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#86948a] text-[18px] group-hover:text-white">
                  chevron_right
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#3c4a42]/30">
              <p className="text-xs text-[#86948a] font-medium">
                O selecciona una acción financiera rápida:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Agregar Ingreso */}
              <button
                type="button"
                onClick={() => handleSelectMode('ingreso')}
                className="p-3.5 rounded-2xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/30 text-left space-y-1.5 transition-all active:scale-95 group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#10b981] text-[#003824] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#10b981]">
                  Agregar Ingreso
                </h4>
                <p className="text-[10px] text-[#86948a] leading-tight">
                  Suma saldo a una cuenta seleccionada
                </p>
              </button>

              {/* Agregar Gasto */}
              <button
                type="button"
                onClick={() => handleSelectMode('gasto')}
                className="p-3.5 rounded-2xl bg-[#ffb95f]/15 hover:bg-[#ffb95f]/25 border border-[#ffb95f]/30 text-left space-y-1.5 transition-all active:scale-95 group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#ffb95f] text-[#3e2800] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#ffb95f]">
                  Agregar Gasto
                </h4>
                <p className="text-[10px] text-[#86948a] leading-tight">
                  Descuenta saldo de la cuenta elegida
                </p>
              </button>

              {/* Agregar Cuentas Diferentes (Dólares, Euros, Colones) */}
              <button
                type="button"
                onClick={() => handleSelectMode('cuenta')}
                className="p-3.5 rounded-2xl bg-[#10b981]/15 hover:bg-[#10b981]/25 border border-[#10b981]/40 text-left space-y-1.5 transition-all active:scale-95 group relative"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#0f131c] text-[#10b981] border border-[#10b981]/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#10b981]">
                    Multidivisa
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#10b981]">
                  Agregar Cuentas Diferentes
                </h4>
                <p className="text-[10px] text-[#86948a] leading-tight">
                  En Dólares ($), Euros (€), Colones (₡) o más
                </p>
              </button>

              {/* Agregar Deuda */}
              <button
                type="button"
                onClick={() => handleSelectMode('deuda')}
                className="p-3.5 rounded-2xl bg-[#93000a]/15 hover:bg-[#93000a]/25 border border-[#ffb4ab]/30 text-left space-y-1.5 transition-all active:scale-95 group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#ffb4ab] text-[#690005] flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">credit_card</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#ffb4ab]">
                  Agregar Deuda
                </h4>
                <p className="text-[10px] text-[#86948a] leading-tight">
                  Ej: Deuda de iglesia, préstamo
                </p>
              </button>

              {/* Agregar Pago de Deuda */}
              <button
                type="button"
                onClick={() => handleSelectMode('pago_deuda')}
                className="p-3.5 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/50 text-left space-y-1.5 transition-all active:scale-95 group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0f131c] text-[#ffb4ab] border border-[#ffb4ab]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-white">
                  Pago de Deuda
                </h4>
                <p className="text-[10px] text-[#86948a] leading-tight">
                  Amortiza deuda y descuenta de cuenta
                </p>
              </button>

              {/* Diezmo / Aporte */}
              <button
                type="button"
                onClick={() => handleSelectMode('diezmo')}
                className="p-3.5 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/50 text-left space-y-1.5 transition-all active:scale-95 group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0f131c] text-[#c0c1ff] border border-[#c0c1ff]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">church</span>
                </div>
                <h4 className="text-xs font-bold text-white group-hover:text-[#c0c1ff]">
                  Diezmo / Aporte
                </h4>
                <p className="text-[10px] text-[#86948a] leading-tight">
                  Registra aporte y descuenta de cuenta
                </p>
              </button>

              {/* Transferencia entre cuentas */}
              <button
                type="button"
                onClick={() => handleSelectMode('transferencia')}
                className="p-3.5 rounded-2xl bg-[#262a33] hover:bg-[#31353e] border border-[#3c4a42]/50 text-left space-y-1.5 transition-all active:scale-95 group col-span-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0f131c] text-[#10b981] border border-[#10b981]/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#10b981]">
                      Transferencia entre Cuentas
                    </h4>
                    <p className="text-[10px] text-[#86948a]">
                      Mueve dinero entre tus fuentes (ej: David → Dalesca)
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. FORMULARIO: AGREGAR GASTO (DESCUENTA DE LA CUENTA SELECCIONADA) */}
        {currentMode === 'gasto' && (
          <form onSubmit={handleSaveExpense} className="space-y-4">
            {/* Monto */}
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-center space-y-1">
              <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider">
                Monto del Gasto (₡)
              </span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-[#ffb95f]">₡</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-48 bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder:text-[#3c4a42]"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Concepto / Comercio */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Concepto o Detalle
              </label>
              <input
                type="text"
                placeholder="Ej: Compra de despensa, Almuerzo, Uber"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#ffb95f]"
                required
              />
            </div>

            {/* Cuenta / Origen de donde sale el dinero */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#86948a]">
                  ¿De cuál cuenta u origen sale el dinero?
                </label>
                <span className="text-[10px] text-[#ffb95f] font-semibold">
                  {expenseSourceType === 'account' ? 'Cuenta registrada' : expenseSourceType === 'custom' ? 'Texto personalizado' : 'Sin cuenta (En blanco)'}
                </span>
              </div>

              {/* Selector de modo de origen: Cuenta | Escribir origen | Dejar en blanco */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0f131c] rounded-xl border border-[#3c4a42]/50">
                <button
                  type="button"
                  onClick={() => setExpenseSourceType('account')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                    expenseSourceType === 'account'
                      ? 'bg-[#ffb95f] text-[#3e2800] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  De Cuenta
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseSourceType('custom')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                    expenseSourceType === 'custom'
                      ? 'bg-[#ffb95f] text-[#3e2800] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  Escribir origen
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseSourceType('none')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                    expenseSourceType === 'none'
                      ? 'bg-[#ffb95f] text-[#3e2800] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  En blanco
                </button>
              </div>

              {/* Vista 1: Seleccionar cuenta existente */}
              {expenseSourceType === 'account' && (
                <div className="space-y-2 pt-1">
                  {accounts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                      {accounts.map((acc) => {
                        const bal = calculateAccountBalance(acc, transactions);
                        const isSelected = selectedAccountId === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedAccountId(acc.id)}
                            className={`p-2.5 rounded-xl text-left border transition-all ${
                              isSelected
                                ? 'bg-[#ffb95f]/15 border-[#ffb95f] text-white shadow-sm'
                                : 'bg-[#0f131c] border-[#3c4a42]/40 text-[#dfe2ee] hover:bg-[#262a33]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{acc.name}</span>
                              <span className="text-[9px] font-black px-1 py-0.2 rounded bg-[#ffb95f]/20 text-[#ffb95f]">
                                {acc.currency || 'CRC'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#86948a] block mt-0.5">
                              Saldo: <strong className={bal < 0 ? 'text-rose-400' : 'text-[#10b981]'}>{formatCurrency(bal, acc.currency, acc.currencySymbol)}</strong>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#262a33] text-center text-xs text-[#86948a] space-y-2">
                      <p>Aún no tienes cuentas registradas. Puedes escribir un origen manual o dejarlo en blanco.</p>
                      <div className="flex justify-center items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setExpenseSourceType('custom')}
                          className="text-[11px] text-[#ffb95f] font-bold underline"
                        >
                          Escribir origen
                        </button>
                        <span className="text-[#3c4a42]">•</span>
                        <button
                          type="button"
                          onClick={() => setCurrentMode('cuenta')}
                          className="text-[11px] text-[#10b981] font-bold underline"
                        >
                          + Crear cuenta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vista 2: Escribir origen personalizado */}
              {expenseSourceType === 'custom' && (
                <div className="space-y-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Ej: Efectivo, Tarjeta de crédito, Bolsillo, Préstamo..."
                    value={customOriginText}
                    onChange={(e) => setCustomOriginText(e.target.value)}
                    className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#ffb95f]"
                    autoFocus
                  />
                  <p className="text-[10px] text-[#86948a]">
                    Se guardará este texto como origen del gasto sin descontar de ninguna cuenta específica.
                  </p>
                </div>
              )}

              {/* Vista 3: En blanco */}
              {expenseSourceType === 'none' && (
                <div className="p-3 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 text-center">
                  <p className="text-xs text-[#dfe2ee] font-semibold">
                    Sin cuenta / En blanco
                  </p>
                  <p className="text-[10px] text-[#86948a] mt-0.5">
                    El gasto se registrará en el historial y totales generales, sin ligarse a ninguna cuenta ni descontar saldo.
                  </p>
                </div>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="Comida">Comida & Alimentación</option>
                <option value="Transporte">Transporte & Gasolina</option>
                <option value="Servicios">Servicios Públicos & Hogar</option>
                <option value="Personal">Gastos Personales</option>
                <option value="Otros">Otros Gastos</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!amount || !title.trim() || (expenseSourceType === 'account' && accounts.length > 0 && !selectedAccountId)}
              className="w-full py-3 px-4 rounded-xl bg-[#ffb95f] hover:bg-[#ee9800] text-[#3e2800] text-xs font-extrabold shadow-lg active:scale-95 transition-all disabled:opacity-40"
            >
              {expenseSourceType === 'account' && selectedAccountId
                ? 'Registrar y Descontar de la Cuenta'
                : expenseSourceType === 'custom' && customOriginText.trim()
                ? `Registrar Gasto (${customOriginText.trim()})`
                : 'Registrar Gasto (Sin cuenta)'}
            </button>
          </form>
        )}

        {/* 3. FORMULARIO: AGREGAR INGRESO (SUMA A LA CUENTA SELECCIONADA) */}
        {currentMode === 'ingreso' && (
          <form onSubmit={handleSaveIncome} className="space-y-4">
            {/* Monto */}
            <div className="p-4 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-center space-y-1">
              <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider">
                Monto del Ingreso (₡)
              </span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-[#10b981]">₡</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-48 bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder:text-[#3c4a42]"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Concepto */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Concepto o Fuente de Ingreso
              </label>
              <input
                type="text"
                placeholder="Ej: Trabajo, Salario quincenal, Venta freelance"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
                required
              />
            </div>

            {/* Cuenta destino / Origen del dinero */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#86948a]">
                  ¿A cuál cuenta o destino ingresa el dinero?
                </label>
                <span className="text-[10px] text-[#10b981] font-semibold">
                  {incomeSourceType === 'account' ? 'Cuenta registrada' : incomeSourceType === 'custom' ? 'Texto personalizado' : 'Sin cuenta (En blanco)'}
                </span>
              </div>

              {/* Selector de destino: A Cuenta | Escribir destino | Dejar en blanco */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0f131c] rounded-xl border border-[#3c4a42]/50">
                <button
                  type="button"
                  onClick={() => setIncomeSourceType('account')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                    incomeSourceType === 'account'
                      ? 'bg-[#10b981] text-[#003824] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  A Cuenta
                </button>

                <button
                  type="button"
                  onClick={() => setIncomeSourceType('custom')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                    incomeSourceType === 'custom'
                      ? 'bg-[#10b981] text-[#003824] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  Escribir destino
                </button>

                <button
                  type="button"
                  onClick={() => setIncomeSourceType('none')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center ${
                    incomeSourceType === 'none'
                      ? 'bg-[#10b981] text-[#003824] shadow'
                      : 'text-[#86948a] hover:text-white'
                  }`}
                >
                  En blanco
                </button>
              </div>

              {/* Vista 1: Seleccionar cuenta existente */}
              {incomeSourceType === 'account' && (
                <div className="space-y-2 pt-1">
                  {accounts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-0.5">
                      {accounts.map((acc) => {
                        const bal = calculateAccountBalance(acc, transactions);
                        const isSelected = selectedAccountId === acc.id;
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setSelectedAccountId(acc.id)}
                            className={`p-2.5 rounded-xl text-left border transition-all ${
                              isSelected
                                ? 'bg-[#10b981]/15 border-[#10b981] text-white shadow-sm'
                                : 'bg-[#0f131c] border-[#3c4a42]/40 text-[#dfe2ee] hover:bg-[#262a33]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{acc.name}</span>
                              <span className="text-[9px] font-black px-1 py-0.2 rounded bg-[#10b981]/20 text-[#10b981]">
                                {acc.currency || 'CRC'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#86948a] block mt-0.5">
                              Saldo actual: <strong>{formatCurrency(bal, acc.currency, acc.currencySymbol)}</strong>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#262a33] text-center text-xs text-[#86948a] space-y-2">
                      <p>Aún no tienes cuentas registradas. Puedes escribir un destino manual o dejarlo en blanco.</p>
                      <div className="flex justify-center items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setIncomeSourceType('custom')}
                          className="text-[11px] text-[#10b981] font-bold underline"
                        >
                          Escribir destino
                        </button>
                        <span className="text-[#3c4a42]">•</span>
                        <button
                          type="button"
                          onClick={() => setCurrentMode('cuenta')}
                          className="text-[11px] text-[#10b981] font-bold underline"
                        >
                          + Crear cuenta
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vista 2: Escribir destino personalizado */}
              {incomeSourceType === 'custom' && (
                <div className="space-y-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Ej: Efectivo, Banco, Caja de ahorro, Tarjeta..."
                    value={customIncomeOriginText}
                    onChange={(e) => setCustomIncomeOriginText(e.target.value)}
                    className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
                    autoFocus
                  />
                  <p className="text-[10px] text-[#86948a]">
                    Se guardará este texto como destino del ingreso sin sumarse a ninguna cuenta específica.
                  </p>
                </div>
              )}

              {/* Vista 3: En blanco */}
              {incomeSourceType === 'none' && (
                <div className="p-3 rounded-xl bg-[#0f131c] border border-[#3c4a42]/40 text-center">
                  <p className="text-xs text-[#dfe2ee] font-semibold">
                    Sin cuenta / En blanco
                  </p>
                  <p className="text-[10px] text-[#86948a] mt-0.5">
                    El ingreso se registrará en el historial y totales generales, sin ligarse a ninguna cuenta.
                  </p>
                </div>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Tipo de Ingreso
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="Salarios">Salario / Nómina</option>
                <option value="Personal">Ingreso Freelance / Trabajo</option>
                <option value="Otros">Venta / Otro Ingreso</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!amount || !title.trim() || (incomeSourceType === 'account' && accounts.length > 0 && !selectedAccountId)}
              className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-extrabold shadow-lg active:scale-95 transition-all disabled:opacity-40"
            >
              {incomeSourceType === 'account' && selectedAccountId
                ? 'Registrar y Sumar a la Cuenta'
                : incomeSourceType === 'custom' && customIncomeOriginText.trim()
                ? `Registrar Ingreso (${customIncomeOriginText.trim()})`
                : 'Registrar Ingreso (Sin cuenta)'}
            </button>
          </form>
        )}

        {/* 4. FORMULARIO: AGREGAR CUENTAS DIFERENTES (DÓLARES, EUROS, COLONES) */}
        {currentMode === 'cuenta' && (
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="p-3 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/30">
              <p className="text-xs text-[#4edea3] font-medium">
                Crea cuentas en la divisa que necesites (Dólares, Euros, Colones, etc.). Puedes separar cuentas de David, Dalesca, efectivo o ahorros.
              </p>
            </div>

            {/* Selector de Moneda */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1.5">
                Moneda de la Cuenta <span className="text-[#10b981]">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SUPPORTED_CURRENCIES.map((cur) => {
                  const isSelected = accountCurrency === cur.code;
                  return (
                    <button
                      key={cur.code}
                      type="button"
                      onClick={() => {
                        setAccountCurrency(cur.code);
                        setAccountCurrencySymbol(cur.symbol);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        isSelected
                          ? 'bg-[#10b981]/20 border-[#10b981] text-white shadow'
                          : 'bg-[#0f131c] border-[#3c4a42]/50 text-[#86948a] hover:text-white hover:bg-[#1f2430]'
                      }`}
                    >
                      <span className="text-lg">{cur.flag}</span>
                      <div className="leading-tight">
                        <span className="text-xs font-bold block text-white">{cur.code}</span>
                        <span className="text-[10px] text-[#86948a]">{cur.symbol}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nombre de la Cuenta */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Nombre de la Cuenta o Persona <span className="text-[#10b981]">*</span>
              </label>
              <input
                type="text"
                placeholder={
                  accountCurrency === 'USD'
                    ? 'Ej: Cuenta Dólares BAC, Ahorro USD, David USD'
                    : accountCurrency === 'EUR'
                    ? 'Ej: Cuenta Euros, Viaje Europa, Dalesca EUR'
                    : 'Ej: David, Dalesca, Efectivo CRC, Salario'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
                required
                autoFocus
              />
            </div>

            {/* Tipo de Cuenta */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Tipo de Cuenta / Uso
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="salario">Salario / Nómina de Trabajo</option>
                <option value="personal">Cuenta Personal / Billetera</option>
                <option value="ahorro">Cuenta de Ahorros / Inversión</option>
                <option value="efectivo">Efectivo en Mano</option>
                <option value="banco">Cuenta Bancaria Débito</option>
                <option value="tarjeta">Tarjeta de Crédito / Prepago</option>
                <option value="otro">Otro Uso</option>
              </select>
            </div>

            {/* Saldo Inicial en la moneda seleccionada */}
            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Saldo Inicial en {accountCurrency} ({accountCurrencySymbol})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#10b981]">
                  {accountCurrencySymbol}
                </span>
                <input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={accountCurrency === 'USD' ? '0.00 (ej: 1250.50)' : accountCurrency === 'EUR' ? '0.00 (ej: 500.00)' : '0 (ej: 50000)'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl pl-8 pr-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
                />
              </div>
              <span className="text-[10px] text-[#86948a] block mt-1">
                Puedes iniciar en {accountCurrencySymbol}0 o con el dinero que ya tengas disponible en esta moneda.
              </span>
            </div>

            <button
              type="submit"
              disabled={!title.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-extrabold shadow-lg active:scale-95 transition-all disabled:opacity-40"
            >
              Guardar Cuenta en {accountCurrency} ({accountCurrencySymbol})
            </button>
          </form>
        )}

        {/* 5. FORMULARIO: REGISTRAR DEUDA */}
        {currentMode === 'deuda' && (
          <form onSubmit={handleSaveDebt} className="space-y-4">
            <p className="text-xs text-[#86948a]">
              Registra una deuda para llevar el control de tus pagos y vencimientos (ej: &quot;Deuda de iglesia&quot;, &quot;Préstamo personal&quot;).
            </p>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Nombre de la Deuda
              </label>
              <input
                type="text"
                placeholder="Ej: Deuda de iglesia, Préstamo de David"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#ffb4ab]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Monto Total de la Deuda (₡)
              </label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Ej: 30000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#ffb4ab]"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Fecha de Vencimiento (Opcional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#ffb4ab]"
              />
              <span className="text-[10px] text-[#86948a] block mt-1">
                Te notificaremos cuando se acerque o venza la fecha.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Nota o Acreedor (Opcional)
              </label>
              <input
                type="text"
                placeholder="Notas adicionales..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#ffb4ab] hover:bg-rose-200 text-[#690005] text-xs font-extrabold shadow-lg active:scale-95 transition-all"
            >
              Registrar Deuda
            </button>
          </form>
        )}

        {/* 6. FORMULARIO: PAGO DE DEUDA (AMORTIZAR Y DESCONTAR DE CUENTA) */}
        {currentMode === 'pago_deuda' && (
          <form onSubmit={handleSaveDebtPayment} className="space-y-4">
            {debts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#262a33] text-center space-y-2 text-xs">
                <p className="text-[#86948a]">No tienes deudas registradas aún para abonar.</p>
                <button
                  type="button"
                  onClick={() => setCurrentMode('deuda')}
                  className="px-3.5 py-2 rounded-xl bg-[#ffb4ab] text-[#690005] font-bold"
                >
                  + Registrar una Deuda primero
                </button>
              </div>
            ) : (
              <>
                {/* Seleccionar deuda */}
                <div>
                  <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                    Selecciona la Deuda a Pagar
                  </label>
                  <select
                    value={selectedDebtId}
                    onChange={(e) => setSelectedDebtId(e.target.value)}
                    className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    required
                  >
                    {debts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} (Total: {formatCRC(d.totalAmount)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monto del abono */}
                <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-center space-y-1">
                  <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider">
                    Monto a Abonar (₡)
                  </span>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-[#10b981]">₡</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-44 bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder:text-[#3c4a42]"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Cuenta de donde sale el dinero */}
                <div>
                  <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                    ¿De cuál cuenta sale el dinero del pago?
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                    required
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} [{a.currency || 'CRC'}] (Saldo: {formatCurrency(calculateAccountBalance(a, transactions), a.currency, a.currencySymbol)})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#86948a] block mt-1">
                    El monto se descontará automáticamente del saldo de esta cuenta.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={accounts.length === 0}
                  className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-extrabold shadow-lg active:scale-95 transition-all"
                >
                  Registrar Pago y Descontar
                </button>
              </>
            )}
          </form>
        )}

        {/* 7. FORMULARIO: TRANSFERENCIA ENTRE CUENTAS */}
        {currentMode === 'transferencia' && (
          <form onSubmit={handleSaveTransfer} className="space-y-4">
            {accounts.length < 2 ? (
              <div className="p-4 rounded-2xl bg-[#262a33] text-center space-y-2 text-xs">
                <p className="text-[#86948a]">Necesitas al menos 2 cuentas para transferir dinero entre ellas (ej: David y Dalesca).</p>
                <button
                  type="button"
                  onClick={() => setCurrentMode('cuenta')}
                  className="px-3.5 py-2 rounded-xl bg-[#10b981] text-[#003824] font-bold"
                >
                  + Crear otra cuenta
                </button>
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-center space-y-1">
                  <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider">
                    Monto a Transferir (₡)
                  </span>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-[#10b981]">₡</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-44 bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder:text-[#3c4a42]"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#86948a] block mb-1">
                      Cuenta Origen (Sale)
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                      className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl p-2 text-xs text-white focus:outline-none"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} [{a.currency || 'CRC'}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#86948a] block mb-1">
                      Cuenta Destino (Entra)
                    </label>
                    <select
                      value={targetAccountId}
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl p-2 text-xs text-white focus:outline-none"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} [{a.currency || 'CRC'}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={selectedAccountId === targetAccountId}
                  className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-extrabold shadow-lg active:scale-95 transition-all disabled:opacity-50"
                >
                  Realizar Transferencia
                </button>
              </>
            )}
          </form>
        )}

        {/* 8. FORMULARIO: REGISTRAR DIEZMO */}
        {currentMode === 'diezmo' && (
          <form onSubmit={handleSaveTithe} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40 text-center space-y-1">
              <span className="text-[10px] font-bold text-[#86948a] uppercase tracking-wider">
                Monto del Diezmo / Aporte (₡)
              </span>
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-[#c0c1ff]">₡</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-44 bg-transparent text-3xl font-extrabold text-white text-center focus:outline-none placeholder:text-[#3c4a42]"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Detalle del Aporte
              </label>
              <input
                type="text"
                placeholder="Ej: Diezmo quincenal, Ofrenda especial"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                ¿De cuál cuenta sale el aporte?
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Saldo: {formatCRC(calculateAccountBalance(a, transactions))})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-[#86948a] block mt-1">
                Se descontará automáticamente del saldo de la cuenta seleccionada.
              </span>
            </div>

            <button
              type="submit"
              disabled={accounts.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-[#c0c1ff] hover:bg-[#a8aaff] text-[#1c2028] text-xs font-extrabold shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              Registrar Aporte
            </button>
          </form>
        )}

        {/* 8. CALCULADORA FINANCIERA CON HISTORIAL */}
        {currentMode === 'calculadora' && (
          <FinancialCalculator
            onUseForExpense={(calcAmount) => {
              setAmount(String(calcAmount));
              setCurrentMode('gasto');
            }}
            onUseForIncome={(calcAmount) => {
              setAmount(String(calcAmount));
              setCurrentMode('ingreso');
            }}
          />
        )}

        {/* 9. PATRIMONIO UNIFICADO */}
        {currentMode === 'patrimonio' && (
          <div className="animate-in fade-in duration-150">
            <UnifiedNetWorthCard
              accounts={accounts}
              debts={debts}
              transactions={transactions}
              savingsGoals={savingsGoals}
              onOpenQuickAdd={() => setCurrentMode('cuenta')}
              onNavigate={(screen) => {
                onClose();
                if (onNavigate) onNavigate(screen);
              }}
            />
          </div>
        )}

        {/* 10. METAS DE AHORRO */}
        {currentMode === 'metas_ahorro' && (
          <div className="animate-in fade-in duration-150">
            <SavingsGoalsSection
              savingsGoals={savingsGoals}
              accounts={accounts}
              onAddGoal={onAddSavingsGoal || (() => {})}
              onUpdateGoalAmount={onUpdateSavingsGoalAmount || (() => {})}
              onDeleteGoal={onDeleteSavingsGoal || (() => {})}
              onAddTransaction={onAddTransaction}
            />
          </div>
        )}

        {/* 11. GRÁFICOS VISUALES DE GASTOS */}
        {currentMode === 'graficos_gastos' && (
          <div className="animate-in fade-in duration-150">
            <ExpenseCategoryCharts
              transactions={transactions}
              compact={false}
            />
          </div>
        )}

        {/* 12. CALCULADORA DE TASA DE CAMBIO */}
        {currentMode === 'tasa_cambio' && (
          <div className="animate-in fade-in duration-150">
            <ExchangeRateCalculator
              compact={false}
              onUseAmount={(convertedAmount) => {
                setAmount(String(convertedAmount));
                setCurrentMode('gasto');
              }}
            />
          </div>
        )}

        {/* 13. DÓLAR HOY: COMPRA Y VENTA (BCCR Y BANCOS DE COSTA RICA) */}
        {currentMode === 'dolar_hoy' && (
          <div className="animate-in fade-in duration-150">
            <DollarExchangeMonitor
              compact={false}
              onUseAmount={(convertedAmount, currency, isIncome) => {
                setAmount(String(convertedAmount));
                setCurrentMode(isIncome ? 'ingreso' : 'gasto');
              }}
            />
          </div>
        )}

        {/* 14. PRESUPUESTO MENSUAL INTELIGENTE (REGLA 50/30/20) */}
        {currentMode === 'presupuesto' && (
          <div className="animate-in fade-in duration-150">
            <BudgetSmartManager
              transactions={transactions}
              accounts={accounts}
              budgetConfig={budgetConfig}
              onSaveBudgetConfig={onSaveBudgetConfig}
              onOpenQuickExpense={() => setCurrentMode('gasto')}
            />
          </div>
        )}

        {/* 15. SUSCRIPCIONES Y PAGOS FIJOS */}
        {currentMode === 'suscripciones' && (
          <div className="animate-in fade-in duration-150">
            <SubscriptionsManager
              subscriptions={subscriptions}
              accounts={accounts}
              onAddSubscription={onAddSubscription}
              onUpdateSubscription={onUpdateSubscription}
              onDeleteSubscription={onDeleteSubscription}
              onPaySubscription={onPaySubscription}
            />
          </div>
        )}

        {/* 16. SIMULADOR DE FONDO DE EMERGENCIA */}
        {currentMode === 'fondo_emergencia' && (
          <div className="animate-in fade-in duration-150">
            <EmergencyFundSimulator
              transactions={transactions}
              accounts={accounts}
              savingsGoals={savingsGoals}
              onAddOrUpdateGoal={(goal) => {
                if (goal.id && onUpdateSavingsGoalAmount) {
                  onUpdateSavingsGoalAmount(goal.id, 0);
                } else if (onAddSavingsGoal) {
                  onAddSavingsGoal(goal);
                }
              }}
            />
          </div>
        )}

        {/* 17. FINANZAS EN PAREJA / HOGAR COMPARTIDO */}
        {currentMode === 'finanzas_pareja' && (
          <div className="animate-in fade-in duration-150">
            <HouseholdFinanceManager
              householdConfig={householdConfig}
              accounts={accounts}
              onSaveConfig={onSaveHouseholdConfig}
            />
          </div>
        )}

        {/* Modal de Escaneo de Facturas */}
        <ReceiptScannerModal
          isOpen={isReceiptScannerOpen}
          onClose={() => setIsReceiptScannerOpen(false)}
          onApplyReceipt={(data) => {
            const defaultAcc = accounts[0];
            onAddTransaction({
              title: data.title,
              amount: data.amount,
              type: 'gasto',
              category: data.category,
              accountId: defaultAcc?.id,
              customOrigin: defaultAcc ? undefined : (data.paymentMethod || 'Tiquete'),
              date: data.date || (new Date().toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
              note: data.note,
            });
            setIsReceiptScannerOpen(false);
            onClose();
          }}
        />

        {/* Modal de Sincronización con Calendario */}
        <CalendarSyncModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          debts={debts}
          subscriptions={subscriptions || []}
        />
      </div>
    </div>
  );
};
