const TG_TOKEN = '8674326760:AAFzcXibu2DaxIUjUNQlldfWlBkAWi9U4yo';
const SB_URL = 'https://mtotltoanudwuxbvhejl.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10b3RsdG9hbnVkd3V4YnZoZWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njk3OTAsImV4cCI6MjA5NjE0NTc5MH0.Gpl8skzkvSmUY3cNiPO0IQbgvhyLjFvMOvs5Spi1Xro';

const PRODUCTS_LIST = [
  {name:'Жидкое мыло',vol:'5 000 мл',price:5500},
  {name:'Лосьон для тела и рук',vol:'5 000 мл',price:7500},
  {name:'Гель для душа',vol:'5 000 мл',price:5500},
  {name:'Шампунь',vol:'5 000 мл',price:7500},
  {name:'Кондиционер',vol:'5 000 мл',price:7500},
  {name:'Мыло-скраб Vetiver & Rosemary',vol:'5 000 мл',price:7000},
  {name:'Рефилл аромадиффузора',vol:'1 000 мл',price:9950},
  {name:'Аромадиффузор готовый',vol:'125 мл',price:1500},
  {name:'Аромамашина профессиональная',vol:'',price:27500},
  {name:'Кронштейн 1-местный',vol:'',price:2500},
  {name:'Кронштейн 2-местный',vol:'',price:3500},
];

export default async function handler(req, res) {
  // Handle order submission
  if (req.method === 'POST') {
    const { kp_id, items, comment } = req.body || {};
    if (!kp_id || !items) { res.status(400).json({error:'Missing data'}); return; }

    const r = await fetch(`${SB_URL}/rest/v1/kp_links?id=eq.${kp_id}&select=*`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
    const rows = await r.json();
    if (!rows || !rows.length) { res.status(404).json({error:'Not found'}); return; }
    const kp = rows[0];

    if (kp.manager_telegram_id) {
      let text = `📝 Клиент дополнил КП!\n📋 ${kp.client_name||'—'} (${kp.segment||''})\n\n✅ Хочет добавить:\n`;
      items.forEach(i => { text += `• ${i}\n`; });
      if (comment) text += `\n💬 Комментарий: ${comment}`;
      text += `\n\n💰 Текущая сумма КП: ${kp.total ? Number(kp.total).toLocaleString('ru-RU') + ' ₽' : '—'}`;

      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: kp.manager_telegram_id, text })
      }).catch(() => {});
    }

    res.status(200).json({ok:true});
    return;
  }

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

  // Build product options HTML (exclude products already in KP)
  const kpHtml = kp.kp_html || '';
  const addProducts = PRODUCTS_LIST.filter(p => !kpHtml.includes(p.name)).map((p,i) =>
    `<label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee;cursor:pointer">
      <input type="checkbox" name="add" value="${p.name}${p.vol?' '+p.vol:''} — ${p.price.toLocaleString('ru-RU')} ₽" style="width:18px;height:18px">
      <span>${p.name}</span>
      ${p.vol?'<span style="color:#999;font-size:11px">'+p.vol+'</span>':''}
      <span style="margin-left:auto;font-weight:500">${p.price.toLocaleString('ru-RU')} ₽</span>
    </label>`
  ).join('');

  const kpCSS = `.kp-doc{background:#fff;color:#1a1a1a;padding:36px 40px;max-width:700px;margin:0 auto;font-size:12.5px;font-family:'Helvetica Neue',Arial,sans-serif}.kp-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid #ddd}.kp-brand{font-size:26px;font-weight:300;letter-spacing:4px;color:#1a1a1a}.kp-brand em{font-style:italic}.kp-brand-sub{font-size:9px;color:#999;letter-spacing:1px;margin-top:3px}.kp-req{text-align:right;font-size:11px;color:#777;line-height:1.6}.kp-date{font-size:10px;color:#999;margin-bottom:12px}.kp-intro{font-size:12px;color:#444;margin-bottom:18px;line-height:1.6}.kp-sec{margin-bottom:16px}.kp-heading{font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ddd}.kp-t{width:100%;border-collapse:collapse;font-size:11.5px}.kp-t th{background:#1A1A2E;color:#C9A84C;padding:6px 10px;text-align:left;font-weight:500}.kp-t td{padding:6px 10px;border-bottom:1px solid #eee}.kp-t tr:nth-child(even){background:#f9f6ee}.kp-tot td{background:#1A1A2E;color:#C9A84C;font-weight:600;font-size:12.5px}.kp-free td{color:#2E7D32;font-size:11px}.kp-aromanote{font-size:10.5px;color:#777;margin-top:10px;font-style:italic}.kp-foot{margin-top:24px;padding-top:14px;border-top:1px solid #ddd;font-size:10.5px;color:#888;line-height:1.6;text-align:center}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>КП Asense — ${kp.client_name||''}</title>
<style>body{margin:0;padding:20px;background:#f5f0e8;font-family:system-ui,sans-serif}${kpCSS}
.kp-actions{max-width:700px;margin:16px auto;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.kp-actions button{padding:10px 24px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-family:inherit}
.btn-print{background:#1A1A2E;color:#C9A84C}
.btn-add{background:#C9A84C;color:#1A1A2E;font-weight:600}
.add-panel{max-width:700px;margin:20px auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);display:none}
.add-panel h3{font-size:15px;margin:0 0 4px;color:#1A1A2E}
.add-panel p{font-size:12px;color:#999;margin:0 0 14px}
.add-comment{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;min-height:50px;margin-top:12px}
.add-submit{width:100%;padding:12px;background:#1A1A2E;color:#C9A84C;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-top:12px;font-family:inherit}
.add-submit:hover{background:#2a2a4e}
@media print{body{background:#fff;padding:0}.kp-actions,.add-panel{display:none}}</style>
</head><body>
${kpHtml}
<div class="kp-actions">
  <button class="btn-print" onclick="window.print()">🖨 Распечатать</button>
  <button class="btn-add" onclick="toggleAdd()">＋ Дополнить заказ</button>
</div>
<div class="add-panel" id="addPanel">
  <h3>Добавить к заказу</h3>
  <p>Выберите продукты — менеджер получит ваш запрос</p>
  <div id="addProducts">${addProducts}</div>
  <textarea class="add-comment" id="addComment" placeholder="Комментарий (необязательно)..."></textarea>
  <button class="add-submit" id="addBtn" onclick="submitOrder()">📨 Отправить запрос менеджеру</button>
</div>
<script>
function toggleAdd(){
  var p=document.getElementById('addPanel');
  if(p) p.style.display=p.style.display==='none'?'block':'none';
}
async function submitOrder(){
  var checks=document.querySelectorAll('#addProducts input:checked');
  if(!checks.length){alert('Выберите хотя бы один продукт');return;}
  var items=[];checks.forEach(function(c){items.push(c.value);});
  var comment=document.getElementById('addComment').value.trim();
  var btn=document.getElementById('addBtn');
  btn.textContent='⏳ Отправляю...';btn.disabled=true;
  try{
    var r=await fetch('/api/kp',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({kp_id:'${id}',items:items,comment:comment})});
    if(r.ok){
      btn.textContent='✅ Отправлено!';
      btn.style.background='#2E7D32';btn.style.color='#fff';
      setTimeout(function(){document.getElementById('addPanel').style.display='none';},2000);
    }else{btn.textContent='❌ Ошибка';btn.disabled=false;}
  }catch(e){btn.textContent='❌ Ошибка';btn.disabled=false;}
}
</script>
</body></html>`);
}
