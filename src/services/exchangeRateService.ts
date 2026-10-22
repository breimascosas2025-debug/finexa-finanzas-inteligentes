/**
 * Servicio de monitoreo del tipo de cambio del Dólar (USD / CRC)
 * Conexión en vivo con el Banco Central de Costa Rica (BCCR) vía API oficial de Hacienda
 * y cálculo referencial para bancos nacionales (BAC, BNCR, BCR).
 */

export interface DollarRateData {
  compra: number;
  venta: number;
  fecha: string;
  source: string;
  lastUpdated: string;
  isOnline: boolean;
}

export interface BankRate {
  name: string;
  shortName: string;
  compra: number;
  venta: number;
  spread: number;
  color: string;
  tag?: 'best_buy' | 'best_sell' | 'official';
}

const STORAGE_KEY = 'finexa_cached_dollar_rate';

// Fallback por defecto en caso de no tener internet
const DEFAULT_FALLBACK: DollarRateData = {
  compra: 445.27,
  venta: 450.00,
  fecha: new Date().toISOString().slice(0, 10),
  source: 'BCCR (Referencial)',
  lastUpdated: new Date().toISOString(),
  isOnline: false,
};

/**
 * Obtiene la tasa de compra y venta del dólar en vivo
 */
export async function fetchLiveDollarRate(): Promise<DollarRateData> {
  // 1. Intentar API oficial de Hacienda (BCCR)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const res = await fetch('https://api.hacienda.go.cr/indicadores/tc/dolar', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.compra?.valor && data?.venta?.valor) {
        const rate: DollarRateData = {
          compra: Number(data.compra.valor),
          venta: Number(data.venta.valor),
          fecha: data.venta.fecha || data.compra.fecha || new Date().toISOString().slice(0, 10),
          source: 'BCCR / Ministerio de Hacienda',
          lastUpdated: new Date().toISOString(),
          isOnline: true,
        };
        // Guardar en cache local para acceso offline
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(rate));
        } catch {
          // Ignore storage quota
        }
        return rate;
      }
    }
  } catch (err) {
    console.warn('[DollarService] No se pudo conectar a la API en vivo, usando cache o fallback:', err);
  }

  // 2. Intentar leer del cache previo
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed: DollarRateData = JSON.parse(cached);
      return {
        ...parsed,
        isOnline: false,
      };
    }
  } catch {
    // Ignore cache parse error
  }

  // 3. Fallback seguro
  return DEFAULT_FALLBACK;
}

/**
 * Calcula las tasas estimadas en los principales bancos comerciales de Costa Rica
 * tomando como base la tasa del BCCR
 */
export function calculateBankRates(baseRate: DollarRateData): BankRate[] {
  const bccrCompra = baseRate.compra;
  const bccrVenta = baseRate.venta;

  const banks: BankRate[] = [
    {
      name: 'Banco Central (BCCR)',
      shortName: 'BCCR',
      compra: bccrCompra,
      venta: bccrVenta,
      spread: Number((bccrVenta - bccrCompra).toFixed(2)),
      color: '#10b981',
      tag: 'official',
    },
    {
      name: 'Banco de Costa Rica',
      shortName: 'BCR',
      compra: Number((bccrCompra - 0.50).toFixed(2)),
      venta: Number((bccrVenta + 0.80).toFixed(2)),
      spread: Number(((bccrVenta + 0.80) - (bccrCompra - 0.50)).toFixed(2)),
      color: '#3b82f6',
      tag: 'best_sell', // BCR suele tener excelente tasa de venta en ventanilla
    },
    {
      name: 'Banco Nacional (BNCR)',
      shortName: 'BNCR',
      compra: Number((bccrCompra - 0.80).toFixed(2)),
      venta: Number((bccrVenta + 1.10).toFixed(2)),
      spread: Number(((bccrVenta + 1.10) - (bccrCompra - 0.80)).toFixed(2)),
      color: '#eab308',
    },
    {
      name: 'BAC Credomatic',
      shortName: 'BAC',
      compra: Number((bccrCompra - 1.50).toFixed(2)),
      venta: Number((bccrVenta + 1.50).toFixed(2)),
      spread: Number(((bccrVenta + 1.50) - (bccrCompra - 1.50)).toFixed(2)),
      color: '#ef4444',
    },
    {
      name: 'Ventanilla / Casas de Cambio',
      shortName: 'Casas de Cambio',
      compra: Number((bccrCompra - 0.20).toFixed(2)),
      venta: Number((bccrVenta + 0.50).toFixed(2)),
      spread: Number(((bccrVenta + 0.50) - (bccrCompra - 0.20)).toFixed(2)),
      color: '#8b5cf6',
      tag: 'best_buy',
    },
  ];

  return banks;
}
