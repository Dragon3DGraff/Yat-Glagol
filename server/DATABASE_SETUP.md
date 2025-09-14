# 🗄️ Настройка реальной базы данных

## 📋 Требования:

- MySQL 8.0+ или MariaDB 10.3+
- Node.js 18+

## 🔧 Настройка:

### 1. Создайте базу данных:

```sql
CREATE DATABASE yat_glagol_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Создайте пользователя (опционально):

```sql
CREATE USER 'yat_glagol_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON yat_glagol_chat.* TO 'yat_glagol_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Настройте переменные окружения:

Создайте файл `.env` в папке `server/`:

```env
# База данных
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=yat_glagol_chat

# Режим работы
USE_MOCK_DB=false
NODE_ENV=development

# JWT секретный ключ
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Ключ шифрования
ENCRYPTION_KEY=your-super-secret-encryption-key-32-chars
```

### 4. Запустите сервер:

```bash
cd server
npm run dev:sequelize
```

## 🧪 Тестирование:

### Проверка подключения к БД:

```bash
cd server
node test-sequelize-friends.js
```

### Ожидаемый результат:

```
✅ Sequelize подключился к базе данных
✅ Модели Sequelize синхронизированы
👥 [SEQUELIZE] getFriends для пользователя 1
👥 [SEQUELIZE] Найдено 0 дружеских связей
👥 [SEQUELIZE] Возвращаем 0 друзей
✅ Найдено 0 друзей:
```

## 📊 Структура таблиц:

Сервер автоматически создаст следующие таблицы:

- `users` - пользователи
- `friends` - дружеские связи
- `chat_rooms` - чат-комнаты
- `messages` - сообщения
- `room_participants` - участники комнат

## 🔍 Отладка:

### Логи подключения:

```
✅ Sequelize подключился к базе данных
✅ Модели Sequelize синхронизированы
```

### Логи запросов друзей:

```
👥 [SEQUELIZE] getFriends для пользователя 1
👥 [SEQUELIZE] Найдено 0 дружеских связей
👥 [SEQUELIZE] Возвращаем 0 друзей
```

## ⚠️ Возможные проблемы:

### 1. Ошибка подключения:

```
❌ Ошибка инициализации Sequelize: connect ECONNREFUSED
```

**Решение:** Проверьте, что MySQL запущен и доступен.

### 2. Ошибка аутентификации:

```
❌ Ошибка инициализации Sequelize: Access denied for user
```

**Решение:** Проверьте логин и пароль в `.env` файле.

### 3. База данных не существует:

```
❌ Ошибка инициализации Sequelize: Unknown database
```

**Решение:** Создайте базу данных согласно инструкции выше.

## 🚀 Готово!

После успешной настройки сервер будет работать с реальной базой данных MySQL.
