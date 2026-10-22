export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = (process.env.NVIDIA_API_KEY || req.body?.apiKey || '').trim();
  if (!apiKey || apiKey.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'No se detectó la clave privada NVIDIA_API_KEY en el servidor.',
    });
  }

  const endpoint = (process.env.NVIDIA_ENDPOINT || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '') + '/chat/completions';
  const envModel = (process.env.NVIDIA_MODEL || '').trim().replace(/^["']|["']$/g, '');
  const model = (!envModel || envModel === 'glm-5-3' || envModel === 'glm-5.3' || envModel === 'Finexa-Plus')
    ? 'z-ai/glm-5.3'
    : envModel;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Ping de prueba' }],
        max_tokens: 60,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorMsg = err?.error?.message || err?.message || `HTTP ${response.status}: Error de autenticación.`;
      return res.status(response.status).json({ success: false, message: errorMsg });
    }

    return res.status(200).json({
      success: true,
      message: '¡Finexa-Plus (GLM 5-3) conectado y listo en modo privado!',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error de red al conectar con el servidor de IA.',
    });
  }
}
