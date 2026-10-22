import React, { useRef } from 'react';

export interface AvatarOption {
  id: string;
  type: 'emoji' | 'url';
  value: string;
  label: string;
}

export const PRESET_AVATARS: AvatarOption[] = [
  { id: 'briefcase', type: 'emoji', value: '💼', label: 'Finanzas Pro' },
  { id: 'diamond', type: 'emoji', value: '💎', label: 'Diamante' },
  { id: 'lion', type: 'emoji', value: '🦁', label: 'León' },
  { id: 'rocket', type: 'emoji', value: '🚀', label: 'Crecimiento' },
  { id: 'crown', type: 'emoji', value: '👑', label: 'Corona' },
  { id: 'shield', type: 'emoji', value: '🛡️', label: 'Seguridad' },
  { id: 'smile', type: 'emoji', value: '😊', label: 'Amigable' },
  { id: 'owl', type: 'emoji', value: '🦉', label: 'Sabiduría' },
  { id: 'wallet', type: 'emoji', value: '💰', label: 'Ahorro' },
  { id: 'star', type: 'emoji', value: '⭐', label: 'Estrella' },
  { id: 'fox', type: 'emoji', value: '🦊', label: 'Estratega' },
  { id: 'fire', type: 'emoji', value: '🔥', label: 'Enfoque' },
];

interface AvatarSelectorProps {
  selectedAvatar?: string;
  onSelectAvatar: (avatarUrlOrEmoji: string) => void;
  compact?: boolean;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedAvatar,
  onSelectAvatar,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen seleccionada supera los 4MB. Por favor elige una imagen más ligera.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onSelectAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const isCustomPhoto = selectedAvatar && selectedAvatar.startsWith('data:image');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-[#86948a] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px] text-[#10b981]">face</span>
          <span>Foto o Icono de Perfil</span>
        </label>
        {selectedAvatar && (
          <span className="text-[10px] text-[#10b981] font-semibold">
            {isCustomPhoto ? 'Foto personalizada' : 'Icono seleccionado'}
          </span>
        )}
      </div>

      {/* Vista previa y acción de subir foto desde galería */}
      <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#262a33] border-2 border-[#10b981] flex items-center justify-center overflow-hidden text-2xl shadow-inner flex-shrink-0">
            {isCustomPhoto ? (
              <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : selectedAvatar ? (
              <span>{selectedAvatar}</span>
            ) : (
              <span className="material-symbols-outlined text-[#86948a] text-[24px]">account_circle</span>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-white">
              {isCustomPhoto ? 'Foto cargada con éxito' : selectedAvatar ? 'Avatar elegido' : 'Elige tu foto o icono'}
            </p>
            <p className="text-[10px] text-[#86948a]">
              Galería, cámara o elige uno de los iconos abajo
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-xl bg-[#262a33] hover:bg-[#31353e] text-[#dfe2ee] hover:text-white border border-[#3c4a42]/60 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px] text-[#10b981]">photo_camera</span>
          <span>Galería</span>
        </button>
      </div>

      {/* Grid de iconos predeterminados */}
      <div>
        <p className="text-[10px] font-semibold text-[#86948a] mb-1.5">O elige un icono rápido:</p>
        <div className={`grid ${compact ? 'grid-cols-6' : 'grid-cols-6'} gap-1.5`}>
          {PRESET_AVATARS.map((avatar) => {
            const isSelected = selectedAvatar === avatar.value;
            return (
              <button
                key={avatar.id}
                type="button"
                onClick={() => onSelectAvatar(avatar.value)}
                title={avatar.label}
                className={`h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                  isSelected
                    ? 'bg-[#10b981]/25 border-2 border-[#10b981] scale-105 shadow-md shadow-[#10b981]/20'
                    : 'bg-[#181c24] border border-[#3c4a42]/40 hover:bg-[#262a33] hover:border-[#10b981]/50 text-white'
                }`}
              >
                <span>{avatar.value}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
