export type AppScreen = 
  | 'inicio' 
  | 'ingresos' 
  | 'gastos' 
  | 'comida' 
  | 'diezmos' 
  | 'deudas' 
  | 'perfil';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  isPro: boolean;
  currency: string;
  isGoogleConnected?: boolean;
  authProvider?: 'manual' | 'google' | 'apple';
}

export interface SecurityConfig {
  isPinEnabled: boolean;
  pin: string; // 4 digits
  securityQuestion: string;
  securityAnswer: string;
  privacyMode: boolean;
  lockMode?: 'manual' | 'on_exit'; // Bloqueo manual o al salir de la app
  autoLockTime?: 'immediate' | '1m' | '5m';
}

export type AccountType = 'salario' | 'personal' | 'ahorro' | 'efectivo' | 'banco' | 'tarjeta' | 'otro';

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

export interface Account {
  id: string;
  name: string; // ej: "David", "Dalesca", "Trabajo - David", "Efectivo USD", "Cuenta Dólares"
  type: AccountType;
  initialBalance: number; // Monto inicial registrado
  currency?: string; // 'CRC' | 'USD' | 'EUR' | 'MXN' | 'COP' | 'GBP' etc.
  currencySymbol?: string; // '₡' | '$' | '€' | '£' etc.
  color?: string;
  createdAt: string;
}

export type TransactionType = 'ingreso' | 'gasto' | 'pago_deuda' | 'transferencia' | 'diezmo';

export interface Transaction {
  id: string;
  title: string; // Concepto
  date: string;
  type: TransactionType;
  category: 'Salarios' | 'Comida' | 'Iglesia' | 'Deudas' | 'Transporte' | 'Servicios' | 'Personal' | 'Otros';
  subcategory?: string;
  accountId?: string; // Cuenta de donde sale o entra el dinero (opcional)
  currency?: string; // Moneda de la transacción
  currencySymbol?: string;
  customOrigin?: string; // Origen o fuente personalizada (ej: "Efectivo", "Tarjeta de crédito", "Bolsillo", etc.)
  toAccountId?: string; // Para transferencias entre cuentas
  debtId?: string; // Si es abono a una deuda específica
  amount: number; // Monto absoluto
  note?: string;
}

export interface DebtItem {
  id: string;
  name: string; // ej: "Deuda de iglesia", "Préstamo personal"
  totalAmount: number; // Monto total
  dueDate?: string; // Fecha de vencimiento (YYYY-MM-DD)
  creditorOrNote?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string; // ej: "Fondo de Emergencia", "Vacaciones", "Comprar Laptop"
  targetAmount: number; // Monto meta
  currentAmount: number; // Monto ahorrado actual
  currency?: string; // 'CRC' | 'USD' | 'EUR' | 'DOP'
  currencySymbol?: string;
  deadline?: string; // YYYY-MM-DD
  category?: string; // 'Emergencia' | 'Vehículo' | 'Viajes' | 'Hogar' | 'Educación' | 'Inversión' | 'Otro'
  color?: string;
  icon?: string;
  createdAt: string;
}

export interface ExchangeRate {
  pair: string; // 'USD_CRC', 'EUR_CRC', 'USD_DOP', etc.
  from: string;
  to: string;
  rate: number;
  lastUpdated?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'due' | 'success';
  date: string;
  isRead: boolean;
  targetScreen?: AppScreen;
}

// 1. Presupuesto Mensual Inteligente (Regla 50/30/20)
export interface BudgetConfig {
  monthlyLimit: number;
  currency: string;
  needsPercent: number; // 50%
  wantsPercent: number; // 30%
  savingsPercent: number; // 20%
  categoryLimits?: { [category: string]: number };
}

// 2. Gestor de Suscripciones y Pagos Fijos Recurrentes
export interface SubscriptionItem {
  id: string;
  name: string; // Netflix, Spotify, Gimnasio, Alquiler, Internet, etc.
  amount: number;
  currency: string;
  billingCycle: 'mensual' | 'anual' | 'quincenal';
  billingDay: number; // 1 - 31
  category: string;
  accountId?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  reminderDaysBefore: number;
  lastPaidDate?: string;
  createdAt: string;
}

// 3. Finanzas en Pareja / Hogar Compartido
export interface SharedExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: 'yo' | 'pareja';
  category: string;
  date: string;
  isSettled: boolean;
  note?: string;
}

export interface SharedHouseholdConfig {
  isEnabled: boolean;
  householdName: string; // ej: "Hogar David & Dalesca"
  partnerName: string; // ej: "Dalesca"
  splitRatioYo: number; // 50
  splitRatioPareja: number; // 50
  expenses: SharedExpenseItem[];
}
