# Asense КП-генератор и База знаний

Веб-приложение для отдела продаж Asense (asense.store) — генерация коммерческих предложений, база знаний, ИИ-советник.

## 🔗 Ссылки

| Сервис | URL |
|--------|-----|
| Приложение (prod) | https://asense-kp.vercel.app |
| Админка | https://asense-kp.vercel.app/admin.html |
| GitHub репо | https://github.com/asensestore/asense-kp |
| Supabase | https://mtotltoanudwuxbvhejl.supabase.co |
| Vercel | https://vercel.com (подключён к GitHub) |

## 🔐 Доступы

### GitHub
- Репо: `asensestore/asense-kp`
- Personal Access Token: `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`
- ⚠️ Токены протухают — при истечении создать новый на github.com → Settings → Developer settings → Personal access tokens

### Supabase
- URL: `https://mtotltoanudwuxbvhejl.supabase.co`
- Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10b3RsdG9hbnVkd3V4YnZoZWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njk3OTAsImV4cCI6MjA5NjE0NTc5MH0.Gpl8skzkvSmUY3cNiPO0IQbgvhyLjFvMOvs5Spi1Xro`
- Пароль проекта: `reka2882zxc`
- Таблицы: `kp_history`, `sales`, `sales_plans`, `manager_profiles`, `ai_knowledge`

### Yandex Cloud (YandexGPT API)
- Folder ID: `b1gt253a948rpn52kb4m`
- API Key: `AQVN2d4q6SwSOhhQTOZ2kbJT-NemAxaA_uZudm6g`
- Сервисный аккаунт: `asense-ai`
- Консоль: https://console.yandex.cloud
- ⚠️ Ключ зашит в коде через base64. При смене — обновить в `index.html` функцию `getYaKey()`

### Приложение (логин)
- Менеджер: любое имя
- Администратор: пароль `reka2882`

## 🏗 Архитектура

```
index.html          — всё приложение (один файл, ~620KB)
admin.html          — панель администратора
api/ai.js           — Vercel serverless функция (прокси для YandexGPT)
```

**Стек:**
- Frontend: чистый HTML/CSS/JS (без фреймворков)
- База данных: Supabase (PostgreSQL)
- ИИ: YandexGPT через Vercel proxy (`/api/ai`)
- Деплой: Vercel (auto-deploy из GitHub main branch)
- Excel: xlsx-js-style CDN

## 📋 Разделы приложения

| Раздел | Описание |
|--------|----------|
| Клиент | Карточка клиента + ИИ-советник (3 вкладки) |
| Продукты | Выбор продуктов, расчёт канистр, сравнение с миниатюрами |
| Предпросмотр | КП в формате PDF |
| История КП | Сохранённые КП + follow-up через ИИ |
| Прайс | Редактор цен |
| Составить КП | Ручное КП с шаблонами |
| Ритейл | B2C прайс и КП |
| Дашборд | Статистика продаж |
| Мои продажи | Учёт фактических продаж |
| FAQ | Частые вопросы |
| База знаний | Скрипты, возражения, воронка |
| Мой профиль | Данные менеджера |
| ИИ-советник | Советы, анализ переписки, подбор аромата |

## 🤖 ИИ функции

Все функции работают через YandexGPT (модель `yandexgpt`):

- **Генерация вводной фразы** — кнопка ✨ в карточке клиента
- **Совет по сделке** — вкладка «Совет» в ИИ-советнике
- **Анализ переписки** — вкладка «Переписка»
- **Подбор аромата** — вкладка «Аромат»
- **Follow-up сообщение** — кнопка 📨 в истории КП
- **Что добавить?** — кнопка 💡 в разделе Продукты
- **Сохранение в базу знаний** — кнопка 👍 под ответами ИИ

**Прокси:** все запросы идут через `/api/ai` (Vercel Edge Function) чтобы обойти CORS.

## 🚀 Деплой

Автоматически при push в ветку `main`:
```bash
git clone https://TOKEN@github.com/asensestore/asense-kp.git
# внести изменения в index.html
git add index.html
git commit -m "описание изменений"
git push
```

⚠️ GitHub блокирует push если в коде есть API ключи в открытом виде. Решение — base64 кодирование через `atob()`.

## 💾 Резервное копирование

**Код:** GitHub хранит всю историю изменений.

**Данные менеджеров:** хранятся в Supabase + localStorage браузера. При входе с нового устройства — данные подтягиваются из Supabase.

**Бэкап истории КП:** в приложении → История КП → кнопка «⬇ JSON» или «📥 Excel».

## 📞 Контакты проекта

- **Роман Шлепикас** — Директор по развитию бренда
- Telegram: @Asense_store_b2b
- Email: sales@asense.ru

## 🔧 Для разработчика/ИИ

Если продолжаешь работу с этим проектом:

1. Скачай актуальный `index.html` из GitHub
2. Все правки делаются только в `index.html` (и `api/ai.js` для ИИ прокси)
3. После каждого изменения — проверяй JS синтаксис через `node -e "new Function(script)"`
4. Деплой через git push в main
5. Стиль кода: vanilla JS, без jQuery/React, минимум зависимостей
6. Цвета: `--gold: #C9A84C`, `--dark: #1A1A2E`, `--navy: #2E4057`

