const TG_TOKEN = '8674326760:AAFzcXibu2DaxIUjUNQlldfWlBkAWi9U4yo';
const SB_URL = 'https://mtotltoanudwuxbvhejl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10b3RsdG9hbnVkd3V4YnZoZWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njk3OTAsImV4cCI6MjA5NjE0NTc5MH0.Gpl8skzkvSmUY3cNiPO0IQbgvhyLjFvMOvs5Spi1Xro';

export default async function handler(req, res) {
  const id = req.query.id;
  if (!id) { res.status(400).send('Missing id'); return; }
  const isMgr = req.query.mgr === '1';

  const r = await fetch(`${SB_URL}/rest/v1/kp_links?id=eq.${id}&select=*`, {
    headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
  });
  const rows = await r.json();
  if (!rows || !rows.length) { res.status(404).send('КП не найдено'); return; }
  const kp = rows[0];

  const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
  const ua = req.headers['user-agent'] || '';
  const device = /mobile|android|iphone/i.test(ua) ? 'Телефон' : 'Компьютер';
  const browser = /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : 'Другой';

  let city = '';
  try {
    const geo = await fetch(`http://ip-api.com/json/${ip}?fields=city&lang=ru`);
    city = (await geo.json()).city || '';
  } catch(e) {}

  if (!isMgr) {
    await fetch(`${SB_URL}/rest/v1/kp_views`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ kp_id: id, ip, device, browser, city })
    });
    await fetch(`${SB_URL}/rest/v1/kp_links?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ views_count: (kp.views_count || 0) + 1 })
    });

    let shouldNotify = true;
    try {
      const rc = await fetch(`${SB_URL}/rest/v1/kp_views?kp_id=eq.${id}&ip=eq.${ip}&created_at=gte.${new Date(Date.now()-600000).toISOString()}&order=created_at.desc&limit=2`,
        { headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` } });
      const recent = await rc.json();
      if (recent && recent.length > 1) shouldNotify = false;
    } catch(e) {}

    if (shouldNotify && kp.manager_telegram_id) {
      const views = (kp.views_count || 0) + 1;
      const text = `👁 Клиент открыл КП!\n📋 ${kp.client_name || '—'} (${kp.segment || ''})\n💰 ${kp.total ? Number(kp.total).toLocaleString('ru-RU') + ' ₽' : '—'}\n🕐 Только что\n📱 ${device}, ${browser}${city ? ', ' + city : ''}\n👀 Просмотров: ${views}`;
      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: kp.manager_telegram_id, text })
      }).catch(() => {});
    }
  }

  const kpCSS = `.kp-doc{background:#fff;color:#1a1a1a;padding:36px 40px;max-width:700px;margin:0 auto;font-size:12.5px;font-family:'Helvetica Neue',Arial,sans-serif}.kp-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid #ddd}.kp-brand{font-size:26px;font-weight:300;letter-spacing:4px;color:#1a1a1a}.kp-brand em{font-style:italic}.kp-brand-sub{font-size:9px;color:#999;letter-spacing:1px;margin-top:3px}.kp-req{text-align:right;font-size:11px;color:#777;line-height:1.6}.kp-date{font-size:10px;color:#999;margin-bottom:12px}.kp-intro{font-size:12px;color:#444;margin-bottom:18px;line-height:1.6}.kp-sec{margin-bottom:16px}.kp-heading{font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ddd}.kp-t{width:100%;border-collapse:collapse;font-size:11.5px}.kp-t th{background:#1A1A2E;color:#C9A84C;padding:6px 10px;text-align:left;font-weight:500}.kp-t td{padding:6px 10px;border-bottom:1px solid #eee}.kp-t tr:nth-child(even){background:#f9f6ee}.kp-tot td{background:#1A1A2E;color:#C9A84C;font-weight:600;font-size:12.5px}.kp-free td{color:#2E7D32;font-size:11px}.kp-aromanote{font-size:10.5px;color:#777;margin-top:10px;font-style:italic}.kp-foot{margin-top:24px;padding-top:14px;border-top:1px solid #ddd;font-size:10.5px;color:#888;line-height:1.6;text-align:center}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>КП Asense — ${kp.client_name||''}</title><style>body{margin:0;padding:20px;background:#f5f0e8;font-family:system-ui,sans-serif}${kpCSS}.kp-actions{max-width:700px;margin:16px auto;display:flex;gap:10px;justify-content:center}.kp-actions button{padding:10px 24px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-family:inherit}.btn-print{background:#1A1A2E;color:#C9A84C}@media print{body{background:#fff;padding:0}.kp-actions{display:none}}</style></head><body>${kp.kp_html||'<h1>КП не найдено</h1>'}<div class="kp-actions"><button class="btn-print" onclick="window.print()">🖨 Распечатать</button></div></body></html>`);
}
