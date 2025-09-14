#!/usr/bin/env node

/**
 * Скрипт для запуска сервера с моковой базой данных
 * Используется для локального тестирования без настройки MySQL
 */

// Устанавливаем переменные окружения для моков
process.env.USE_MOCK_DB = "true"
process.env.NODE_ENV = "development"

// Запускаем сервер
require("./dist/index.js")
