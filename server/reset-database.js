#!/usr/bin/env node

/**
 * Скрипт для сброса базы данных
 * ВНИМАНИЕ: Удаляет все данные!
 */

const { Sequelize } = require("sequelize")

async function resetDatabase() {
  console.log("⚠️  ВНИМАНИЕ: Этот скрипт удалит все данные из базы данных!")
  console.log("Нажмите Ctrl+C для отмены или Enter для продолжения...")

  // Ждем подтверждения
  await new Promise((resolve) => {
    process.stdin.once("data", () => resolve())
  })

  const sequelize = new Sequelize({
    dialect: "mysql",
    host: process.env.DB_HOST || "localhost",
    username: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "yat_glagol_chat",
    logging: console.log,
  })

  try {
    console.log("🔧 Подключение к базе данных...")
    await sequelize.authenticate()
    console.log("✅ Подключение успешно")

    console.log("🗑️  Удаление всех таблиц...")
    await sequelize.drop()
    console.log("✅ Все таблицы удалены")

    console.log("🔧 Создание новых таблиц...")
    await sequelize.sync()
    console.log("✅ Таблицы созданы заново")

    console.log("🎉 База данных сброшена успешно!")
  } catch (error) {
    console.error("❌ Ошибка сброса базы данных:", error.message)
  } finally {
    await sequelize.close()
  }
}

resetDatabase()
