import { DebtItem, SubscriptionItem } from '../types';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  start: {
    date?: string; // YYYY-MM-DD for all-day events
    dateTime?: string; // ISO string
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'popup' | 'email';
      minutes: number;
    }>;
  };
  colorId?: string; // '11' red (debt), '10' green (deposit), '9' blueberry (subscriptions)
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  timeZone?: string;
  backgroundColor?: string;
}

export interface GoogleCalendarOAuthConfig {
  clientId: string;
  clientSecret?: string;
  apiKey?: string;
  redirectUri: string;
  scopes: string[];
}

export const DEFAULT_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

export function getStoredCalendarConfig(): GoogleCalendarOAuthConfig {
  try {
    const raw = localStorage.getItem('finexa_google_calendar_oauth_config');
    if (raw) return JSON.parse(raw);
  } catch {}

  return {
    clientId: 'gen-lang-client-0349977218.apps.googleusercontent.com',
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    scopes: DEFAULT_CALENDAR_SCOPES,
  };
}

export function saveStoredCalendarConfig(config: Partial<GoogleCalendarOAuthConfig>) {
  const current = getStoredCalendarConfig();
  const updated = { ...current, ...config };
  localStorage.setItem('finexa_google_calendar_oauth_config', JSON.stringify(updated));
}

/**
 * Consulta la lista de calendarios del usuario mediante la API oficial de Google Calendar
 */
export async function fetchGoogleCalendars(accessToken: string): Promise<GoogleCalendarItem[]> {
  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Error al consultar calendarios (${res.status})`);
    }

    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary,
      description: item.description,
      primary: item.primary,
      timeZone: item.timeZone,
      backgroundColor: item.backgroundColor,
    }));
  } catch (error: any) {
    console.error('Error en fetchGoogleCalendars:', error);
    throw error;
  }
}

/**
 * Agrega un evento a Google Calendar utilizando la API REST v3 oficial con OAuth token
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEventPayload,
  calendarId: string = 'primary'
): Promise<{ id: string; htmlLink?: string }> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Error de Google Calendar (${response.status})`);
    }

    const data = await response.json();
    return { id: data.id, htmlLink: data.htmlLink };
  } catch (error: any) {
    console.error('Error al crear evento en Google Calendar:', error);
    throw error;
  }
}

/**
 * Actualiza un evento existente en Google Calendar
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEventPayload>,
  calendarId: string = 'primary'
): Promise<{ id: string; htmlLink?: string }> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Error al actualizar evento (${response.status})`);
    }

    const data = await response.json();
    return { id: data.id, htmlLink: data.htmlLink };
  } catch (error: any) {
    console.error('Error al actualizar evento en Google Calendar:', error);
    throw error;
  }
}

/**
 * Elimina un evento de Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    return false;
  }
}

/**
 * Revoca el token de acceso OAuth con los servidores de Google
 */
export async function revokeGoogleCalendarToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Prepara y sincroniza un recordatorio de Pago de Deuda en Google Calendar
 * Soporta actualización si ya existe un ID para evitar duplicados,
 * y programa recordatorios (2 días antes, 1 día antes y el mismo día).
 */
