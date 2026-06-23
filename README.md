# ACTA. — Telegram Mini App

⚔️ Ежедневник воина в стиле римских стоиков с RPG-прокачкой.

## Возможности

- 📋 **Календарь привычек** — отмечай ежедневные задачи, получай XP
- ⚔️ **RPG-прокачка** — создавай квесты, прокачивай 4 характеристики
- ✎ **Дневник рефлексии** — благодарности, размышления, уроки дня
- ⚖ **Финансовый трекер** — доходы, расходы, статистика

## Установка

### 1. Разверните веб-приложение

Соберите и разверните на любом хостинге (Vercel, Netlify, GitHub Pages):

```bash
npm install
npm run build
```

Загрузите содержимое папки `dist/` на хостинг.

### 2. Создайте Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot`
3. Введите имя бота (например: `ACTA Ежедневник`)
4. Введите username бота (например: `acta_diary_bot`)
5. Скопируйте токен бота

### 3. Настройте Menu Button (Mini App)

В @BotFather:
1. `/mybots` → выберите вашего бота
2. `Bot Settings` → `Menu Button`
3. `Configure menu button`
4. Введите URL вашего развёрнутого приложения
5. Введите текст кнопки: `📱 Открыть ACTA.`

### 4. Запустите бота (Python)

```bash
# Установите библиотеку
pip install python-telegram-bot

# Отредактируйте bot.py:
# - BOT_TOKEN = "ваш_токен"
# - WEBAPP_URL = "https://ваш-сайт.com"

# Запустите
python bot.py
```

## Структура проекта

```
├── src/
│   ├── App.tsx      # Главный компонент (Telegram Mini App)
│   ├── main.tsx     # Точка входа React
│   └── index.css    # Стили (античный римский дизайн)
├── public/images/   # Изображения персонажей (5 уровней + орёл)
├── bot.py           # Telegram бот на Python
├── index.html       # HTML с Telegram Web App SDK
└── dist/            # Собранное приложение
```

## Технологии

**Frontend:**
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Telegram Web App API

**Bot:**
- Python 3.10+
- python-telegram-bot

## Особенности

- 📳 **Haptic Feedback** — вибрация при нажатиях
- ☁️ **Cloud Storage** — данные в облаке Telegram
- 🔐 **Авторизация** — автоматически по Telegram ID
- 📱 **Адаптивный** — оптимизирован для мобильных
- 🏛 **Античный стиль** — Cormorant Garamond + Old Standard TT

## Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Главное меню с кнопкой Mini App |
| `/quote` | Случайная цитата стоиков |
| `/help` | Справка по приложению |

---

_"Делай что должен — и будь что будет."_ — Марк Аврелий
