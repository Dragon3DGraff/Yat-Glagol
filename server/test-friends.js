#!/usr/bin/env node

/**
 * Тест для проверки друзей в моковой системе
 */

// Устанавливаем переменные окружения
process.env.USE_MOCK_DB = "true"
process.env.NODE_ENV = "development"

console.log("🧪 Тестирование друзей в моковой системе...")

// Импортируем MockAdapter
const { MockAdapter } = require("./dist/mock/MockAdapter.js")

async function testFriends() {
  const mockDB = new MockAdapter()

  try {
    // Инициализация
    await mockDB.initialize()
    console.log("✅ Инициализация прошла успешно")

    // Тестируем друзей для Alice (ID: 1)
    console.log("\n🔧 Тестирование друзей для Alice (ID: 1)...")
    const aliceFriends = await mockDB.getFriends(1)
    console.log(`✅ Alice имеет ${aliceFriends.length} друзей:`)
    aliceFriends.forEach((friend, index) => {
      console.log(
        `  ${index + 1}. ${friend.friend.username} (ID: ${friend.friend.id})`
      )
    })

    // Тестируем друзей для Bob (ID: 2)
    console.log("\n🔧 Тестирование друзей для Bob (ID: 2)...")
    const bobFriends = await mockDB.getFriends(2)
    console.log(`✅ Bob имеет ${bobFriends.length} друзей:`)
    bobFriends.forEach((friend, index) => {
      console.log(
        `  ${index + 1}. ${friend.friend.username} (ID: ${friend.friend.id})`
      )
    })

    // Тестируем запросы на дружбу для Charlie (ID: 3)
    console.log("\n🔧 Тестирование запросов на дружбу для Charlie (ID: 3)...")
    const charlieRequests = await mockDB.getFriendRequests(3)
    console.log(`✅ Charlie имеет ${charlieRequests.length} входящих запросов:`)
    charlieRequests.forEach((request, index) => {
      console.log(
        `  ${index + 1}. От ${request.from_username} (ID: ${
          request.from_user_id
        })`
      )
    })

    // Тестируем отправленные запросы для Alice (ID: 1)
    console.log("\n🔧 Тестирование отправленных запросов для Alice (ID: 1)...")
    const aliceSentRequests = await mockDB.getSentFriendRequests(1)
    console.log(`✅ Alice отправила ${aliceSentRequests.length} запросов:`)
    aliceSentRequests.forEach((request, index) => {
      console.log(
        `  ${index + 1}. К ${request.to_username} (ID: ${request.to_user_id})`
      )
    })

    console.log("\n🎉 Все тесты друзей прошли успешно!")
  } catch (error) {
    console.error("❌ Ошибка тестирования друзей:", error.message)
    console.error("Stack:", error.stack)
  } finally {
    await mockDB.close()
  }
}

// Запуск теста
testFriends()
