# 🔧 Решение ошибки "Ошибка инициализации Sequelize базы данных"

## 🚨 Проблема:

```
❌ Ошибка инициализации Sequelize базы данных
```

## ✅ Решение:

### Способ 1: Используйте готовую команду

```bash
cd server
npm run dev:mock
```

### Способ 2: PowerShell скрипт

```powershell
cd server
.\start-with-mocks.ps1
```

### Способ 3: Batch файл

```cmd
cd server
start-with-mocks.bat
```

### Способ 4: Ручная установка переменных

**Windows PowerShell:**

```powershell
cd server
$env:USE_MOCK_DB="true"
$env:NODE_ENV="development"
npm run dev
```

**Windows CMD:**

```cmd
cd server
set USE_MOCK_DB=true
set NODE_ENV=development
npm run dev
```

## 🔍 Проверка:

После запуска вы должны увидеть:

```
🔧 [DEBUG] USE_MOCK_DB: true
🔧 [DEBUG] NODE_ENV: development
🔧 [DEBUG] useMockDB: true
Используется Mock Database для локального тестирования
✅ Mock Database инициализирован с тестовыми данными
Mock база данных инициализирована
Сервер Ять-глагол запущен на порту 3001
```

## ❌ Если проблема остается:

1. **Проверьте переменные окружения:**

   ```bash
   node check-env.js
   ```

2. **Убедитесь, что используете правильную команду:**

   - `npm run dev:mock` - с моками
   - `npm run dev:sequelize` - с реальной БД

3. **Перезапустите терминал** и попробуйте снова

## 🎯 Результат:

После правильного запуска сервер будет работать с моковой базой данных, и ошибка 500 в API `/api/friends` исчезнет.
