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
  {name:'Аромамашина профессиональная',vol:'',price:6000},
  {name:'Кронштейн 1-местный',vol:'',price:2500},
  {name:'Кронштейн 2-местный',vol:'',price:3500},
];

const KP_CSS = '.kp-doc{background:#fff;color:#1a1a1a;padding:36px 40px;max-width:700px;margin:0 auto;font-size:12.5px;font-family:"Helvetica Neue",Arial,sans-serif}.kp-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid #ddd}.kp-brand{font-size:26px;font-weight:300;letter-spacing:4px;color:#1a1a1a}.kp-brand em{font-style:italic}.kp-brand-sub{font-size:9px;color:#999;letter-spacing:1px;margin-top:3px}.kp-req{text-align:right;font-size:11px;color:#777;line-height:1.6}.kp-date{font-size:10px;color:#999;margin-bottom:12px}.kp-intro{font-size:12px;color:#444;margin-bottom:18px;line-height:1.6}.kp-sec{margin-bottom:16px}.kp-heading{font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ddd}.kp-t{width:100%;border-collapse:collapse;font-size:11.5px}.kp-t th{background:#1A1A2E;color:#C9A84C;padding:6px 10px;text-align:left;font-weight:500}.kp-t td{padding:6px 10px;border-bottom:1px solid #eee}.kp-t tr:nth-child(even){background:#f9f6ee}.kp-tot td{background:#1A1A2E;color:#C9A84C;font-weight:600;font-size:12.5px}.kp-free td{color:#2E7D32;font-size:11px}.kp-aromanote{font-size:10.5px;color:#777;margin-top:10px;font-style:italic}.kp-foot{margin-top:24px;padding-top:14px;border-top:1px solid #ddd;font-size:10.5px;color:#888;line-height:1.6;text-align:center}';

