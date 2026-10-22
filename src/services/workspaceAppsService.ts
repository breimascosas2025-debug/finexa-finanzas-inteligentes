import { Account, Transaction, DebtItem, BudgetConfig, SavingsGoal } from '../types';
import { calculateAccountBalance } from '../utils/finance';

export interface GoogleSheetsConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  spreadsheetId?: string;
  mode: 'create_new' | 'existing_sheet';
  autoSyncEnabled?: boolean;
}

export const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export function getStoredSheetsConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem('finexa_google_sheets_config');
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    clientId: 'gen-lang-client-0349977218.apps.googleusercontent.com',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    scopes: SHEETS_SCOPES,
    mode: 'create_new',
    autoSyncEnabled: false,
  };
}

export function saveStoredSheetsConfig(config: Partial<GoogleSheetsConfig>) {
  const current = getStoredSheetsConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('finexa_google_sheets_config', JSON.stringify(updated));
  return updated;
}

const REQUIRED_SHEET_TITLES = [
  'Reporte Ejecutivo',
  'Gastos',
  'Ingresos',
  'Deudas y Pagos',
  'Cuentas y Saldos',
  'Presupuestos',
  'Categorías de Gastos',
  'Historial de Transacciones',
];

/**
 * Asegura que una hoja existente contenga las pestañas requeridas
 */
async function ensureSheetsExist(accessToken: string, spreadsheetId: string) {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return;

    const metadata = await res.json();
    const existingTitles = new Set(
      (metadata.sheets || []).map((s: any) => s.properties?.title)
    );

    const missingTitles = REQUIRED_SHEET_TITLES.filter((title) => !existingTitles.has(title));
    if (missingTitles.length === 0) return;

    const requests = missingTitles.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { rowCount: 500, columnCount: 15 },
        },
      },
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  } catch (err) {
    console.warn('Advertencia al verificar pestañas existentes:', err);
  }
}

/**
 * Exporta y sincroniza la estructura contable completa hacia Google Sheets:
 * - Ingresos y Gastos
 * - Deudas y Pagos pendientes (con amortizaciones)
 * - Cuentas y Saldos calculados
 * - Presupuestos y Regla 50/30/20
 * - Desglose por Categorías
 * - Historial completo de Transacciones
 * - Fórmulas automáticas de suma, diferencia y porcentajes
 */
