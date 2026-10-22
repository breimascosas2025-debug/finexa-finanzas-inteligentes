export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = (process.env.NVIDIA_API_KEY || '').trim();
  const isConfigured = apiKey.length >= 8;

  return res.status(200).json({
    configured: isConfigured,
    serverPrivateMode: true,
    model: 'Finexa Plus',
    displayName: 'Finexa Plus',
  });
}
