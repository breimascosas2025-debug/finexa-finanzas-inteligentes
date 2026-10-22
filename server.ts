import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getResolvedModel(): string {
  const envModel = (process.env.NVIDIA_MODEL || '').trim().replace(/^["']|["']$/g, '');
  if (!envModel || envModel === 'glm-5-3' || envModel === 'glm-5.3' || envModel === 'Finexa-Plus') {
    return 'z-ai/glm-5.3';
  }
  return envModel;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '15mb' }));

  // ==========================================
  // RUTAS PROXY PRIVADAS (APIs del Servidor)
  // ==========================================

  // 1. Estado de configuración privada de Finexa-Plus en el servidor
  app.get('/api/finexa-plus/status', (req, res) => {
    const apiKey = (process.env.NVIDIA_API_KEY || '').trim();
    const isConfigured = apiKey.length >= 8;

    res.json({
      configured: isConfigured,
      serverPrivateMode: true,
      model: 'Finexa-Plus',
      displayName: 'Finexa-Plus',
    });
  });

  // 2. Test de conexión privada contra NVIDIA NIM (GLM 5-3)
  app.post('/api/finexa-plus/test', async (req, res) => {
    const apiKey = (process.env.NVIDIA_API_KEY || req.body.apiKey || '').trim();
    if (!apiKey || apiKey.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'No se detectó la clave privada NVIDIA_API_KEY en el servidor.',
      });
    }

    const endpoint = (process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '') + '/chat/completions';
    const model = getResolvedModel();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: 'Ping de prueba' },
          ],
          max_tokens: 60,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errorMsg = err?.error?.message || err?.message || `HTTP ${response.status}: Error de autenticación.`;
        return res.status(response.status).json({ success: false, message: errorMsg });
      }

      const data = await response.json();
      const messageObj = data?.choices?.[0]?.message;
      const reply = messageObj?.content || messageObj?.reasoning_content || 'Finexa-Plus activo y en línea.';

      return res.json({
        success: true,
        message: `¡Asistente Finexa Plus conectado y listo para responder consultas!`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Error de red al conectar con el servidor de IA.',
      });
    }
  });

  // 3. Proxy de Chat Privado para Finexa Plus con soporte de Streaming (SSE)
  app.post('/api/finexa-plus/chat', async (req, res) => {
    const apiKey = (process.env.NVIDIA_API_KEY || req.body.apiKey || '').trim();
    if (!apiKey || apiKey.length < 8) {
      return res.status(400).json({
        error: 'Finexa Plus no está configurado en el servidor.',
      });
    }

    const { userPrompt, financialContext, history, stream = true } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: 'Debes proporcionar una consulta para Finexa Plus.' });
    }

    const endpoint = (process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '') + '/chat/completions';
    const model = getResolvedModel();

    const systemInstructions = `Eres exclusivamente "Finexa Plus", el asistente personal de finanzas inteligentes de la aplicación Finexa Plus.
Tu única presentación cuando te saludan o preguntan quién eres es: "Hola, soy el asistente de Finexa Plus. ¿En qué puedo ayudarte?"
REGLAS OBLIGATORIAS:
1. No menciones GLM, modelos de IA, motores neuronales, NVIDIA NIM ni ningún detalle técnico o de arquitectura en tu respuesta.
2. Responde en español de forma rápida, directa, profesional y clara, sin textos innecesarios ni rodeos.
3. Utiliza EXCLUSIVAMENTE los datos financieros reales del usuario provistos en el contexto. Si no hay datos, indícalo con transparencia.
4. NUNCA inventes transacciones, montos ni saldos.
5. Puedes consultar ingresos y gastos, analizar el dinero disponible, organizar deudas, consultar pagos pendientes, explicar movimientos, ayudar a crear presupuestos y comparar gastos entre meses.
6. Menciona siempre los montos con la moneda correspondiente (₡ colones o $ dólares).

CONTEXTO FINANCIERO REAL DEL USUARIO:
${financialContext || 'No hay datos financieros registrados en la cuenta.'}`;

    const messagesPayload: any[] = [
      { role: 'system', content: systemInstructions },
    ];

    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((h: any) => {
        messagesPayload.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content,
        });
      });
    }

    messagesPayload.push({
      role: 'user',
      content: userPrompt,
    });

    try {
      const wantsStream = Boolean(stream && req.headers.accept?.includes('text/event-stream'));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          max_tokens: 1000,
          temperature: 0.3,
          stream: wantsStream,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errorMsg = err?.error?.message || err?.message || `HTTP ${response.status}: Error en servidor de IA.`;
        return res.status(response.status).json({ error: errorMsg });
      }

      if (wantsStream && response.body) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }

        return res.end();
      }

      const data = await response.json();
      const messageObj = data?.choices?.[0]?.message;
      let reply = messageObj?.content;
      
      if (!reply && messageObj?.reasoning_content) {
        reply = messageObj.reasoning_content;
      }
      
      if (!reply) {
        reply = 'Hola, soy el asistente de Finexa Plus. ¿En qué puedo ayudarte?';
      }

      return res.json({ reply });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error de comunicación del servidor con IA.' });
    }
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC FILES
  // ==========================================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Finexa Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
