#!/usr/bin/env node

/**
 * Тест API /friends для проверки работы сервера
 */

const axios = require("axios")

async function testFriendsAPI() {
  try {
    console.log("🧪 Тестирование API /friends...")

    // Тестируем без токена (должна быть ошибка 401)
    console.log("🔧 Тест без токена...")
    try {
      const response = await axios.get("http://localhost:3001/api/friends")
      console.log("❌ Ожидалась ошибка 401, но получили:", response.status)
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("✅ Правильно получили ошибку 401 (не авторизован)")
      } else {
        console.log(
          "❌ Неожиданная ошибка:",
          error.response?.status,
          error.message
        )
      }
    }

    // Тестируем с неверным токеном
    console.log("\n🔧 Тест с неверным токеном...")
    try {
      const response = await axios.get("http://localhost:3001/api/friends", {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      })
      console.log("❌ Ожидалась ошибка 401, но получили:", response.status)
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("✅ Правильно получили ошибку 401 (неверный токен)")
      } else {
        console.log(
          "❌ Неожиданная ошибка:",
          error.response?.status,
          error.message
        )
      }
    }

    console.log("\n🎉 Тест API завершен!")
    console.log("📝 Для полного тестирования нужен валидный JWT токен")
  } catch (error) {
    console.error("❌ Ошибка тестирования API:", error.message)
  }
}

testFriendsAPI()
