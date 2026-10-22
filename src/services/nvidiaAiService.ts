/**
 * Servicio y Arquitectura para Integración de Inteligencia Artificial Finexa-Plus (NVIDIA NIM / GLM 5-3)
 * 
 * ARQUITECTURA PRIVADA DE SERVIDOR (Zero Client Secret Exposure):
 * - Las claves privadas (NVIDIA_API_KEY) se gestionan de forma segura en el servidor (.env)
 * - Las peticiones de chat pasan por la ruta proxy privada /api/finexa-plus/chat
 * - El navegador del usuario nunca descarga ni almacena secretos privados
 * - El único modelo visible en la interfaz se llama "Finexa-Plus" (disfrazado de GLM 5-3)
 */

export interface NvidiaAiConfig {
  apiKey: string;
  model: string;
  displayName: string;
  endpoint: string;
  maxTokens: number;
  temperature: number;
  status: 'not_configured' | 'testing' | 'connected' | 'error';
  isServerPrivate: boolean; // Indica si la clave está guardada privadamente en el servidor (.env)
  lastTestedAt?: string;
  lastErrorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// El único modelo visible en la app
export const POPULAR_NVIDIA_MODELS = [
  {
    id: 'glm-5-3',
    name: 'Finexa-Plus',
    technicalEngine: 'GLM 5-3 Neural Engine',
    description: 'Motor neural avanzado de alta velocidad, análisis contable, proyección de ahorros y optimización de gastos.',
  },
];

export const DEFAULT_NVIDIA_CONFIG: NvidiaAiConfig = {
  apiKey: '',
  model: 'glm-5-3',
  displayName: 'Finexa-Plus',
  endpoint: '/api/finexa-plus',
  maxTokens: 1024,
  temperature: 0.3,
  status: 'not_configured',
  isServerPrivate: false,
};

export function getStoredNvidiaConfig(): NvidiaAiConfig {
  try {
    const raw = localStorage.getItem('finexa_nvidia_ai_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_NVIDIA_CONFIG,
        ...parsed,
        model: 'glm-5-3',
        displayName: 'Finexa-Plus',
      };
    }
  } catch {}
  return DEFAULT_NVIDIA_CONFIG;
}

export function saveStoredNvidiaConfig(config: Partial<NvidiaAiConfig>) {
  const current = getStoredNvidiaConfig();
  const updated = {
    ...current,
    ...config,
    model: 'glm-5-3',
    displayName: 'Finexa-Plus',
  };
  localStorage.setItem('finexa_nvidia_ai_config', JSON.stringify(updated));
  return updated;
}

/**
 * Consulta el estado de la API privada en el servidor backend (/api/finexa-plus/status)
 */
export async function checkServerPrivateAiStatus(): Promise<{
  configured: boolean;
  serverPrivateMode: boolean;
  displayName: string;
}> {
  try {
    const res = await fetch('/api/finexa-plus/status');
    if (res.ok) {
      const data = await res.json();
      if (data.configured) {
        saveStoredNvidiaConfig({
          status: 'connected',
          isServerPrivate: true,
          lastTestedAt: new Date().toISOString(),
          lastErrorMessage: undefined,
        });
      }
      return data;
    }
  } catch (e) {
    console.warn('[Finexa-Plus] Servidor privado no respondió status:', e);
  }
  return { configured: false, serverPrivateMode: false, displayName: 'Finexa-Plus' };
}

/**
 * Prueba la conexión con la API de NVIDIA para Finexa-Plus (GLM 5-3)
 * Utiliza el proxy privado del servidor para mantener la clave 100% segura
 */
export async function testNvidiaConnection(config?: Partial<NvidiaAiConfig>): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Intentar prueba a través de la ruta privada del servidor
    const response = await fetch('/api/finexa-plus/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: config?.apiKey || undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      saveStoredNvidiaConfig({
        status: 'connected',
        isServerPrivate: true,
        lastTestedAt: new Date().toISOString(),
        lastErrorMessage: undefined,
      });
      return {
        success: true,
        message: data.message || '¡Conexión privada exitosa con NVIDIA NIM (Finexa-Plus / GLM 5-3)!',
      };
    } else {
      const errorMsg = data.message || `Error en el servidor privado de Finexa-Plus (${response.status}).`;
      saveStoredNvidiaConfig({
        status: 'error',
        lastTestedAt: new Date().toISOString(),
        lastErrorMessage: errorMsg,
      });
      return { success: false, message: errorMsg };
    }
  } catch (error: any) {
    const msg = error.message || 'Error al conectar con el servidor backend de Finexa.';
    saveStoredNvidiaConfig({
      status: 'error',
      lastTestedAt: new Date().toISOString(),
      lastErrorMessage: msg,
    });
    return { success: false, message: msg };
  }
}

/**
 * Consulta a Finexa-Plus enviando los datos a través del proxy privado del servidor (/api/finexa-plus/chat)
 * De esta forma la API Key NUNCA viaja al cliente ni se expone públicamente
 */
export async function queryFinexaPlus(params: {
  userPrompt: string;
  financialContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ reply: string; error?: string }> {
  try {
    const response = await fetch('/api/finexa-plus/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPrompt: params.userPrompt,
        financialContext: params.financialContext,
        history: params.history,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorMsg =
        err?.error ||
        err?.message ||
        `Error ${response.status}: No se pudo procesar la consulta en el servidor privado.`;
      return {
        reply: '',
        error: errorMsg,
      };
    }

    const data = await response.json();
    const reply = data?.reply || 'Finexa-Plus no devolvió una respuesta válida.';
    return { reply };
  } catch (err: any) {
    return {
      reply: '',
      error: err.message || 'Error de comunicación con el servidor privado de Finexa-Plus.',
    };
  }
}
