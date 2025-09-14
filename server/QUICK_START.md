# 🚀 Быстрый запуск с моками

## 1. Запуск сервера:

### Вариант 1: Готовая команда

```bash
cd server
npm run dev:mock
```

### Вариант 2: PowerShell скрипт

```powershell
cd server
.\start-with-mocks.ps1
```

### Вариант 3: Batch файл

```cmd
cd server
start-with-mocks.bat
```

### Вариант 4: Ручная установка переменных

```bash
cd server
# Windows PowerShell
$env:USE_MOCK_DB="true"; $env:NODE_ENV="development"; npm run dev

# Windows CMD
set USE_MOCK_DB=true && set NODE_ENV=development && npm run dev
```

## 2. Тестовые аккаунты:

| Email               | Password    | Username |
| ------------------- | ----------- | -------- |
| alice@example.com   | password123 | Alice    |
| bob@example.com     | password123 | Bob      |
| charlie@example.com | password123 | Charlie  |
| diana@example.com   | password123 | Diana    |
| admin@example.com   | admin123    | Admin    |

## 3. Тестовые дружеские связи:

- **Alice и Bob** - друзья
- **Charlie и Diana** - друзья
- **Alice отправила запрос Charlie**

## 4. Проверка работы:

```bash
# Тест моковой системы
node test-mock-simple.js

# Тест друзей
node test-friends.js
```

## 5. Ожидаемый результат:

```
✅ Mock Database инициализирован с тестовыми данными
✅ Созданы тестовые дружеские связи:
  - Alice и Bob - друзья
  - Charlie и Diana - друзья
  - Alice отправила запрос Charlie
Сервер Ять-глагол запущен на порту 3001
```

**Готово! Теперь можно тестировать все функции чата.** 🎉
