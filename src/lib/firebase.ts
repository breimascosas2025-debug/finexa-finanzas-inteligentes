import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  requestGoogleAccessToken,
  getCachedGoogleToken,
  setCachedGoogleToken,
  GOOGLE_SCOPES,
} from '../services/googleAuthService';

const app = initializeApp(firebaseConfig);
export const db = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

// Workspace Calendar & Sheets OAuth Provider
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const googleProvider = new GoogleAuthProvider();
GOOGLE_SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

export const getCachedCalendarToken = (): string | null => getCachedGoogleToken();
export const setCachedCalendarToken = (token: string | null) => {
  setCachedGoogleToken(token);
};

export const signInWithGoogleCalendar = async (): Promise<{ token: string; email?: string | null }> => {
  return requestGoogleAccessToken({ forcePrompt: false });
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

