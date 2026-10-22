import React, { useState, useEffect, useRef } from 'react';
import { FinexaLogo } from './FinexaLogo';
import { UserProfile } from '../types';
import { AvatarSelector } from './AvatarSelector';
import { generateSecureOtpChallenge, verifyOtpChallenge, sendOtpViaEmailJS, OtpChallenge } from '../utils/otpAuth';
import {
  saveOrUpdateAccount,
  findStoredAccount,
  checkManualPassword,
  createPasswordReset,
  verifyPasswordResetToken,
  applyNewPassword,
  sendPasswordResetViaEmailJS,
} from '../utils/authStorage';
import { saveUserProfileToStorage, loadUserProfileFromStorage } from '../utils/userStorage';
import { authenticateWithPasskey, isPasskeySupported } from '../services/webauthnService';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '19131670721-np7pl34gt6k2s1t3ku8g5du710q4vu3q.apps.googleusercontent.com';

function parseJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const jsonPayload = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    try {
      let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) {
        base64 += '=';
      }
      return JSON.parse(atob(base64));
    } catch (e) {
      console.warn('No se pudo decodificar el token de Google:', err);
      return null;
    }
  }
}

type AuthViewMode =
  | 'options'
  | 'manual'
  | 'google_dialog'
  | 'apple_dialog'
  | 'otp_verify'
  | 'forgot_password'
  | 'reset_password_token';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  // Authentication view mode
  const [authMethod, setAuthMethod] = useState<AuthViewMode>('options');
  const [currentProvider, setCurrentProvider] = useState<'google' | 'apple' | 'manual'>('manual');

  // Pending user data for when OTP is verified
  const [pendingUser, setPendingUser] = useState<{
    name: string;
    email: string;
    avatarUrl?: string;
    isGoogleConnected?: boolean;
  } | null>(null);

  // Manual Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userName, setUserName] = useState('');
  const [manualAvatar, setManualAvatar] = useState('💼');

  // Google & Apple Form States
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [googleAvatar, setGoogleAvatar] = useState('🌐');
  const [appleEmail, setAppleEmail] = useState('');
  const [appleName, setAppleName] = useState('');
  const [appleAvatar, setAppleAvatar] = useState('🍎');

  // Auto-completar nombre y avatar si la cuenta ya existía previamente
  const handleManualEmailBlur = () => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    const stored = findStoredAccount(clean);
    const profile = loadUserProfileFromStorage(clean);
    if (stored?.name && !userName) {
      setUserName(stored.name);
    } else if (profile?.name && !userName) {
      setUserName(profile.name);
    }
    if (stored?.avatarUrl && manualAvatar === '💼') {
      setManualAvatar(stored.avatarUrl);
    } else if (profile?.avatarUrl && manualAvatar === '💼') {
      setManualAvatar(profile.avatarUrl);
    }
  };

  const handleGoogleEmailBlur = () => {
    const clean = googleEmail.trim().toLowerCase();
    if (!clean) return;
    const stored = findStoredAccount(clean);
    const profile = loadUserProfileFromStorage(clean);
    if (stored?.name && !googleName) {
      setGoogleName(stored.name);
    } else if (profile?.name && !googleName) {
      setGoogleName(profile.name);
    }
    if (stored?.avatarUrl && googleAvatar === '🌐') {
      setGoogleAvatar(stored.avatarUrl);
    } else if (profile?.avatarUrl && googleAvatar === '🌐') {
      setGoogleAvatar(profile.avatarUrl);
    }
  };

  const handleAppleEmailBlur = () => {
    const clean = appleEmail.trim().toLowerCase();
    if (!clean) return;
    const stored = findStoredAccount(clean);
    const profile = loadUserProfileFromStorage(clean);
    if (stored?.name && !appleName) {
      setAppleName(stored.name);
    } else if (profile?.name && !appleName) {
      setAppleName(profile.name);
    }
    if (stored?.avatarUrl && appleAvatar === '🍎') {
      setAppleAvatar(stored.avatarUrl);
    } else if (profile?.avatarUrl && appleAvatar === '🍎') {
      setAppleAvatar(profile.avatarUrl);
    }
  };

  // OTP Verification States
  const [otpChallenge, setOtpChallenge] = useState<OtpChallenge | null>(null);
  const [otpInput, setOtpInput] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpFeedbackMessage, setOtpFeedbackMessage] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatusMessage, setForgotStatusMessage] = useState<string | null>(null);
  const [forgotErrorMessage, setForgotErrorMessage] = useState<string | null>(null);
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Google GSI States
  const [isGoogleRendered, setIsGoogleRendered] = useState(false);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Comprobar si la URL viene con token de recuperación (desde enlace en Android, iOS o Web)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      const resetEmail = urlParams.get('email');
      const token = urlParams.get('token');

      if (action === 'reset_password' && resetEmail) {
        setForgotEmail(decodeURIComponent(resetEmail));
        if (token) {
          setResetTokenInput(token);
        }
        setAuthMethod('reset_password_token');
      }
    } catch (e) {
      console.warn('Error comprobando parámetros de URL:', e);
    }
  }, []);

  // Función común para disparar desafío OTP y cambiar a pantalla de verificación
  const triggerOtpForUser = async (targetEmail: string, provider: 'google' | 'apple' | 'manual', userData: { name: string; avatarUrl?: string; isGoogleConnected?: boolean }) => {
    setIsSendingOtp(true);
    setOtpError('');
    setCurrentProvider(provider);
    setPendingUser({
      email: targetEmail,
      name: userData.name,
      avatarUrl: userData.avatarUrl,
      isGoogleConnected: userData.isGoogleConnected,
    });

    // Inmediatamente cambiar la vista a verificación OTP
    setAuthMethod('otp_verify');
    setResendCountdown(60);
    setOtpInput(['', '', '', '', '', '']);

    setTimeout(() => {
      otpInputRefs.current[0]?.focus();
    }, 250);

    try {
      const challenge = await generateSecureOtpChallenge(targetEmail);
      setOtpChallenge(challenge);

      const result = await sendOtpViaEmailJS(targetEmail, challenge.plainOtpForPreview || '');
      setOtpFeedbackMessage(result.message);
    } catch (err: any) {
      console.warn('Error generando o enviando OTP:', err);
      setOtpError('Error generando el código de verificación. Inténtalo de nuevo o solicita reenvío.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Inicializar Google Identity Services
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 15;

    const setupGsi = () => {
      attempts++;
      if (typeof window === 'undefined') return;

      const google = (window as any).google;
      if (google?.accounts?.id) {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: any) => {
              if (!response?.credential) {
                setAuthMethod('google_dialog');
                return;
              }
              const payload = parseJwt(response.credential);
              if (payload?.email) {
                // Al iniciar sesión con Google (cuenta nueva o existente), NUNCA pide OTP: acceso directo
                handleGoogleSignInDirect(
                  payload.email,
                  payload.name || payload.given_name || undefined,
                  payload.picture || undefined
                );
              } else {
                setAuthMethod('google_dialog');
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleBtnContainerRef.current) {
            googleBtnContainerRef.current.innerHTML = '';
            google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'filled_black',
              size: 'large',
              type: 'standard',
              shape: 'pill',
              text: 'continue_with',
              logo_alignment: 'left',
              width: 320,
            });
            setIsGoogleRendered(true);
          }
        } catch (e) {
          console.warn('Error inicializando Google Sign-In:', e);
        }
      } else if (attempts < maxAttempts) {
        setTimeout(setupGsi, 300);
      }
    };

    setupGsi();
  }, []);

  // Countdown timer para reenvío de OTP
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  // Manejar envío de OTP para inicio manual
  const handleRequestManualOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setOtpError('Por favor ingresa tu correo y contraseña.');
      return;
    }
    if (password.length < 4) {
      setOtpError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (!userName.trim()) {
      setOtpError('Por favor ingresa tu nombre para saber cómo llamarte.');
      return;
    }

    // Verificar si la contraseña coincide si la cuenta ya existía manualmente
    const passCheck = await checkManualPassword(email, password);
    if (!passCheck.valid) {
      setOtpError(passCheck.reason || 'Contraseña incorrecta.');
      return;
    }

    const cleanName = userName.trim();

    await triggerOtpForUser(email.trim().toLowerCase(), 'manual', {
      name: cleanName,
      avatarUrl: manualAvatar,
    });
  };

  // Manejar inicio con Google DIRECTO (sin código OTP), para cuentas nuevas o existentes
  const handleGoogleSignInDirect = async (
    overrideEmail?: string,
    overrideName?: string,
    overrideAvatar?: string
  ) => {
    const cleanEmail = (overrideEmail || googleEmail).trim().toLowerCase();
    if (!cleanEmail) {
      setOtpError('Por favor ingresa tu correo de Google / Gmail.');
      return;
    }

    const defaultNamePart = cleanEmail.split('@')[0] || 'Usuario Google';
    const cleanName =
      (overrideName || googleName).trim() ||
      defaultNamePart.charAt(0).toUpperCase() + defaultNamePart.slice(1);
    const cleanAvatar = overrideAvatar || googleAvatar || '🌐';

    setOtpError('');

    // Guardar o actualizar cuenta registrada con Google
    saveOrUpdateAccount(
      cleanEmail,
      cleanName,
      'google',
      undefined,
      cleanAvatar
    );

    const userProfile: UserProfile = {
      name: cleanName,
      email: cleanEmail,
      avatarUrl: cleanAvatar,
      isPro: true,
      currency: 'CRC (₡)',
      isGoogleConnected: true,
      authProvider: 'google',
    };

    saveUserProfileToStorage(cleanEmail, userProfile);
    onLoginSuccess(userProfile);
  };

  // Manejar solicitud de OTP para inicio con Apple ID (exige verificación OTP para proteger la cuenta y datos)
  const handleRequestAppleOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = appleEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setOtpError('Por favor ingresa tu correo de Apple ID / iCloud.');
      return;
    }
    if (!appleName.trim()) {
      setOtpError('Por favor ingresa tu nombre para saber cómo llamarte.');
      return;
    }

    setOtpError('');
    await triggerOtpForUser(cleanEmail, 'apple', {
      name: appleName.trim(),
      avatarUrl: appleAvatar,
    });
  };

  // Reenviar código OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || !pendingUser?.email) return;
    setIsSendingOtp(true);
    try {
      const challenge = await generateSecureOtpChallenge(pendingUser.email);
      setOtpChallenge(challenge);
      const result = await sendOtpViaEmailJS(pendingUser.email, challenge.plainOtpForPreview || '');
      setOtpFeedbackMessage(result.message);
      setResendCountdown(60);
      setOtpError('');
    } catch {
      setOtpError('Error reenviando código. Inténtalo de nuevo.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Manejar cambio en inputs individuales de OTP
  const handleOtpDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpInput];
    newOtp[index] = digit;
    setOtpInput(newOtp);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpInput[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtpInput(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  // Validar código OTP de 6 dígitos
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpChallenge || !pendingUser) return;

    const fullCode = otpInput.join('');
    if (fullCode.length !== 6) {
      setOtpError('Por favor ingresa los 6 dígitos del código.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const verification = await verifyOtpChallenge(otpChallenge, fullCode);
      if (!verification.isValid) {
        setOtpError(verification.error || 'Código incorrecto');
        setIsVerifyingOtp(false);
        return;
      }

      // Guardar cuenta en el almacenamiento según el proveedor
      await saveOrUpdateAccount(
        pendingUser.email,
        pendingUser.name,
        currentProvider,
        currentProvider === 'manual' ? password : undefined,
        pendingUser.avatarUrl
      );

      const userProfile: UserProfile = {
        name: pendingUser.name,
        email: pendingUser.email,
        avatarUrl: pendingUser.avatarUrl,
        isPro: true,
        currency: 'CRC (₡)',
        isGoogleConnected: currentProvider === 'google',
        authProvider: currentProvider,
      };

      // Guardar perfil persistente por correo
      saveUserProfileToStorage(pendingUser.email, userProfile);

      // Iniciar sesión exitosamente
      onLoginSuccess(userProfile);
    } catch {
      setOtpError('Error validando el código de seguridad.');
      setIsVerifyingOtp(false);
    }
  };

  // Manejar envío de "¿Olvidaste tu contraseña?"
  const handleSendForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = forgotEmail.trim().toLowerCase();
    if (!cleanMail) {
      setForgotErrorMessage('Ingresa el correo electrónico asociado a tu cuenta.');
      return;
    }

    setIsSendingForgot(true);
    setForgotStatusMessage(null);
    setForgotErrorMessage(null);

    try {
      const resetResult = await createPasswordReset(cleanMail);

      // Si la cuenta solo existe con Google o Apple y no tiene contraseña manual
      if (!resetResult.success && resetResult.isSocialOnly) {
        setForgotErrorMessage(resetResult.message || 'Esta cuenta no tiene contraseña manual.');
        setIsSendingForgot(false);
        return;
      }

      if (resetResult.token && resetResult.resetUrl) {
        await sendPasswordResetViaEmailJS(cleanMail, resetResult.resetUrl, resetResult.token);
        setForgotStatusMessage(
          `Hemos enviado un enlace y un código de recuperación a ${cleanMail}. Revisa tu bandeja de entrada o spam.`
        );
        // Llevar a la pantalla para ingresar nuevo password con el token
        setTimeout(() => {
          setAuthMethod('reset_password_token');
        }, 1500);
      }
    } catch (err) {
      setForgotErrorMessage('Error al procesar la solicitud de recuperación.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  // Aplicar nueva contraseña con el token
  const handleApplyNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotErrorMessage(null);

    const cleanMail = forgotEmail.trim().toLowerCase();
    if (!cleanMail || !resetTokenInput.trim()) {
      setForgotErrorMessage('Ingresa el correo y el código de recuperación.');
      return;
    }

    if (newPassword.length < 4) {
      setForgotErrorMessage('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    const isValidToken = verifyPasswordResetToken(cleanMail, resetTokenInput.trim());
    if (!isValidToken) {
      setForgotErrorMessage('El código de recuperación es inválido o ha expirado.');
      return;
    }

    await applyNewPassword(cleanMail, newPassword);
    setResetSuccessMessage('¡Contraseña actualizada con éxito! Ahora puedes iniciar sesión.');
    setPassword(newPassword);
    setEmail(cleanMail);

    setTimeout(() => {
      setAuthMethod('manual');
      setResetSuccessMessage(null);
      setForgotErrorMessage(null);
    }, 2000);
  };

  // Manejar inicio de sesión con Passkey (WebAuthn)
  const handlePasskeySignIn = async () => {
    setOtpError('');
    try {
      const lastUser = localStorage.getItem('finexa_user');
      let targetEmail = '';
      if (lastUser) {
        try {
          targetEmail = JSON.parse(lastUser).email;
        } catch {}
      }
      if (!targetEmail) {
        const inputMail = prompt('Ingresa tu correo electrónico asociado a la Passkey:');
        if (!inputMail) return;
        targetEmail = inputMail.trim().toLowerCase();
      }

      await authenticateWithPasskey(targetEmail);
      const profile = loadUserProfileFromStorage(targetEmail) || {
        name: targetEmail.split('@')[0],
        email: targetEmail,
        avatarUrl: '💼',
      };
      onLoginSuccess(profile);
    } catch (err: any) {
      console.warn('Error en Passkey sign-in:', err);
      setOtpError(err.message || 'No se pudo autenticar con Passkey en este dispositivo.');
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto min-h-screen flex flex-col bg-[#0f131c] text-[#dfe2ee] px-5 py-8 justify-between select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#10b981]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-64 h-64 bg-[#ee9800]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative z-10 space-y-4 pt-2 text-center flex flex-col items-center">
        <FinexaLogo size="xl" showText={true} />

        <div className="space-y-1 max-w-xs">
          <h2 className="text-xl font-black text-white tracking-tight">
            Tus finanzas bajo tu control
          </h2>
          <p className="text-xs text-[#86948a] leading-relaxed">
            Gestión inteligente en colones (₡). Cuentas, gastos, deudas y seguridad con PIN.
          </p>
        </div>
      </div>

      {/* Main Authentication Body */}
      <div className="relative z-10 my-auto py-4 space-y-4">
        {/* VISTA 1: MENÚ DE INICIOS DE SESIÓN */}
        {authMethod === 'options' && (
          <div className="space-y-3.5">
            <p className="text-xs font-semibold text-center text-[#86948a]">
              Selecciona tu método de inicio de sesión:
            </p>

            {/* 1. Google Sign-In (Exige OTP al correo) */}
            <div className="space-y-2">
              <div className="flex justify-center min-h-[44px] items-center">
                <div
                  ref={googleBtnContainerRef}
                  id="google-signin-btn"
                  className="flex justify-center w-full"
                />
              </div>

              {!isGoogleRendered && (
                <button
                  type="button"
                  disabled={isSendingOtp}
                  onClick={() => {
                    const google = (window as any).google;
                    if (google?.accounts?.id) {
                      try {
                        google.accounts.id.prompt((notification: any) => {
                          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                            setAuthMethod('google_dialog');
                          }
                        });
                      } catch {
                        setAuthMethod('google_dialog');
                      }
                    } else {
                      setAuthMethod('google_dialog');
                    }
                  }}
                  className="w-full py-3 px-4 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xl active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </button>
              )}
            </div>

            {/* 2. Apple Sign-In */}
            <button
              type="button"
              onClick={() => setAuthMethod('apple_dialog')}
              className="w-full py-3 px-4 rounded-full bg-[#1c2230] hover:bg-[#252c3e] border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-md active:scale-95 transition-all"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12-14.44-6.1-9.35-10.9-20.27-14.42-32.74-3.52-12.48-5.28-24.3-5.28-35.48 0-14.68 3.73-26.78 11.19-36.3 7.45-9.52 16.7-14.37 27.76-14.56 5.56 0 11.28 1.48 17.16 4.44 5.88 2.96 9.87 4.51 11.97 4.65 1.57-.14 5.76-1.74 12.57-4.79 6.81-3.05 12.59-4.41 17.33-4.08 13.06.84 23.36 5.6 30.9 14.28-11.45 6.94-17.06 16.5-16.82 28.69.24 9.54 3.86 17.51 10.86 23.91 7 6.4 15.29 10.02 24.87 10.86-2.12 6.54-4.66 12.92-7.63 19.14zM119.22 33.15c0-7.39 2.68-14.39 8.04-21.01 5.36-6.62 12.16-10.96 20.4-13.02.24 1.13.36 2.22.36 3.27 0 7.39-2.73 14.38-8.19 20.97-5.46 6.59-12.33 10.86-20.61 12.82-.24-1.03-.36-2.04-.36-3.03z" />
              </svg>
              <span>Continuar con Apple</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-[#3c4a42]/40" />
              <span className="text-[10px] uppercase font-bold text-[#86948a] tracking-wider">
                o inicio manual
              </span>
              <div className="flex-1 h-px bg-[#3c4a42]/40" />
            </div>

            {/* 3. Botón para abrir inicio manual */}
            <button
              type="button"
              onClick={() => {
                setAuthMethod('manual');
                setOtpError('');
              }}
              className="w-full py-3 px-4 rounded-2xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-lg shadow-[#10b981]/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              <span>Iniciar sesión manual (Correo y Contraseña)</span>
            </button>

            {/* 4. Botón Iniciar con Passkey (WebAuthn) */}
            {isPasskeySupported() && (
              <button
                type="button"
                onClick={handlePasskeySignIn}
                className="w-full py-3 px-4 rounded-2xl bg-[#1d232e] hover:bg-[#252c3a] text-white font-bold text-xs border border-[#10b981]/40 flex items-center justify-center gap-2 active:scale-95 transition-all shadow"
              >
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">fingerprint</span>
                <span>Iniciar con Passkey (Huella / Rostro / PIN)</span>
              </button>
            )}
          </div>
        )}

        {/* VISTA 2: FORMULARIO MANUAL (Correo + Contraseña + ¿Olvidaste tu contraseña?) */}
        {authMethod === 'manual' && (
          <form onSubmit={handleRequestManualOtp} className="space-y-3.5 bg-[#181c24] p-4 rounded-3xl border border-[#3c4a42]/50 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod('options')}
                  className="w-7 h-7 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
                <h3 className="text-xs font-bold text-white">Inicio Manual con Verificación OTP</h3>
              </div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981]">
                Paso 1 de 2
              </span>
            </div>

            <p className="text-[11px] text-[#86948a] leading-relaxed">
              Ingresa tus credenciales. Por seguridad, te enviaremos un código OTP a tu correo para validar tu inicio de sesión.
            </p>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleManualEmailBlur}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#86948a]">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-[#10b981] font-semibold"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />

              {/* Botón de ¿Olvidaste tu contraseña? solicitado explícitamente */}
              <div className="flex justify-end pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotErrorMessage(null);
                    setForgotStatusMessage(null);
                    setAuthMethod('forgot_password');
                  }}
                  className="text-[11px] font-semibold text-[#ffc978] hover:text-[#ee9800] hover:underline flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                  <span>¿Olvidaste tu contraseña?</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                ¿Cómo te llamaremos? <span className="text-[#10b981]">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. David, Carlos, María..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1.5">
                Foto o Icono de Perfil
              </label>
              <AvatarSelector
                selectedAvatar={manualAvatar}
                onSelectAvatar={setManualAvatar}
                compact
              />
            </div>

            {otpError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{otpError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingOtp || !email.trim() || !password}
              className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isSendingOtp ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Generando y enviando OTP...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  <span>Enviar Código de Verificación OTP</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* VISTA 2.5: DIÁLOGO DE INICIO CON GOOGLE (DIRECTO SIN OTP) */}
        {authMethod === 'google_dialog' && (
          <div className="bg-[#181c24] p-4 rounded-3xl border border-[#3c4a42]/50 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod('options')}
                  className="w-7 h-7 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
                <h3 className="text-xs font-bold text-white">Inicio con Google</h3>
              </div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#4285F4]/20 text-[#4285F4]">
                Sin OTP
              </span>
            </div>

            <div className="text-center py-2 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-white flex items-center justify-center text-white shadow-md">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-white">Ingresa tu cuenta de Google / Gmail</p>
              <p className="text-[11px] text-[#86948a]">Acceso directo e instantáneo con Google sin código OTP.</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Correo de Google / Gmail <span className="text-[#10b981]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="tu.cuenta@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                onBlur={handleGoogleEmailBlur}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#4285F4]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                ¿Cómo te llamaremos? <span className="text-[#10b981]">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Breitan, Carlos, María..."
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#4285F4]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1.5">
                Foto o Icono de Perfil
              </label>
              <AvatarSelector
                selectedAvatar={googleAvatar}
                onSelectAvatar={setGoogleAvatar}
                compact
              />
            </div>

            {otpError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{otpError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleGoogleSignInDirect()}
              disabled={!googleEmail.trim()}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Iniciar Sesión con Google</span>
            </button>
          </div>
        )}

        {/* VISTA 3: DIÁLOGO DE INICIO CON APPLE (EXIGE OTP PARA PROTEGER DATOS) */}
        {authMethod === 'apple_dialog' && (
          <form onSubmit={handleRequestAppleOtp} className="bg-[#181c24] p-4 rounded-3xl border border-[#3c4a42]/50 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod('options')}
                  className="w-7 h-7 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
                <h3 className="text-xs font-bold text-white">Inicio con Apple ID</h3>
              </div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981]">
                Con Verificación OTP
              </span>
            </div>

            <div className="text-center py-2 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-black border border-slate-700 flex items-center justify-center text-white shadow-md">
                <svg className="w-6 h-6 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.74 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12-14.44-6.1-9.35-10.9-20.27-14.42-32.74-3.52-12.48-5.28-24.3-5.28-35.48 0-14.68 3.73-26.78 11.19-36.3 7.45-9.52 16.7-14.37 27.76-14.56 5.56 0 11.28 1.48 17.16 4.44 5.88 2.96 9.87 4.51 11.97 4.65 1.57-.14 5.76-1.74 12.57-4.79 6.81-3.05 12.59-4.41 17.33-4.08 13.06.84 23.36 5.6 30.9 14.28-11.45 6.94-17.06 16.5-16.82 28.69.24 9.54 3.86 17.51 10.86 23.91 7 6.4 15.29 10.02 24.87 10.86-2.12 6.54-4.66 12.92-7.63 19.14zM119.22 33.15c0-7.39 2.68-14.39 8.04-21.01 5.36-6.62 12.16-10.96 20.4-13.02.24 1.13.36 2.22.36 3.27 0 7.39-2.73 14.38-8.19 20.97-5.46 6.59-12.33 10.86-20.61 12.82-.24-1.03-.36-2.04-.36-3.03z" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-white">Ingresa tu cuenta de Apple ID</p>
              <p className="text-[11px] text-[#86948a]">
                Para proteger tus datos y evitar accesos no autorizados, te enviaremos un código OTP de seguridad.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Correo de Apple ID / iCloud <span className="text-[#10b981]">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="ejemplo@icloud.com"
                value={appleEmail}
                onChange={(e) => setAppleEmail(e.target.value)}
                onBlur={handleAppleEmailBlur}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                ¿Cómo te llamaremos? <span className="text-[#10b981]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Alex, Sofía, Roberto..."
                value={appleName}
                onChange={(e) => setAppleName(e.target.value)}
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1.5">
                Foto o Icono de Perfil
              </label>
              <AvatarSelector
                selectedAvatar={appleAvatar}
                onSelectAvatar={setAppleAvatar}
                compact
              />
            </div>

            {otpError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{otpError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingOtp || !appleEmail.trim()}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-200 text-slate-900 font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSendingOtp ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Enviando código OTP...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">key</span>
                  <span>Enviar Código de Verificación OTP</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* VISTA 4: VERIFICACIÓN DE CÓDIGO OTP (Para Google, Apple y Manual) */}
        {authMethod === 'otp_verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 bg-[#181c24] p-4 rounded-3xl border border-[#3c4a42]/50 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod(currentProvider === 'manual' ? 'manual' : 'options')}
                  className="w-7 h-7 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
                <h3 className="text-xs font-bold text-white">Código de Verificación OTP</h3>
              </div>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981]">
                {currentProvider === 'google' ? 'Google' : currentProvider === 'apple' ? 'Apple' : 'Manual'}
              </span>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-[#86948a]">
                Hemos enviado un código OTP a:
              </p>
              <p className="text-xs font-bold text-[#10b981]">{pendingUser?.email}</p>
            </div>

            {/* Aviso seguro: El código OTP solo se envía al correo y NUNCA se muestra en pantalla */}
            <div className="p-3.5 rounded-2xl bg-[#003824]/30 border border-[#10b981]/30 text-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-center gap-2 font-bold text-[#4edea3]">
                <span className="material-symbols-outlined text-[18px]">mark_email_read</span>
                <span>Código enviado a tu correo</span>
              </div>
              <p className="text-[11px] text-[#86948a] text-center leading-relaxed">
                Por seguridad, el código de 6 dígitos se envió a <span className="font-semibold text-white">{pendingUser?.email}</span>.
              </p>
              <div className="text-[10px] text-[#86948a] bg-[#0f131c]/60 p-2 rounded-xl flex items-center gap-1.5 justify-center">
                <span className="material-symbols-outlined text-[15px] text-[#ffc978]">info</span>
                <span>Si no lo ves en unos segundos, revisa tu carpeta de <strong>Spam</strong>.</span>
              </div>
            </div>

            {/* Casillas de 6 Dígitos OTP */}
            <div className="flex items-center justify-center gap-2 py-2" onPaste={handleOtpPaste}>
              {otpInput.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-11 h-12 text-center text-lg font-black bg-[#0f131c] border-2 border-[#3c4a42] rounded-xl text-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]"
                />
              ))}
            </div>

            {otpError && (
              <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs text-center">
                {otpError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingOtp || otpInput.join('').length !== 6}
              className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isVerifyingOtp ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Verificando código...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Confirmar e Iniciar Sesión</span>
                </>
              )}
            </button>

            {/* Reenvío de código */}
            <div className="text-center pt-1">
              {resendCountdown > 0 ? (
                <span className="text-[11px] text-[#86948a]">
                  Reenviar código en <strong className="text-white">{resendCountdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSendingOtp}
                  className="text-xs font-bold text-[#10b981] hover:underline"
                >
                  ¿No recibiste el código? Reenviar ahora
                </button>
              )}
            </div>
          </form>
        )}

        {/* VISTA 5: ¿OLVIDASTE TU CONTRASEÑA? (Solicitar enlace / código de restablecimiento) */}
        {authMethod === 'forgot_password' && (
          <form onSubmit={handleSendForgotPassword} className="space-y-3.5 bg-[#181c24] p-4 rounded-3xl border border-[#3c4a42]/50 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod('manual')}
                  className="w-7 h-7 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
                <h3 className="text-xs font-bold text-white">Recuperar Contraseña</h3>
              </div>
            </div>

            <p className="text-[11px] text-[#86948a] leading-relaxed">
              Ingresa el correo con el que registraste tu contraseña manual. Te enviaremos un enlace y un código seguro para que puedas cambiarla tanto en Android como en iOS o Web.
            </p>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            {forgotErrorMessage && (
              <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-400">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Aviso de Seguridad</span>
                </div>
                <p className="text-[11px] leading-relaxed">{forgotErrorMessage}</p>
              </div>
            )}

            {forgotStatusMessage && (
              <div className="p-3 rounded-2xl bg-[#003824]/60 border border-[#10b981]/40 text-emerald-200 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#10b981]">mark_email_read</span>
                <span className="text-[11px]">{forgotStatusMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSendingForgot || !forgotEmail.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-lg active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isSendingForgot ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Enviando enlace de restablecimiento...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">forward_to_inbox</span>
                  <span>Enviar Correo de Recuperación</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setAuthMethod('reset_password_token')}
                className="text-[11px] font-semibold text-[#86948a] hover:text-white underline"
              >
                ¿Ya tienes un código de recuperación? Haz clic aquí
              </button>
            </div>
          </form>
        )}

        {/* VISTA 6: RESTABLECER CONTRASEÑA CON TOKEN / ENLACE */}
        {authMethod === 'reset_password_token' && (
          <form onSubmit={handleApplyNewPassword} className="space-y-3.5 bg-[#181c24] p-4 rounded-3xl border border-[#3c4a42]/50 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#3c4a42]/40 pb-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAuthMethod('manual')}
                  className="w-7 h-7 rounded-full bg-[#262a33] text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </button>
                <h3 className="text-xs font-bold text-white">Nueva Contraseña</h3>
              </div>
            </div>

            <p className="text-[11px] text-[#86948a] leading-relaxed">
              Ingresa el código que te enviamos por correo y define tu nueva contraseña.
            </p>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Código de Recuperación (6 dígitos)
              </label>
              <input
                type="text"
                placeholder="Ej. 123456"
                value={resetTokenInput}
                onChange={(e) => setResetTokenInput(e.target.value)}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-[#86948a]">
                  Nueva Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-[10px] text-[#10b981] font-semibold"
                >
                  {showNewPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Mínimo 4 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#86948a] block mb-1">
                Confirmar Nueva Contraseña
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Repite la contraseña"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full bg-[#0f131c] border border-[#3c4a42]/70 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[#86948a] focus:outline-none focus:border-[#10b981]"
              />
            </div>

            {forgotErrorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{forgotErrorMessage}</span>
              </div>
            )}

            {resetSuccessMessage && (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-extrabold text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>Guardar Nueva Contraseña</span>
            </button>
          </form>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-[10px] text-[#86948a] space-y-0.5 pt-2">
        <p>Finexa • Finanzas Inteligentes</p>
        <p>Moneda Oficial: Colones de Costa Rica (CRC ₡)</p>
      </div>
    </div>
  );
};
