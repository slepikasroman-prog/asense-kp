export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(200).send('ok'); return; }
  
  const update = req.body;
  if (!update || !update.message) { res.status(200).send('ok'); return; }
  
  const chatId = update.message.chat.id;
  const text = update.message.text || '';
  const name = update.message.from.first_name || '';
  
  const TG_TOKEN = '8674326760:AAFzcXibu2DaxIUjUNQlldfWlBkAWi9U4yo';
  
  if (text === '/start') {
    const reply = `Привет, ${name}! 👋\n\nЭто бот уведомлений Asense КП.\n\n📌 Ваш Telegram ID: <code>${chatId}</code>\n\nСкопируйте этот ID и вставьте в поле «Telegram ID» в профиле приложения asense-kp.vercel.app\n\nПосле этого вы будете получать уведомления когда клиенты открывают ваши КП.`;
    
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'HTML' })
    });
  }
  
  res.status(200).send('ok');
}
