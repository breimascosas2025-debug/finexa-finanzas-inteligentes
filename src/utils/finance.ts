import { Account, AppNotification, DebtItem, Transaction } from '../types';

/**
 * Calcula el saldo exacto de una cuenta según:
 * Saldo inicial + Ingresos - Gastos - Pagos de deuda - Diezmos + Transferencias recibidas - Transferencias enviadas
 */
export function calculateAccountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initialBalance || 0;

  for (const tx of transactions) {
    if (tx.accountId === account.id) {
      if (tx.type === 'ingreso') {
        balance += tx.amount;
      } else if (tx.type === 'gasto' || tx.type === 'pago_deuda' || tx.type === 'diezmo') {
        balance -= tx.amount;
      } else if (tx.type === 'transferencia') {
        balance -= tx.amount;
      }
    }

    // Si es transferencia y esta cuenta es la receptora
    if (tx.type === 'transferencia' && tx.toAccountId === account.id) {
      balance += tx.amount;
    }
  }

  return balance;
}

/**
 * Calcula el saldo total disponible sumando los saldos de todas las cuentas creadas (en CRC por defecto)
 */
export function calculateTotalBalance(accounts: Account[], transactions: Transaction[], targetCurrency = 'CRC'): number {
  return accounts
    .filter((acc) => !acc.currency || acc.currency.toUpperCase() === targetCurrency.toUpperCase())
    .reduce((acc, curr) => acc + calculateAccountBalance(curr, transactions), 0);
}

/**
 * Agrupa los saldos totales desglosados por cada moneda (Dólares, Euros, Colones, etc.)
 */
export function calculateBalancesByCurrency(
  accounts: Account[],
  transactions: Transaction[]
): Array<{ currency: string; symbol: string; total: number; count: number }> {
  const map: Record<string, { currency: string; symbol: string; total: number; count: number }> = {};

  for (const acc of accounts) {
    const code = (acc.currency || 'CRC').toUpperCase();
    const symbol = acc.currencySymbol || (code === 'USD' ? '$' : code === 'EUR' ? '€' : code === 'GBP' ? '£' : '₡');
    const bal = calculateAccountBalance(acc, transactions);

    if (!map[code]) {
      map[code] = { currency: code, symbol, total: 0, count: 0 };
    }
    map[code].total += bal;
    map[code].count += 1;
  }

  return Object.values(map);
}

/**
 * Total de ingresos registrados
 */
export function calculateTotalIncome(transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.type === 'ingreso')
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Total de gastos registrados (incluye gastos regulares, pagos de deuda y diezmos)
 */
export function calculateTotalExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((tx) => tx.type === 'gasto' || tx.type === 'pago_deuda' || tx.type === 'diezmo')
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Información de estado de una deuda individual
 */
export function getDebtStatus(debt: DebtItem, transactions: Transaction[]) {
  const paidAmount = transactions
    .filter((tx) => tx.type === 'pago_deuda' && tx.debtId === debt.id)
    .reduce((sum, tx) => sum + tx.amount, 0);

  const remainingAmount = Math.max(0, debt.totalAmount - paidAmount);
  const isPaid = remainingAmount <= 0;
  const percentage = debt.totalAmount > 0 ? Math.min(100, Math.round((paidAmount / debt.totalAmount) * 100)) : 100;

  // Cálculo de vencimiento
  let isOverdue = false;
  let isDueToday = false;
  let daysRemaining: number | null = null;

  if (debt.dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(debt.dueDate + 'T00:00:00');
    const diffTime = due.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (!isPaid) {
      if (daysRemaining < 0) {
        isOverdue = true;
      } else if (daysRemaining === 0) {
        isDueToday = true;
      }
    }
  }

  return {
    paidAmount,
    remainingAmount,
    isPaid,
    percentage,
    daysRemaining,
    isOverdue,
    isDueToday,
  };
}

/**
 * Genera notificaciones y recordatorios inteligentes basados en los datos reales del usuario
 */
