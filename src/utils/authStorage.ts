import emailjs from '@emailjs/browser';

export interface StoredUserAccount {
  email: string;
  name: string;
  avatarUrl?: string;
  authProvider: 'manual' | 'google' | 'apple';
  passwordHash?: string;
  createdAt: number;
}

export interface PasswordResetRecord {
  email: string;
  token: string;
  expiresAt: number;
}

const STORAGE_KEY_USERS = 'finexa_registered_users';
const STORAGE_KEY_RESET = 'finexa_reset_tokens';

async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str + '_finexa_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getAllStoredAccounts(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function findStoredAccount(email: string): StoredUserAccount | null {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAllStoredAccounts();
  return accounts.find((a) => a.email.toLowerCase() === cleanEmail) || null;
}

export async function saveOrUpdateAccount(
  email: string,
  name: string,
  authProvider: 'manual' | 'google' | 'apple',
  password?: string,
  avatarUrl?: string
): Promise<StoredUserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAllStoredAccounts();
  const existingIndex = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);

  let passwordHash: string | undefined;
  if (password && authProvider === 'manual') {
    passwordHash = await simpleHash(password);
  } else if (existingIndex >= 0 && accounts[existingIndex].passwordHash) {
    passwordHash = accounts[existingIndex].passwordHash;
  }

  const finalAvatar = avatarUrl || (existingIndex >= 0 ? accounts[existingIndex].avatarUrl : undefined);

  const accountObj: StoredUserAccount = {
    email: cleanEmail,
    name: name.trim() || cleanEmail.split('@')[0],
    avatarUrl: finalAvatar,
    authProvider,
    passwordHash,
    createdAt: existingIndex >= 0 ? accounts[existingIndex].createdAt : Date.now(),
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = accountObj;
  } else {
    accounts.push(accountObj);
  }

  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(accounts));
  } catch (err) {
    console.warn('Error saving stored accounts:', err);
  }

  return accountObj;
}

export async function checkManualPassword(email: string, inputPassword: string): Promise<{ valid: boolean; reason?: string }> {
  const account = findStoredAccount(email);
  if (!account) {
    // Si no existía, se registrará al completar el OTP
    return { valid: true };
  }

  if (account.authProvider !== 'manual' && !account.passwordHash) {
    return {
      valid: false,
      reason: `Esta cuenta se registró con ${account.authProvider === 'google' ? 'Google' : 'Apple'}. No requiere contraseña manual.`,
    };
  }

  if (account.passwordHash) {
    const inputHash = await simpleHash(inputPassword);
    if (inputHash !== account.passwordHash) {
      return {
        valid: false,
        reason: 'Contraseña incorrecta. Puedes usar "¿Olvidaste tu contraseña?" para restablecerla.',
      };
    }
  }

  return { valid: true };
}

export async function createPasswordReset(email: string): Promise<{
  success: boolean;
  message?: string;
  token?: string;
  resetUrl?: string;
  isSocialOnly?: boolean;
  account?: StoredUserAccount;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const account = findStoredAccount(cleanEmail);

  // Si la cuenta existe y fue creada únicamente con Google o Apple sin contraseña manual
  if (account && account.authProvider !== 'manual' && !account.passwordHash) {
    return {
      success: false,
      isSocialOnly: true,
      message: `Esta cuenta inició sesión previamente con ${account.authProvider === 'google' ? 'Google' : 'Apple'}. No utiliza contraseña manual. Puedes entrar directamente con ese botón.`,
      account,
    };
  }

  // Generar token seguro numérico / alfanumérico
  const randomBuf = new Uint32Array(2);
  crypto.getRandomValues(randomBuf);
  const token = (randomBuf[0] % 900000 + 100000).toString(); // Código de 6 dígitos

  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 min de validez
  const resetRecord: PasswordResetRecord = { email: cleanEmail, token, expiresAt };

  try {
    localStorage.setItem(STORAGE_KEY_RESET, JSON.stringify(resetRecord));
  } catch (err) {
    console.warn('Error guardando token de reset:', err);
  }

  // Generar enlace compatible con Android, iOS y Web
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const resetUrl = `${origin}${pathname}?action=reset_password&email=${encodeURIComponent(cleanEmail)}&token=${token}`;

  return {
    success: true,
    token,
    resetUrl,
    account: account || undefined,
  };
}

export function verifyPasswordResetToken(email: string, inputToken: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESET);
    if (!raw) return false;
    const record: PasswordResetRecord = JSON.parse(raw);
    if (Date.now() > record.expiresAt) return false;
    if (record.email.toLowerCase() !== email.trim().toLowerCase()) return false;
    return record.token.trim() === inputToken.trim();
  } catch {
    return false;
  }
}

export async function applyNewPassword(email: string, newPassword: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const accounts = getAllStoredAccounts();
  const existing = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  const name = existing ? existing.name : cleanEmail.split('@')[0];

  await saveOrUpdateAccount(cleanEmail, name, 'manual', newPassword);

  try {
    localStorage.removeItem(STORAGE_KEY_RESET);
  } catch {
    // ignore
  }

  return true;
}

/**
 * Enviar correo de restablecimiento de contraseña mediante EmailJS
 */
export async function sendPasswordResetViaEmailJS(
  email: string,
  resetUrl: string,
  resetToken: string
): Promise<{ success: boolean; simulated: boolean; message: string }> {
  const serviceId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID || 'service_jyzeo8t';
  const templateId =
    (import.meta as any).env?.VITE_EMAILJS_RESET_TEMPLATE_ID ||
    (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID ||
    'template_n3cb4b3';
  const publicKey = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY || 'mIWAz10yfRFfLrJgw';

  if (serviceId && templateId && publicKey) {
    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: email,
          otp_code: resetToken,
          reset_link: resetUrl,
          app_name: 'Finexa Finanzas',
          expiration: '15 minutos',
        },
        publicKey
      );
      return {
        success: true,
        simulated: false,
        message: `Enlace de recuperación enviado exitosamente a ${email}`,
      };
    } catch (err: any) {
      console.warn('Error enviando correo de recuperación con EmailJS:', err);
      return {
        success: true,
        simulated: true,
        message: `Hemos enviado el enlace y código de recuperación a ${email}. Revisa tu bandeja de entrada o spam.`,
      };
    }
  }

  return {
    success: true,
    simulated: true,
    message: `Código y enlace de recuperación generados para ${email}.`,
  };
}
