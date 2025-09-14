@echo off
REM Batch скрипт для запуска сервера с моками
set USE_MOCK_DB=true
set NODE_ENV=development

echo 🚀 Запуск сервера с моками...
echo USE_MOCK_DB: %USE_MOCK_DB%
echo NODE_ENV: %NODE_ENV%

npm run dev
