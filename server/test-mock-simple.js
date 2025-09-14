#!/usr/bin/env node

/**
 * Простой тест моковой системы
 */

// Устанавливаем переменные окружения
process.env.USE_MOCK_DB = "true"
process.env.NODE_ENV = "development"

console.log("🧪 Тестирование моковой системы...")
console.log("USE_MOCK_DB:", process.env.USE_MOCK_DB)
console.log("NODE_ENV:", process.env.NODE_ENV)

// Импортируем MockAdapter
const { MockAdapter } = require("./dist/mock/MockAdapter.js")

async function testMockSystem() {
  console.log("🔧 Создание MockAdapter...")

  const mockDB = new MockAdapter()

  try {
    // Инициализация
    console.log("🔧 Инициализация...")
    await mockDB.initialize()
    console.log("✅ Инициализация прошла успешно")

    // Создание пользователя
    console.log("🔧 Создание пользователя...")
    const userId = await mockDB.createUser(
      "testuser",
      "test@example.com",
      "hashedpassword"
    )
    console.log("✅ Создание пользователя:", userId)

    // Поиск пользователей
    console.log("🔧 Поиск пользователей...")
    const users = await mockDB.searchUsers("test")
    console.log("✅ Поиск пользователей:", users.length, "найдено")

    // Создание чата
    console.log("🔧 Создание чата...")
    const chat = await mockDB.createChat(
      "Test Chat",
      "Test Description",
      false,
      userId
    )
    console.log("✅ Создание чата:", chat.id)

    // Создание сообщения
    console.log("🔧 Создание сообщения...")
    const message = await mockDB.createMessage(chat.id, userId, "Hello World!")
    console.log("✅ Создание сообщения:", message.id)

    // Получение сообщений
    console.log("🔧 Получение сообщений...")
    const messages = await mockDB.getChatMessages(chat.id)
    console.log("✅ Получение сообщений:", messages.length, "сообщений")

    console.log("🎉 Все тесты прошли успешно!")
  } catch (error) {
    console.error("❌ Ошибка тестирования:", error.message)
    console.error("Stack:", error.stack)
  } finally {
    await mockDB.close()
  }
}

// Запуск теста
testMockSystem()
