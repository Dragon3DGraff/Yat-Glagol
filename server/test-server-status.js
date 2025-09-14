#!/usr/bin/env node

/**
 * Простой тест статуса сервера
 */

const http = require("http")

function testServerStatus() {
  console.log("🧪 Проверка статуса сервера...")

  const options = {
    hostname: "localhost",
    port: 3001,
    path: "/api/friends",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }

  const req = http.request(options, (res) => {
    console.log(`📡 Статус ответа: ${res.statusCode}`)
    console.log(`📋 Заголовки:`, res.headers)

    let data = ""
    res.on("data", (chunk) => {
      data += chunk
    })

    res.on("end", () => {
      console.log(`📄 Тело ответа:`, data)

      if (res.statusCode === 401) {
        console.log(
          "✅ Сервер работает! Получили ожидаемую ошибку 401 (не авторизован)"
        )
      } else if (res.statusCode === 500) {
        console.log("❌ Ошибка 500 - проблема с базой данных")
        console.log("💡 Решение: Запустите сервер с моками: npm run dev:mock")
      } else {
        console.log(`⚠️  Неожиданный статус: ${res.statusCode}`)
      }
    })
  })

  req.on("error", (error) => {
    console.error("❌ Ошибка подключения к серверу:", error.message)
    console.log("💡 Убедитесь, что сервер запущен на порту 3001")
  })

  req.end()
}

testServerStatus()
