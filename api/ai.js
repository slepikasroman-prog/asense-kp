export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({error:'Method not allowed'}); return; }

  const { key, folder, messages } = req.body;
  if (!key || !folder || !messages) { res.status(400).json({error:'Missing params'}); return; }

  try {
    const r = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Authorization': `Api-Key ${key}`,
        'Content-Type': 'application/json',
        'x-folder-id': folder
      },
      body: JSON.stringify({
        modelUri: `gpt://${folder}/yandexgpt-lite/latest`,
        completionOptions: { stream: false, temperature: 0.3, maxTokens: '600' },
        messages
      })
    });
    const data = await r.json();
    if (!r.ok) { res.status(r.status).json(data); return; }
    const text = data.result?.alternatives?.[0]?.message?.text || '';
    res.status(200).json({ text });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
