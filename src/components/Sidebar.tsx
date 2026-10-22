import React from 'react';
import { FinexaLogo } from './FinexaLogo';
import { AppScreen, SecurityConfig, UserProfile } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: AppScreen;
  onSelectScreen: (screen: AppScreen) => void;
  user: UserProfile;
  security: SecurityConfig;
  onLockApp: () => void;
  onLogout: () => void;
  onOpenPrivacyTerms?: (tab?: 'privacy' | 'cookies' | 'terms' | 'permissions') => void;
  onOpenPermissions?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onSelectScreen,
  user,
  security,
  onLockApp,
  onLogout,
  onOpenPrivacyTerms,
  onOpenPermissions,
}) => {
  if (!isOpen) return null;

  const navItems = [
    { id: 'inicio', label: 'Inicio (Panel)', icon: 'grid_view' },
    { id: 'ingresos', label: 'Cuentas & Ingresos', icon: 'trending_up' },
    { id: 'comida', label: 'Gastos & Comida', icon: 'trending_down' },
    { id: 'diezmos', label: 'Iglesia & Diezmos', icon: 'church' },
    { id: 'deudas', label: 'Control de Deudas', icon: 'credit_card' },
    { id: 'perfil', label: 'Perfil & Seguridad', icon: 'person' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Body */}
      <div className="relative w-[82%] max-w-xs bg-[#181c24] border-r border-[#3c4a42]/40 h-full flex flex-col justify-between p-5 z-10 shadow-2xl overflow-y-auto no-scrollbar animate-in slide-in-from-left duration-200">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#3c4a42]/30">
            <FinexaLogo size="md" showText={true} />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#262a33] text-[#86948a] hover:text-white flex items-center justify-center active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* User Profile Card */}
          <div
            onClick={() => {
              onSelectScreen('perfil');
              onClose();
            }}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-[#262a33] to-[#1c2028] border border-[#3c4a42]/40 flex items-center gap-3 cursor-pointer hover:border-[#10b981]/50 transition-colors"
          >
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-[#10b981]/20 border border-[#10b981] flex items-center justify-center text-[#10b981] font-bold text-sm overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              {user.isGoogleConnected && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </span>
              )}
            </div>

            <div className="overflow-hidden flex-1">
              <h4 className="text-xs font-bold text-white truncate">
                {user.name || 'Mi Perfil'}
              </h4>
              <p className="text-[10px] text-[#86948a] truncate">
                {user.email || 'Control manual de finanzas'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                <span className="text-[9px] font-semibold text-[#10b981]">
                  Colones (₡)
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-[#86948a] uppercase px-2 mb-1 block">
              Menú Principal
            </span>
            {navItems.map((item) => {
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectScreen(item.id as AppScreen);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shadow-sm'
                      : 'text-[#dfe2ee] hover:bg-[#262a33] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isActive ? 'text-[#10b981]' : 'text-[#86948a]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Security PIN Section */}
          <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">
                  lock
                </span>
                <span className="text-xs font-bold text-white">
                  Bloqueo con PIN
                </span>
              </div>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  security.isPinEnabled
                    ? 'bg-[#10b981]/20 text-[#10b981]'
                    : 'bg-[#31353e] text-[#86948a]'
                }`}
              >
                {security.isPinEnabled ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>

            {security.isPinEnabled && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLockApp();
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#262a33] hover:bg-[#31353e] active:scale-95 text-xs font-semibold text-[#ffb95f] flex items-center justify-center gap-2 border border-[#ffb95f]/30 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Bloquear App Ahora</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer & Logout */}
        <div className="pt-4 border-t border-[#3c4a42]/30 space-y-2">
          <div className="flex items-center gap-1.5">
            {onOpenPrivacyTerms && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPrivacyTerms('privacy');
                }}
                className="flex-1 py-1.5 px-2 rounded-lg bg-[#0f131c] hover:bg-[#262a33] text-[10px] text-[#86948a] hover:text-white border border-[#3c4a42]/40 transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px] text-[#10b981]">shield</span>
                <span>Privacidad</span>
              </button>
            )}
            {onOpenPermissions && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPermissions();
                }}
                className="flex-1 py-1.5 px-2 rounded-lg bg-[#0f131c] hover:bg-[#262a33] text-[10px] text-[#86948a] hover:text-white border border-[#3c4a42]/40 transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px] text-blue-400">tune</span>
                <span>Permisos</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#93000a]/15 hover:bg-[#93000a]/25 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 border border-[#93000a]/30 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Cerrar Sesión</span>
          </button>

          <div className="text-center text-[9px] text-[#86948a]">
            Finexa • Finanzas Inteligentes (Costa Rica)
          </div>
        </div>
      </div>
    </div>
  );
};
