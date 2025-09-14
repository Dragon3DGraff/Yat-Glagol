# 🚨 Важно! Создайте файл .env

Для работы с моками необходимо создать файл `.env` в папке `server/`.

## 📝 Инструкция:

### 1. Скопируйте файл env.example

```bash
cd server
cp env.example .env
```

### 2. Убедитесь, что в .env установлено:

```env
USE_MOCK_DB=true
NODE_ENV=development
```

### 3. Запустите сервер

```bash
npm run dev:mock
```

## 🔧 Альтернативный способ (без .env файла):

Можно запустить сервер с переменными окружения напрямую:

```bash
# Windows (PowerShell)
$env:USE_MOCK_DB="true"; $env:NODE_ENV="development"; npm run dev

# Windows (CMD)
set USE_MOCK_DB=true && set NODE_ENV=development && npm run dev

# Linux/Mac
USE_MOCK_DB=true NODE_ENV=development npm run dev
```

## 🐛 Если все еще не работает:

1. Проверьте, что файл `.env` существует в папке `server/`
2. Убедитесь, что `USE_MOCK_DB=true` в файле `.env`
3. Перезапустите сервер
4. Проверьте логи - должны появиться сообщения:
   - `🔧 [DEBUG] USE_MOCK_DB: true`
   - `🔧 [DEBUG] useMockDB: true`
   - `Используется Mock Database для локального тестирования`
