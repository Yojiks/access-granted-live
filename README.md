# YouTube Shorts Hacker Guessing Game

MVP интерактивной игры для YouTube Shorts Live и OBS Browser Source. Зрители пишут 4-значные коды в чат, backend проверяет попытки, постепенно открывает первые три цифры по таймингу и показывает победителя в cyber-terminal overlay.

## Стек

- Frontend: React, Vite, TypeScript, Socket.IO client.
- Backend: Node.js, TypeScript, Express, Socket.IO.
- Shared: общие TypeScript-типы событий и состояния.
- State: in-memory для MVP.

## Установка

```bash
npm install
```

Создайте локальный конфиг:

```bash
copy .env.example .env
```

На macOS/Linux используйте `cp .env.example .env`.

## Запуск локально

В двух терминалах:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

По умолчанию:

- backend: `http://localhost:4000`
- frontend overlay: `http://localhost:5173`
- debug overlay: `http://localhost:5173/?debug=true`

## OBS Browser Source

1. Добавьте новый `Browser Source`.
2. URL: `http://localhost:5173`
3. Width: `1080`
4. Height: `1920`
5. Включите refresh browser when scene becomes active, если нужно.

Для локального тестирования откройте `http://localhost:5173/?debug=true` в браузере, а в OBS оставьте обычный URL без debug-панели.

## Mock-чат

В debug-панели доступны:

- `nickname` - имя зрителя.
- `message` - любое сообщение или 4-значный код.
- `Send` - отправить сообщение в backend как chat event.
- `Random Guess` - отправить случайную попытку.
- `Force New Round` - начать новый раунд.
- `SECRET` - текущий секретный код, виден только при `?debug=true`.

Для автоматического локального шума в чате включите:

```env
MOCK_AUTO_MESSAGES=true
MOCK_AUTO_INTERVAL_MS=3500
```

## Игровые правила

- Полное совпадение 4-значного кода выигрывает в любой момент.
- До 30 секунд частичные совпадения не учитываются.
- После 30 секунд можно открыть максимум 1 цифру.
- После 60 секунд можно открыть максимум 2 цифры.
- После 90 секунд можно открыть максимум 3 цифры.
- Четвертая цифра никогда не открывается автоматически.
- За одну попытку открывается максимум одна новая цифра.
- Победитель получает 15 секунд на первое следующее сообщение, которое будет показано на стриме.

## YouTube Live Chat API

В MVP реальная интеграция вынесена в `YouTubeChatProvider` как stub. Для подключения YouTube позже:

1. Установите `CHAT_PROVIDER=youtube`.
2. Заполните `YOUTUBE_LIVE_CHAT_ID` и `YOUTUBE_API_KEY`.
3. Реализуйте polling в `backend/src/chat/YouTubeChatProvider.ts`.
4. Маппите сообщения YouTube в общий формат `ChatMessage`.
5. Если понадобится OAuth, добавьте отдельный auth-flow и хранение токенов вне git.

Debug-панель остается рабочей даже при `CHAT_PROVIDER=youtube`, чтобы тестировать игру без живого чата.

## Команды

```bash
npm run test
npm run typecheck
npm run build
```

## Баннеры

В `.env` можно заменить текстовые слоты на изображения:

```env
BANNER_1_MODE=image
BANNER_1_CONTENT=/banners/top.png
BANNER_1_ALT=Top sponsor
```

Для локальных изображений положите файлы в `frontend/public/banners/`.
