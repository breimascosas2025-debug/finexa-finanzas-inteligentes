import { AppNotification } from '../types';

/**
 * Utilidades para disparar notificaciones del sistema en el dispositivo (Web Notifications API)
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendSystemNotification('Finexa - Notificaciones Activas', {
        body: 'Te avisaremos cuando sea momento de pagar deudas, gastos o registrar ingresos.',
      });
    }
    return permission;
  } catch (err) {
    console.warn('Error solicitando permisos de notificación:', err);
    return 'default';
  }
}

export function sendSystemNotification(title: string, options?: NotificationOptions): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notification = new Notification(title, {
      icon: '/icon.svg',
      badge: '/icon.svg',
      ...options,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch (err) {
    console.warn('Error disparando notificación:', err);
    return false;
  }
}

/**
 * Dispara notificaciones del sistema para deudas pendientes, gastos e ingresos
 * si el permiso está concedido, evitando repeticiones en la misma sesión.
 */
export function triggerFinancialAlerts(notifications: AppNotification[]): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const sessionKey = 'finexa_sent_alerts';
  let sentAlerts: string[] = [];
  try {
    sentAlerts = JSON.parse(sessionStorage.getItem(sessionKey) || '[]');
  } catch {
    sentAlerts = [];
  }

  // Filtrar notificaciones importantes que no se hayan enviado aún en esta sesión
  const highPriority = notifications.filter(
    (n) => (n.type === 'due' || n.type === 'warning') && !sentAlerts.includes(n.id)
  );

  highPriority.slice(0, 2).forEach((n) => {
    sendSystemNotification(`Finexa: ${n.title}`, {
      body: n.message,
      tag: n.id,
    });
    sentAlerts.push(n.id);
  });

  try {
    sessionStorage.setItem(sessionKey, JSON.stringify(sentAlerts));
  } catch {
    // Ignorar si sessionStorage está lleno
  }
}
