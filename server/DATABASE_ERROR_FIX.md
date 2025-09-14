# 🔧 Исправление ошибки "Too many keys specified; max 64 keys allowed"

## 🚨 Проблема:

```
❌ Ошибка инициализации Sequelize: Error: Too many keys specified; max 64 keys allowed
```

## 🔍 Причина:

В таблице `users` накопилось слишком много индексов (более 64), что превышает лимит MySQL.

## ✅ Решения:

### Решение 1: Используйте моки (рекомендуется)

```bash
cd server
npm run dev:mock
```

### Решение 2: Сброс базы данных

```bash
cd server
node reset-database.js
```

### Решение 3: Ручная очистка базы данных

1. **Подключитесь к MySQL:**

   ```bash
   mysql -u root -p
   ```

2. **Выберите базу данных:**

   ```sql
   USE yat_glagol_chat;
   ```

3. **Удалите все таблицы:**

   ```sql
   DROP TABLE IF EXISTS friends;
   DROP TABLE IF EXISTS messages;
   DROP TABLE IF EXISTS room_participants;
   DROP TABLE IF EXISTS chat_rooms;
   DROP TABLE IF EXISTS users;
   ```

4. **Запустите сервер:**
   ```bash
   npm run dev:sequelize
   ```

### Решение 4: Создайте новую базу данных

1. **Создайте новую базу данных:**

   ```sql
   CREATE DATABASE yat_glagol_chat_new CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Обновите .env файл:**

   ```env
   DB_NAME=yat_glagol_chat_new
   ```

3. **Запустите сервер:**
   ```bash
   npm run dev:sequelize
   ```

## 🎯 Рекомендация:

**Используйте моки для разработки:**

```bash
cd server
npm run dev:mock
```

Это избавит от проблем с настройкой MySQL и позволит сразу начать тестирование.

## 🔧 Что было исправлено в коде:

1. **Изменен режим синхронизации:**

   - Было: `{ alter: true }` - пытается изменить существующие таблицы
   - Стало: `{ force: false }` - создает только новые таблицы

2. **Создан скрипт сброса базы данных:**
   - `reset-database.js` - безопасно удаляет все таблицы

## ✅ Результат:

После применения любого из решений сервер запустится без ошибок инициализации базы данных.
