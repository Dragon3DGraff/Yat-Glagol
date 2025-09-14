#!/usr/bin/env node

/**
 * Тест для проверки друзей в Sequelize (реальная БД)
 */

// Устанавливаем переменные окружения для реальной БД
process.env.USE_MOCK_DB = "false"
process.env.NODE_ENV = "development"

console.log("🧪 Тестирование друзей в Sequelize...")
console.log("USE_MOCK_DB:", process.env.USE_MOCK_DB)
console.log("NODE_ENV:", process.env.NODE_ENV)

// Импортируем SequelizeAdapter
const { SequelizeAdapter } = require("./dist/database/SequelizeAdapter.js")

async function testSequelizeFriends() {
  const sequelizeDB = new SequelizeAdapter()

  try {
    // Инициализация
    console.log("🔧 Инициализация Sequelize...")
    await sequelizeDB.initialize()
    console.log("✅ Инициализация прошла успешно")

    // Тестируем друзей для пользователя с ID 1
    console.log("\n🔧 Тестирование друзей для пользователя ID: 1...")
    const friends = await sequelizeDB.getFriends(1)
    console.log(`✅ Найдено ${friends.length} друзей:`)
    friends.forEach((friend, index) => {
      console.log(
        `  ${index + 1}. ${friend.username} (ID: ${friend.id}, Status: ${
          friend.status
        })`
      )
    })

    // Тестируем запросы на дружбу для пользователя с ID 1
    console.log(
      "\n🔧 Тестирование запросов на дружбу для пользователя ID: 1..."
    )
    const requests = await sequelizeDB.getFriendRequests(1)
    console.log(`✅ Найдено ${requests.length} входящих запросов:`)
    requests.forEach((request, index) => {
      console.log(`  ${index + 1}. От пользователя ID: ${request.from_user_id}`)
    })

    console.log("\n🎉 Тест Sequelize друзей завершен!")
  } catch (error) {
    console.error("❌ Ошибка тестирования Sequelize друзей:", error.message)
    console.error("Stack:", error.stack)
  } finally {
    await sequelizeDB.close()
  }
}

// Запуск теста
testSequelizeFriends()
