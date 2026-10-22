import { Account, Transaction, DebtItem } from '../types';

export interface GoogleSheetsConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  spreadsheetId?: string;
  mode: 'create_new' | 'existing_sheet';
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
  };
}

export function saveStoredSheetsConfig(config: Partial<GoogleSheetsConfig>) {
  const current = getStoredSheetsConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('finexa_google_sheets_config', JSON.stringify(updated));
}

/**
 * Exporta y sincroniza la estructura completa financiera de Finexa hacia Google Sheets:
 * - Gastos
 * - Ingresos
 * - Deudas
 * - Pagos y Amortizaciones
 * - Movimientos Consolidados
 * - Resumen y Reporte Ejecutivo
 */
export async function exportToGoogleSheetsFull(
  accessToken: string,
  accounts: Account[],
  transactions: Transaction[],
  debts: DebtItem[],
  options: {
    mode: 'create_new' | 'existing_sheet';
    existingSpreadsheetId?: string;
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
            title: `Finexa Finanzas - Reporte Consolidado (${new Date().toLocaleDateString('es-CR')})`,
          },
          sheets: [
            { properties: { title: 'Reporte Ejecutivo', gridProperties: { rowCount: 50, columnCount: 10 } } },
            { properties: { title: 'Gastos', gridProperties: { rowCount: 500, columnCount: 10 } } },
            { properties: { title: 'Ingresos', gridProperties: { rowCount: 500, columnCount: 10 } } },
            { properties: { title: 'Deudas y Pagos', gridProperties: { rowCount: 200, columnCount: 10 } } },
            { properties: { title: 'Cuentas y Fuentes', gridProperties: { rowCount: 50, columnCount: 10 } } },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error al crear hoja de cálculo en Google Sheets (${response.status})`);
      }

      const sheetData = await response.json();
      targetSpreadsheetId = sheetData.spreadsheetId;
      targetSpreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`;
    } else {
      targetSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${targetSpreadsheetId}/edit`;
    }

    // 2. Formatear datos para cada pestaña
    const expenses = transactions.filter((t) => t.type === 'gasto');
    const incomes = transactions.filter((t) => t.type === 'ingreso');
    const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
    const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
    const totalDebtsAmount = debts.reduce((acc, d) => acc + (d.totalAmount || 0), 0);

    // Resumen Ejecutivo
    const summaryRows = [
      ['FINEXA FINANZAS - REPORTE CONSOLIDADO EN LÍNEA', '', ''],
      ['Fecha de Sincronización', new Date().toLocaleString('es-CR'), ''],
      ['', '', ''],
      ['MÉTRICA FINANCIERA', 'VALOR ESTIMADO', 'MONEDA'],
      ['Total Ingresos Acumulados', totalIncome, 'CRC (₡)'],
      ['Total Gastos Registrados', totalExpenses, 'CRC (₡)'],
      ['Balance Operativo Neto', totalIncome - totalExpenses, 'CRC (₡)'],
      ['Pasivos Totales (Deudas Registradas)', totalDebtsAmount, 'CRC (₡)'],
      ['Cuentas y Fuentes Activas', accounts.length, 'Cuentas'],
      ['Transacciones Totales', transactions.length, 'Movimientos'],
    ];

    // Gastos
    const expenseRows = [
      ['ID Transacción', 'Fecha y Hora', 'Comercio / Título', 'Categoría', 'Monto (₡)', 'Cuenta de Débito', 'Nota'],
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

    // Ingresos
    const incomeRows = [
      ['ID Transacción', 'Fecha y Hora', 'Origen / Empleador', 'Categoría', 'Monto (₡)', 'Cuenta de Depósito', 'Nota'],
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

    // Deudas y Pagos
    const debtRows = [
      ['ID Deuda', 'Nombre / Concepto', 'Acreedor / Entidad', 'Monto Total (₡)', 'Fecha de Vencimiento', 'Notas'],
      ...debts.map((d) => [
        d.id,
        d.name,
        d.creditorOrNote || 'Acreedor privado',
        d.totalAmount,
        d.dueDate || 'Sin fecha fija',
        '',
      ]),
    ];

    // Cuentas
    const accountRows = [
      ['ID Cuenta', 'Nombre de Cuenta', 'Tipo', 'Moneda', 'Símbolo', 'Saldo Inicial'],
      ...accounts.map((a) => [
        a.id,
        a.name,
        a.type,
        a.currency,
        a.currencySymbol,
        a.initialBalance,
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
        { range: "'Cuentas y Fuentes'!A1", values: accountRows },
      ],
    };

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetSpreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    return {
      spreadsheetId: targetSpreadsheetId,
      spreadsheetUrl: targetSpreadsheetUrl,
      message: '¡Estructura financiera completa sincronizada con éxito en Google Sheets!',
    };
  } catch (error: any) {
    console.error('Error en exportToGoogleSheetsFull:', error);
    throw error;
  }
}
