import React, { useState, useEffect } from 'react';
import { Account, AppScreen, DebtItem, SavingsGoal, SecurityConfig, Transaction, UserProfile, BudgetConfig, SubscriptionItem, SharedHouseholdConfig } from './types';
import { DEFAULT_SECURITY_CONFIG, INITIAL_USER } from './data/mockData';
import { loadUserDataFromStorage, saveUserDataToStorage, clearUserStorage, loadUserProfileFromStorage, saveUserProfileToStorage, DEFAULT_BUDGET_CONFIG, DEFAULT_HOUSEHOLD_CONFIG } from './utils/userStorage';
import { LoginView } from './components/LoginView';
import { PinLockView } from './components/PinLockView';
import { PinSetupModal } from './components/PinSetupModal';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { ActionType, QuickActionsModal } from './components/QuickActionsModal';
import { NotificationsModal } from './components/NotificationsModal';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallAppBanner } from './components/InstallAppBanner';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { PrivacyTermsModal } from './components/PrivacyTermsModal';
import { PermissionsModal } from './components/PermissionsModal';
import { getAppNotifications } from './utils/finance';
import { getNotificationPermission, requestNotificationPermission, triggerFinancialAlerts } from './utils/systemNotifications';
import { fetchUserFinancialsFromCloud, saveUserFinancialsToCloud, subscribeToUserFinancials, SyncStatus } from './services/cloudSyncService';
import { ChangelogUpdateModal } from './components/ChangelogUpdateModal';
import { InitialOnboardingView } from './components/InitialOnboardingView';
import { FinexaPlusAssistantModal } from './components/FinexaPlusAssistantModal';

// Views
import { InicioView } from './components/views/InicioView';
import { IngresosView } from './components/views/IngresosView';
import { ComidaView } from './components/views/ComidaView';
import { DiezmosView } from './components/views/DiezmosView';
import { DeudasView } from './components/views/DeudasView';
import { PerfilView } from './components/views/PerfilView';

