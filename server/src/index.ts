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
  console.log("[ENV DEBUG] Database: Sequelize ORM")
  console.log("[ENV DEBUG] CLIENT_URL:", process.env.CLIENT_URL)
}

import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import path from "path"
import { SequelizeAdapter } from "./database/SequelizeAdapter"
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
  console.log(`🔓 [SERVER] Rate limiting отключен для режима разработки`)
}
app.use(limiter)

// Статические файлы
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// Инициализация базы данных
const dbManager = new SequelizeAdapter()

console.log("🗄️  Используется Sequelize ORM для работы с базой данных")

// Маршруты
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
  console.log("Mock data info requested - but using Sequelize now")
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
  console.log(`Пользователь подключился: ${socket.userId}`)

  // Обновляем статус пользователя
  dbManager.updateUserStatus(socket.userId, "online")

  // Присоединяем пользователя к его комнатам
  socketHandler.handleUserConnection(socket)

  // WebRTC сигналинг
  webrtcSignaling.handleConnection(socket)

  // Обработка отключения
  socket.on("disconnect", () => {
    console.log(`Пользователь отключился: ${socket.userId}`)
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
  dbManager
    .initialize()
    .then(() => {
      console.log("✅ Sequelize база данных инициализирована")
    })
    .catch((error: any) => {
      console.error("❌ Ошибка инициализации Sequelize базы данных:", error)
      process.exit(1)
    })
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