export async function syncDebtReminderToGoogle(
  accessToken: string,
  debt: DebtItem,
  options?: { reminderDays?: number }
): Promise<{ id: string; htmlLink?: string }> {
  const amount = debt.totalAmount || 0;
  const formattedAmount = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(amount);

  const dueDate = debt.dueDate || new Date().toISOString().split('T')[0];
  const reminderDays = options?.reminderDays ?? debt.reminderDaysBefore ?? 2;
  const advanceMinutes = Math.max(1, reminderDays) * 24 * 60; // 2 días = 2880 min

  const isPaid = Boolean(debt.isPaid);

  const eventPayload: CalendarEventPayload = {
    summary: isPaid
      ? `✅ [PAGADO] Finexa Plus: ${debt.name} (${formattedAmount})`
      : `Finexa Plus: recuerda que debes pagar ${formattedAmount} (${debt.name})`,
    description: `Recordatorio automático de Finexa Plus:\n- Pago: ${debt.name}\n- Monto: ${formattedAmount}\n- Fecha límite: ${dueDate}\n- Detalle / Acreedor: ${debt.creditorOrNote || 'Personal'}\n- Estado: ${isPaid ? 'PAGADO' : 'PENDIENTE'}\n\n${
      isPaid
        ? 'Esta deuda fue pagada en Finexa Plus. No requiere más acciones.'
        : 'Finexa Plus: hoy vence el pago de tu deuda. Recuerda marcarla como pagada en la aplicación.'
    }`,
    start: {
      date: dueDate,
    },
    end: {
      date: dueDate,
    },
    colorId: isPaid ? '10' : '11', // Verde si ya se pagó, Rojo si está pendiente
    reminders: isPaid
      ? { useDefault: false, overrides: [] }
      : {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: advanceMinutes }, // Dos días antes (configurable)
            { method: 'popup', minutes: 24 * 60 },        // Un día antes
            { method: 'popup', minutes: 60 * 9 },         // El mismo día a las 9am
          ],
        },
  };

  // Si ya existía un evento registrado, actualizarlo para evitar duplicados
  if (debt.calendarEventId) {
    try {
      const updated = await updateGoogleCalendarEvent(accessToken, debt.calendarEventId, eventPayload);
      return updated;
    } catch (e) {
      console.warn('No se pudo actualizar evento existente en Google Calendar, creando nuevo...', e);
    }
  }

  return createGoogleCalendarEvent(accessToken, eventPayload);
}

/**
 * Elimina o desactiva los recordatorios en Google Calendar cuando una deuda es marcada como pagada
 */
export async function cancelDebtReminderFromGoogle(
  accessToken: string,
  debt: DebtItem
): Promise<boolean> {
  if (!debt.calendarEventId) return true;
  try {
    return await deleteGoogleCalendarEvent(accessToken, debt.calendarEventId);
  } catch (err) {
    console.warn('Error cancelando evento de Google Calendar:', err);
    return false;
  }
}

/**
 * Prepara y sincroniza un recordatorio de Suscripción o Pago Fijo Recurrente en Google Calendar
 */
export async function syncSubscriptionReminderToGoogle(
  accessToken: string,
  sub: SubscriptionItem
): Promise<{ id: string; htmlLink?: string }> {
  const formattedAmount = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: sub.currency === 'USD' ? 'USD' : 'CRC',
    maximumFractionDigits: 0,
  }).format(sub.amount);

  const now = new Date();
  const day = Math.min(Math.max(sub.billingDay || 1, 1), 28);
  let targetDate = new Date(now.getFullYear(), now.getMonth(), day);
  if (targetDate < now) {
    targetDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  const dateStr = targetDate.toISOString().split('T')[0];

  const eventPayload: CalendarEventPayload = {
    summary: `🔄 Cobro Recurrente: ${sub.name} (${formattedAmount})`,
    description: `Servicio recurrente en Finexa Plus:\n- Servicio: ${sub.name}\n- Categoría: ${sub.category}\n- Monto: ${formattedAmount}\n- Ciclo: ${sub.billingCycle}\n- Día de cobro: día ${sub.billingDay}\n\nRegistrado automáticamente desde Finexa Plus.`,
    start: {
      date: dateStr,
    },
    end: {
      date: dateStr,
    },
    recurrence: ['RRULE:FREQ=MONTHLY'],
    colorId: '9', // Morado para suscripciones
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: (sub.reminderDaysBefore || 2) * 24 * 60 },
        { method: 'popup', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 * 9 },
      ],
    },
  };

  if (sub.calendarEventId) {
    try {
      return await updateGoogleCalendarEvent(accessToken, sub.calendarEventId, eventPayload);
    } catch {
      // Fallback a crear nuevo si no se encuentra
    }
  }

  return createGoogleCalendarEvent(accessToken, eventPayload);
}

