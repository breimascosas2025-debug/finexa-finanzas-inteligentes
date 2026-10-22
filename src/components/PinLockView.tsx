import React, { useState } from 'react';
import { PinexaIcon } from './PinexaLogo';
import { SecurityConfig, UserProfile } from '../types';

interface PinLockViewProps {
  user: UserProfile;
  security: SecurityConfig;
  onUnlockSuccess: () => void;
  onResetPinRequired: () => void;
}

export const PinLockView: React.FC<PinLockViewProps> = ({
  user,
  security,
  onUnlockSuccess,
  onResetPinRequired,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [recoveryAnswerInput, setRecoveryAnswerInput] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const nextPin = enteredPin + num;
      setEnteredPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        // Validate PIN
        if (nextPin === security.pin) {
          setTimeout(() => {
            onUnlockSuccess();
          }, 150);
        } else {
          setTimeout(() => {
            setIsShaking(true);
            setErrorMsg('PIN incorrecto. Inténtalo de nuevo.');
            setTimeout(() => {
              setEnteredPin('');
              setIsShaking(false);
            }, 600);
          }, 200);
        }
      }
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const handleClear = () => {
    setEnteredPin('');
    setErrorMsg('');
  };

  const handleVerifySecurityQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUserAnswer = recoveryAnswerInput.trim().toLowerCase();
    const cleanSavedAnswer = security.securityAnswer.trim().toLowerCase();

    if (cleanSavedAnswer && cleanUserAnswer === cleanSavedAnswer) {
      setRecoverySuccess(true);
      setRecoveryError('');
      setTimeout(() => {
        setIsRecoveryOpen(false);
        onResetPinRequired();
      }, 1200);
    } else {
      setRecoveryError('La respuesta de seguridad no coincide. Intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#0f131c] text-[#dfe2ee] px-6 py-10 select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#10b981]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Brand */}
      <div className="relative z-10 flex flex-col items-center space-y-3 pt-6">
        <PinexaIcon size={52} className="shadow-xl shadow-[#10b981]/25" />
        <div className="text-center space-y-1">
          <span className="text-[10px] font-bold tracking-[0.2em] text-[#86948a] uppercase">
            Finexa Seguridad
          </span>
          <h2 className="text-xl font-bold text-white">
            App Bloqueada
          </h2>
          <p className="text-xs text-[#86948a]">
            Hola, <span className="text-[#10b981] font-semibold">{user.name.split(' ')[0]}</span>. Ingresa tu PIN de 4 dígitos.
          </p>
        </div>
      </div>

      {/* PIN Dots Indicator */}
      <div className="relative z-10 flex flex-col items-center space-y-4 my-auto">
        <div
          className={`flex items-center gap-5 transition-transform ${
            isShaking ? 'animate-bounce text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < enteredPin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-[#10b981] scale-125 shadow-lg shadow-[#10b981]/50'
                    : 'bg-[#262a33] border border-[#3c4a42]'
                }`}
              />
            );
          })}
        </div>

        {errorMsg ? (
          <p className="text-xs text-rose-400 font-medium animate-in fade-in">
            {errorMsg}
          </p>
        ) : (
          <p className="text-[11px] text-[#86948a]">
            Cifrado biométrico y PIN activo
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="relative z-10 w-full max-w-xs space-y-3 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-16 rounded-2xl bg-[#181c24] hover:bg-[#262a33] active:bg-[#10b981]/20 active:scale-95 text-xl font-bold text-white border border-[#3c4a42]/30 transition-all flex items-center justify-center shadow-md"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 rounded-2xl bg-[#181c24]/50 hover:bg-[#262a33] active:scale-95 text-xs font-semibold text-[#86948a] border border-[#3c4a42]/20 transition-all flex items-center justify-center"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-[#181c24] hover:bg-[#262a33] active:bg-[#10b981]/20 active:scale-95 text-xl font-bold text-white border border-[#3c4a42]/30 transition-all flex items-center justify-center shadow-md"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-[#181c24]/50 hover:bg-[#262a33] active:scale-95 text-[#86948a] hover:text-white border border-[#3c4a42]/20 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[24px]">backspace</span>
          </button>
        </div>

        {/* Biometrics & Recovery options */}
        <div className="flex items-center justify-between pt-2 px-2">
          {security.biometricsEnabled ? (
            <button
              type="button"
              onClick={onUnlockSuccess}
              className="flex items-center gap-1.5 text-xs text-[#10b981] font-semibold hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">fingerprint</span>
              <span>Usar Face ID / Huella</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => setIsRecoveryOpen(true)}
            className="text-xs text-[#ffb95f] font-semibold hover:underline"
          >
            ¿Olvidaste tu PIN?
          </button>
        </div>
      </div>

      {/* Security Question Recovery Modal */}
      {isRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#181c24] border border-[#3c4a42] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb95f] text-[22px]">
                  security
                </span>
                <h3 className="font-bold text-sm text-white">
                  Recuperación de Acceso
                </h3>
              </div>
              <button
                onClick={() => setIsRecoveryOpen(false)}
                className="text-[#86948a] hover:text-white p-1"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-[#86948a] leading-relaxed">
              Para recuperar el acceso a tu cuenta Pinexa, responde tu pregunta de seguridad previamente configurada:
            </p>

            <form onSubmit={handleVerifySecurityQuestion} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-[#262a33] border border-[#3c4a42]/40 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#10b981]">
                  Pregunta de Seguridad
                </span>
                <p className="text-xs font-semibold text-white">
                  {security.securityQuestion || '¿Cuál es el nombre de tu primera mascota?'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#86948a]">
                  Tu respuesta
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={recoveryAnswerInput}
                  onChange={(e) => setRecoveryAnswerInput(e.target.value)}
                  placeholder="Escribe tu respuesta secreta..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f131c] border border-[#3c4a42] text-sm text-white focus:outline-none focus:border-[#10b981]"
                />
              </div>

              {recoveryError && (
                <p className="text-xs text-rose-400 font-medium">
                  {recoveryError}
                </p>
              )}

              {recoverySuccess && (
                <div className="p-2.5 rounded-xl bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] text-xs font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>¡Identidad confirmada! Desbloqueando...</span>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecoveryOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#262a33] text-xs text-[#86948a] hover:text-white font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-bold shadow-lg shadow-[#10b981]/20 active:scale-95 transition-all"
                >
                  Verificar y Restaurar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
