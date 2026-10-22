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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none select-none">
      <nav
        aria-label="Navegación inferior principal"
        className="pointer-events-auto w-full max-w-md mx-auto bg-[#141822]/95 backdrop-blur-2xl border-t border-[#3c4a42]/40 shadow-2xl px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] grid grid-cols-5 items-center justify-items-center"
      >
        {/* 1. Inicio */}
        <button
          type="button"
          onClick={() => onSelectScreen('inicio')}
          aria-label="Ir a Inicio"
          className={`flex flex-col items-center justify-center w-full py-1 group transition-all duration-200 active:scale-95 ${
            currentScreen === 'inicio' ? 'text-[#10b981]' : 'text-[#86948a] hover:text-[#dfe2ee]'
          }`}
        >
          <div
            className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentScreen === 'inicio' ? 'bg-[#10b981]/20 scale-105' : 'group-hover:bg-[#252c3a]/50'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Inicio</span>
        </button>

        {/* 2. Cuentas */}
        <button
          type="button"
          onClick={() => onSelectScreen('ingresos')}
          aria-label="Ir a Cuentas y Saldos"
          className={`flex flex-col items-center justify-center w-full py-1 group transition-all duration-200 active:scale-95 ${
            currentScreen === 'ingresos' ? 'text-[#10b981]' : 'text-[#86948a] hover:text-[#dfe2ee]'
          }`}
        >
          <div
            className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentScreen === 'ingresos' ? 'bg-[#10b981]/20 scale-105' : 'group-hover:bg-[#252c3a]/50'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Cuentas</span>
        </button>

        {/* 3. Botón Central [+] Perfectamente Centrado */}
        <div className="relative -top-3.5 flex items-center justify-center w-full">
          <button
            type="button"
            onClick={onNewAction}
            aria-label="Agregar movimiento o abrir acciones rápidas"
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#10b981] via-[#34d399] to-[#059669] text-[#003824] shadow-xl shadow-emerald-500/35 flex items-center justify-center active:scale-90 hover:scale-105 transition-all duration-200 border-4 border-[#0e1219] ring-2 ring-[#10b981]/40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[28px] sm:text-[30px] font-black">add</span>
          </button>
        </div>

        {/* 4. Gastos */}
        <button
          type="button"
          onClick={() => onSelectScreen('comida')}
          aria-label="Ir a Gastos"
          className={`flex flex-col items-center justify-center w-full py-1 group transition-all duration-200 active:scale-95 ${
            currentScreen === 'comida' || currentScreen === 'gastos'
              ? 'text-[#ffb95f]'
              : 'text-[#86948a] hover:text-[#dfe2ee]'
          }`}
        >
          <div
            className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentScreen === 'comida' || currentScreen === 'gastos'
                ? 'bg-[#ffb95f]/20 scale-105'
                : 'group-hover:bg-[#252c3a]/50'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Gastos</span>
        </button>

        {/* 5. Deudas */}
        <button
          type="button"
          onClick={() => onSelectScreen('deudas')}
          aria-label="Ir a Control de Deudas"
          className={`flex flex-col items-center justify-center w-full py-1 group transition-all duration-200 active:scale-95 ${
            currentScreen === 'deudas' ? 'text-[#ffb4ab]' : 'text-[#86948a] hover:text-[#dfe2ee]'
          }`}
        >
          <div
            className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-200 ${
              currentScreen === 'deudas' ? 'bg-[#ffb4ab]/20 scale-105' : 'group-hover:bg-[#252c3a]/50'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">credit_card</span>
          </div>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Deudas</span>
        </button>
      </nav>
    </div>
  );
};
