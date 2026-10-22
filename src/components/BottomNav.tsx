import React from 'react';
import { AppScreen } from '../types';

interface BottomNavProps {
  currentScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
  onNewAction: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onSelectScreen,
  onNewAction,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-20 w-full max-w-md mx-auto bg-[#181c24]/95 backdrop-blur-xl border-t border-[#3c4a42]/30 px-2 flex items-center justify-around select-none">
      {/* 1. Inicio */}
      <button
        type="button"
        onClick={() => onSelectScreen('inicio')}
        className={`flex flex-col items-center justify-center flex-1 transition-all ${
          currentScreen === 'inicio' ? 'text-[#10b981]' : 'text-[#86948a] hover:text-[#dfe2ee]'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'inicio' ? 'bg-[#10b981]/20' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">grid_view</span>
        </div>
        <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Inicio</span>
      </button>

      {/* 2. Cuentas */}
      <button
        type="button"
        onClick={() => onSelectScreen('ingresos')}
        className={`flex flex-col items-center justify-center flex-1 transition-all ${
          currentScreen === 'ingresos' ? 'text-[#10b981]' : 'text-[#86948a] hover:text-[#dfe2ee]'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'ingresos' ? 'bg-[#10b981]/20' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
        </div>
        <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Cuentas</span>
      </button>

      {/* 3. Central "+" Action Hub Button (Destacado y prominente) */}
      <div className="relative -top-3 flex items-center justify-center px-1">
        <button
          type="button"
          onClick={onNewAction}
          aria-label="Acciones financieras"
          className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#10b981] via-[#34d399] to-[#059669] text-[#003824] shadow-xl shadow-[#10b981]/35 flex items-center justify-center active:scale-90 hover:scale-105 transition-all border-4 border-[#0f131c] ring-2 ring-[#10b981]/40"
        >
          <span className="material-symbols-outlined text-[28px] sm:text-[30px] font-black">add</span>
        </button>
      </div>

      {/* 4. Gastos */}
      <button
        type="button"
        onClick={() => onSelectScreen('comida')}
        className={`flex flex-col items-center justify-center flex-1 transition-all ${
          currentScreen === 'comida' || currentScreen === 'gastos'
            ? 'text-[#ffb95f]'
            : 'text-[#86948a] hover:text-[#dfe2ee]'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'comida' || currentScreen === 'gastos' ? 'bg-[#ffb95f]/20' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
        </div>
        <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Gastos</span>
      </button>

      {/* 5. Deudas */}
      <button
        type="button"
        onClick={() => onSelectScreen('deudas')}
        className={`flex flex-col items-center justify-center flex-1 transition-all ${
          currentScreen === 'deudas' ? 'text-[#ffb4ab]' : 'text-[#86948a] hover:text-[#dfe2ee]'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'deudas' ? 'bg-[#ffb4ab]/20' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">credit_card</span>
        </div>
        <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Deudas</span>
      </button>

      {/* 6. Perfil */}
      <button
        type="button"
        onClick={() => onSelectScreen('perfil')}
        className={`flex flex-col items-center justify-center flex-1 transition-all ${
          currentScreen === 'perfil' ? 'text-[#10b981]' : 'text-[#86948a] hover:text-[#dfe2ee]'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-full flex items-center justify-center transition-all ${
            currentScreen === 'perfil' ? 'bg-[#10b981]/20' : ''
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">person</span>
        </div>
        <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Perfil</span>
      </button>
    </nav>
  );
};
