import React, { useState } from 'react';
import { SecurityConfig } from '../types';
import { SECURITY_QUESTIONS } from '../data/mockData';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SecurityConfig;
  onSaveConfig: (updated: Partial<SecurityConfig>) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}) => {
  const [pin, setPin] = useState(currentConfig.pin || '');
  const [confirmPin, setConfirmPin] = useState(currentConfig.pin || '');
  const [question, setQuestion] = useState(currentConfig.securityQuestion || SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState(currentConfig.securityAnswer || '');
  const [enablePin, setEnablePin] = useState(currentConfig.isPinEnabled);
  const [lockMode, setLockMode] = useState<'manual' | 'on_exit'>(currentConfig.lockMode || 'on_exit');
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enablePin) {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        setError('El PIN debe tener exactamente 4 dígitos numéricos.');
        return;
      }
      if (pin !== confirmPin) {
        setError('Los PINs ingresados no coinciden.');
        return;
      }
      if (!answer.trim()) {
        setError('Por favor ingresa la respuesta para tu pregunta de seguridad.');
        return;
      }
    }

    setError('');
    onSaveConfig({
      isPinEnabled: enablePin,
      pin: enablePin ? pin : currentConfig.pin,
      securityQuestion: question,
      securityAnswer: answer.trim() || currentConfig.securityAnswer,
      lockMode: lockMode,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-[#181c24] border border-[#3c4a42] rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between pb-2 border-b border-[#3c4a42]/30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#10b981] text-[24px]">
              lock_person
            </span>
            <div>
              <h3 className="font-bold text-sm text-white leading-tight">
                Seguridad & Bloqueo PIN
              </h3>
              <p className="text-[10px] text-[#86948a]">
                Configura tu clave y recuperación
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#86948a] hover:text-white p-1"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle PIN Lock */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#262a33]/70 border border-[#3c4a42]/40">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">
                Bloqueo de App con PIN
              </span>
              <span className="text-[11px] text-[#86948a] block">
                Solicitar PIN al abrir la aplicación
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enablePin}
                onChange={(e) => setEnablePin(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#31353e] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]" />
            </label>
          </div>

          {enablePin && (
            <>
              {/* PIN Inputs */}
              <div className="space-y-3 p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#86948a]">
                    Nuevo PIN (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    required={enablePin}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center tracking-[1em] text-lg font-bold py-2 px-3 rounded-xl bg-[#181c24] border border-[#3c4a42] text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#86948a]">
                    Confirmar PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    required={enablePin}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center tracking-[1em] text-lg font-bold py-2 px-3 rounded-xl bg-[#181c24] border border-[#3c4a42] text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Modo de Bloqueo: Bloquear manual o Al salir de la app */}
              <div className="space-y-2.5 p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40">
                <div className="flex items-center gap-1.5 text-[#10b981]">
                  <span className="material-symbols-outlined text-[18px]">
                    security
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Modo de Bloqueo
                  </span>
                </div>
                <p className="text-[11px] text-[#86948a]">
                  Elige cuándo debe solicitarse el PIN para acceder a Finexa:
                </p>

                <div className="grid grid-cols-1 gap-2 pt-0.5">
                  {/* Opción 1: Bloquear manual */}
                  <button
                    type="button"
                    onClick={() => setLockMode('manual')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      lockMode === 'manual'
                        ? 'bg-[#10b981]/15 border-[#10b981] text-white shadow-sm'
                        : 'bg-[#181c24] border-[#3c4a42]/50 text-[#86948a] hover:bg-[#262a33]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Bloquear manual</span>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        lockMode === 'manual' ? 'border-[#10b981] bg-[#10b981]' : 'border-[#86948a]'
                      }`}>
                        {lockMode === 'manual' && <span className="w-1.5 h-1.5 rounded-full bg-[#003824]" />}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#86948a] mt-1 leading-snug">
                      Solo se bloquea cuando presionas manualmente el botón &quot;Bloquear Aplicación Ahora&quot;.
                    </p>
                  </button>

                  {/* Opción 2: Al salir de la app */}
                  <button
                    type="button"
                    onClick={() => setLockMode('on_exit')}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      lockMode === 'on_exit'
                        ? 'bg-[#10b981]/15 border-[#10b981] text-white shadow-sm'
                        : 'bg-[#181c24] border-[#3c4a42]/50 text-[#86948a] hover:bg-[#262a33]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Al salir de la app</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#10b981]/20 text-[#10b981]">
                          Siempre activo
                        </span>
                      </div>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        lockMode === 'on_exit' ? 'border-[#10b981] bg-[#10b981]' : 'border-[#86948a]'
                      }`}>
                        {lockMode === 'on_exit' && <span className="w-1.5 h-1.5 rounded-full bg-[#003824]" />}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#86948a] mt-1 leading-snug">
                      Siempre que abras la app, cambies de ventana o salgas y vuelvas a entrar, te pedirá el PIN.
                    </p>
                  </button>
                </div>
              </div>

              {/* Security Question Section (Requested by user) */}
              <div className="space-y-2.5 p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/40">
                <div className="flex items-center gap-1.5 text-[#ffb95f]">
                  <span className="material-symbols-outlined text-[18px]">
                    contact_support
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Recuperación en caso de olvido
                  </span>
                </div>
                <p className="text-[11px] text-[#86948a]">
                  Si olvidas tu PIN, podrás recuperar el acceso respondiendo a esta pregunta de seguridad:
                </p>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#86948a]">
                    Pregunta de seguridad
                  </label>
                  <select
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full text-xs py-2.5 px-3 rounded-xl bg-[#181c24] border border-[#3c4a42] text-[#dfe2ee] focus:outline-none focus:border-[#10b981]"
                  >
                    {SECURITY_QUESTIONS.map((q) => (
                      <option key={q} value={q} className="bg-[#181c24] text-white">
                        {q}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#86948a]">
                    Respuesta secreta
                  </label>
                  <input
                    type="text"
                    required={enablePin}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Ej. Firulais, San José, etc."
                    className="w-full text-xs py-2.5 px-3 rounded-xl bg-[#181c24] border border-[#3c4a42] text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-rose-400 font-medium">
              {error}
            </p>
          )}

          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-[#10b981]/20 border border-[#10b981]/50 text-[#10b981] text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>¡Configuración de PIN guardada exitosamente!</span>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[#262a33] text-xs text-[#86948a] hover:text-white font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#003824] text-xs font-bold shadow-lg shadow-[#10b981]/20 active:scale-95 transition-all"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
