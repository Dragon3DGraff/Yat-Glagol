# PowerShell скрипт для запуска сервера с моками
$env:USE_MOCK_DB = "true"
$env:NODE_ENV = "development"

Write-Host "🚀 Запуск сервера с моками..." -ForegroundColor Green
Write-Host "USE_MOCK_DB: $env:USE_MOCK_DB" -ForegroundColor Yellow
Write-Host "NODE_ENV: $env:NODE_ENV" -ForegroundColor Yellow

npm run dev
