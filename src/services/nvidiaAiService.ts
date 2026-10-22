/**
 * Servicio y Arquitectura para Integración de Inteligencia Artificial Finexa Plus
 * 
 * ARQUITECTURA PRIVADA DE SERVIDOR (Zero Client Secret Exposure):
 * - Las claves privadas se gestionan de forma segura en el servidor (.env)
 * - Las peticiones de chat pasan por la ruta proxy privada /api/finexa-plus/chat
 * - Soporte para streaming de alta velocidad (Server-Sent Events)
 * - Identidad exclusiva: Finexa Plus
 */

export interface NvidiaAiConfig {
  apiKey: string;
  model: string;
  displayName: string;
  endpoint: string;
  maxTokens: number;
  temperature: number;
  status: 'not_configured' | 'testing' | 'connected' | 'error';
  isServerPrivate: boolean;
  lastTestedAt?: string;
  lastErrorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export const POPULAR_NVIDIA_MODELS = [
  {
    id: 'finexa-plus',
    name: 'Finexa Plus',
    technicalEngine: 'Finexa Plus Core',
    description: 'Asistente financiero inteligente de alta velocidad para análisis contable, proyección de ahorros, presupuestos y control de deudas.',
  },
];

export const DEFAULT_NVIDIA_CONFIG: NvidiaAiConfig = {
  apiKey: '',
  model: 'Finexa-Plus',
  displayName: 'Finexa Plus',
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
        displayName: 'Finexa Plus',
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
    displayName: 'Finexa Plus',
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
    console.warn('[Finexa Plus] Servidor privado no respondió status:', e);
  }
  return { configured: false, serverPrivateMode: false, displayName: 'Finexa Plus' };
}

/**
 * Prueba la conexión con el servidor privado para Finexa Plus
 */
export async function testNvidiaConnection(config?: Partial<NvidiaAiConfig>): Promise<{ success: boolean; message: string }> {
  try {
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
        message: data.message || '¡Conexión privada exitosa con el asistente Finexa Plus!',
      };
    } else {
      const errorMsg = data.message || `Error en el servidor privado de Finexa Plus (${response.status}).`;
      saveStoredNvidiaConfig({
        status: 'error',
        lastTestedAt: new Date().toISOString(),
        lastErrorMessage: errorMsg,
      });
      return { success: false, message: errorMsg };
    }
  } catch (error: any) {
    const msg = error.message || 'Error al conectar con el servidor backend de Finexa Plus.';
    saveStoredNvidiaConfig({
      status: 'error',
      lastTestedAt: new Date().toISOString(),
      lastErrorMessage: msg,
    });
    return { success: false, message: msg };
  }
}

/**
 * Consulta a Finexa Plus a través del proxy privado del servidor con soporte de streaming
 */
export async function queryFinexaPlus(params: {
  userPrompt: string;
  financialContext?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onStreamChunk?: (chunkText: string, fullTextSoFar: string) => void;
}): Promise<{ reply: string; error?: string }> {
  try {
    const wantsStream = typeof params.onStreamChunk === 'function';

    const response = await fetch('/api/finexa-plus/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(wantsStream ? { Accept: 'text/event-stream' } : {}),
      },
      body: JSON.stringify({
        userPrompt: params.userPrompt,
        financialContext: params.financialContext,
        history: params.history,
        stream: wantsStream,
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

    const contentType = response.headers.get('content-type') || '';

    // Si la respuesta es un Stream SSE
    if (wantsStream && contentType.includes('text/event-stream') && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                params.onStreamChunk!(delta, fullText);
              }
            } catch {
              // Si vino texto plano
              const chunk = trimmed.slice(6);
              fullText += chunk;
              params.onStreamChunk!(chunk, fullText);
            }
          }
        }
      }

      if (!fullText) {
        fullText = 'Hola, soy el asistente de Finexa Plus. ¿En qué puedo ayudarte?';
      }

      return { reply: fullText };
    }

    // Respuesta normal JSON
    const data = await response.json();
    const reply = data?.reply || 'Hola, soy el asistente de Finexa Plus. ¿En qué puedo ayudarte?';
    return { reply };
  } catch (err: any) {
    return {
      reply: '',
      error: err.message || 'Error de comunicación con el servidor privado de Finexa Plus.',
    };
  }
}
