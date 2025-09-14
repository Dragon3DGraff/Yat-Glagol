#!/usr/bin/env node

/**
 * Простой тест для проверки работы моковой системы
 */

const { MockAdapter } = require("./dist/mock/MockAdapter.js")

async function testMockSystem() {
  console.log("🧪 Тестирование моковой системы...")

  const mockDB = new MockAdapter()

  try {
    // Инициализация
    await mockDB.initialize()
    console.log("✅ Инициализация прошла успешно")

    // Создание пользователя
    const userId = await mockDB.createUser(
      "testuser",
      "test@example.com",
      "hashedpassword"
    )
    console.log("✅ Создание пользователя:", userId)

    // Поиск пользователей
    const users = await mockDB.searchUsers("test")
    console.log("✅ Поиск пользователей:", users.length, "найдено")

    // Создание чата
    const chat = await mockDB.createChat(
      "Test Chat",
      "Test Description",
      false,
      userId
    )
    console.log("✅ Создание чата:", chat.id)

    // Создание сообщения
    const message = await mockDB.createMessage(chat.id, userId, "Hello World!")
    console.log("✅ Создание сообщения:", message.id)

    // Получение сообщений
    const messages = await mockDB.getChatMessages(chat.id)
    console.log("✅ Получение сообщений:", messages.length, "сообщений")

    console.log("🎉 Все тесты прошли успешно!")
  } catch (error) {
    console.error("❌ Ошибка тестирования:", error.message)
  } finally {
    await mockDB.close()
  }
}

// Запуск теста
testMockSystem()
