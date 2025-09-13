import dotenv from "dotenv"

// Загружаем переменные окружения первым делом
dotenv.config()

// Отладочная информация для переменных окружения
if (process.env.NODE_ENV === "development") {
  console.log("[ENV DEBUG] NODE_ENV:", process.env.NODE_ENV)
  console.log(
    "[ENV DEBUG] JWT_SECRET:",
    process.env.JWT_SECRET ? "Set" : "Not Set"
  )
  console.log("[ENV DEBUG] USE_MOCK_DB:", process.env.USE_MOCK_DB)
  console.log("[ENV DEBUG] CLIENT_URL:", process.env.CLIENT_URL)
}

import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import path from "path"
import { DatabaseManager } from "./database/DatabaseManager"
import { MockDatabaseManager } from "./mock/MockDatabaseManager"
import { IDatabaseManager } from "./database/IDatabaseManager"
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
const isDevMode =
  process.env.NODE_ENV === "development" || process.env.USE_MOCK_DB === "true"
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
  console.log(`🔓 [SERVER] Rate limiting отключен для режима разработки`)
}
app.use(limiter)

// Статические файлы
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Инициализация базы данных
const USE_MOCK_DB =
  process.env.USE_MOCK_DB === "true" || process.env.NODE_ENV === "development"
const dbManager = USE_MOCK_DB
  ? new MockDatabaseManager()
  : new DatabaseManager()

console.log(
  `🗄️  Используется ${USE_MOCK_DB ? "моковая" : "реальная"} база данных`
)

// Маршруты
app.use("/api/auth", authRoutes)
app.use("/api/chat", AuthMiddleware.verifyToken, chatRoutes)
app.use("/api/user", AuthMiddleware.verifyToken, userRoutes)
app.use("/api/friends", AuthMiddleware.verifyToken, friendsRoutes)

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() })
})

// Mock data info (только для dev режима)
app.get("/api/mock-info", (req, res) => {
  console.log("Mock data info requested")
  if (USE_MOCK_DB) {
    const mockInfo = (dbManager as MockDatabaseManager).getMockDataInfo()
    res.json(mockInfo)
  } else {
    res
      .status(404)
      .json({ error: "Mock data not available in production mode" })
  }
})

// Socket.IO обработка
const socketHandler = new SocketHandler(io, dbManager as any)
const webrtcSignaling = new WebRTCSignaling(io, dbManager as any)

// Обработка подключений
io.use(AuthMiddleware.authenticateSocket as any)

io.on("connection", (socket: any) => {
  console.log(`Пользователь подключился: ${socket.userId}`)

  // Обновляем статус пользователя
  if (USE_MOCK_DB) {
    ;(dbManager as MockDatabaseManager).updateUserStatus(
      socket.userId,
      "online"
    )
  } else {
    ;(dbManager as DatabaseManager).updateUserStatus(socket.userId, "online")
  }

  // Присоединяем пользователя к его комнатам
  socketHandler.handleUserConnection(socket)

  // WebRTC сигналинг
  webrtcSignaling.handleConnection(socket)

  // Обработка отключения
  socket.on("disconnect", () => {
    console.log(`Пользователь отключился: ${socket.userId}`)
    if (USE_MOCK_DB) {
      ;(dbManager as MockDatabaseManager).updateUserStatus(
        socket.userId,
        "offline"
      )
    } else {
      ;(dbManager as DatabaseManager).updateUserStatus(socket.userId, "offline")
    }
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
    console.error(err.stack)
    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    })
  }
)

// Запуск сервера
server.listen(PORT, () => {
  console.log(`🚀 Сервер Ять-глагол запущен на порту ${PORT}`)
  console.log(`📡 WebSocket сервер готов к подключениям`)

  // Инициализация базы данных
  if (USE_MOCK_DB) {
    console.log("✅ Моковая база данных готова к работе")
    const mockInfo = (dbManager as MockDatabaseManager).getMockDataInfo()
    console.log("📊 Тестовые данные:", JSON.stringify(mockInfo, null, 2))
  } else {
    ;(dbManager as any)
      .initialize()
      .then(() => {
        console.log("✅ База данных инициализирована")
      })
      .catch((error: any) => {
        console.error("❌ Ошибка инициализации базы данных:", error)
        process.exit(1)
      })
  }
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM получен, завершаем сервер...")
  server.close(() => {
    console.log("Сервер завершен")
    process.exit(0)
  })
})

export { app, io, dbManager }
