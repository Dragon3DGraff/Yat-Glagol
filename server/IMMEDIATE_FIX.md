# 🚨 Немедленное решение ошибки 500

## ❌ Проблема:

```
GET http://localhost:3001/api/friends 500 (Internal Server Error)
```

## ✅ Решение:

### 1. Остановите текущий сервер

Нажмите `Ctrl+C` в терминале где запущен сервер

### 2. Запустите сервер с моками

```bash
cd server
npm run dev:mock
```

### 3. Проверьте логи

Должны появиться сообщения:

```
🔧 [DEBUG] USE_MOCK_DB: true
🔧 [DEBUG] NODE_ENV: development
🔧 [DEBUG] useMockDB: true
Используется Mock Database для локального тестирования
✅ Mock Database инициализирован с тестовыми данными
Mock база данных инициализирована
Сервер Ять-глагол запущен на порту 3001
```

### 4. Проверьте в браузере

Откройте http://localhost:3001/api/friends
Должна быть ошибка 401 (не авторизован), а не 500

## 🔧 Альтернативные способы запуска:

### PowerShell скрипт:

```powershell
cd server
.\start-with-mocks.ps1
```

### Batch файл:

```cmd
cd server
start-with-mocks.bat
```

### Ручная установка переменных:

```bash
cd server
$env:USE_MOCK_DB="true"
$env:NODE_ENV="development"
npm run dev
```

## 🎯 Результат:

После правильного запуска:

- ✅ Ошибка 500 исчезнет
- ✅ API будет работать с моковой БД
- ✅ Будут доступны тестовые пользователи
- ✅ Дружеские связи будут работать

## 📋 Тестовые аккаунты:

| Email               | Password    | Username |
| ------------------- | ----------- | -------- |
| alice@example.com   | password123 | Alice    |
| bob@example.com     | password123 | Bob      |
| charlie@example.com | password123 | Charlie  |
| diana@example.com   | password123 | Diana    |
| admin@example.com   | admin123    | Admin    |

**Главное: используйте `npm run dev:mock` вместо `npm run dev`!** 🚀
