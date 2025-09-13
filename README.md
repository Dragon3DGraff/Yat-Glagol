# Ять-глагол - Чат с видеосвязью

Современный чат-мессенджер с поддержкой видеозвонков, демонстрации экрана и шифрования сообщений.

## Особенности

- 🚀 **Современный стек**: Node.js + Express + Socket.IO + React + TypeScript + MUI
- 📱 **PWA поддержка**: Работает как нативное приложение
- 🎥 **Видеозвонки**: WebRTC с поддержкой аудио и видео
- 🖥️ **Демонстрация экрана**: Возможность показать свой экран
- 🔐 **Шифрование**: Все сообщения шифруются в базе данных
- 👥 **Групповые чаты**: Создание и управление комнатами
- 💾 **MySQL**: Надежное хранение данных
- 🔔 **Уведомления**: Push-уведомления и звуки
- 🧪 **Dev режим**: Моковые данные для разработки без MySQL

## 🧪 Быстрый старт (Dev режим с моковыми данными)

Для быстрого тестирования без настройки MySQL базы данных:

### Тестовые аккаунты:

- **Alice**: `alice@example.com` / `password123`
- **Bob**: `bob@example.com` / `password123`
- **Charlie**: `charlie@example.com` / `password123`
- **Diana**: `diana@example.com` / `password123`
- **Admin**: `admin@example.com` / `admin123`

### Запуск:

```bash
# Установка зависимостей
npm install
cd server && npm install && cd ../client && npm install && cd ..

# Создание .env файлов
cp server/env.example server/.env
cp client/env.example client/.env

# В server/.env убедитесь что USE_MOCK_DB=true
# В client/.env должно быть:
echo "VITE_API_URL=/api" > client/.env
echo "VITE_SOCKET_URL=" >> client/.env

# Запуск (из корня проекта)
npm run dev
```

**🔧 Прокси настроен автоматически:**

- Клиент: http://localhost:5777
- Сервер: http://localhost:3001
- API запросы: `http://localhost:5777/api` → проксируются на `http://localhost:3001/api`
- WebSocket: `http://localhost:5777/socket.io` → проксируется на `http://localhost:3001/socket.io`

## Структура проекта

```
yat-glagol-chat/
├── server/                 # Backend (Node.js + Express + Socket.IO)
│   ├── src/
│   │   ├── database/       # Работа с БД и шифрование
│   │   ├── middleware/     # Middleware для аутентификации
│   │   ├── routes/         # API роуты
│   │   ├── socket/         # Socket.IO обработчики
│   │   ├── webrtc/         # WebRTC сигналинг
│   │   └── index.ts        # Главный файл сервера
│   ├── database/
│   │   └── schema.sql      # SQL схема базы данных
│   └── package.json
├── client/                 # Frontend (React + TypeScript + MUI)
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы приложения
│   │   ├── services/       # API и Socket клиенты
│   │   ├── store/          # Zustand стейт менеджмент
│   │   ├── types/          # TypeScript типы
│   │   └── main.tsx        # Точка входа
│   ├── vite.config.ts      # Конфигурация Vite + PWA
│   └── package.json
└── package.json            # Root package для скриптов
```

## Установка и запуск

### Требования

- Node.js 18+
- MySQL 8.0+
- npm или yarn

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd yat-glagol-chat
```

### 2. Установка зависимостей

```bash
# Установка зависимостей для всего проекта
npm install

# Установка зависимостей сервера
cd server
npm install

# Установка зависимостей клиента
cd ../client
npm install

# Возвращаемся в корень
cd ..
```

### 3. Настройка базы данных

1. Создайте MySQL базу данных:

```sql
CREATE DATABASE yat_glagol_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Выполните SQL скрипт для создания таблиц:

```bash
mysql -u root -p yat_glagol_chat < server/database/schema.sql
```

### 4. Настройка переменных окружения

#### Сервер (`server/.env`):

```bash
cp server/env.example server/.env
```

Отредактируйте `server/.env`:

```
PORT=3001
CLIENT_URL=http://localhost:5173

# База данных
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=yat_glagol_chat

# Секретные ключи (ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ENCRYPTION_KEY=your-super-secret-encryption-key-32-chars

NODE_ENV=development
```

#### Клиент (`client/.env`):

