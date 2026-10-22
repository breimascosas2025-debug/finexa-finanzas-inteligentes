import { Account, DebtItem, SecurityConfig, Transaction, UserProfile } from '../types';

// La aplicación inicia completamente limpia y vacía, sin datos ficticios ni saldos inventados
export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_ACCOUNTS: Account[] = [];

export const INITIAL_DEBTS: DebtItem[] = [];

export const INITIAL_USER: UserProfile = {
  name: 'Mi Cuenta',
  email: '',
  isPro: true,
  currency: 'CRC (₡)',
  isGoogleConnected: false,
};

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  isPinEnabled: false,
  pin: '',
  securityQuestion: '¿Cuál es el nombre de tu primera mascota?',
  securityAnswer: '',
  privacyMode: false,
  lockMode: 'manual',
  autoLockTime: 'immediate',
};

export const SECURITY_QUESTIONS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad o cantón naciste?',
  '¿Cuál era el nombre de tu escuela primaria?',
  '¿Cuál es el apellido de soltera de tu madre?',
  '¿Cuál es tu comida costarricense favorita?'
];

// Aliases for compatibility
export const MOCK_TRANSACTIONS: Transaction[] = [];
export const SALARY_STREAMS = [];
export const DEBT_ITEMS: DebtItem[] = [];
export const FOOD_SUBCATEGORIES = [];
