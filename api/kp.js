const TG_TOKEN = '8674326760:AAFzcXibu2DaxIUjUNQlldfWlBkAWi9U4yo';
const SB_URL = 'https://mtotltoanudwuxbvhejl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10b3RsdG9hbnVkd3V4YnZoZWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njk3OTAsImV4cCI6MjA5NjE0NTc5MH0.Gpl8skzkvSmUY3cNiPO0IQbgvhyLjFvMOvs5Spi1Xro';

export default async function handler(req, res) {
  const id = req.query.id;
  if (!id) { res.status(400).send('Missing id'); return; }

  // Fetch KP data from Supabase
  const r = await fetch(`${SB_URL}/rest/v1/kp_links?id=eq.${id}&select=*`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  const rows = await r.json();
  if (!rows || !rows.length) { res.status(404).send('КП не найдено'); return; }
  const kp = rows[0];

  // Get viewer info
  const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  const ua = req.headers['user-agent'] || '';
  const device = /mobile|android|iphone/i.test(ua) ? 'Телефон' : 'Компьютер';
  const browser = /chrome/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : 'Другой';

  // Record view in Supabase
  await fetch(`${SB_URL}/rest/v1/kp_views`, {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kp_id: id, ip, device, browser, city: '' })
  });

  // Update views count
  await fetch(`${SB_URL}/rest/v1/kp_links?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ views_count: (kp.views_count || 0) + 1 })
  });

  // Get city from IP (free API)
  let city = '';
  try {
    const geo = await fetch(`http://ip-api.com/json/${ip}?fields=city&lang=ru`);
    const geoData = await geo.json();
    city = geoData.city || '';
  } catch(e) {}

  // Send Telegram notification
  if (kp.manager_telegram_id) {
    const text = `👁 Клиент открыл КП!\n📋 ${kp.client_name || 'Без названия'} (${kp.segment || ''})\n💰 ${kp.total ? Number(kp.total).toLocaleString('ru-RU') + ' ₽' : '—'}\n🕐 Только что\n📱 ${device}, ${browser}${city ? ', ' + city : ''}`;
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: kp.manager_telegram_id, text, parse_mode: 'HTML' })
    }).catch(() => {});
  }

  // Serve KP HTML
  const html = kp.kp_html || '<h1>КП не найдено</h1>';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>КП Asense — ${kp.client_name || ''}</title>
<style>
  body{margin:0;padding:20px;background:#f5f0e8;font-family:system-ui,-apple-system,sans-serif}
  .kp-wrap{max-width:800px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
  @media print{body{background:#fff;padding:0}.kp-wrap{box-shadow:none;padding:20px}}
  .kp-actions{max-width:800px;margin:16px auto;display:flex;gap:10px;justify-content:center}
  .kp-actions button{padding:10px 24px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-family:inherit}
  .btn-print{background:#1A1A2E;color:#C9A84C}
  .btn-pdf{background:#C9A84C;color:#1A1A2E}
</style>
</head>
<body>
<div class="kp-wrap">${html}</div>
<div class="kp-actions">
  <button class="btn-print" onclick="window.print()">🖨 Распечатать</button>
</div>
</body>
</html>`);
}