export async function exportToGoogleSheetsFull(
  accessToken: string,
  accounts: Account[],
  transactions: Transaction[],
  debts: DebtItem[],
  options: {
    mode: 'create_new' | 'existing_sheet';
    existingSpreadsheetId?: string;
    budgetConfig?: BudgetConfig;
    savingsGoals?: SavingsGoal[];
  }
): Promise<{ spreadsheetUrl: string; message: string; spreadsheetId: string }> {
  try {
    let targetSpreadsheetId = options.existingSpreadsheetId?.trim();
    let targetSpreadsheetUrl = '';

    // 1. Crear nueva hoja de cálculo si es modo 'create_new' o no hay ID existente
    if (options.mode === 'create_new' || !targetSpreadsheetId) {
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            title: `Finexa Plus - Finanzas Inteligentes (${new Date().toLocaleDateString('es-CR')})`,
          },
          sheets: REQUIRED_SHEET_TITLES.map((title) => ({
            properties: {
              title,
              gridProperties: { rowCount: 500, columnCount: 12 },
            },
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error al crear hoja de cálculo (${response.status})`);
      }

      const sheetData = await response.json();
      targetSpreadsheetId = sheetData.spreadsheetId;
      targetSpreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`;
    } else {
      targetSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`;
      await ensureSheetsExist(accessToken, targetSpreadsheetId);
    }

    // 2. Formatear datos y fórmulas para cada pestaña
    const expenses = transactions.filter((t) => t.type === 'gasto');
    const incomes = transactions.filter((t) => t.type === 'ingreso');

    // Resumen Ejecutivo con fórmulas
    const summaryRows = [
      ['FINEXA PLUS - REPORTE EJECUTIVO CONSOLIDADO', '', ''],
      ['Fecha de Sincronización', new Date().toLocaleString('es-CR'), ''],
      ['', '', ''],
      ['INDICADOR FINANCIERO', 'MONTO ESTIMADO', 'FÓRMULA / MONEDA'],
      ['Total Ingresos Registrados', '=SUM(Ingresos!E2:E500)', 'CRC (₡)'],
      ['Total Gastos Registrados', '=SUM(Gastos!E2:E500)', 'CRC (₡)'],
      ['Balance Operativo Neto', '=B5-B6', 'CRC (₡)'],
      ['Pasivos Totales (Deudas)', "=SUM('Deudas y Pagos'!D2:D200)", 'CRC (₡)'],
      ['Saldo Pendiente de Deudas', "=SUM('Deudas y Pagos'!F2:F200)", 'CRC (₡)'],
      ['Cuentas Activas', "=COUNTA('Cuentas y Saldos'!A2:A50)", 'Cuentas'],
      ['Total Movimientos Registrados', "=COUNTA('Historial de Transacciones'!A2:A1000)", 'Movimientos'],
    ];

    // Gastos con fórmula de total al pie
    const expenseRows: any[][] = [
      ['ID Transacción', 'Fecha y Hora', 'Concepto', 'Categoría', 'Monto (₡)', 'Cuenta / Origen', 'Nota'],
      ...expenses.map((e) => [
        e.id,
        e.date,
        e.title,
        e.category,
        e.amount,
        accounts.find((a) => a.id === e.accountId)?.name || e.customOrigin || 'General',
        e.note || '',
      ]),
    ];
    if (expenses.length > 0) {
      expenseRows.push([
        'TOTAL GASTOS',
        '',
        '',
        '',
        `=SUM(E2:E${expenses.length + 1})`,
        '',
        'Calculado automáticamente',
      ]);
    }

    // Ingresos con fórmula de total al pie
    const incomeRows: any[][] = [
      ['ID Transacción', 'Fecha y Hora', 'Origen / Concepto', 'Categoría', 'Monto (₡)', 'Cuenta de Depósito', 'Nota'],
      ...incomes.map((i) => [
        i.id,
        i.date,
        i.title,
        i.category,
        i.amount,
        accounts.find((a) => a.id === i.accountId)?.name || i.customOrigin || 'General',
        i.note || '',
      ]),
    ];
    if (incomes.length > 0) {
      incomeRows.push([
        'TOTAL INGRESOS',
        '',
        '',
        '',
        `=SUM(E2:E${incomes.length + 1})`,
        '',
        'Calculado automáticamente',
      ]);
    }

    // Deudas y Pagos con fórmulas de saldo restante y estado
    const debtRows: any[][] = [
      ['ID Deuda', 'Concepto', 'Acreedor / Entidad', 'Monto Total (₡)', 'Total Abonado (₡)', 'Saldo Pendiente (₡)', 'Fecha Límite', 'Estado'],
      ...debts.map((d, idx) => {
        const rowNum = idx + 2;
        const paidAmount = transactions
          .filter((t) => t.type === 'pago_deuda' && t.debtId === d.id)
          .reduce((sum, t) => sum + t.amount, 0);

        return [
          d.id,
          d.name,
          d.creditorOrNote || 'Personal',
          d.totalAmount,
          paidAmount,
          `=D${rowNum}-E${rowNum}`,
          d.dueDate || 'Sin fecha',
          d.isPaid ? 'PAGADO' : `=IF(F${rowNum}<=0,"PAGADO","PENDIENTE")`,
        ];
      }),
    ];

    // Cuentas y Saldos (calculados consistentemente a partir de transacciones)
    const accountRows: any[][] = [
      ['ID Cuenta', 'Nombre de Cuenta', 'Tipo', 'Moneda', 'Símbolo', 'Saldo Inicial', 'Saldo Actual Calculado'],
      ...accounts.map((a) => {
        const currentBalance = calculateAccountBalance(a, transactions);
        return [
          a.id,
          a.name,
          a.type,
          a.currency || 'CRC',
          a.currencySymbol || '₡',
          a.initialBalance || 0,
          currentBalance,
        ];
      }),
    ];

    // Presupuestos
    const budget = options.budgetConfig;
    const budgetCategories = ['Comida', 'Transporte', 'Servicios', 'Personal', 'Deudas', 'Otros'];
    const budgetRows: any[][] = [
      ['Categoría', 'Límite Presupuestado (₡)', 'Gasto Real Actual (₡)', 'Diferencia / Disponible (₡)', '% Utilizado'],
    ];
    budgetCategories.forEach((cat, idx) => {
      const rowNum = idx + 2;
      const limit = budget?.categoryLimits?.[cat] || 0;
      const spent = expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0);
      budgetRows.push([
        cat,
        limit,
        spent,
        `=B${rowNum}-C${rowNum}`,
        `=IF(B${rowNum}>0, C${rowNum}/B${rowNum}, 0)`,
      ]);
    });

    // Categorías de Gastos
    const categoryTotals: Record<string, { count: number; total: number }> = {};
    expenses.forEach((e) => {
      const cat = e.category || 'Otros';
      if (!categoryTotals[cat]) categoryTotals[cat] = { count: 0, total: 0 };
      categoryTotals[cat].count += 1;
      categoryTotals[cat].total += e.amount;
    });

    const categoryRows: any[][] = [
      ['Categoría', 'Gasto Total (₡)', 'Cantidad de Transacciones', '% del Total Gastado'],
      ...Object.entries(categoryTotals).map(([cat, data], idx) => {
        const rowNum = idx + 2;
        return [
          cat,
          data.total,
          data.count,
          `=IF(SUM(B$2:B$50)>0, B${rowNum}/SUM(B$2:B$50), 0)`,
        ];
      }),
    ];

    // Historial Completo de Transacciones
    const historyRows: any[][] = [
      ['ID', 'Fecha', 'Tipo', 'Categoría', 'Concepto / Título', 'Monto', 'Moneda', 'Cuenta Origen', 'Cuenta Destino', 'Nota'],
      ...transactions.map((t) => [
        t.id,
        t.date,
        t.type,
        t.category,
        t.title,
        t.amount,
        t.currency || 'CRC',
        accounts.find((a) => a.id === t.accountId)?.name || t.customOrigin || '',
        accounts.find((a) => a.id === t.toAccountId)?.name || '',
        t.note || '',
      ]),
    ];

    // 3. Escribir datos mediante batchUpdate de values en la API de Google Sheets
    const updatePayload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        { range: "'Reporte Ejecutivo'!A1", values: summaryRows },
        { range: "'Gastos'!A1", values: expenseRows },
        { range: "'Ingresos'!A1", values: incomeRows },
        { range: "'Deudas y Pagos'!A1", values: debtRows },
        { range: "'Cuentas y Saldos'!A1", values: accountRows },
        { range: "'Presupuestos'!A1", values: budgetRows },
        { range: "'Categorías de Gastos'!A1", values: categoryRows },
        { range: "'Historial de Transacciones'!A1", values: historyRows },
      ],
    };

    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!batchRes.ok) {
      const err = await batchRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Error al escribir en Google Sheets (${batchRes.status})`);
    }

    return {
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: targetSpreadsheetUrl,
      message: '¡Estructura financiera completa y fórmulas exportadas con éxito en Google Sheets!',
    };
  } catch (error: any) {
    console.error('Error en exportToGoogleSheetsFull:', error);
    throw error;
  }
}
