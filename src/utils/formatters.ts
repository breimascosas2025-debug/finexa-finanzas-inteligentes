import { CurrencyOption } from '../types';

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'CRC', name: 'Colones (CRC)', symbol: '₡', flag: '🇨🇷' },
  { code: 'USD', name: 'Dólares (USD)', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euros (EUR)', symbol: '€', flag: '🇪🇺' },
  { code: 'MXN', name: 'Pesos Mexicanos (MXN)', symbol: '$', flag: '🇲🇽' },
  { code: 'COP', name: 'Pesos Colombianos (COP)', symbol: '$', flag: '🇨🇴' },
  { code: 'GBP', name: 'Libras Esterlinas (GBP)', symbol: '£', flag: '🇬🇧' },
];

export function getCurrencySymbol(code?: string): string {
  if (!code) return '₡';
  const found = SUPPORTED_CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
  return found ? found.symbol : '$';
}

export function formatCurrency(
  amount: number,
  currencyCode = 'CRC',
  symbolOverride?: string,
  includeDecimals?: boolean
): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const symbol = symbolOverride || getCurrencySymbol(currencyCode);

  // Default decimals: USD, EUR, MXN, GBP show 2 decimals if not specified; CRC/COP show 0 decimals
  const withDecimals =
    includeDecimals !== undefined
      ? includeDecimals
      : currencyCode === 'USD' || currencyCode === 'EUR' || currencyCode === 'GBP';

  const parts = abs.toFixed(withDecimals ? 2 : 0).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currencyCode === 'CRC' ? '.' : ',');

  const sign = isNegative ? '-' : '';
  if (withDecimals) {
    const decimalPart = parts[1];
    const decSep = currencyCode === 'CRC' ? ',' : '.';
    return `${sign}${symbol}${integerPart}${decSep}${decimalPart}`;
  }
  return `${sign}${symbol}${integerPart}`;
}

export function formatCRC(amount: number, includeDecimals = false): string {
  return formatCurrency(amount, 'CRC', '₡', includeDecimals);
}

export function formatCompactCRC(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1000000) {
    return `₡${(amount / 1000000).toFixed(1).replace('.0', '')}M`;
  }
  if (abs >= 1000) {
    return `₡${(amount / 1000).toFixed(0)}k`;
  }
  return `₡${amount}`;
}

