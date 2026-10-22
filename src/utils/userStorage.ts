import { Account, Transaction, DebtItem, SecurityConfig, UserProfile, SavingsGoal, BudgetConfig, SubscriptionItem, SharedHouseholdConfig } from '../types';
import { DEFAULT_SECURITY_CONFIG } from '../data/mockData';

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  monthlyLimit: 0,
  currency: 'CRC',
  needsPercent: 50,
  wantsPercent: 30,
  savingsPercent: 20,
  categoryLimits: {},
};

export const DEFAULT_HOUSEHOLD_CONFIG: SharedHouseholdConfig = {
  isEnabled: false,
  householdName: 'Hogar Compartido',
  partnerName: 'Mi Pareja',
  splitRatioYo: 50,
  splitRatioPareja: 50,
  expenses: [],
};

/**
 * Genera una clave única en localStorage para aislar los datos por cuenta de usuario (email)
 */
export function getUserStorageKey(email: string, subkey: string): string {
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `finexa_user_${cleanEmail}_${subkey}`;
}

export interface UserPersistedData {
  accounts: Account[];
  transactions: Transaction[];
  debts: DebtItem[];
  savingsGoals: SavingsGoal[];
  budgetConfig: BudgetConfig;
  subscriptions: SubscriptionItem[];
  householdConfig: SharedHouseholdConfig;
  security: SecurityConfig;
}

/**
 * Carga los datos financieros y de seguridad aislados para un correo de usuario específico
 */
export function loadUserDataFromStorage(email: string): UserPersistedData {
  if (!email || !email.trim()) {
    return {
      accounts: [],
      transactions: [],
      debts: [],
      savingsGoals: [],
      budgetConfig: DEFAULT_BUDGET_CONFIG,
      subscriptions: [],
      householdConfig: DEFAULT_HOUSEHOLD_CONFIG,
      security: DEFAULT_SECURITY_CONFIG,
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const accKey = getUserStorageKey(cleanEmail, 'accounts');
  const trsKey = getUserStorageKey(cleanEmail, 'transactions');
  const dbtKey = getUserStorageKey(cleanEmail, 'debts');
  const svgKey = getUserStorageKey(cleanEmail, 'savings_goals');
  const bdgKey = getUserStorageKey(cleanEmail, 'budget_config');
  const subKey = getUserStorageKey(cleanEmail, 'subscriptions');
  const hshKey = getUserStorageKey(cleanEmail, 'household_config');
  const secKey = getUserStorageKey(cleanEmail, 'security');

  let accounts: Account[] = [];
  let transactions: Transaction[] = [];
  let debts: DebtItem[] = [];
  let savingsGoals: SavingsGoal[] = [];
  let budgetConfig: BudgetConfig = DEFAULT_BUDGET_CONFIG;
  let subscriptions: SubscriptionItem[] = [];
  let householdConfig: SharedHouseholdConfig = DEFAULT_HOUSEHOLD_CONFIG;
  let security: SecurityConfig = DEFAULT_SECURITY_CONFIG;

  try {
    const rawAcc = localStorage.getItem(accKey);
    if (rawAcc) {
      accounts = JSON.parse(rawAcc);
    } else {
      // Migración del antiguo finexa_accounts global si existe
      const oldGlobal = localStorage.getItem('finexa_accounts');
      if (oldGlobal) {
        try {
          const parsed = JSON.parse(oldGlobal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            accounts = parsed;
            localStorage.setItem(accKey, oldGlobal);
          }
        } catch {
          // Ignore parse error
        }
      }

      // Si aún no hay cuentas, buscar si en el dispositivo había datos en otra cuenta guardada (ej. antes del cambio de email o apple)
      if (!accounts || accounts.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('finexa_user_') && k.endsWith('_accounts')) {
            try {
              const val = localStorage.getItem(k);
              if (val) {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  const total = parsed.reduce((sum, item) => sum + (Number(item.balance) || 0), 0);
                  if (total > 0) {
                    accounts = parsed;
                    localStorage.setItem(accKey, val);
                    break;
                  }
                }
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    }

    const rawTrs = localStorage.getItem(trsKey);
    if (rawTrs) {
      transactions = JSON.parse(rawTrs);
    } else {
      const oldGlobalTrs = localStorage.getItem('finexa_transactions');
      if (oldGlobalTrs) {
        try {
          const parsed = JSON.parse(oldGlobalTrs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            transactions = parsed;
            localStorage.setItem(trsKey, oldGlobalTrs);
          }
        } catch {}
      }
    }

    const rawDbt = localStorage.getItem(dbtKey);
    if (rawDbt) {
      debts = JSON.parse(rawDbt);
    } else {
      const oldGlobalDbt = localStorage.getItem('finexa_debts');
      if (oldGlobalDbt) {
        try {
          const parsed = JSON.parse(oldGlobalDbt);
          if (Array.isArray(parsed) && parsed.length > 0) {
            debts = parsed;
            localStorage.setItem(dbtKey, oldGlobalDbt);
          }
        } catch {}
      }
    }

    const rawSvg = localStorage.getItem(svgKey);
    if (rawSvg) {
      savingsGoals = JSON.parse(rawSvg);
    }

    const rawBdg = localStorage.getItem(bdgKey);
    if (rawBdg) {
      budgetConfig = JSON.parse(rawBdg);
    }

    const rawSub = localStorage.getItem(subKey);
    if (rawSub) {
      subscriptions = JSON.parse(rawSub);
    }

    const rawHsh = localStorage.getItem(hshKey);
    if (rawHsh) {
      householdConfig = JSON.parse(rawHsh);
    }

    const rawSec = localStorage.getItem(secKey);
    if (rawSec) {
      security = JSON.parse(rawSec);
    } else {
      const oldSec = localStorage.getItem('finexa_security_config');
      if (oldSec) {
        try {
          security = JSON.parse(oldSec);
          localStorage.setItem(secKey, oldSec);
        } catch {}
      }
    }
  } catch (err) {
    console.error('Error cargando datos de usuario desde localStorage:', err);
  }

  return { accounts, transactions, debts, savingsGoals, budgetConfig, subscriptions, householdConfig, security };
}

/**
 * Guarda los datos financieros y de seguridad de forma aislada para un usuario específico
 */
export function saveUserDataToStorage(
  email: string,
  data: {
    accounts?: Account[];
    transactions?: Transaction[];
    debts?: DebtItem[];
    savingsGoals?: SavingsGoal[];
    budgetConfig?: BudgetConfig;
    subscriptions?: SubscriptionItem[];
    householdConfig?: SharedHouseholdConfig;
    security?: SecurityConfig;
  }
) {
  if (!email || !email.trim()) return;
  const cleanEmail = email.trim().toLowerCase();

  try {
    if (data.accounts !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'accounts'), JSON.stringify(data.accounts));
    }
    if (data.transactions !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'transactions'), JSON.stringify(data.transactions));
    }
    if (data.debts !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'debts'), JSON.stringify(data.debts));
    }
    if (data.savingsGoals !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'savings_goals'), JSON.stringify(data.savingsGoals));
    }
    if (data.budgetConfig !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'budget_config'), JSON.stringify(data.budgetConfig));
    }
    if (data.subscriptions !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'subscriptions'), JSON.stringify(data.subscriptions));
    }
    if (data.householdConfig !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'household_config'), JSON.stringify(data.householdConfig));
    }
    if (data.security !== undefined) {
      localStorage.setItem(getUserStorageKey(cleanEmail, 'security'), JSON.stringify(data.security));
    }
  } catch (err) {
    console.error('Error guardando datos de usuario en localStorage:', err);
  }
}

