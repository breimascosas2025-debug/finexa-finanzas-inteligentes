import React from 'react';
import { AppScreen } from '../types';
import { FinexaIcon } from './FinexaLogo';
import { SiriOrb } from './SiriOrb';

interface TopHeaderProps {
  currentScreen: AppScreen;
  onSelectScreen?: (screen: AppScreen) => void;
  onOpenMenu: () => void;
  onBack?: () => void;
  onNewAction: () => void;
  onOpenNotifications: () => void;
  onOpenAiAssistant?: () => void;
  notificationCount?: number;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onForceSync?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentScreen,
  onSelectScreen,
  onOpenMenu,
  onBack,
  onNewAction,
  onOpenNotifications,
  onOpenAiAssistant,
  notificationCount = 0,
  syncStatus = 'synced',
  onForceSync,
}) => {
  const getHeaderData = () => {
    switch (currentScreen) {
      case 'inicio':
        return {
          title: 'Finexa',
          subtitle: 'Finanzas Inteligentes',
          showBack: false,
          badge: 'Multidivisa',
        };
      case 'ingresos':
        return {
          title: 'Cuentas & Fuentes',
          subtitle: 'INGRESOS Y MONEDAS',
          showBack: true,
          badge: 'Multidivisa',
        };
      case 'gastos':
      case 'comida':
        return {
          title: 'Gastos & Comida',
          subtitle: 'CONTROL DE SALIDAS',
          showBack: true,
          badge: null,
        };
      case 'diezmos':
        return {
          title: 'Iglesia & Diezmos',
          subtitle: '10% DE FIDELIDAD',
          showBack: true,
          badge: null,
        };
      case 'deudas':
        return {
          title: 'Control de Deudas',
          subtitle: 'AMORTIZACIÓN Y PAGOS',
          showBack: true,
          badge: null,
        };
      case 'perfil':
        return {
          title: 'Perfil & Seguridad',
          subtitle: 'AJUSTES MANUALES',
          showBack: true,
          badge: null,
        };
      default:
        return {
          title: 'Finexa',
          subtitle: 'Finanzas Inteligentes',
          showBack: false,
          badge: 'Multidivisa',
        };
    }
  };

  const info = getHeaderData();

  const desktopNavItems: Array<{ id: AppScreen; label: string; icon: string }> = [
    { id: 'inicio', label: 'Inicio', icon: 'grid_view' },
    { id: 'ingresos', label: 'Cuentas', icon: 'account_balance_wallet' },
    { id: 'comida', label: 'Gastos', icon: 'shopping_bag' },
    { id: 'diezmos', label: 'Diezmos', icon: 'church' },
    { id: 'deudas', label: 'Deudas', icon: 'credit_card' },
    { id: 'perfil', label: 'Perfil & Nube', icon: 'person' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 w-full bg-[#1c2028]/95 backdrop-blur-xl border-b border-[#3c4a42]/40 shadow-sm select-none">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo & Mobile burger or Back button */}
        <div className="flex items-center gap-2.5">
          {info.showBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Volver"
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-[#262a33]/80 text-[#dfe2ee] hover:bg-[#31353e] active:scale-95 transition-all md:hidden"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Menú lateral"
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-[#262a33]/80 text-[#dfe2ee] hover:bg-[#31353e] active:scale-95 transition-all md:hidden"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
          )}

          {/* Logo click takes to inicio */}
          <div
            onClick={() => onSelectScreen?.('inicio')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <FinexaIcon size={32} className="rounded-xl shadow-md group-hover:scale-105 transition-transform" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg text-white tracking-tight">
                  Fine<span className="text-[#00d2ff]">x</span>a
                </span>
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse hidden sm:inline-block" />
              </div>
              <p className="text-[10px] text-[#86948a] font-medium leading-none hidden sm:block">
                {info.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation Bar (Only visible on MD/LG screens) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#12161f] p-1.5 rounded-2xl border border-[#3c4a42]/40 shadow-inner">
          {desktopNavItems.map((item) => {
            const isActive =
              currentScreen === item.id ||
              (item.id === 'comida' && currentScreen === 'gastos');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectScreen?.(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#10b981] text-[#003824] shadow-md shadow-[#10b981]/20 font-black'
                    : 'text-[#86948a] hover:text-white hover:bg-[#1d222e]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Sync, Notifications & Quick Add */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            onClick={onForceSync}
            title={
              syncStatus === 'syncing'
                ? 'Sincronizando con la nube (PC / Móvil)...'
                : syncStatus === 'error'
                ? 'Error de sincronización. Toca para reintentar.'
                : 'Sincronizado en la nube (PC y Celular conectados)'
            }
            className={`px-2.5 py-1 sm:h-9 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all ${
              syncStatus === 'syncing'
                ? 'bg-[#10b981]/20 text-[#10b981] animate-pulse'
                : syncStatus === 'error'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[#262a33]/80 text-[#10b981] hover:bg-[#31353e]'
            }`}
          >
            {syncStatus === 'syncing' ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
            ) : syncStatus === 'error' ? (
              <span className="material-symbols-outlined text-[16px]">cloud_off</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">cloud_done</span>
            )}
            <span className="hidden lg:inline text-[11px]">
              {syncStatus === 'syncing' ? 'Sincronizando' : 'Nube Conectada'}
            </span>
          </button>

          {/* Siri-like Orb Button para Preguntar a Finexa-Plus (IA) */}
          {onOpenAiAssistant && (
            <button
              type="button"
              onClick={onOpenAiAssistant}
              title="Preguntar a la IA (Finexa-Plus / GLM 5-3)"
              className="relative p-1 rounded-2xl bg-[#262a33]/60 hover:bg-[#31353e] flex items-center gap-1.5 active:scale-95 transition-all group border border-[#00d2ff]/20 hover:border-[#00d2ff]/50 shadow-sm"
            >
              <SiriOrb size={28} />
              <span className="hidden sm:inline text-[11px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] via-[#f093fb] to-[#f5576c] pr-1.5">
                Finexa-Plus
              </span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label="Notificaciones"
            className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#262a33]/80 text-[#dfe2ee] hover:bg-[#31353e] flex items-center justify-center active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ee9800] text-[#0f131c] text-[9px] font-extrabold flex items-center justify-center shadow">
                {notificationCount}
              </span>
            )}
          </button>

          {/* Desktop Menu toggle button */}
          <button
            type="button"
            onClick={onOpenMenu}
            title="Más opciones y menú lateral"
            className="hidden md:flex w-9 h-9 rounded-xl bg-[#262a33]/80 text-[#dfe2ee] hover:bg-[#31353e] items-center justify-center active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>
      </div>
    </header>
  );
};
