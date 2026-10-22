import React from 'react';

interface FinexaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'full' | 'emblem';
}

/**
 * Componente oficial de ícono / emblema de Finexa:
 * F estilizada en cintas degradadas azules y cian, barras financieras esmeralda ascendentes y flecha verde hacia arriba.
 */
export const FinexaEmblemSvg: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => {
  return (
    <svg
      viewBox="0 0 300 280"
      width={size}
      height={(size * 280) / 300}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        {/* Blue Ribbon Gradients */}
        <linearGradient id="emblemBlueTop" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#0066ff" />
          <stop offset="60%" stopColor="#00b4d8" />
          <stop offset="100%" stopColor="#48cae4" />
        </linearGradient>

        <linearGradient id="emblemBlueSpine" x1="0%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#0077b6" />
          <stop offset="70%" stopColor="#023e8a" />
          <stop offset="100%" stopColor="#03045e" />
        </linearGradient>

        <linearGradient id="emblemBlueMid" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0096c7" />
          <stop offset="100%" stopColor="#48cae4" />
        </linearGradient>

        {/* Growth Bars & Arrow Gradients */}
        <linearGradient id="emblemGrowthGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#00a86b" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>

        <linearGradient id="emblemArrowGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>

        <filter id="emblemGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0077b6" floodOpacity="0.4" />
        </filter>
        <filter id="growthGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#10b981" floodOpacity="0.5" />
        </filter>
      </defs>

      <g filter="url(#emblemGlow)">
        {/* Upper sweeping curve of the letter F */}
        <path
          d="M 60 70 C 85 25, 165 15, 235 20 C 275 22, 280 40, 260 65 C 235 95, 190 100, 140 100 C 110 100, 80 95, 60 70 Z"
          fill="url(#emblemBlueTop)"
        />

        {/* Outer curved back spine */}
        <path
          d="M 70 50 C 120 20, 210 15, 250 35 C 220 80, 170 95, 110 95 C 70 95, 45 130, 45 185 C 45 235, 65 260, 105 260 L 60 260 C 25 260, 15 225, 15 170 C 15 105, 35 65, 70 50 Z"
          fill="url(#emblemBlueSpine)"
        />

        {/* Middle wing / arm of the F */}
        <path
          d="M 65 130 C 115 130, 185 125, 220 128 C 235 128, 235 142, 220 155 C 195 175, 155 175, 110 175 L 65 175 Z"
          fill="url(#emblemBlueMid)"
        />

        {/* 3 Ascending Financial Growth Bars */}
        <rect x="90" y="195" width="22" height="50" rx="6" fill="url(#emblemGrowthGrad)" filter="url(#growthGlow)" />
        <rect x="122" y="175" width="22" height="70" rx="6" fill="url(#emblemGrowthGrad)" filter="url(#growthGlow)" />
        <rect x="154" y="155" width="22" height="90" rx="6" fill="url(#emblemGrowthGrad)" filter="url(#growthGlow)" />

        {/* Upward Growth Trend Curved Arrow */}
        <path
          d="M 75 205 C 110 195, 150 175, 185 130 L 175 130 L 205 100 L 208 140 L 196 140 C 168 180, 125 200, 75 205 Z"
          fill="url(#emblemArrowGrad)"
          filter="url(#growthGlow)"
        />
      </g>
    </svg>
  );
};

export const FinexaIcon: React.FC<{ size?: number; className?: string }> = ({ size = 38, className = '' }) => {
  return (
    <div
      className={`relative flex items-center justify-center bg-[#070b14] border border-[#1e293b] rounded-2xl shadow-xl overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/finexa-logo.png"
        alt="Finexa Logo"
        className="w-full h-full object-cover select-none pointer-events-none"
        onError={(e) => {
          // Fallback to SVG emblem if image fails
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center -z-10">
        <FinexaEmblemSvg size={size * 0.75} />
      </div>
    </div>
  );
};

export const FinexaLogo: React.FC<FinexaLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'md' ? 38 : size === 'lg' ? 46 : 64;
  const textSizeClass =
    size === 'sm'
      ? 'text-base'
      : size === 'md'
      ? 'text-xl'
      : size === 'lg'
      ? 'text-2xl'
      : 'text-3xl';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official emblem icon */}
      <FinexaIcon size={iconSize} />

      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-center">
            <span className={`text-white font-black tracking-tight ${textSizeClass} leading-none flex items-center`}>
              Fine
              {/* x with glowing cyan ribbon crossover */}
              <span className="relative inline-block text-white mx-[0.5px]">
                x
                <span className="absolute inset-0 text-[#00d2ff] opacity-80 pointer-events-none">x</span>
              </span>
              a
            </span>
          </div>
          <span className="text-[9px] font-bold tracking-[0.2em] text-[#86948a] uppercase leading-none mt-1">
            Finanzas Inteligentes
          </span>
        </div>
      )}
    </div>
  );
};

// Aliases for compatibility
export const PinexaIcon = FinexaIcon;
export const PinexaLogo = FinexaLogo;
