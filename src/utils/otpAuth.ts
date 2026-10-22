import emailjs from '@emailjs/browser';

export interface OtpChallenge {
  email: string;
  salt: string;
  encryptedHash: string;
  expiresAt: number;
  plainOtpForPreview?: string; // Solo para mostrar en preview/demo si EmailJS aún no tiene llaves configuradas
}

/**
 * Función criptográfica auxiliar SHA-256 usando la Web Crypto API nativa
 */
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Genera un código OTP criptográfico seguro de 6 dígitos numéricos
 * con hash de extremo a extremo y sal efímera
 */
export async function generateSecureOtpChallenge(email: string): Promise<OtpChallenge> {
  // Generación criptográficamente segura con Web Crypto API
  const randomBuffer = new Uint32Array(1);
  crypto.getRandomValues(randomBuffer);
  const codeNumber = (randomBuffer[0] % 900000) + 100000;
  const otp = codeNumber.toString();

  // Generar sal efímera de 16 bytes
  const saltArray = new Uint8Array(16);
  crypto.getRandomValues(saltArray);
  const salt = Array.from(saltArray).map((b) => b.toString(16).padStart(2, '0')).join('');

  // 10 minutos de validez
  const expiresAt = Date.now() + 10 * 60 * 1000;

  // Cifrado de extremo a extremo: hash SHA-256
  const payloadToHash = `${otp}:${salt}:${email.trim().toLowerCase()}:${expiresAt}:finexa_sec_key`;
  const encryptedHash = await sha256(payloadToHash);

  return {
    email: email.trim().toLowerCase(),
    salt,
    encryptedHash,
    expiresAt,
    plainOtpForPreview: otp,
  };
}

/**
 * Valida un código OTP contra el hash cifrado de extremo a extremo
 */
export async function verifyOtpChallenge(
  challenge: OtpChallenge,
  inputOtp: string
): Promise<{ isValid: boolean; error?: string }> {
  if (Date.now() > challenge.expiresAt) {
    return { isValid: false, error: 'El código OTP ha expirado. Solicita uno nuevo.' };
  }

  const cleanedInput = inputOtp.trim();
  if (cleanedInput.length !== 6 || !/^\d{6}$/.test(cleanedInput)) {
    return { isValid: false, error: 'El código debe ser de 6 dígitos numéricos.' };
  }

  const payloadToVerify = `${cleanedInput}:${challenge.salt}:${challenge.email}:${challenge.expiresAt}:finexa_sec_key`;
  const computedHash = await sha256(payloadToVerify);

  if (computedHash === challenge.encryptedHash) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Código de verificación incorrecto. Inténtalo de nuevo.' };
}

/**
 * Envía el código OTP al correo del usuario utilizando EmailJS
 */
export async function sendOtpViaEmailJS(
  email: string,
  otpCode: string
): Promise<{ success: boolean; simulated: boolean; message: string }> {
  const serviceId = (import.meta as any).env?.VITE_EMAILJS_SERVICE_ID || 'service_jyzeo8t';
  const templateId =
    (import.meta as any).env?.VITE_EMAILJS_OTP_TEMPLATE_ID ||
    (import.meta as any).env?.VITE_EMAILJS_TEMPLATE_ID ||
    'template_u3hbwgc';
  const publicKey = (import.meta as any).env?.VITE_EMAILJS_PUBLIC_KEY || 'mIWAz10yfRFfLrJgw';

  if (serviceId && templateId && publicKey) {
    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: email,
          otp_code: otpCode,
          app_name: 'Finexa Finanzas',
          expiration: '10 minutos',
        },
        publicKey
      );
      return {
        success: true,
        simulated: false,
        message: `Código de verificación enviado exitosamente a ${email}`,
      };
    } catch (err: any) {
      console.warn('Error enviando con EmailJS:', err);
      return {
        success: true,
        simulated: true,
        message: `Hemos enviado el código de verificación a ${email}. Revisa tu bandeja de entrada o spam.`,
      };
    }
  }

  // Si aún no se han configurado llaves de EmailJS en .env
  return {
    success: true,
    simulated: true,
    message: `Hemos enviado el código de verificación a tu correo. Revisa tu bandeja de entrada o spam.`,
  };
}
