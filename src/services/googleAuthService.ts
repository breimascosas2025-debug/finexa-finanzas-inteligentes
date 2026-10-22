/**
 * Google Auth Service Unificado para Finexa Plus
 * 
 * Gestiona la autenticación OAuth 2.0 para:
 * - Google Calendar (Recordatorios de deudas y pagos)
 * - Google Sheets (Exportación y sincronización contable)
 * - Google Drive (Creación de hojas financieras)
 * 
 * Soporta Google Identity Services (GIS - Token Client) con fallback automático
 * a Firebase GoogleAuthProvider para máxima compatibilidad en Web, PWA y Móviles.
 */

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

export const PRIMARY_GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '19131670721-np7pl34gt6k2s1t3ku8g5du710q4vu3q.apps.googleusercontent.com';

const TOKEN_KEY = 'finexa_google_oauth_token';
const TOKEN_TIME_KEY = 'finexa_google_oauth_time';
const TOKEN_EMAIL_KEY = 'finexa_google_oauth_email';

// Token en memoria para la sesión activa
let inMemoryToken: string | null = null;
let inMemoryEmail: string | null = null;

/**
 * Obtiene el token de Google en caché si aún no ha expirado (50 min de validez)
 */
export function getCachedGoogleToken(): string | null {
  if (inMemoryToken) return inMemoryToken;

  try {
    const stored = sessionStorage.getItem(TOKEN_KEY);
    const storedTime = sessionStorage.getItem(TOKEN_TIME_KEY);
    if (stored && storedTime) {
      const elapsedMs = Date.now() - parseInt(storedTime, 10);
      // Los tokens de Google expiran en 60 minutos; usamos 50 minutos como margen seguro
      if (elapsedMs < 50 * 60 * 1000) {
        inMemoryToken = stored;
        inMemoryEmail = sessionStorage.getItem(TOKEN_EMAIL_KEY);
        return stored;
      }
    }
  } catch {}

  return null;
}

/**
 * Guarda el token de acceso en memoria y sessionStorage
 */
export function setCachedGoogleToken(token: string | null, email?: string | null): void {
  inMemoryToken = token;
  inMemoryEmail = email || null;

  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
      if (email) sessionStorage.setItem(TOKEN_EMAIL_KEY, email);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_TIME_KEY);
      sessionStorage.removeItem(TOKEN_EMAIL_KEY);
    }
  } catch {}
}

export function getCachedGoogleEmail(): string | null {
  if (inMemoryEmail) return inMemoryEmail;
  try {
    return sessionStorage.getItem(TOKEN_EMAIL_KEY);
  } catch {
    return null;
  }
}

/**
 * Solicita un token OAuth 2.0 con permisos para Google Calendar y Google Sheets.
 * Intenta primero Google Identity Services (GIS TokenClient) y si falla o no está disponible,
 * usa Firebase Auth GoogleAuthProvider con todos los scopes.
 */
export async function requestGoogleAccessToken(options?: {
  forcePrompt?: boolean;
}): Promise<{ token: string; email?: string | null }> {
  // 1. Si ya tenemos un token activo y no se exige forzar login, retornarlo
  if (!options?.forcePrompt) {
    const existing = getCachedGoogleToken();
    if (existing) {
      return { token: existing, email: getCachedGoogleEmail() };
    }
  }

  // 2. Intentar mediante Google Identity Services (GIS Token Client)
  const gisAvailable = typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2;
  if (gisAvailable) {
    try {
      const gisResult = await new Promise<{ token: string }>((resolve, reject) => {
        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: PRIMARY_GOOGLE_CLIENT_ID,
            scope: GOOGLE_SCOPES.join(' '),
            callback: (response: any) => {
              if (response && response.access_token) {
                resolve({ token: response.access_token });
              } else if (response && response.error) {
                reject(new Error(response.error_description || response.error || 'Acceso denegado por Google.'));
              } else {
                reject(new Error('No se recibió token de acceso de Google.'));
              }
            },
            error_callback: (err: any) => {
              reject(new Error(err?.message || 'Ventana de autorización de Google cerrada.'));
            },
          });

          client.requestAccessToken({ prompt: options?.forcePrompt ? 'consent' : '' });
        } catch (e) {
          reject(e);
        }
      });

      if (gisResult?.token) {
        setCachedGoogleToken(gisResult.token);
        return { token: gisResult.token, email: getCachedGoogleEmail() };
      }
    } catch (gisError: any) {
      console.warn('[GoogleAuth] Falló GIS Token Client, intentando fallback con Firebase:', gisError);
    }
  }

  // 3. Fallback con Firebase GoogleAuthProvider
  try {
    const googleProvider = new GoogleAuthProvider();
    GOOGLE_SCOPES.forEach((scope) => googleProvider.addScope(scope));
    googleProvider.setCustomParameters({
      prompt: options?.forcePrompt ? 'consent' : 'select_account',
      access_type: 'offline',
    });

    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google no devolvió un token de acceso válido.');
    }

    const email = result.user?.email || null;
    setCachedGoogleToken(token, email);
    return { token, email };
  } catch (firebaseErr: any) {
    console.error('[GoogleAuth] Error en autorización con Firebase:', firebaseErr);
    const msg =
      firebaseErr?.code === 'auth/popup-blocked'
        ? 'El navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes para Finexa.'
        : firebaseErr?.code === 'auth/popup-closed-by-user'
        ? 'Autorización cancelada por el usuario.'
        : firebaseErr?.message || 'Error al conectar con Google.';
    throw new Error(msg);
  }
}

/**
 * Revoca y desconecta la sesión de Google
 */
export async function disconnectGoogleSession(): Promise<void> {
  const token = getCachedGoogleToken();
  setCachedGoogleToken(null);

  if (token) {
    try {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2?.revoke) {
        (window as any).google.accounts.oauth2.revoke(token, () => {});
      } else {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      }
    } catch {}
  }
}