/**
 * Guarda el perfil del usuario (nombre, avatar, etc.) de forma aislada
 */
export function saveUserProfileToStorage(email: string, profile: Partial<UserProfile>) {
  if (!email || !email.trim()) return;
  const cleanEmail = email.trim().toLowerCase();
  try {
    const existing = loadUserProfileFromStorage(cleanEmail) || {};
    const merged = { ...existing, ...profile };
    localStorage.setItem(getUserStorageKey(cleanEmail, 'profile'), JSON.stringify(merged));
  } catch (err) {
    console.error('Error guardando perfil de usuario en localStorage:', err);
  }
}

/**
 * Carga el perfil del usuario de forma aislada
 */
export function loadUserProfileFromStorage(email: string): Partial<UserProfile> | null {
  if (!email || !email.trim()) return null;
  const cleanEmail = email.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(getUserStorageKey(cleanEmail, 'profile'));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Borra los datos almacenados de un usuario específico
 */
export function clearUserStorage(email: string) {
  if (!email || !email.trim()) return;
  const cleanEmail = email.trim().toLowerCase();
  try {
    localStorage.removeItem(getUserStorageKey(cleanEmail, 'accounts'));
    localStorage.removeItem(getUserStorageKey(cleanEmail, 'transactions'));
    localStorage.removeItem(getUserStorageKey(cleanEmail, 'debts'));
    localStorage.removeItem(getUserStorageKey(cleanEmail, 'security'));
    localStorage.removeItem(getUserStorageKey(cleanEmail, 'profile'));
  } catch (err) {
    console.error('Error limpiando datos de usuario en localStorage:', err);
  }
}