```bash
cp client/env.example client/.env
```

Отредактируйте `client/.env`:

```
VITE_API_URL=http://localhost:3001/api
VITE_SOCKET_URL=http://localhost:3001
VITE_APP_NAME=Ять-глагол
```

### 5. Запуск проекта

#### Режим разработки (рекомендуется)

```bash
# Запуск сервера и клиента одновременно
npm run dev
```

Или раздельно:

```bash
# Терминал 1: Сервер
npm run server:dev

# Терминал 2: Клиент
npm run client:dev
```

#### Продакшен сборка

```bash
# Сборка проекта
npm run build

# Запуск в продакшене
npm start
```

### 6. Доступ к приложению

- **Клиент**: http://localhost:5173
- **API сервер**: http://localhost:3001
- **Проверка здоровья**: http://localhost:3001/api/health

## API Endpoints

### Аутентификация

- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/logout` - Выход
- `GET /api/auth/verify` - Проверка токена
- `POST /api/auth/refresh` - Обновление токена

### Пользователи

- `GET /api/user/profile` - Профиль текущего пользователя
- `PUT /api/user/profile` - Обновление профиля
- `GET /api/user/:id` - Профиль пользователя по ID
- `PUT /api/user/status` - Изменение статуса

### Чаты

- `GET /api/chat/rooms` - Список комнат пользователя
- `POST /api/chat/rooms` - Создание комнаты
- `GET /api/chat/rooms/:id` - Информация о комнате
- `GET /api/chat/rooms/:id/messages` - Сообщения комнаты
- `POST /api/chat/rooms/:id/messages` - Отправка сообщения

## WebSocket События

### Сообщения

- `send_message` - Отправка сообщения
- `new_message` - Новое сообщение
- `edit_message` / `message_edited` - Редактирование
- `delete_message` / `message_deleted` - Удаление

### Комнаты

- `join_room` / `joined_room` - Присоединение к комнате
- `leave_room` / `left_room` - Покидание комнаты
- `user_joined_room` / `user_left_room` - Уведомления

### Звонки

- `start_call` / `call_started` - Начало звонка
- `join_call` / `user_joined_call` - Присоединение к звонку
- `leave_call` / `user_left_call` - Покидание звонка
- `webrtc_offer` / `webrtc_answer` / `webrtc_ice_candidate` - WebRTC сигналинг

## Технологии

### Backend

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Socket.IO** - Real-time communication
- **MySQL2** - Database driver
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Crypto-JS** - Message encryption
- **TypeScript** - Type safety

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Material-UI** - Component library
- **Zustand** - State management
- **React Query** - Server state
- **Socket.IO Client** - Real-time communication
- **WebRTC** - Video/audio calls

### PWA

- **Vite PWA Plugin** - Service worker generation
- **Workbox** - Caching strategies
- **Web App Manifest** - App metadata

## Разработка

### Скрипты

```bash
# Разработка
npm run dev              # Запуск сервера и клиента
npm run server:dev       # Только сервер
npm run client:dev       # Только клиент

# Сборка
npm run build           # Сборка всего проекта
npm run server:build    # Сборка сервера
npm run client:build    # Сборка клиента

# Продакшен
npm start               # Запуск собранного проекта
```

### Структура БД

- `users` - Пользователи с хэшированными паролями
- `chat_rooms` - Комнаты чатов
- `room_participants` - Участники комнат с ролями
- `messages` - Зашифрованные сообщения
- `message_attachments` - Файловые вложения
- `active_calls` - Активные звонки
- `call_participants` - Участники звонков

### Безопасность

- Все пароли хэшируются с bcrypt
- JWT токены для аутентификации
- Сообщения шифруются в БД с AES
- Rate limiting на API endpoints
- CORS защита
- Валидация входных данных

## Deployment

### Docker (Рекомендуется)

```dockerfile
# TODO: Добавить Docker конфигурацию
```

### Manual Deploy

1. Настройте продакшн переменные окружения
2. Настройте HTTPS (рекомендуется nginx)
3. Настройте TURN сервер для WebRTC
4. Соберите проект: `npm run build`
5. Запустите: `npm start`

## Лицензия

MIT License

## Поддержка

Для вопросов и поддержки создавайте issues в репозитории проекта.
