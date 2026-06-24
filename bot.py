"""
ACTA. Telegram Bot

Телеграм бот с Mini App для ежедневника в стиле римских стоиков.

УСТАНОВКА:
    pip install python-telegram-bot

ЗАПУСК:
    python bot.py

НАСТРОЙКА:
    1. Создайте бота через @BotFather
    2. Замените BOT_TOKEN на ваш токен
    3. Замените WEBAPP_URL на URL развёрнутого приложения
    4. В @BotFather: /mybots → Bot Settings → Menu Button → укажите URL
"""

import random
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

# ═══════════════════════════════════════════════════════════
# КОНФИГУРАЦИЯ — ЗАМЕНИТЕ НА СВОИ ЗНАЧЕНИЯ
# ═══════════════════════════════════════════════════════════
BOT_TOKEN = "8840512956:AAEkwdKYMSl56kryZ-JgPXYWrBjvJ5EPoAU"
WEBAPP_URL = "https://landing-page-demo-dp28co6ydcc0.edgeone.dev"  # например: https://your-app.vercel.app

# Логирование
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# ЦИТАТЫ СТОИКОВ
# ═══════════════════════════════════════════════════════════
QUOTES = [
    ("Разделяй и властвуй.", "Гай Юлий Цезарь"),
    ("Делай что должен — и будь что будет.", "Марк Аврелий"),
    ("Тот непобедим, кто победил самого себя.", "Сенека"),
    ("Трудности укрепляют ум, как труд укрепляет тело.", "Сенека"),
    ("Судьба ведёт того, кто хочет, и тащит того, кто не хочет.", "Клеанф"),
    ("Богатство — не в обилии имущества, а в малости потребностей.", "Эпиктет"),
    ("Мы страдаем не от событий, а от наших суждений о них.", "Эпиктет"),
    ("Счастье — не в вещах, а в нас самих.", "Марк Аврелий"),
    ("Время — единственное, чего нельзя вернуть.", "Сенека"),
    ("Покой — не бегство от бури, а умение стоять в ней.", "Марк Аврелий"),
    ("Познай самого себя.", "Надпись в Дельфах"),
    ("Лучшая месть — не быть похожим на своего врага.", "Марк Аврелий"),
    ("Препятствие на пути становится самим путём.", "Марк Аврелий"),
    ("Ни один человек не свободен, пока он не стал хозяином самому себе.", "Эпиктет"),
    ("Пока мы откладываем жизнь, она проходит.", "Сенека"),
    ("Пришёл, увидел, победил.", "Юлий Цезарь"),
    ("Жребий брошен.", "Юлий Цезарь"),
    ("Величайшая победа — это победа над самим собой.", "Платон"),
    ("Удача любит смелых.", "Теренций"),
    ("Помни о смерти.", "Античная мудрость"),
    ("Если хочешь мира, готовься к войне.", "Вегеций"),
    ("Характер — это судьба.", "Гераклит"),
    ("Ничто не принадлежит нам, кроме времени.", "Сенека"),
    ("Путь в тысячу ли начинается с первого шага.", "Лао-цзы"),
    ("Не смерти должен бояться человек, он должен бояться никогда не начать жить.", "Марк Аврелий"),
    ("Кто хочет, ищет возможности, кто не хочет — ищет оправдания.", "Сократ"),
    ("Заговори, чтобы я тебя увидел.", "Сократ"),
]


def get_random_quote() -> tuple[str, str]:
    """Возвращает случайную цитату."""
    return random.choice(QUOTES)


def get_main_keyboard() -> InlineKeyboardMarkup:
    """Главное меню с кнопками."""
    keyboard = [
        [InlineKeyboardButton("📱 Открыть ACTA.", web_app=WebAppInfo(url=WEBAPP_URL))],
        [
            InlineKeyboardButton("💡 Цитата", callback_data="quote"),
            InlineKeyboardButton("ℹ️ Помощь", callback_data="help"),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def get_webapp_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура с кнопкой открытия приложения."""
    keyboard = [[InlineKeyboardButton("📱 Открыть ACTA.", web_app=WebAppInfo(url=WEBAPP_URL))]]
    return InlineKeyboardMarkup(keyboard)


# ═══════════════════════════════════════════════════════════
# ОБРАБОТЧИКИ КОМАНД
# ═══════════════════════════════════════════════════════════

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start."""
    user = update.effective_user
    first_name = user.first_name if user else "Воин"
    
    welcome_text = f"""
⚔️ *ACTA.* — Ежедневник Воина

Salve, *{first_name}*!

Добро пожаловать в ACTA — приложение для дисциплины и самосовершенствования в духе римских стоиков.

📋 *Возможности:*
• Календарь привычек с прокачкой
• RPG-система с уровнями
• Дневник рефлексии  
• Финансовый трекер

Нажми кнопку ниже, чтобы открыть приложение:
"""
    
    await update.message.reply_text(
        welcome_text,
        parse_mode="Markdown",
        reply_markup=get_main_keyboard()
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /help."""
    help_text = """
📖 *Справка ACTA.*

*Команды:*
/start — Главное меню
/quote — Цитата дня
/help — Эта справка

*Как пользоваться:*
1. Открой приложение кнопкой ниже
2. Добавляй задачи в Календарь
3. Создавай RPG-квесты
4. Веди дневник рефлексии
5. Отслеживай финансы

*Прокачка:*
• Задача в календаре → +1 XP
• RPG-квест → от +1 до +8 XP
• Полный дневник → +4 XP
• Каждые 20 XP — новый уровень!

_"Делай что должен — и будь что будет."_
"""
    
    await update.message.reply_text(
        help_text,
        parse_mode="Markdown",
        reply_markup=get_webapp_keyboard()
    )


async def quote_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /quote."""
    text, author = get_random_quote()
    await update.message.reply_text(
        f'💭 _«{text}»_\n\n— *{author}*',
        parse_mode="Markdown"
    )


# ═══════════════════════════════════════════════════════════
# ОБРАБОТЧИК CALLBACK (КНОПКИ)
# ═══════════════════════════════════════════════════════════

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик нажатий на inline-кнопки."""
    query = update.callback_query
    await query.answer()
    
    if query.data == "quote":
        text, author = get_random_quote()
        await query.message.reply_text(
            f'💭 _«{text}»_\n\n— *{author}*',
            parse_mode="Markdown"
        )
    
    elif query.data == "help":
        help_text = """
📖 *Справка ACTA.*

Нажми "Открыть ACTA." чтобы запустить приложение.

*В приложении:*
• ☰ Календарь — ежедневные привычки
• ⚔ Герой — квесты и прокачка
• ✎ Дневник — рефлексия
• ⚖ Казна — финансы

_"Познай самого себя."_
"""
        await query.message.reply_text(
            help_text,
            parse_mode="Markdown",
            reply_markup=get_webapp_keyboard()
        )


async def unknown_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик неизвестных сообщений."""
    await update.message.reply_text(
        "⚔️ Используй /start для меню или нажми кнопку:",
        reply_markup=get_main_keyboard()
    )


# ═══════════════════════════════════════════════════════════
# ЗАПУСК БОТА
# ═══════════════════════════════════════════════════════════

def main() -> None:
    """Запуск бота."""
    print("🏛 ACTA. Bot запускается...")
    
    # Создаём приложение
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрируем обработчики
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("quote", quote_command))
    application.add_handler(CallbackQueryHandler(button_callback))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, unknown_message))
    
    print("✅ Бот запущен! Ожидание сообщений...")
    print(f"📱 WebApp URL: {WEBAPP_URL}")
    
    # Запускаем polling
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
