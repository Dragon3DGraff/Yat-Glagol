import winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"
import path from "path"

// Создаем папку для логов
const logsDir = path.join(process.cwd(), "logs")

// Формат для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

// Формат для консоли (более читабельный)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} ${level}: ${message}\n${stack}`
    }
    return `${timestamp} ${level}: ${message}`
  })
)

// Транспорт для ротации логов по дням (все логи)
const dailyRotateFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, "app-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  format: logFormat,
  level: "debug",
})

// Транспорт для ошибок (отдельный файл)
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  format: logFormat,
  level: "error",
})

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  transports: [dailyRotateFileTransport, errorFileTransport],
  // Обработка необработанных исключений
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, "exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      format: logFormat,
    }),
  ],
  // Обработка необработанных промисов
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, "rejections-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      format: logFormat,
    }),
  ],
})

// В development режиме также логгируем в консоль
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
      level: "debug",
    })
  )
}

// Создаем папку для логов если её нет
dailyRotateFileTransport.on("new", (newFilename) => {
  logger.info(`📁 Создан новый лог файл: ${newFilename}`)
})

// Логгируем информацию о ротации
dailyRotateFileTransport.on("rotate", (oldFilename, newFilename) => {
  logger.info(`🔄 Ротация логов: ${oldFilename} -> ${newFilename}`)
})

// Экспортируем логгер
export default logger

// Экспортируем вспомогательные функции
export const logStartup = (message: string) => {
  logger.info(`🚀 ${message}`)
}

export const logDatabase = (message: string) => {
  logger.info(`🗄️  ${message}`)
}

export const logSocket = (message: string) => {
  logger.info(`📡 ${message}`)
}

export const logError = (message: string, error?: any) => {
  if (error) {
    logger.error(`❌ ${message}`, { error: error.stack || error })
  } else {
    logger.error(`❌ ${message}`)
  }
}

export const logWarning = (message: string) => {
  logger.warn(`⚠️  ${message}`)
}

export const logAuth = (message: string) => {
  logger.info(`🔐 ${message}`)
}

export const logRequest = (method: string, url: string, userId?: number) => {
  if (userId) {
    logger.info(`🌐 ${method} ${url} [User: ${userId}]`)
  } else {
    logger.info(`🌐 ${method} ${url}`)
  }
}
