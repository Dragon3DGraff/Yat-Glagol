#!/usr/bin/env node

/**
 * Скрипт для проверки переменных окружения
 */

console.log("🔧 Проверка переменных окружения:")
console.log("USE_MOCK_DB:", process.env.USE_MOCK_DB)
console.log("NODE_ENV:", process.env.NODE_ENV)

const useMockDB =
  process.env.USE_MOCK_DB === "true" || process.env.NODE_ENV === "development"
console.log("useMockDB (вычисленное):", useMockDB)

if (useMockDB) {
  console.log("✅ Будет использоваться Mock Database")
} else {
  console.log("✅ Будет использоваться Sequelize Database")
}

console.log("\n📝 Для использования моков запустите:")
console.log("npm run dev:mock")
console.log("\n📝 Или создайте файл .env с:")
console.log("USE_MOCK_DB=true")
console.log("NODE_ENV=development")