async function sbFetch(path, method, body) {
  const opts = { method: method || 'GET', headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' } };
  if (method === 'POST' || method === 'PATCH') { opts.body = JSON.stringify(body); if(method==='PATCH') opts.headers['Prefer']='return=minimal'; }
  if (method === 'POST') opts.headers['Prefer'] = 'return=representation';
  return fetch(SB_URL + '/rest/v1/' + path, opts);
}

export default async function handler(req, res) {
  // POST: order or metrics
  if (req.method === 'POST') {
    const body = req.body || {};

    if (body.action === 'metrics' && body.view_id && body.meta) {
      await sbFetch('kp_views?id=eq.' + body.view_id, 'PATCH', { meta: body.meta, duration_sec: body.meta.duration || 0 });
      res.status(200).json({ok:true}); return;
    }

    if (body.kp_id && body.items) {
      const rows = await (await sbFetch('kp_links?id=eq.' + body.kp_id + '&select=*')).json();
      if (rows && rows.length && rows[0].manager_telegram_id) {
        const kp = rows[0];
        let text = '📝 Клиент дополнил КП!\n📋 ' + (kp.client_name||'—') + ' (' + (kp.segment||'') + ')\n\n✅ Хочет добавить:\n';
        body.items.forEach(function(i){ text += '• ' + i + '\n'; });
        if (body.comment) text += '\n💬 ' + body.comment;
        text += '\n\n💰 Сумма КП: ' + (kp.total ? Number(kp.total).toLocaleString('ru-RU') + ' ₽' : '—');
        await fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: kp.manager_telegram_id, text: text })
        }).catch(function(){});
      }
      res.status(200).json({ok:true}); return;
    }

    res.status(400).json({error:'Bad request'}); return;
  }

  // GET: serve KP page
  const id = req.query.id;
  if (!id) { res.status(400).send('Missing id'); return; }
  const isMgr = req.query.mgr === '1';

  const rows = await (await sbFetch('kp_links?id=eq.' + id + '&select=*')).json();
  if (!rows || !rows.length) { res.status(404).send('КП не найдено'); return; }
  const kp = rows[0];

  const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
  const ua = req.headers['user-agent'] || '';
  const device = /mobile|android|iphone/i.test(ua) ? 'Телефон' : 'Компьютер';
  const browser = /edg/i.test(ua) ? 'Edge' : /chrome/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : /firefox/i.test(ua) ? 'Firefox' : 'Другой';

  let city = '';
  try { city = (await (await fetch('http://ip-api.com/json/' + ip + '?fields=city&lang=ru')).json()).city || ''; } catch(e) {}

  let viewId = '';
  if (!isMgr) {
    try {
      const vr = await (await sbFetch('kp_views', 'POST', { kp_id: id, ip, device, browser, city })).json();
      viewId = (vr && vr[0]) ? String(vr[0].id) : '';
    } catch(e) {}

    await sbFetch('kp_links?id=eq.' + id, 'PATCH', { views_count: (kp.views_count || 0) + 1 });

    let shouldNotify = true;
    try {
      const recent = await (await sbFetch('kp_views?kp_id=eq.' + id + '&ip=eq.' + ip + '&created_at=gte.' + new Date(Date.now()-600000).toISOString() + '&order=created_at.desc&limit=2')).json();
      if (recent && recent.length > 1) shouldNotify = false;
    } catch(e) {}

    if (shouldNotify && kp.manager_telegram_id) {
      const views = (kp.views_count || 0) + 1;

      // Check unique IPs (forwarding detection)
      let uniqueIPs = 1;
      let forwarded = false;
      try {
        const ipCheck = await (await sbFetch('kp_views?kp_id=eq.' + id + '&select=ip&order=created_at.desc&limit=50')).json();
        const ips = new Set(ipCheck.map(function(v){ return v.ip; }));
        uniqueIPs = ips.size;
        forwarded = uniqueIPs > 1 && !ips.has(ip);
      } catch(e) {}

      // Check previous views for scoring
      let totalDuration = 0;
      let maxScroll = 0;
      let printed = false;
      let addClicked = false;
      try {
        const prevViews = await (await sbFetch('kp_views?kp_id=eq.' + id + '&select=meta,duration_sec&order=created_at.desc&limit=20')).json();
        prevViews.forEach(function(v) {
          totalDuration += (v.duration_sec || 0);
          if (v.meta) {
            if (v.meta.scroll_pct > maxScroll) maxScroll = v.meta.scroll_pct;
            if (v.meta.printed) printed = true;
            if (v.meta.add_clicked) addClicked = true;
          }
        });
      } catch(e) {}

      // Calculate score
      let score = 0;
      if (views >= 3) score += 2;
      else if (views >= 2) score += 1;
      if (totalDuration >= 120) score += 2;
      else if (totalDuration >= 30) score += 1;
      if (maxScroll >= 90) score += 1;
      if (printed) score += 2;
      if (addClicked) score += 2;
      if (forwarded || uniqueIPs > 1) score += 2;

      let heat = '🔵 Просто открыл — пока без интереса';
      let advice = '';
      if (score >= 6) { heat = '🔥 Очень заинтересован!'; advice = '\n\n💡 Звони прямо сейчас — клиент изучает КП!'; }
      else if (score >= 3) { heat = '🟡 Есть интерес — изучает'; advice = '\n\n💡 Напиши follow-up сегодня'; }

      var segRu = {restaurant:'Ресторан',hotel:'Отель',spa:'СПА',glamping:'Глэмпинг',fitness:'Фитнес'}[kp.segment] || kp.segment || '';
      let text = '👁 Клиент открыл КП!\n'
        + '📋 ' + (kp.client_name||'—') + ' (' + segRu + ')\n'
        + '💰 ' + (kp.total ? Number(kp.total).toLocaleString('ru-RU') + ' ₽' : '—') + '\n'
        + '📱 ' + device + ', ' + browser + (city ? ', ' + city : '') + '\n'
        + '👀 Просмотров: ' + views + '\n'
        + heat;

      if (forwarded) text += '\n📤 Новое устройство — возможно переслал коллеге/руководству';
      if (uniqueIPs > 1) text += '\n👥 Открыли с ' + uniqueIPs + ' разных устройств';
      if (printed) text += '\n🖨 Клиент распечатал КП';
      if (addClicked) text += '\n＋ Клиент смотрел доп. продукты';
      text += advice;

      await fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: kp.manager_telegram_id, text: text })
      }).catch(function(){});
    }
  }

  // Build add-products list
  const kpHtml = kp.kp_html || '';
  const addHtml = PRODUCTS_LIST.filter(function(p){ return !kpHtml.includes(p.name); }).map(function(p){
    return '<label style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #eee;cursor:pointer">'
      + '<input type="checkbox" name="add" value="' + p.name + (p.vol?' '+p.vol:'') + ' — ' + p.price.toLocaleString('ru-RU') + ' ₽" style="width:18px;height:18px">'
      + '<span>' + p.name + '</span>'
      + (p.vol ? '<span style="color:#999;font-size:11px">' + p.vol + '</span>' : '')
      + '<span style="margin-left:auto;font-weight:500">' + p.price.toLocaleString('ru-RU') + ' ₽</span></label>';
  }).join('');

  const pageCSS = 'body{margin:0;padding:20px;background:#f5f0e8;font-family:system-ui,sans-serif}' + KP_CSS
    + '.kp-actions{max-width:700px;margin:16px auto;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}'
    + '.kp-actions button{padding:10px 24px;border-radius:8px;border:none;cursor:pointer;font-size:14px;font-family:inherit}'
    + '.btn-print{background:#1A1A2E;color:#C9A84C}'
    + '.btn-add{background:#C9A84C;color:#1A1A2E;font-weight:600}'
    + '.add-panel{max-width:700px;margin:20px auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.1);display:none}'
    + '.add-comment{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;min-height:50px;margin-top:12px;box-sizing:border-box}'
    + '.add-submit{width:100%;padding:12px;background:#1A1A2E;color:#C9A84C;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-top:12px;font-family:inherit}'
    + '@media print{body{background:#fff;padding:0}.kp-actions,.add-panel{display:none}}';

  const page = '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>КП Asense — ' + (kp.client_name||'') + '</title>'
    + '<style>' + pageCSS + '</style></head><body>'
    + kpHtml
    + '<div class="kp-actions">'
    + '<button class="btn-print" onclick="window.print()">🖨 Распечатать</button>'
    + '<button class="btn-add" onclick="toggleAdd()">＋ Дополнить заказ</button>'
    + '</div>'
    + '<div class="add-panel" id="addPanel">'
    + '<h3 style="font-size:15px;margin:0 0 4px;color:#1A1A2E">Добавить к заказу</h3>'
    + '<p style="font-size:12px;color:#999;margin:0 0 14px">Выберите продукты — менеджер получит ваш запрос</p>'
    + '<div id="addProducts">' + addHtml + '</div>'
    + '<textarea class="add-comment" id="addComment" placeholder="Комментарий (необязательно)..."></textarea>'
    + '<button class="add-submit" id="addBtn" onclick="submitOrder()">📨 Отправить запрос менеджеру</button>'
    + '</div>'
    + '<script>'
    + 'var VIEW_ID="' + viewId + '";'
    + 'var KP_ID="' + id + '";'
    + 'function toggleAdd(){var p=document.getElementById("addPanel");if(!p)return;var h=!p.style.display||p.style.display==="none";p.style.display=h?"block":"none";}'
    + 'async function submitOrder(){var ch=document.querySelectorAll("#addProducts input:checked");if(!ch.length){alert("Выберите хотя бы один продукт");return;}var items=[];ch.forEach(function(c){items.push(c.value);});var cm=document.getElementById("addComment").value.trim();var btn=document.getElementById("addBtn");btn.textContent="⏳ Отправляю...";btn.disabled=true;try{var r=await fetch("/api/kp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kp_id:KP_ID,items:items,comment:cm})});if(r.ok){btn.textContent="✅ Отправлено!";btn.style.background="#2E7D32";btn.style.color="#fff";setTimeout(function(){document.getElementById("addPanel").style.display="none";},2000);}else{btn.textContent="❌ Ошибка";btn.disabled=false;}}catch(e){btn.textContent="❌ Ошибка";btn.disabled=false;}}'
    + 'var _st=Date.now(),_ms=0,_pr=false,_ac=false,_ref=document.referrer||"direct";'
    + 'window.addEventListener("scroll",function(){var s=Math.round((window.scrollY+window.innerHeight)/document.body.scrollHeight*100);if(s>_ms)_ms=s;});'
    + 'var _op=window.print;window.print=function(){_pr=true;_op.call(window);};'
    + 'function _send(){if(!VIEW_ID)return;var d=Math.round((Date.now()-_st)/1000);navigator.sendBeacon("/api/kp",new Blob([JSON.stringify({action:"metrics",view_id:VIEW_ID,meta:{duration:d,scroll_pct:_ms,printed:_pr,add_clicked:_ac,referrer:_ref.substring(0,200)}})],{type:"application/json"}));}'
    + 'window.addEventListener("beforeunload",_send);setInterval(function(){if(VIEW_ID)_send();},30000);'
    + '</script></body></html>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page);
}
