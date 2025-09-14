import { Router, Request, Response } from "express"
import bcrypt from "bcryptjs"
import { body, validationResult } from "express-validator"
import rateLimit from "express-rate-limit"
import { AuthMiddleware } from "../middleware/AuthMiddleware"
import { dbManager } from "../index"

const router = Router()

// Rate limiting для аутентификации (отключен для dev режима)
const isDev =
  process.env.NODE_ENV === "development" || process.env.USE_MOCK_DB === "true"

console.log(
  `🔒 [AUTH] Режим разработки: ${isDev}, NODE_ENV: ${process.env.NODE_ENV}, USE_MOCK_DB: ${process.env.USE_MOCK_DB}`
)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: isDev ? 10000 : 5, // 10000 в dev режиме, 5 в production
  message: { error: "Слишком много попыток входа. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const skipAuth =
      isDev || req.path === "/api/mock-info" || req.path === "/api/health"
    if (skipAuth) {
      console.log(
        `🔓 [AUTH] Пропускаем rate limiting для ${req.path}, dev режим: ${isDev}`
      )
    }
    return skipAuth
  },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: isDev ? 10000 : 3, // 10000 в dev режиме, 3 в production
  message: { error: "Слишком много регистраций. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const skipRegister =
      isDev || req.path === "/api/mock-info" || req.path === "/api/health"
    if (skipRegister) {
      console.log(
        `🔓 [REGISTER] Пропускаем rate limiting для ${req.path}, dev режим: ${isDev}`
      )
    }
    return skipRegister
  },
})

// Валидаторы
const validateRegister = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Имя пользователя должно быть от 3 до 30 символов")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Имя пользователя может содержать только буквы, цифры, _ и -"),
  body("email")
    .isEmail()
    .withMessage("Введите корректный email")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Пароль должен быть не менее 8 символов")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Пароль должен содержать минимум одну строчную букву, заглавную букву и цифру"
    ),
]

const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Введите корректный email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Пароль обязателен"),
]

// Регистрация
router.post(
  "/register",
  registerLimiter,
  validateRegister,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const { username, email, password } = req.body

      // Проверяем, существует ли уже пользователь с таким email
      const existingUser = await dbManager.getUserByEmail(email)
      if (existingUser) {
        res
          .status(409)
          .json({ error: "Пользователь с таким email уже существует" })
        return
      }

      // Проверяем уникальность username
      // TODO: добавить метод getUserByUsername в DatabaseManager

      // Хэшируем пароль
      const saltRounds = 12
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Создаем пользователя
      const userId = await dbManager.createUser(username, email, hashedPassword)

      // Генерируем токен
      const token = AuthMiddleware.generateToken(parseInt(userId), email)

      // Получаем данные пользователя
      const user = await dbManager.getUserById(userId)

      res.status(201).json({
        message: "Регистрация успешна",
        token,
        user: {
          id: user!.id,
          username: user!.username,
          email: user!.email,
          avatar_url: user!.avatar_url,
          status: user!.status,
        },
      })
    } catch (error) {
      console.error("Ошибка регистрации:", error)

      if (error instanceof Error && error.message.includes("Duplicate entry")) {
        if (error.message.includes("username")) {
          res.status(409).json({ error: "Имя пользователя уже занято" })
        } else if (error.message.includes("email")) {
          res.status(409).json({ error: "Email уже используется" })
        } else {
          res.status(409).json({ error: "Данные уже используются" })
        }
      } else {
        res.status(500).json({ error: "Внутренняя ошибка сервера" })
      }
    }
  }
)

// Вход
router.post(
  "/login",
  authLimiter,
  validateLogin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const { email, password } = req.body

      // Находим пользователя
      const user = await dbManager.getUserByEmail(email)
      if (!user) {
        res.status(401).json({ error: "Неверный email или пароль" })
        return
      }

      // Проверяем пароль
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        res.status(401).json({ error: "Неверный email или пароль" })
        return
      }

      // Обновляем статус пользователя на online
      await dbManager.updateUserStatus(user.id, "online")

      // Генерируем токен
      const token = AuthMiddleware.generateToken(parseInt(user.id), user.email)

      res.json({
        message: "Вход выполнен успешно",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
          status: "online",
        },
      })
    } catch (error) {
      console.error("Ошибка входа:", error)
      res.status(500).json({ error: "Внутренняя ошибка сервера" })
    }
  }
)

// Обновление токена
router.post("/refresh", AuthMiddleware.verifyToken, AuthMiddleware.refreshToken)

// Выход
router.post(
  "/logout",
  AuthMiddleware.verifyToken,
  async (req: any, res: Response): Promise<void> => {
    try {
      // Обновляем статус пользователя на offline
      await dbManager.updateUserStatus(req.userId, "offline")

      res.json({ message: "Выход выполнен успешно" })
    } catch (error) {
      console.error("Ошибка выхода:", error)
      res.status(500).json({ error: "Внутренняя ошибка сервера" })
    }
  }
)

// Проверка токена
router.get(
  "/verify",
  AuthMiddleware.verifyToken,
  async (req: any, res: Response): Promise<void> => {
    try {
      const user = await dbManager.getUserById(req.userId)

      if (!user) {
        res.status(404).json({ error: "Пользователь не найден" })
        return
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
          status: user.status,
        },
      })
    } catch (error) {
      console.error("Ошибка проверки токена:", error)
      res.status(500).json({ error: "Внутренняя ошибка сервера" })
    }
  }
)

// Сброс пароля (отправка email)
router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const { email } = req.body

      // Проверяем, существует ли пользователь
      const user = await dbManager.getUserByEmail(email)

      // Всегда отвечаем успехом для безопасности (не раскрываем существование email)
      res.json({
        message:
          "Если аккаунт с таким email существует, на него было отправлено письмо для сброса пароля",
      })

      if (user) {
        // TODO: Реализовать отправку email с токеном для сброса пароля
        console.log(`Запрос сброса пароля для пользователя: ${user.email}`)
      }
    } catch (error) {
      console.error("Ошибка сброса пароля:", error)
      res.status(500).json({ error: "Внутренняя ошибка сервера" })
    }
  }
)

export default router
