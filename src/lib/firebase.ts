import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

// Workspace Calendar OAuth Provider
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope(CALENDAR_SCOPE);
googleProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// In-memory access token cache (NEVER stored in localStorage or sessionStorage per security guidelines)
let cachedCalendarAccessToken: string | null = null;

export const getCachedCalendarToken = (): string | null => cachedCalendarAccessToken;
export const setCachedCalendarToken = (token: string | null) => {
  cachedCalendarAccessToken = token;
};

export const signInWithGoogleCalendar = async (): Promise<{ token: string; email?: string | null }> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error('No se pudo obtener el token de acceso de Google Calendar.');
    }
    cachedCalendarAccessToken = token;
    return { token, email: result.user.email };
  } catch (err) {
    console.error('Error al autenticar con Google Calendar:', err);
    throw err;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Sanitiza un correo para ser usado de forma segura como ID de documento en Firestore
 * cumpliendo con la regla regex: ^[a-zA-Z0-9_\-]+$
 */
export function getUserDocKey(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 100);
}