export function getAppNotifications(
  debts: DebtItem[],
  accounts: Account[],
  transactions: Transaction[]
): AppNotification[] {
  const notifications: AppNotification[] = [];

  // 1. Notificaciones de deudas
  debts.forEach((debt) => {
    const status = getDebtStatus(debt, transactions);
    if (!status.isPaid) {
      if (status.isOverdue) {
        notifications.push({
          id: `due-overdue-${debt.id}`,
          title: 'Deuda Vencida',
          message: `La deuda "${debt.name}" tiene un saldo pendiente de ₡${status.remainingAmount.toLocaleString()} y su fecha ya pasó.`,
          type: 'warning',
          date: 'Vencida',
          isRead: false,
          targetScreen: 'deudas',
        });
      } else if (status.isDueToday) {
        notifications.push({
          id: `due-today-${debt.id}`,
          title: 'Vence Hoy',
          message: `Hoy corresponde realizar el pago de la deuda "${debt.name}". Saldo pendiente: ₡${status.remainingAmount.toLocaleString()}.`,
          type: 'due',
          date: 'Hoy',
          isRead: false,
          targetScreen: 'deudas',
        });
      } else if (status.daysRemaining !== null && status.daysRemaining <= 5 && status.daysRemaining > 0) {
        notifications.push({
          id: `due-soon-${debt.id}`,
          title: 'Próximo Vencimiento',
          message: `La deuda "${debt.name}" vence en ${status.daysRemaining} días. Saldo pendiente: ₡${status.remainingAmount.toLocaleString()}.`,
          type: 'info',
          date: `En ${status.daysRemaining} días`,
          isRead: false,
          targetScreen: 'deudas',
        });
      }
    }
  });

  // 2. Notificaciones de gastos por pagar y control de gastos
  const now = new Date();
  const currentDay = now.getDate();
  const recentExpenses = transactions.filter(
    (t) => t.type === 'gasto' && Date.now() - new Date(t.date).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  // Recordatorio de pago de servicios y gastos de inicio/mitad de mes
  if (currentDay >= 1 && currentDay <= 7) {
    notifications.push({
      id: 'notif-gastos-mes',
      title: 'Pago de Gastos Mensuales',
      message: 'Recuerda pagar los servicios y gastos fijos del inicio de mes (alquiler, agua, luz, internet).',
      type: 'info',
      date: 'Gastos',
      isRead: false,
      targetScreen: 'inicio',
    });
  } else if (currentDay >= 15 && currentDay <= 18) {
    notifications.push({
      id: 'notif-gastos-quincena',
      title: 'Gastos de Mitad de Mes',
      message: 'Revisa tus compromisos de mitad de mes y registra cualquier gasto pendiente en tus cuentas.',
      type: 'info',
      date: 'Gastos',
      isRead: false,
      targetScreen: 'inicio',
    });
  }

  // 3. Notificaciones de ingresos esperados (quincenas y salarios)
  const recentIncomes = transactions.filter(
    (t) => t.type === 'ingreso' && Date.now() - new Date(t.date).getTime() < 10 * 24 * 60 * 60 * 1000
  );

  if (currentDay === 14 || currentDay === 15 || currentDay === 29 || currentDay === 30 || currentDay === 31) {
    if (recentIncomes.length === 0) {
      notifications.push({
        id: 'notif-ingreso-quincena',
        title: 'Recordatorio de Ingreso (Quincena)',
        message: '¿Recibiste tu salario o pago de quincena? Registra el ingreso para actualizar el saldo de tus cuentas.',
        type: 'due',
        date: 'Hoy',
        isRead: false,
        targetScreen: 'ingresos',
      });
    }
  }

  // 4. Notificaciones de cuentas con saldo negativo o bajo
  accounts.forEach((acc) => {
    const bal = calculateAccountBalance(acc, transactions);
    if (bal < 0) {
      notifications.push({
        id: `acc-neg-${acc.id}`,
        title: 'Saldo en Negativo',
        message: `La cuenta "${acc.name}" tiene un saldo de ₡${bal.toLocaleString()}. Verifica tus movimientos.`,
        type: 'warning',
        date: 'Alerta',
        isRead: false,
        targetScreen: 'ingresos',
      });
    }
  });

  return notifications;
}
