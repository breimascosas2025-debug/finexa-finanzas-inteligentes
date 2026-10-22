import React, { useState } from 'react';

export type LegalTab =
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'data_treatment'
  | 'permissions'
  | 'security'
  | 'third_party'
  | 'contact';

interface PrivacyTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export const PrivacyTermsModal: React.FC<PrivacyTermsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'terms',
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  const tabs: Array<{ id: LegalTab; label: string; icon: string }> = [
    { id: 'terms', label: 'Términos y Condiciones', icon: 'gavel' },
    { id: 'privacy', label: 'Política de Privacidad', icon: 'shield' },
    { id: 'cookies', label: 'Cookies y Almacenamiento', icon: 'cookie' },
    { id: 'data_treatment', label: 'Tratamiento de Datos', icon: 'database' },
    { id: 'permissions', label: 'Permisos del Sistema', icon: 'key' },
    { id: 'security', label: 'Seguridad y Criptografía', icon: 'lock' },
    { id: 'third_party', label: 'Integraciones de Terceros', icon: 'hub' },
    { id: 'contact', label: 'Contacto y Soporte', icon: 'support_agent' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-[#181c24] border border-[#3c4a42]/70 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#3c4a42]/50 flex items-center justify-between bg-[#121620]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
              <span className="material-symbols-outlined text-[20px]">policy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white">Centro Legal y Transparencia</h2>
                <span className="text-[9px] bg-[#10b981]/20 text-[#10b981] px-1.5 py-0.2 rounded font-bold">
                  v2026.1
                </span>
              </div>
              <p className="text-[10px] text-[#86948a]">
                Documentación legal, privacidad y uso responsable de Finexa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262a33] text-[#dfe2ee] hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Nota Interna Requerida */}
        <div className="bg-amber-950/40 border-b border-amber-900/50 px-4 py-2 flex items-start gap-2 text-amber-300 text-[10px] leading-tight">
          <span className="material-symbols-outlined text-[15px] shrink-0 text-amber-400 mt-0.5">info</span>
          <div>
            <strong>Nota interna para el proyecto:</strong> Los siguientes documentos legales han sido redactados para reflejar con precisión técnica el funcionamiento actual de Finexa. Antes de la publicación formal en producción, deben ser revisados y adaptados por asesoría jurídica calificada según la jurisdicción y modelo societario definitivo (ej. Costa Rica - PRODHAB / Ley 8968 de Protección de la Persona frente al tratamiento de sus datos personales).
          </div>
        </div>

        {/* Tab Navigation Horizontal */}
        <div className="flex border-b border-[#3c4a42]/40 bg-[#0f131c] px-3 pt-2 gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-[#10b981] text-[#10b981]'
                  : 'border-transparent text-[#86948a] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#dfe2ee]/90 leading-relaxed max-h-[64vh]">
          {/* TAB 1: TÉRMINOS Y CONDICIONES */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">gavel</span>
                <span>Términos y Condiciones de Uso</span>
              </h3>
              <p>
                Bienvenido a Finexa. Al acceder o utilizar esta aplicación web o móvil, usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte, no debe utilizar la aplicación.
              </p>

              <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-2">
                <h4 className="font-bold text-white text-xs">1. Naturaleza del Servicio</h4>
                <p className="text-[#86948a] text-[11px]">
                  Finexa es una herramienta digital de gestión y registro financiero personal y doméstico (cuentas multidivisa, registro de gastos, abono a deudas, presupuestos y recordatorios). Finexa <strong>no es una entidad bancaria, institución financiera ni entidad regulada por SUGEF/BCCR</strong>, y no presta servicios de intermediación financiera ni custodia de fondos monetarios reales.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-2">
                <h4 className="font-bold text-white text-xs">2. Responsabilidades del Usuario</h4>
                <ul className="list-disc list-inside space-y-1 text-[#86948a] text-[11px]">
                  <li>Custodia de credenciales, PINs de acceso y Passkeys en sus dispositivos.</li>
                  <li>Veracidad y exactitud de los montos, comprobantes y datos financieros ingresados manualmente o mediante OCR.</li>
                  <li>Realizar copias de seguridad periódicas mediante la función de exportación JSON para evitar pérdidas por limpieza de almacenamiento del navegador.</li>
                  <li>Uso estrictamente lícito de la plataforma, absteniéndose de vulnerar derechos de propiedad intelectual o intentar ingeniería inversa.</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-2">
                <h4 className="font-bold text-white text-xs">3. Exención de Responsabilidad Financiera</h4>
                <p className="text-[#86948a] text-[11px]">
                  Las proyecciones, cálculos de amortización, simuladores de fondos de emergencia y tipos de cambio mostrados son de carácter meramente informativo y estimativo. El usuario es el único responsable de sus decisiones económicas, tributarias y contractuales.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: POLÍTICA DE PRIVACIDAD */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">shield</span>
                <span>Política de Privacidad</span>
              </h3>

              <div className="p-3.5 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/25 text-[#10b981] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] flex-shrink-0 mt-0.5">verified_user</span>
                <p className="text-[11px] font-semibold leading-normal">
                  Su privacidad financiera es un pilar fundamental. Finexa no comercializa, no arrienda ni vende sus registros contables, ingresos, deudas ni patrones de consumo a anunciantes ni terceros.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">¿Qué datos recopila Finexa?</h4>
                <p className="text-[#86948a] text-[11px]">
                  Recopilamos únicamente los datos necesarios para brindar el servicio: nombre o alias, dirección de correo electrónico (para autenticación y sincronización en la nube), saldos de cuentas, conceptos de gastos, deudas registradas, y metadatos de configuración criptográfica para inicio con Passkey o PIN.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">¿Dónde y cómo se almacenan sus datos?</h4>
                <p className="text-[#86948a] text-[11px]">
                  Los datos se conservan de forma local en el almacenamiento persistente de su dispositivo (IndexedDB / LocalStorage) y se sincronizan de forma cifrada mediante transporte HTTPS/TLS en la base de datos en la nube (Firestore / Cloud Storage) vinculada a su cuenta autenticada.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white text-xs">Derecho de Supresión y Eliminación Total</h4>
                <p className="text-[#86948a] text-[11px]">
                  Usted tiene el control absoluto. En cualquier momento puede ingresar a Perfil y hacer clic en <em>"Reiniciar App Limpia"</em> para eliminar de manera irreversible todos sus registros locales y solicitar la purga de su base de datos.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: COOKIES Y ALMACENAMIENTO */}
          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">cookie</span>
                <span>Política de Cookies y Almacenamiento Local</span>
              </h3>

              <p className="text-[11px] text-[#86948a]">
                Finexa opera primariamente como una Aplicación Web Progresiva (PWA). Empleamos tecnologías de almacenamiento del navegador para permitir el funcionamiento sin conexión (offline-first) y mantener su sesión segura.
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <h5 className="font-bold text-white text-xs">1. LocalStorage e IndexedDB (Técnicos y Esenciales)</h5>
                  <p className="text-[11px] text-[#86948a] mt-1">
                    Se emplean para conservar sus transacciones, cuentas, saldos, configuración de tema y el registro criptográfico de su sesión. Son estrictamente necesarios; sin ellos la aplicación no puede recordar sus saldos ni funcionar sin conexión.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <h5 className="font-bold text-white text-xs">2. Cookies de Autenticación de Terceros</h5>
                  <p className="text-[11px] text-[#86948a] mt-1">
                    Cuando usted opta por iniciar sesión con Google o conectar Google Workspace, Google establece cookies seguras bajo sus dominios (accounts.google.com) para verificar su identidad y emitir tokens temporales mediante OAuth 2.0.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <h5 className="font-bold text-white text-xs">3. Cero Cookies de Rastreo Publicitario</h5>
                  <p className="text-[11px] text-[#86948a] mt-1">
                    Finexa <strong>no utiliza Google AdSense, Meta Pixel, cookies de retargeting publicitario ni rastreadores entre sitios</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRATAMIENTO DE DATOS */}
          {activeTab === 'data_treatment' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">database</span>
                <span>Política de Tratamiento de Datos Personales</span>
              </h3>

              <p className="text-[11px] text-[#86948a]">
                Esta política detalla los principios aplicados al tratamiento de información financiera y personal recopilada en Finexa:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <span className="text-[#10b981] font-bold text-xs">Principio de Finalidad</span>
                  <p className="text-[10px] text-[#86948a] mt-1">
                    Los datos ingresados solo se utilizan para la visualización de balances, cálculo de presupuestos, amortización de pasivos y recordatorios.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <span className="text-[#10b981] font-bold text-xs">Minimización de Datos</span>
                  <p className="text-[10px] text-[#86948a] mt-1">
                    No solicitamos cédulas físicas completas, números completos de tarjeta de crédito (PAN) ni códigos de seguridad (CVV).
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <span className="text-[#10b981] font-bold text-xs">Seguridad y Respaldo</span>
                  <p className="text-[10px] text-[#86948a] mt-1">
                    El usuario puede en cualquier momento exportar su información completa en formato portable JSON y transferirla libremente.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <span className="text-[#10b981] font-bold text-xs">Confidencialidad</span>
                  <p className="text-[10px] text-[#86948a] mt-1">
                    Los algoritmos de análisis financiero se ejecutan directamente en su navegador o en funciones aisladas en la nube.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PERMISOS DEL SISTEMA */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">key</span>
                <span>Permisos del Dispositivo y Navegador</span>
              </h3>

              <p className="text-[11px] text-[#86948a]">
                Finexa solo solicita permisos nativos del navegador cuando usted explícitamente interactúa con una función que lo requiere:
              </p>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">Cámara (video en vivo)</h5>
                    <p className="text-[10px] text-[#86948a] mt-0.5">
                      Utilizado exclusivamente para capturar fotogramas de tiquetes físicos o comprobantes de pago. La cámara se detiene de inmediato al tomar o cancelar la captura.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#ffb95f]/20 text-[#ffb95f] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">notifications</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">Notificaciones Push / Alertas</h5>
                    <p className="text-[10px] text-[#86948a] mt-0.5">
                      Para alertar sobre el vencimiento de deudas, suscripciones y recordatorios de salario o diezmo. Puede revocarse en cualquier momento desde el navegador.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">photo_library</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">Archivos y Almacenamiento</h5>
                    <p className="text-[10px] text-[#86948a] mt-0.5">
                      Permite exportar e importar archivos JSON de respaldo local y seleccionar imágenes de avatar o recibos guardados.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">Passkeys y Autenticador Biométrico (WebAuthn)</h5>
                    <p className="text-[10px] text-[#86948a] mt-0.5">
                      Utiliza la API estándar WebAuthn de su sistema operativo (Touch ID, Face ID, Windows Hello). <strong>Finexa nunca tiene acceso a su huella ni a su rostro</strong>; la validación biométrica la realiza exclusivamente el chip de seguridad de su dispositivo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SEGURIDAD Y CRIPTOGRAFÍA */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">lock</span>
                <span>Seguridad y Criptografía</span>
              </h3>

              <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-2">
                <h4 className="font-bold text-white text-xs">Protección de Sesión & PIN de Bloqueo</h4>
                <p className="text-[#86948a] text-[11px]">
                  Finexa incluye un sistema de bloqueo con PIN de 4 dígitos con pregunta de seguridad de respaldo y opción de bloqueo inmediato al salir de la aplicación.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-2">
                <h4 className="font-bold text-white text-xs">Criptografía Asimétrica de Passkeys</h4>
                <p className="text-[#86948a] text-[11px]">
                  El inicio de sesión mediante Passkeys genera un par de claves criptográficas público-privadas según el estándar FIDO2/WebAuthn. La clave privada nunca abandona su procesador de seguridad; Finexa únicamente almacena la clave pública para verificar la firma de desafío.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-2">
                <h4 className="font-bold text-white text-xs">Cifrado en Tránsito y Reposo</h4>
                <p className="text-[#86948a] text-[11px]">
                  Todas las comunicaciones entre su navegador y los servicios en la nube están cifradas mediante TLS 1.3. Las credenciales de acceso a terceros (OAuth Tokens) se manejan en memoria temporal volátil y no se exponen en almacenamiento no seguro.
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: INTEGRACIONES DE TERCEROS */}
          {activeTab === 'third_party' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">hub</span>
                <span>Integraciones de Terceros y Servicios Externos</span>
              </h3>

              <p className="text-[11px] text-[#86948a]">
                Finexa permite conectar servicios externos de manera voluntaria. A continuación se detalla qué ocurre cuando usted activa cada integración:
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-xs">📅 Google Calendar</h5>
                    <span className="text-[9px] text-[#10b981] font-bold">OAuth 2.0</span>
                  </div>
                  <p className="text-[10px] text-[#86948a] mt-1">
                    Permite crear, leer y actualizar recordatorios de pagos de deudas y suscripciones. Finexa utiliza el scope mínimo <code>calendar.events</code>. El usuario puede desconectar y revocar la autorización en cualquier momento desde Perfil → Integraciones.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-xs">📊 Google Sheets</h5>
                    <span className="text-[9px] text-[#10b981] font-bold">OAuth 2.0</span>
                  </div>
                  <p className="text-[10px] text-[#86948a] mt-1">
                    Permite exportar transacciones, saldos y reportes financieros a una hoja de cálculo en su Google Drive. Solo se envían los datos cuando usted presiona explícitamente "Exportar a Google Sheets".
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-[#0f131c] border border-[#3c4a42]/50">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-xs">🤖 Procesamiento OCR e Inteligencia Artificial</h5>
                    <span className="text-[9px] text-purple-400 font-bold">Visión & LLM</span>
                  </div>
                  <p className="text-[10px] text-[#86948a] mt-1">
                    Al escanear un tiquete, la imagen es procesada por el motor de visión para detectar texto, comercio y totales. Las imágenes son efímeras y se utilizan exclusivamente para el análisis de los valores a registrar. Si configura una API de IA externa (como NVIDIA AI), las peticiones se comunican directamente mediante su API Key configurada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: CONTACTO Y SOPORTE */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#10b981] text-[18px]">support_agent</span>
                <span>Contacto, Asistencia y Ejercicio de Derechos</span>
              </h3>

              <p className="text-[11px] text-[#86948a]">
                Para dudas sobre la plataforma, sugerencias, reporte de incidentes o ejercicio de derechos sobre sus datos personales:
              </p>

              <div className="p-4 rounded-3xl bg-[#0f131c] border border-[#3c4a42]/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#10b981]/20 text-[#10b981] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#86948a] uppercase">Canal de Soporte Directo</span>
                    <h5 className="text-xs font-bold text-white">soporte@finexa.app</h5>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#3c4a42]/40 text-[11px] text-[#86948a] space-y-1">
                  <p>• Tiempo de respuesta habitual: 24 a 48 horas hábiles.</p>
                  <p>• Solicitudes de eliminación completa de registros de cuenta o asistencia técnica.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#181c24] border border-[#3c4a42]/40 text-center">
                <p className="text-[10px] text-[#86948a]">
                  Finexa • Finanzas Personales Inteligentes • Costa Rica & Internacional
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3c4a42]/40 bg-[#121620] flex items-center justify-between">
          <span className="text-[10px] text-[#86948a]">
            Documento legal revisable y auditable por el usuario
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#003824] font-black text-xs shadow-md transition-all active:scale-95"
          >
            Entendido y Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
