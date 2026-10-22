export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = (process.env.NVIDIA_API_KEY || req.body?.apiKey || '').trim();
  if (!apiKey || apiKey.length < 8) {
    return res.status(400).json({
      error: 'Finexa-Plus no está configurado en el servidor.',
    });
  }

  const { userPrompt, financialContext, history } = req.body || {};
  if (!userPrompt) {
    return res.status(400).json({ error: 'Debes proporcionar una consulta para Finexa-Plus.' });
  }

  const endpoint = (process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '') + '/chat/completions';
  const envModel = (process.env.NVIDIA_MODEL || '').trim().replace(/^["']|["']$/g, '');
  const model = (!envModel || envModel === 'glm-5-3' || envModel === 'glm-5.3' || envModel === 'Finexa-Plus')
    ? 'z-ai/glm-5.3'
    : envModel;

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

    if (!reply && messageObj?.reasoning_content) {
      reply = messageObj.reasoning_content;
    }

    if (!reply) {
      reply = 'No se pudo generar la respuesta en este momento. Intenta de nuevo.';
    }

    return res.status(200).json({ reply });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error de comunicación del servidor con IA.' });
  }
}
