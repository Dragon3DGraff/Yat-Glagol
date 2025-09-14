import dotenv from "dotenv"

// Загружаем переменные окружения первым делом
dotenv.config()

// Инициализируем логгер как можно раньше
import logger, {
  logStartup,
  logDatabase,
  logSocket,
  logError,
  logWarning,
  logAuth,
  logRequest,
} from "./utils/logger"

// Отладочная информация для переменных окружения
if (process.env.NODE_ENV === "development") {
  logger.debug("[ENV DEBUG] NODE_ENV:", process.env.NODE_ENV)
  logger.debug(
    "[ENV DEBUG] JWT_SECRET:",
    process.env.JWT_SECRET ? "Set" : "Not Set"
  )
  logger.debug("[ENV DEBUG] Database: Sequelize ORM")
  logger.debug("[ENV DEBUG] CLIENT_URL:", process.env.CLIENT_URL)
}

import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import path from "path"
import { SequelizeAdapter } from "./database/SequelizeAdapter"
import { MockAdapter } from "./mock/MockAdapter"
import { AuthMiddleware } from "./middleware/AuthMiddleware"
import { SocketHandler } from "./socket/SocketHandler"
import { WebRTCSignaling } from "./webrtc/WebRTCSignaling"
import authRoutes from "./routes/auth"
import chatRoutes from "./routes/chat"
import userRoutes from "./routes/user"
import friendsRoutes from "./routes/friends"

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5777",
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Улучшенные настройки для продакшена
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
})

const PORT = process.env.PORT || 3001

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
  })
)

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5777",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
)

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Rate limiting
const isDevMode = process.env.NODE_ENV === "development"
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevMode ? 10000 : 100, // 10000 в dev режиме, 100 в production
  message: "Слишком много запросов, попробуйте позже",
  // Исключаем dev endpoints из rate limiting
  skip: (req) => {
    const skipPath = req.path === "/api/mock-info" || req.path === "/api/health"
    return isDevMode || skipPath
  },
})

if (isDevMode) {
  logWarning("[SERVER] Rate limiting отключен для режима разработки")
}
app.use(limiter)

// Статические файлы
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Инициализация базы данных
const useMockDB = process.env.USE_MOCK_DB === "true"
const dbManager = useMockDB ? new MockAdapter() : new SequelizeAdapter()

console.log("🔧 [DEBUG] USE_MOCK_DB:", process.env.USE_MOCK_DB)
console.log("🔧 [DEBUG] NODE_ENV:", process.env.NODE_ENV)
console.log("🔧 [DEBUG] useMockDB:", useMockDB)

if (useMockDB) {
  logDatabase("Используется Mock Database для локального тестирования")
} else {
  logDatabase("Используется Sequelize ORM для работы с базой данных")
}

// Middleware для логгирования HTTP запросов
app.use((req, res, next) => {
  const userId = (req as any).userId
  logRequest(req.method, req.originalUrl, userId)
  next()
})

// Маршруты
if (process.env.NODE_ENV === "production") {
  app.use("/", express.static(path.join(__dirname, "client", "dist")))
}
app.use("/api/auth", authRoutes)
app.use("/api/chat", AuthMiddleware.verifyToken, chatRoutes)
app.use("/api/user", AuthMiddleware.verifyToken, userRoutes)
app.use("/api/friends", AuthMiddleware.verifyToken, friendsRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Mock data info (только для dev режима) - теперь использует Sequelize
app.get("/api/mock-info", (req, res) => {
  logger.warn("Mock data info requested - but using Sequelize now")
  res.status(404).json({
    error: "Mock data не доступна, используется Sequelize ORM",
  })
})

// Socket.IO обработка
const socketHandler = new SocketHandler(io, dbManager)
const webrtcSignaling = new WebRTCSignaling(io, dbManager)

// Обработка подключений
io.use(AuthMiddleware.authenticateSocket as any)

io.on("connection", (socket: any) => {
  logSocket(`Пользователь подключился: ${socket.userId}`)

  // Обновляем статус пользователя
  dbManager.updateUserStatus(socket.userId, "online")

  // Присоединяем пользователя к его комнатам
  socketHandler.handleUserConnection(socket)

  // WebRTC сигналинг
  webrtcSignaling.handleConnection(socket)

  // Обработка отключения
  socket.on("disconnect", () => {
    logSocket(`Пользователь отключился: ${socket.userId}`)
    dbManager.updateUserStatus(socket.userId, "offline")
    webrtcSignaling.handleDisconnection(socket)
  })
})

// Обработка ошибок
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logError("Unhandled server error", err)
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    })
  }
)

// Запуск сервера
server.listen(PORT, () => {
  logStartup(`Сервер Ять-глагол запущен на порту ${PORT}`)
  logSocket("WebSocket сервер готов к подключениям")

  // Инициализация базы данных
  dbManager
    .initialize()
    .then(() => {
      if (useMockDB) {
        logDatabase("Mock база данных инициализирована")
      } else {
        logDatabase("Sequelize база данных инициализирована")
      }
    })
    .catch((error: any) => {
      if (useMockDB) {
        logError("Ошибка инициализации Mock базы данных", error)
      } else {
        logError("Ошибка инициализации Sequelize базы данных", error)
      }
      process.exit(1)
    })
})

// Graceful shutdown
process.on("SIGTERM", () => {
  logStartup("SIGTERM получен, завершаем сервер...")
  server.close(() => {
    logStartup("Сервер завершен")
    process.exit(0)
  })
})

// Обработка необработанных исключений
process.on("uncaughtException", (error) => {
  logError("Необработанное исключение", error)
  process.exit(1)
})

// Обработка необработанных Promise rejection'ов
process.on("unhandledRejection", (reason, promise) => {
  logError("Необработанное отклонение Promise", { reason, promise })
  process.exit(1)
})

export { app, io, dbManager }