export default function App() {
  // User profile state - null by default to show Login screen directly on first visit
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('finexa_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Datos iniciales cargados específicamente para la cuenta activa en localStorage
  const initialData = user?.email
    ? loadUserDataFromStorage(user.email)
    : {
        accounts: [],
        transactions: [],
        debts: [],
        savingsGoals: [],
        budgetConfig: DEFAULT_BUDGET_CONFIG,
        subscriptions: [],
        householdConfig: DEFAULT_HOUSEHOLD_CONFIG,
        security: DEFAULT_SECURITY_CONFIG,
      };

  // Accounts & Sources of money aisladas por usuario
  const [accounts, setAccounts] = useState<Account[]>(initialData.accounts);

  // Financial transactions aisladas por usuario
  const [transactions, setTransactions] = useState<Transaction[]>(initialData.transactions);

  // Debts aisladas por usuario
  const [debts, setDebts] = useState<DebtItem[]>(initialData.debts);

  // Metas de ahorro aisladas por usuario
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(initialData.savingsGoals || []);

  // Presupuesto mensual inteligente aislado por usuario
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(initialData.budgetConfig || DEFAULT_BUDGET_CONFIG);

  // Suscripciones y pagos fijos recurrentes aislados por usuario
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>(initialData.subscriptions || []);

  // Finanzas compartidas en pareja / hogar aisladas por usuario
  const [householdConfig, setHouseholdConfig] = useState<SharedHouseholdConfig>(initialData.householdConfig || DEFAULT_HOUSEHOLD_CONFIG);

  // Security config (PIN y preguntas) aisladas por usuario
  const [security, setSecurity] = useState<SecurityConfig>(initialData.security);

  // Navigation & Screen states
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('inicio');
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      const savedUser = localStorage.getItem('finexa_user');
      const savedLocked = localStorage.getItem('finexa_is_locked');
      if (savedUser) {
        const parsedUser: UserProfile = JSON.parse(savedUser);
        const userSec = loadUserDataFromStorage(parsedUser.email).security;
        if (userSec.isPinEnabled && userSec.pin) {
          if (userSec.lockMode === 'on_exit' || savedLocked === 'true') {
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  // Modals & Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [quickActionInitialMode, setQuickActionInitialMode] = useState<ActionType>('menu');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [privacyModalTab, setPrivacyModalTab] = useState<'privacy' | 'cookies' | 'terms' | 'permissions'>('privacy');
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(() => !localStorage.getItem('finexa_seen_v32'));
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Consentimiento legal y permisos en primer inicio de sesión (Requisito 5)
  const [hasLegalConsent, setHasLegalConsent] = useState(() => {
    try {
      const savedUser = localStorage.getItem('finexa_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        return Boolean(localStorage.getItem(`finexa_consent_${parsed.email}`));
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (user?.email) {
      setHasLegalConsent(Boolean(localStorage.getItem(`finexa_consent_${user.email}`)));
    }
  }, [user?.email]);

  // Cloud Sync state across PC and mobile devices
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const isRemoteUpdatingRef = React.useRef(false);
  const hasInitializedCloudRef = React.useRef(false);

  // Sincronización en la Nube Multidispositivo (PC <-> Celular) en tiempo real
  useEffect(() => {
    if (!user?.email) return;

    setSyncStatus('syncing');

    // 1. Carga inicial desde la nube para hidratar si se abre en un dispositivo nuevo (ej: compu)
    fetchUserFinancialsFromCloud(user.email)
      .then(async (remote) => {
        const localBalance = accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0);
        const remoteBalance = remote?.accounts
          ? remote.accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0)
          : 0;

        console.log('[CloudSync Init] Estado:', {
          email: user.email,
          localBalance,
          localAccounts: accounts.length,
          remoteBalance,
          remoteAccounts: remote?.accounts?.length || 0,
        });

        if (remote && (remote.accounts.length > 0 || remote.transactions.length > 0 || remote.debts.length > 0 || (remote.savingsGoals && remote.savingsGoals.length > 0) || remote.budgetConfig || (remote.subscriptions && remote.subscriptions.length > 0))) {
          // Si el local tiene 0 (como en la PC) o la nube tiene mayor o igual saldo, adoptar la nube
          if (localBalance === 0 || remoteBalance >= localBalance) {
            isRemoteUpdatingRef.current = true;
            setAccounts(remote.accounts);
            setTransactions(remote.transactions);
            setDebts(remote.debts);
            if (remote.savingsGoals) setSavingsGoals(remote.savingsGoals);
            if (remote.budgetConfig) setBudgetConfig(remote.budgetConfig);
            if (remote.subscriptions) setSubscriptions(remote.subscriptions);
            if (remote.householdConfig) setHouseholdConfig(remote.householdConfig);
            if (remote.security) setSecurity(remote.security);
            saveUserDataToStorage(user.email, {
              accounts: remote.accounts,
              transactions: remote.transactions,
              debts: remote.debts,
              savingsGoals: remote.savingsGoals || [],
              budgetConfig: remote.budgetConfig || budgetConfig,
              subscriptions: remote.subscriptions || subscriptions,
              householdConfig: remote.householdConfig || householdConfig,
              security: remote.security,
            });
            setSyncStatus('synced');
          } else {
            // El local tiene saldo mayor (ej: celular con los 23 mil), subir a la nube
            console.log('[CloudSync Init] Subiendo datos locales con saldo a la nube...');
            await saveUserFinancialsToCloud(user.email, {
              accounts,
              transactions,
              debts,
              savingsGoals,
              budgetConfig,
              subscriptions,
              householdConfig,
              security,
              profile: user,
            });
            setSyncStatus('synced');
          }
        } else if (accounts.length > 0 || transactions.length > 0 || debts.length > 0 || savingsGoals.length > 0 || subscriptions.length > 0) {
          // La nube está vacía pero este dispositivo tiene datos (ej: celular con 23 mil)
          console.log('[CloudSync Init] Subiendo datos existentes del dispositivo a la nube...');
          await saveUserFinancialsToCloud(user.email, {
            accounts,
            transactions,
            debts,
            savingsGoals,
            budgetConfig,
            subscriptions,
            householdConfig,
            security,
            profile: user,
          });
          setSyncStatus('synced');
        } else {
          setSyncStatus('synced');
        }

        hasInitializedCloudRef.current = true;
      })
      .catch((err) => {
        console.error('[CloudSync Init Error]:', err);
        setSyncStatus('error');
        hasInitializedCloudRef.current = true;
      });

    // 2. Suscripción en tiempo real: cualquier cambio hecho en la PC aparece en el celular y viceversa
    const unsubscribe = subscribeToUserFinancials(
      user.email,
      (remote) => {
        const remoteBalance = remote.accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0);
        console.log('[CloudSync Listener] Actualización remota recibida:', {
          cuentas: remote.accounts.length,
          saldo: remoteBalance,
          tienePin: Boolean(remote.security?.pin),
        });

        isRemoteUpdatingRef.current = true;
        setAccounts(remote.accounts);
        setTransactions(remote.transactions);
        setDebts(remote.debts);
        if (remote.savingsGoals) setSavingsGoals(remote.savingsGoals);
        if (remote.budgetConfig) setBudgetConfig(remote.budgetConfig);
        if (remote.subscriptions) setSubscriptions(remote.subscriptions);
        if (remote.householdConfig) setHouseholdConfig(remote.householdConfig);
        if (remote.security) setSecurity(remote.security);
        saveUserDataToStorage(user.email, {
          accounts: remote.accounts,
          transactions: remote.transactions,
          debts: remote.debts,
          savingsGoals: remote.savingsGoals || [],
          budgetConfig: remote.budgetConfig || budgetConfig,
          subscriptions: remote.subscriptions || subscriptions,
          householdConfig: remote.householdConfig || householdConfig,
          security: remote.security,
        });
        setSyncStatus('synced');
      },
      (err) => {
        console.warn('[CloudSync Listener Error]:', err);
        setSyncStatus('error');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.email]);

  // Guardado automático en la Nube con debounce cuando el usuario hace cambios locales
  useEffect(() => {
    if (!user?.email) return;

    // Proteger: nunca enviar datos vacíos antes de completar la carga inicial de la nube
    if (!hasInitializedCloudRef.current) {
      return;
    }

    // Evitar eco si el cambio provino de una actualización remota
    if (isRemoteUpdatingRef.current) {
      isRemoteUpdatingRef.current = false;
      return;
    }

    setSyncStatus('syncing');
    const timer = setTimeout(() => {
      saveUserFinancialsToCloud(user.email, {
        accounts,
        transactions,
        debts,
        savingsGoals,
        budgetConfig,
        subscriptions,
        householdConfig,
        security,
        profile: user,
      }).then((ok) => {
        setSyncStatus(ok ? 'synced' : 'error');
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [accounts, transactions, debts, savingsGoals, budgetConfig, subscriptions, householdConfig, security, user]);

  // Bloqueo automático al salir de la app (cambio de ventana, pestaña, app minimizada o cerrada)
  useEffect(() => {
    if (!security.isPinEnabled || !security.pin || security.lockMode !== 'on_exit' || !user) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsAppLocked(true);
        localStorage.setItem('finexa_is_locked', 'true');
      }
    };

    const handlePageHide = () => {
      setIsAppLocked(true);
      localStorage.setItem('finexa_is_locked', 'true');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [security.isPinEnabled, security.pin, security.lockMode, user]);

  // Sincronización en LocalStorage: cada usuario guarda sus datos exclusivamente bajo su clave de cuenta
  useEffect(() => {
    if (user) {
      localStorage.setItem('finexa_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('finexa_user');
    }
  }, [user]);

  useEffect(() => {
    if (user?.email) {
      saveUserDataToStorage(user.email, { accounts });
    }
  }, [accounts, user]);

  useEffect(() => {
    if (user?.email) {
      saveUserDataToStorage(user.email, { transactions });
    }
  }, [transactions, user]);

  useEffect(() => {
    if (user?.email) {
      saveUserDataToStorage(user.email, { debts });
    }
  }, [debts, user]);

  useEffect(() => {
    if (user?.email) {
      saveUserDataToStorage(user.email, { savingsGoals });
    }
  }, [savingsGoals, user]);

  useEffect(() => {
    if (user?.email) {
      saveUserDataToStorage(user.email, { security });
    }
  }, [security, user]);

  // Notifications calculation based on actual user data
  const notifications = getAppNotifications(debts, accounts, transactions);
  const unreadNotificationsCount = notifications.length;
  const [notificationPermission, setNotificationPermission] = useState<string>(() => getNotificationPermission());

  // Tirar notificaciones del sistema para deudas, gastos e ingresos cuando corresponda
  useEffect(() => {
    if (user && !isAppLocked) {
      triggerFinancialAlerts(notifications);
    }
  }, [user, isAppLocked, notifications]);

  const handleRequestNotificationPermission = async () => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      triggerFinancialAlerts(notifications);
    }
  };

  // Handlers for financial entities
  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = {
      ...newTx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setTransactions((prev) => [tx, ...prev]);
  };

  const handleAddAccount = (newAcc: Omit<Account, 'id' | 'createdAt'>) => {
    const acc: Account = {
      ...newAcc,
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, acc]);
  };

  const handleAddDebt = (newDebt: Omit<DebtItem, 'id' | 'createdAt'>) => {
    const debt: DebtItem = {
      ...newDebt,
      id: `debt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setDebts((prev) => [...prev, debt]);
  };

  const handleAddSavingsGoal = (newGoal: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const goal: SavingsGoal = {
      ...newGoal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    setSavingsGoals((prev) => [...prev, goal]);
  };

  const handleUpdateSavingsGoalAmount = (goalId: string, addedAmount: number, sourceAccountId?: string) => {
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          return {
            ...g,
            currentAmount: Math.max(0, (Number(g.currentAmount) || 0) + addedAmount),
          };
        }
        return g;
      })
    );
  };

  const handleDeleteSavingsGoal = (goalId: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  const handleSaveBudgetConfig = (newConfig: BudgetConfig) => {
    setBudgetConfig(newConfig);
    if (user?.email) {
      saveUserDataToStorage(user.email, {
        accounts,
        transactions,
        debts,
        savingsGoals,
        budgetConfig: newConfig,
        subscriptions,
        householdConfig,
        security,
      });
    }
  };

  const handleAddSubscription = (newSub: Omit<SubscriptionItem, 'id' | 'createdAt'>) => {
    const sub: SubscriptionItem = {
      ...newSub,
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...subscriptions, sub];
    setSubscriptions(updated);
    if (user?.email) {
      saveUserDataToStorage(user.email, {
        accounts,
        transactions,
        debts,
        savingsGoals,
        budgetConfig,
        subscriptions: updated,
        householdConfig,
        security,
      });
    }
  };

  const handleUpdateSubscription = (id: string, updates: Partial<SubscriptionItem>) => {
    const updated = subscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSubscriptions(updated);
    if (user?.email) {
      saveUserDataToStorage(user.email, {
        accounts,
        transactions,
        debts,
        savingsGoals,
        budgetConfig,
        subscriptions: updated,
        householdConfig,
        security,
      });
    }
  };

  const handleDeleteSubscription = (id: string) => {
    const updated = subscriptions.filter((s) => s.id !== id);
    setSubscriptions(updated);
    if (user?.email) {
      saveUserDataToStorage(user.email, {
        accounts,
        transactions,
        debts,
        savingsGoals,
        budgetConfig,
        subscriptions: updated,
        householdConfig,
        security,
      });
    }
  };

  const handlePaySubscription = (sub: SubscriptionItem, accountId?: string) => {
    handleAddTransaction({
      amount: sub.amount,
      type: 'gasto',
      category: (sub.category as any) || 'Servicios',
      title: `Pago recurrente: ${sub.name}`,
      accountId: accountId || accounts[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      note: `Cobro programado (${sub.billingCycle})`,
    });
  };

  const handleSaveHouseholdConfig = (newConfig: SharedHouseholdConfig) => {
    setHouseholdConfig(newConfig);
    if (user?.email) {
      saveUserDataToStorage(user.email, {
        accounts,
        transactions,
        debts,
        savingsGoals,
        budgetConfig,
        subscriptions,
        householdConfig: newConfig,
        security,
      });
    }
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    setTransactions((prev) => prev.filter((t) => t.accountId !== accountId && t.toAccountId !== accountId));
  };

  const handleDeleteDebt = (debtId: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    setTransactions((prev) => prev.filter((t) => t.debtId !== debtId));
  };

  const handleDeleteTransaction = (txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  const handleOpenQuickAdd = (mode: ActionType = 'menu') => {
    setQuickActionInitialMode(mode);
    setIsQuickActionsOpen(true);
  };

  // Profile and Security Handlers
  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      saveUserProfileToStorage(next.email, next);
      return next;
    });
  };

  const handleOpenPrivacyTerms = (tab: 'privacy' | 'cookies' | 'terms' | 'permissions' = 'privacy') => {
    if (tab === 'permissions') {
      setIsPermissionsModalOpen(true);
    } else {
      setPrivacyModalTab(tab);
      setIsPrivacyModalOpen(true);
    }
  };

  const handleOpenPermissions = () => {
    setIsPermissionsModalOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: UserProfile) => {
    // Cargar datos exclusivamente aislados para esta cuenta desde localStorage
    const loadedData = loadUserDataFromStorage(loggedInUser.email);
    const savedProfile = loadUserProfileFromStorage(loggedInUser.email);
    const finalUser = savedProfile ? { ...loggedInUser, ...savedProfile } : loggedInUser;

    setAccounts(loadedData.accounts);
    setTransactions(loadedData.transactions);
    setDebts(loadedData.debts);
    setSavingsGoals(loadedData.savingsGoals || []);
    setSecurity(loadedData.security);
    setUser(finalUser);
    saveUserProfileToStorage(finalUser.email, finalUser);

    if (loadedData.security.isPinEnabled && loadedData.security.pin) {
      if (loadedData.security.lockMode === 'on_exit') {
        setIsAppLocked(true);
      } else {
        setIsAppLocked(false);
      }
    } else {
      setIsAppLocked(false);
    }
  };

  const handleLogout = () => {
    // Guardar estado actual antes de cerrar sesión para asegurar persistencia
    if (user?.email) {
      saveUserDataToStorage(user.email, {
        accounts,
        transactions,
        debts,
        savingsGoals,
        security,
      });
      saveUserProfileToStorage(user.email, user);
    }
    setUser(null);
    // Limpiar el estado en memoria para que no se transfiera a otra cuenta
    setAccounts([]);
    setTransactions([]);
    setDebts([]);
    setSavingsGoals([]);
    setSecurity(DEFAULT_SECURITY_CONFIG);
    setIsAppLocked(false);
    localStorage.removeItem('finexa_user');
    localStorage.removeItem('finexa_is_locked');
    setIsSidebarOpen(false);
    setCurrentScreen('inicio');
  };

  const handleLockApp = () => {
    setIsAppLocked(true);
    localStorage.setItem('finexa_is_locked', 'true');
    setIsSidebarOpen(false);
  };

  const handleUnlockApp = () => {
    setIsAppLocked(false);
    localStorage.removeItem('finexa_is_locked');
  };

  const handleResetPinRequired = () => {
    setIsAppLocked(false);
    localStorage.removeItem('finexa_is_locked');
    setIsPinSetupOpen(true);
  };

  const handleSaveSecurityConfig = (updated: Partial<SecurityConfig>) => {
    setSecurity((prev) => {
      const next = {
        ...prev,
        ...updated,
      };
      if (!next.isPinEnabled) {
        setIsAppLocked(false);
        localStorage.removeItem('finexa_is_locked');
      }
      return next;
    });
  };

  const handleForceSync = async () => {
    if (!user?.email) return;
    setSyncStatus('syncing');
    try {
      const localBalance = accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0);
      const remote = await fetchUserFinancialsFromCloud(user.email);
      const remoteBalance = remote?.accounts ? remote.accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0) : 0;

      // Si la nube tiene saldo o datos y el local está en 0 (caso típico: PC nueva)
      if (remote && (remoteBalance > localBalance || (localBalance === 0 && (remote.accounts.length > 0 || remote.transactions.length > 0 || (remote.savingsGoals && remote.savingsGoals.length > 0))))) {
        isRemoteUpdatingRef.current = true;
        setAccounts(remote.accounts);
        setTransactions(remote.transactions);
        setDebts(remote.debts);
        if (remote.savingsGoals) setSavingsGoals(remote.savingsGoals);
        if (remote.security) setSecurity(remote.security);
        saveUserDataToStorage(user.email, {
          accounts: remote.accounts,
          transactions: remote.transactions,
          debts: remote.debts,
          savingsGoals: remote.savingsGoals || [],
          security: remote.security,
        });
        setSyncStatus('synced');
      } else {
        // El dispositivo local tiene datos/saldo (ej: celular con los 23.000), subir a la nube
        const ok = await saveUserFinancialsToCloud(user.email, {
          accounts,
          transactions,
          debts,
          savingsGoals,
          security,
          profile: user,
        });
        setSyncStatus(ok ? 'synced' : 'error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  const handlePushToCloud = async () => {
    if (!user?.email) return;
    setSyncStatus('syncing');
    const ok = await saveUserFinancialsToCloud(user.email, {
      accounts,
      transactions,
      debts,
      savingsGoals,
      security,
      profile: user,
    });
    setSyncStatus(ok ? 'synced' : 'error');
    if (!ok) throw new Error('Falló subida a la nube');
  };

  const handlePullFromCloud = async () => {
    if (!user?.email) return;
    setSyncStatus('syncing');
    const remote = await fetchUserFinancialsFromCloud(user.email);
    if (remote) {
      isRemoteUpdatingRef.current = true;
      setAccounts(remote.accounts);
      setTransactions(remote.transactions);
      setDebts(remote.debts);
      if (remote.savingsGoals) setSavingsGoals(remote.savingsGoals);
      if (remote.security) setSecurity(remote.security);
      saveUserDataToStorage(user.email, {
        accounts: remote.accounts,
        transactions: remote.transactions,
        debts: remote.debts,
        savingsGoals: remote.savingsGoals || [],
        security: remote.security,
      });
      setSyncStatus('synced');
    } else {
      setSyncStatus('error');
      throw new Error('No se encontraron datos en la nube');
    }
  };

  // Data Export & Import Handlers
  const handleExportData = () => {
    const backup = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      user,
      accounts,
      transactions,
      debts,
      savingsGoals,
      security: {
        isPinEnabled: security.isPinEnabled,
        securityQuestion: security.securityQuestion,
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finexa_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.accounts) setAccounts(parsed.accounts);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.debts) setDebts(parsed.debts);
        if (parsed.savingsGoals) setSavingsGoals(parsed.savingsGoals);
        if (parsed.user) setUser(parsed.user);
        alert('¡Datos restaurados con éxito en Finexa!');
      } catch {
        alert('Error al leer el archivo JSON. Verifica que sea una copia de Finexa válida.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (!user) return;
    if (confirm('¿Estás seguro de que deseas borrar todos los datos de tu cuenta y reiniciar tus finanzas limpias?')) {
      setAccounts([]);
      setTransactions([]);
      setDebts([]);
      setSavingsGoals([]);
      clearUserStorage(user.email);
      alert('Tus datos de cuenta han sido restablecidos limpios y vacíos.');
    }
  };

  // If user is logged out, show LoginView first
  if (!user) {
    return (
      <main className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased flex flex-col justify-center">
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </main>
    );
  }

  // Primer inicio de sesión: pantalla "Antes de comenzar" con consentimiento obligatorio y permisos (Requisito 5)
  if (!hasLegalConsent) {
    return (
      <main className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased">
        <InitialOnboardingView
          user={user}
          onComplete={() => setHasLegalConsent(true)}
        />
      </main>
    );
  }

  // If app is locked by PIN, show PIN Lock Screen
  if (isAppLocked && security.isPinEnabled) {
    return (
      <main className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased">
        <PinLockView
          user={user}
          security={security}
          onUnlockSuccess={handleUnlockApp}
          onResetPinRequired={handleResetPinRequired}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#dfe2ee] font-sans antialiased relative selection:bg-[#10b981]/30 selection:text-white">
      {/* Offline Status Alert Banner */}
      <OfflineBanner />

      {/* Top Header Bar */}
      <TopHeader
        currentScreen={currentScreen}
        onOpenMenu={() => setIsSidebarOpen(true)}
        onBack={currentScreen !== 'inicio' ? () => setCurrentScreen('inicio') : undefined}
        onNewAction={() => handleOpenQuickAdd('menu')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        notificationCount={unreadNotificationsCount}
        syncStatus={syncStatus}
        onForceSync={handleForceSync}
      />

      {/* Main Screen Container (responsive mobile-first viewport) */}
      <main className="w-full max-w-md mx-auto pt-20 px-4 min-h-screen">
        {/* Banner de instalación PWA (Pantalla de Inicio) */}
        <InstallAppBanner />

        {currentScreen === 'inicio' && (
          <InicioView
            user={user}
            accounts={accounts}
            transactions={transactions}
            debts={debts}
            notifications={notifications}
            onNavigate={(screen) => setCurrentScreen(screen)}
            onOpenQuickAction={(action) => handleOpenQuickAdd(action || 'menu')}
            onOpenMenu={() => setIsSidebarOpen(true)}
            onRequestNotifications={handleRequestNotificationPermission}
            notificationPermission={notificationPermission}
          />
        )}

        {currentScreen === 'ingresos' && (
          <IngresosView
            accounts={accounts}
            transactions={transactions}
            onOpenQuickAdd={(mode) => handleOpenQuickAdd(mode || 'ingreso')}
            onDeleteAccount={handleDeleteAccount}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {(currentScreen === 'gastos' || currentScreen === 'comida') && (
          <ComidaView
            accounts={accounts}
            transactions={transactions}
            onOpenQuickAdd={(mode) => handleOpenQuickAdd(mode || 'gasto')}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {currentScreen === 'diezmos' && (
          <DiezmosView
            accounts={accounts}
            transactions={transactions}
            onOpenQuickAdd={(mode) => handleOpenQuickAdd(mode || 'diezmo')}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {currentScreen === 'deudas' && (
          <DeudasView
            debts={debts}
            transactions={transactions}
            accounts={accounts}
            onOpenQuickAdd={(mode) => handleOpenQuickAdd(mode || 'deuda')}
            onDeleteDebt={handleDeleteDebt}
          />
        )}

        {currentScreen === 'perfil' && (
          <PerfilView
            user={user}
            security={security}
            accounts={accounts}
            transactions={transactions}
            debts={debts}
            onUpdateUser={handleUpdateUser}
            onOpenPinSetup={() => setIsPinSetupOpen(true)}
            onLockApp={handleLockApp}
            onLogout={handleLogout}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetData={handleResetData}
            onOpenPrivacyTerms={handleOpenPrivacyTerms}
            onOpenPermissions={handleOpenPermissions}
            onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
            syncStatus={syncStatus}
            onForceSync={handleForceSync}
            onPushToCloud={handlePushToCloud}
            onPullFromCloud={handlePullFromCloud}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav
        currentScreen={currentScreen}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
        onNewAction={() => handleOpenQuickAdd('menu')}
      />

      {/* Sliding Sidebar Navigation Drawer */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentScreen={currentScreen}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
        user={user}
        security={security}
        onLockApp={handleLockApp}
        onLogout={handleLogout}
        onOpenPrivacyTerms={handleOpenPrivacyTerms}
        onOpenPermissions={handleOpenPermissions}
      />

      {/* Modal: Central Quick Financial Actions Hub ("+" button) */}
      <QuickActionsModal
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        accounts={accounts}
        debts={debts}
        transactions={transactions}
        savingsGoals={savingsGoals}
        budgetConfig={budgetConfig}
        onSaveBudgetConfig={handleSaveBudgetConfig}
        subscriptions={subscriptions}
        onAddSubscription={handleAddSubscription}
        onUpdateSubscription={handleUpdateSubscription}
        onDeleteSubscription={handleDeleteSubscription}
        onPaySubscription={handlePaySubscription}
        householdConfig={householdConfig}
        onSaveHouseholdConfig={handleSaveHouseholdConfig}
        initialAction={quickActionInitialMode}
        onAddTransaction={handleAddTransaction}
        onAddAccount={handleAddAccount}
        onAddDebt={handleAddDebt}
        onAddSavingsGoal={handleAddSavingsGoal}
        onUpdateSavingsGoalAmount={handleUpdateSavingsGoalAmount}
        onDeleteSavingsGoal={handleDeleteSavingsGoal}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Modal: PIN Configuration & Security Question */}
      <PinSetupModal
        isOpen={isPinSetupOpen}
        onClose={() => setIsPinSetupOpen(false)}
        currentConfig={security}
        onSaveConfig={handleSaveSecurityConfig}
      />

      {/* Modal: Notifications and Debt Reminders */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Banner de consentimiento de Cookies y Privacidad */}
      <CookieConsentBanner onOpenPrivacyModal={handleOpenPrivacyTerms} />

      {/* Modal de Políticas de Privacidad, Cookies, Términos y Transparencia */}
      <PrivacyTermsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        defaultTab={privacyModalTab}
        onOpenPermissions={handleOpenPermissions}
      />

      {/* Centro de Permisos del Dispositivo (Cámara, Galería, Notificaciones, Persistencia) */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
      />

      {/* Pantalla de Actualización / Changelog */}
      <ChangelogUpdateModal
        isOpen={isChangelogOpen}
        onClose={() => {
          localStorage.setItem('finexa_seen_v32', 'true');
          setIsChangelogOpen(false);
        }}
        onUpdateConfirmed={() => {
          localStorage.setItem('finexa_seen_v32', 'true');
          setIsChangelogOpen(false);
        }}
      />

      {/* Modal: Asistente IA Finexa-Plus con Siri Orb y Motor GLM 5-3 */}
      <FinexaPlusAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        transactions={transactions}
        accounts={accounts}
        debts={debts}
        currencySymbol={user?.currency === 'USD' ? '$' : '₡'}
      />
    </div>
  );
}
