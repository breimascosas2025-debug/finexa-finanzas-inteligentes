import React from 'react';

interface SiriOrbProps {
  size?: number; // diameter in pixels
  isThinking?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SiriOrb: React.FC<SiriOrbProps> = ({
  size = 36,
  isThinking = false,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center cursor-pointer select-none group ${className}`}
      title="Finexa-Plus (Asistente IA)"
    >
      {/* Outer ambient glow */}
      <div
        className={`absolute inset-0 rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity ${
          isThinking
            ? 'animate-ping bg-gradient-to-tr from-cyan-400 via-fuchsia-500 to-amber-400'
            : 'bg-gradient-to-tr from-[#00d2ff] via-[#ec4899] to-[#8b5cf6]'
        }`}
        style={{
          filter: 'blur(6px)',
        }}
      />

      {/* Rotating gradient ring */}
      <div
        className={`absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-[#00f2fe] via-[#4facfe] via-[#ec4899] via-[#f093fb] to-[#f5576c] ${
          isThinking ? 'animate-spin' : 'animate-[spin_6s_linear_infinite]'
        }`}
        style={{ animationDuration: isThinking ? '1.5s' : '8s' }}
      >
        <div className="w-full h-full rounded-full bg-[#0a0d14]/70 backdrop-blur-sm" />
      </div>

      {/* Core Siri orb with swirling glass effect */}
      <div
        className={`relative rounded-full overflow-hidden flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 active:scale-95 ${
          isThinking ? 'scale-105' : ''
        }`}
        style={{
          width: size - 4,
          height: size - 4,
          background: 'radial-gradient(circle at 30% 30%, #38bdf8 0%, #ec4899 45%, #6366f1 75%, #0f172a 100%)',
          boxShadow: isThinking
            ? '0 0 20px 4px rgba(236, 72, 153, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.6)'
            : '0 0 12px 2px rgba(56, 189, 248, 0.4), inset 0 0 8px rgba(255, 255, 255, 0.4)',
        }}
      >
        {/* Inner highlights for 3D sphere depth */}
        <div className="absolute top-1 left-1.5 w-1/3 h-1/3 rounded-full bg-white/40 blur-[1px]" />
        <div className="absolute bottom-1 right-1.5 w-1/4 h-1/4 rounded-full bg-[#00ffff]/30 blur-[2px]" />
        
        {/* Micro waveform / Siri core pulse */}
        <div className="flex items-center gap-[1.5px] z-10 opacity-90">
          <span
            className={`w-[2px] bg-white rounded-full transition-all ${
              isThinking ? 'h-3 animate-bounce' : 'h-1.5 group-hover:h-2.5'
            }`}
            style={{ animationDelay: '0ms' }}
          />
          <span
            className={`w-[2.5px] bg-white rounded-full transition-all ${
              isThinking ? 'h-4 animate-bounce' : 'h-2.5 group-hover:h-3.5'
            }`}
            style={{ animationDelay: '150ms' }}
          />
          <span
            className={`w-[2px] bg-white rounded-full transition-all ${
              isThinking ? 'h-2.5 animate-bounce' : 'h-1.5 group-hover:h-2'
            }`}
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};
