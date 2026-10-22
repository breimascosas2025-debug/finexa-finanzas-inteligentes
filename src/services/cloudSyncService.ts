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
 * Fusiona de forma determinista y sin pérdida de datos los registros locales y remotos
 */
export function mergeFinancialData(
  local: Partial<RemoteFinancialData>,
  remote: Partial<RemoteFinancialData>
): RemoteFinancialData {
  // Cuentas unificadas por ID
  const accountMap = new Map<string, Account>();
  (remote.accounts || []).forEach((a) => accountMap.set(a.id, a));
  (local.accounts || []).forEach((a) => {
    if (!accountMap.has(a.id)) {
      accountMap.set(a.id, a);
    }
  });

  // Transacciones unificadas por ID (evita duplicados exactos)
  const txMap = new Map<string, Transaction>();
  (remote.transactions || []).forEach((t) => txMap.set(t.id, t));
  (local.transactions || []).forEach((t) => {
    if (!txMap.has(t.id)) {
      txMap.set(t.id, t);
    }
  });
  const mergedTx = Array.from(txMap.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Deudas unificadas por ID
  const debtMap = new Map<string, DebtItem>();
  (remote.debts || []).forEach((d) => debtMap.set(d.id, d));
  (local.debts || []).forEach((d) => {
    if (!debtMap.has(d.id)) {
      debtMap.set(d.id, d);
    } else {
      const existing = debtMap.get(d.id)!;
      debtMap.set(d.id, {
        ...existing,
        calendarEventId: existing.calendarEventId || d.calendarEventId,
        isPaid: existing.isPaid ?? d.isPaid,
        paidDate: existing.paidDate || d.paidDate,
      });
    }
  });

  // Metas de ahorro unificadas por ID
  const goalMap = new Map<string, SavingsGoal>();
  (remote.savingsGoals || []).forEach((g) => goalMap.set(g.id, g));
  (local.savingsGoals || []).forEach((g) => {
    if (!goalMap.has(g.id)) goalMap.set(g.id, g);
  });

  // Suscripciones unificadas por ID
  const subMap = new Map<string, SubscriptionItem>();
  (remote.subscriptions || []).forEach((s) => subMap.set(s.id, s));
  (local.subscriptions || []).forEach((s) => {
    if (!subMap.has(s.id)) subMap.set(s.id, s);
  });

  const remoteTime = new Date(remote.lastUpdated || 0).getTime();
  const localTime = new Date(local.lastUpdated || 0).getTime();
  const latestSecurity = remoteTime >= localTime ? (remote.security || local.security) : (local.security || remote.security);
  const latestBudget = remoteTime >= localTime ? (remote.budgetConfig || local.budgetConfig) : (local.budgetConfig || remote.budgetConfig);
  const latestHousehold = remoteTime >= localTime ? (remote.householdConfig || local.householdConfig) : (local.householdConfig || remote.householdConfig);
  const latestProfile = remoteTime >= localTime ? (remote.profile || local.profile) : (local.profile || remote.profile);

  return {
    email: remote.email || local.email || '',
    lastUpdated: new Date().toISOString(),
    accounts: Array.from(accountMap.values()),
    transactions: mergedTx,
    debts: Array.from(debtMap.values()),
    savingsGoals: Array.from(goalMap.values()),
    budgetConfig: latestBudget,
    subscriptions: Array.from(subMap.values()),
    householdConfig: latestHousehold,
    security: latestSecurity,
    profile: latestProfile,
  };
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
          biometricsEnabled: Boolean(data.security.biometricsEnabled ?? true),
          calendarSyncEnabled: Boolean(data.security.calendarSyncEnabled),
          calendarReminderDays: data.security.calendarReminderDays ?? 2,
          sheetsAutoSync: Boolean(data.security.sheetsAutoSync),
        };
      }

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
 * Guarda los datos financieros y configuraciones en Firestore para sincronización multidispositivo
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
        biometricsEnabled: Boolean(payload.security.biometricsEnabled ?? true),
        calendarSyncEnabled: Boolean(payload.security.calendarSyncEnabled),
        calendarReminderDays: payload.security.calendarReminderDays ?? 2,
        sheetsAutoSync: Boolean(payload.security.sheetsAutoSync),
      };
    }

    if (payload.profile) {
      rawData.profile = {
        name: payload.profile.name || '',
        avatarUrl: payload.profile.avatarUrl || '',
        currency: payload.profile.currency || 'CRC (₡)',
      };
    }

    const sanitizedData = cleanForFirestore(rawData);
    await setDoc(docRef, sanitizedData, { merge: true });
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
            biometricsEnabled: Boolean(data.security.biometricsEnabled ?? true),
            calendarSyncEnabled: Boolean(data.security.calendarSyncEnabled),
            calendarReminderDays: data.security.calendarReminderDays ?? 2,
            sheetsAutoSync: Boolean(data.security.sheetsAutoSync),
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