/**
 * Genera un archivo estándar iCalendar (.ics)
 */
export function generateIcsCalendar(events: Array<{
  id: string;
  title: string;
  amount?: number;
  date: string;
  notes?: string;
  type: 'deuda' | 'suscripcion' | 'deposito';
  recurrenceMonthly?: boolean;
}>): string {
  const cleanDate = (d: string) => d.replace(/-/g, '');

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Finexa//Finanzas Inteligentes CR//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Finexa - Recordatorios de Pagos y Depósitos',
    'X-WR-TIMEZONE:America/Costa_Rica',
  ];

  events.forEach((ev) => {
    const dt = cleanDate(ev.date);
    const uid = `${ev.id}-${dt}@finexa.app`;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:${uid}`);
    ics.push(`DTSTAMP:${stamp}`);
    ics.push(`DTSTART;VALUE=DATE:${dt}`);
    ics.push(`DTEND;VALUE=DATE:${dt}`);
    ics.push(`SUMMARY:${ev.title}`);
    ics.push(`DESCRIPTION:${(ev.notes || `Recordatorio creado desde Finexa para ${ev.type}`).replace(/\n/g, '\\n')}`);
    ics.push('STATUS:CONFIRMED');

    if (ev.recurrenceMonthly) {
      ics.push('RRULE:FREQ=MONTHLY');
    }

    ics.push('BEGIN:VALARM');
    ics.push('TRIGGER:-P1D');
    ics.push('ACTION:DISPLAY');
    ics.push(`DESCRIPTION:Recordatorio de pago Finexa: ${ev.title}`);
    ics.push('END:VALARM');

    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

export function downloadUniversalIcs(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Prepara y sincroniza un recordatorio de Depósito / Ingreso programado en Google Calendar
 */
export async function syncDepositReminderToGoogle(
  accessToken: string,
  deposit: { title: string; amount: number; date: string; notes?: string }
): Promise<{ id: string; htmlLink?: string }> {
  const formattedAmount = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(deposit.amount);

  const eventPayload: CalendarEventPayload = {
    summary: `💰 Depósito / Ingreso Esperado: ${deposit.title} (${formattedAmount})`,
    description: `Ingreso planificado en Finexa:\n- Título: ${deposit.title}\n- Monto proyectado: ${formattedAmount}\n- Fecha de acreditación: ${deposit.date}\n- Notas: ${deposit.notes || 'Acreditar en cuenta bancaria'}\n\nRegistra el depósito en tu saldo de Finexa.`,
    start: {
      date: deposit.date,
    },
    end: {
      date: deposit.date,
    },
    colorId: '10', // Verde para ingresos/depósitos
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 * 9 }, // 9am del día
      ],
    },
  };

  return createGoogleCalendarEvent(accessToken, eventPayload);
}

/**
 * Abre la interfaz web de Google Calendar con el evento pre-cargado (vía URL universal)
 */
export function openGoogleCalendarWebEvent(event: {
  title: string;
  date: string;
  notes?: string;
}) {
  const dt = event.date.replace(/-/g, '');
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', event.title);
  url.searchParams.set('dates', `${dt}/${dt}`);
  url.searchParams.set('details', event.notes || 'Recordatorio programado desde Finexa Finanzas');
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

/**
 * Genera enlace de WhatsApp para compartir el recordatorio de pago a uno mismo o a la pareja
 */
export function openWhatsAppPaymentReminder(title: string, amount: number, date: string, notes?: string) {
  const formattedAmount = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  }).format(amount);

  const text = `🔔 *Recordatorio de Pago (Finexa)*\n\n📌 *Concepto:* ${title}\n💰 *Monto:* ${formattedAmount}\n📅 *Fecha límite:* ${date}\n${notes ? `📝 *Detalle:* ${notes}\n` : ''}\n_Registrado en Finexa Finanzas_`;
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
