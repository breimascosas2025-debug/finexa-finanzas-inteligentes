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
        message: `¡Finexa-Plus (GLM 5-3) conectado y listo en modo privado!`,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Error de red al conectar con el servidor de IA.',
      });
    }
  });

  // 3. Proxy de Chat Privado para Finexa-Plus (GLM 5-3)
  app.post('/api/finexa-plus/chat', async (req, res) => {
    const apiKey = (process.env.NVIDIA_API_KEY || req.body.apiKey || '').trim();
    if (!apiKey || apiKey.length < 8) {
      return res.status(400).json({
        error: 'Finexa-Plus no está configurado en el servidor.',
      });
    }

    const { userPrompt, financialContext, history } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: 'Debes proporcionar una consulta para Finexa-Plus.' });
    }

    const endpoint = (process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '') + '/chat/completions';
    const model = getResolvedModel();

    const systemInstructions = `Eres "Finexa-Plus", el asistente personal de finanzas inteligentes de la aplicación Finexa.
Tu arquitectura interna está potenciada por el motor neural GLM 5-3.
Tu personalidad es profesional, motivadora, analítica, clara y directa.

CONTEXTO FINANCIERO DEL USUARIO EN FINEXA:
${financialContext || 'No hay datos financieros sincronizados en este momento.'}

INSTRUCCIONES DE RESPUESTA:
1. Responde siempre en español.
2. Utiliza los datos del contexto financiero del usuario para responder con exactitud (menciona montos en colones ₡ o dólares $ según corresponda).
3. Da sugerencias prácticas para ahorrar, optimizar compras, amortizar deudas o proyectar presupuestos.
4. Mantén tus respuestas claras y agradables de leer en pantallas móviles.
5. Firma o preséntate como Finexa-Plus cuando sea necesario.`;

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
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: messagesPayload,
          max_tokens: 1200,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errorMsg = err?.error?.message || err?.message || `HTTP ${response.status}: Error en servidor de IA.`;
        return res.status(response.status).json({ error: errorMsg });
      }

      const data = await response.json();
      const messageObj = data?.choices?.[0]?.message;
      let reply = messageObj?.content;
      
      // Si el modelo razonador gastó tokens en reasoning_content
      if (!reply && messageObj?.reasoning_content) {
        reply = messageObj.reasoning_content;
      }
      
      if (!reply) {
        reply = 'No se pudo generar la respuesta en este momento. Intenta de nuevo.';
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
