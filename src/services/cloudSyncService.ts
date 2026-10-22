import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db, getUserDocKey, handleFirestoreError, OperationType } from '../lib/firebase';
import { Account, DebtItem, SavingsGoal, SecurityConfig, Transaction, UserProfile, BudgetConfig, SubscriptionItem, SharedHouseholdConfig } from '../types';

export interface RemoteFinancialData {
  email: string;
  lastUpdated: string;
  accounts: Account[];
  transactions: Transaction[];
  debts: DebtItem[];
  savingsGoals?: SavingsGoal[];
  budgetConfig?: BudgetConfig;
  subscriptions?: SubscriptionItem[];
  householdConfig?: SharedHouseholdConfig;
  security?: SecurityConfig;
  profile?: Partial<UserProfile>;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Sanitiza profundamente cualquier objeto eliminando 'undefined' para compatibilidad con Firestore
 */
function cleanForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => (value === undefined ? null : value))
  );
}

/**
 * Carga una sola vez los datos financieros desde Firestore
 */
export async function fetchUserFinancialsFromCloud(email: string): Promise<RemoteFinancialData | null> {
  if (!email || !email.trim()) return null;
  const userKey = getUserDocKey(email);
  const docPath = `user_financials/${userKey}`;

  try {
    const docRef = doc(db, 'user_financials', userKey);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const accounts: Account[] = Array.isArray(data.accounts) ? data.accounts : [];
      const transactions: Transaction[] = Array.isArray(data.transactions) ? data.transactions : [];
      const debts: DebtItem[] = Array.isArray(data.debts) ? data.debts : [];
      const savingsGoals: SavingsGoal[] = Array.isArray(data.savingsGoals) ? data.savingsGoals : [];
      const budgetConfig: BudgetConfig | undefined = data.budgetConfig && typeof data.budgetConfig === 'object' ? data.budgetConfig : undefined;
      const subscriptions: SubscriptionItem[] = Array.isArray(data.subscriptions) ? data.subscriptions : [];
      const householdConfig: SharedHouseholdConfig | undefined = data.householdConfig && typeof data.householdConfig === 'object' ? data.householdConfig : undefined;

      let security: SecurityConfig | undefined = undefined;
      if (data.security && typeof data.security === 'object') {
        security = {
          isPinEnabled: Boolean(data.security.isPinEnabled),
          pin: typeof data.security.pin === 'string' ? data.security.pin : '',
          securityQuestion: typeof data.security.securityQuestion === 'string' ? data.security.securityQuestion : '',
          securityAnswer: typeof data.security.securityAnswer === 'string' ? data.security.securityAnswer : '',
          privacyMode: Boolean(data.security.privacyMode),
          lockMode: data.security.lockMode === 'manual' ? 'manual' : 'on_exit',
          autoLockTime: data.security.autoLockTime || 'immediate',
        };
      }

      const totalInitial = accounts.reduce((sum, item) => sum + (Number(item.initialBalance) || 0), 0);
      console.log(`[CloudSync] Datos cargados de la nube para ${email}:`, {
        cuentas: accounts.length,
        saldoInicialTotal: totalInitial,
        transacciones: transactions.length,
        metasAhorro: savingsGoals.length,
        tienePin: Boolean(security?.pin),
      });

      return {
        email: data.email || email,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        accounts,
        transactions,
        debts,
        savingsGoals,
        budgetConfig,
        subscriptions,
        householdConfig,
        security,
        profile: data.profile || undefined,
      };
    }
    return null;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.GET, docPath);
    } catch (e) {
      console.warn('[CloudSync] No se pudo leer de Firestore:', e);
    }
    return null;
  }
}

/**
 * Guarda los datos financieros y el PIN en Firestore para sincronización multidispositivo (PC, Celular, etc.)
 */
export async function saveUserFinancialsToCloud(
  email: string,
  payload: {
    accounts: Account[];
    transactions: Transaction[];
    debts: DebtItem[];
    savingsGoals?: SavingsGoal[];
    budgetConfig?: BudgetConfig;
    subscriptions?: SubscriptionItem[];
    householdConfig?: SharedHouseholdConfig;
    security?: SecurityConfig;
    profile?: Partial<UserProfile>;
  }
): Promise<boolean> {
  if (!email || !email.trim()) return false;
  const userKey = getUserDocKey(email);
  const docPath = `user_financials/${userKey}`;

  try {
    const cleanAccounts = (payload.accounts || []).slice(0, 50);
    const cleanTransactions = (payload.transactions || []).slice(0, 5000);
    const cleanDebts = (payload.debts || []).slice(0, 100);
    const cleanSavingsGoals = (payload.savingsGoals || []).slice(0, 50);
    const cleanSubscriptions = (payload.subscriptions || []).slice(0, 100);

    const docRef = doc(db, 'user_financials', userKey);
    const rawData: Record<string, any> = {
      email: email.trim().toLowerCase(),
      lastUpdated: new Date().toISOString(),
      accounts: cleanAccounts,
      transactions: cleanTransactions,
      debts: cleanDebts,
      savingsGoals: cleanSavingsGoals,
      subscriptions: cleanSubscriptions,
    };

    if (payload.budgetConfig) {
      rawData.budgetConfig = payload.budgetConfig;
    }

    if (payload.householdConfig) {
      rawData.householdConfig = payload.householdConfig;
    }

    if (payload.security) {
      rawData.security = {
        isPinEnabled: Boolean(payload.security.isPinEnabled),
        pin: payload.security.pin || '',
        securityQuestion: payload.security.securityQuestion || '',
        securityAnswer: payload.security.securityAnswer || '',
        privacyMode: Boolean(payload.security.privacyMode),
        lockMode: payload.security.lockMode || 'on_exit',
        autoLockTime: payload.security.autoLockTime || 'immediate',
      };
    }

    if (payload.profile) {
      rawData.profile = {
        name: payload.profile.name || '',
        avatarUrl: payload.profile.avatarUrl || '',
        currency: payload.profile.currency || 'CRC (₡)',
      };
    }

    // Sanitizar profundamente antes de enviar a Firestore
    const sanitizedData = cleanForFirestore(rawData);

    await setDoc(docRef, sanitizedData, { merge: true });

    const totalInitial = cleanAccounts.reduce((acc, a) => acc + (Number(a.initialBalance) || 0), 0);
    console.log(`[CloudSync] Sincronización exitosa en la nube para ${email}:`, {
      cuentas: cleanAccounts.length,
      saldoInicialTotal: totalInitial,
      tienePin: Boolean(payload.security?.pin),
    });

    return true;
  } catch (error) {
    console.error('[CloudSync] Error guardando en la nube:', error);
    try {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    } catch {
      // Registrar sin romper la app
    }
    return false;
  }
}

/**
 * Escucha en tiempo real (onSnapshot) cambios en la nube provenientes de otros dispositivos (PC <-> Celular)
 */
export function subscribeToUserFinancials(
  email: string,
  onRemoteUpdate: (data: RemoteFinancialData) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (!email || !email.trim()) {
    return () => {};
  }
  const userKey = getUserDocKey(email);
  const docPath = `user_financials/${userKey}`;
  const docRef = doc(db, 'user_financials', userKey);

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const accounts: Account[] = Array.isArray(data.accounts) ? data.accounts : [];
        const transactions: Transaction[] = Array.isArray(data.transactions) ? data.transactions : [];
        const debts: DebtItem[] = Array.isArray(data.debts) ? data.debts : [];
        const savingsGoals: SavingsGoal[] = Array.isArray(data.savingsGoals) ? data.savingsGoals : [];
        const budgetConfig: BudgetConfig | undefined = data.budgetConfig && typeof data.budgetConfig === 'object' ? data.budgetConfig : undefined;
        const subscriptions: SubscriptionItem[] = Array.isArray(data.subscriptions) ? data.subscriptions : [];
        const householdConfig: SharedHouseholdConfig | undefined = data.householdConfig && typeof data.householdConfig === 'object' ? data.householdConfig : undefined;

        let security: SecurityConfig | undefined = undefined;
        if (data.security && typeof data.security === 'object') {
          security = {
            isPinEnabled: Boolean(data.security.isPinEnabled),
            pin: typeof data.security.pin === 'string' ? data.security.pin : '',
            securityQuestion: typeof data.security.securityQuestion === 'string' ? data.security.securityQuestion : '',
            securityAnswer: typeof data.security.securityAnswer === 'string' ? data.security.securityAnswer : '',
            privacyMode: Boolean(data.security.privacyMode),
            lockMode: data.security.lockMode === 'manual' ? 'manual' : 'on_exit',
            autoLockTime: data.security.autoLockTime || 'immediate',
          };
        }

        onRemoteUpdate({
          email: data.email || email,
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          accounts,
          transactions,
          debts,
          savingsGoals,
          budgetConfig,
          subscriptions,
          householdConfig,
          security,
          profile: data.profile || undefined,
        });
      }
    },
    (error) => {
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.GET, docPath);
      } catch (e) {
        console.warn('[CloudSync] Listener pausado:', e);
      }
    }
  );

  return unsubscribe;
}
