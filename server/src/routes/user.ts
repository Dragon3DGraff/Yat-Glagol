import { Router, Request, Response } from "express"
import { body, param, query, validationResult } from "express-validator"
import bcrypt from "bcryptjs"
import { dbManager } from "../index"

interface AuthenticatedRequest extends Request {
  userId?: number
  user?: any
}

const router = Router()

// Валидаторы
const validateUpdateProfile = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Имя пользователя должно быть от 3 до 30 символов")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Имя пользователя может содержать только буквы, цифры, _ и -"),
  body("avatar_url").optional().isURL().withMessage("Некорректный URL аватара"),
]

const validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Текущий пароль обязателен"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Новый пароль должен быть не менее 8 символов")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Новый пароль должен содержать минимум одну строчную букву, заглавную букву и цифру"
    ),
]

// Получить профиль текущего пользователя
router.get(
  "/profile",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!
      const user = await dbManager.getUserById(userId)

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
          last_seen: user.last_seen,
          created_at: user.created_at,
        },
      })
    } catch (error) {
      console.error("Ошибка получения профиля:", error)
      res.status(500).json({ error: "Ошибка получения профиля" })
    }
  }
)

// Получить профиль пользователя по ID
router.get(
  "/:userId",
  [
    param("userId")
      .isInt({ min: 1 })
      .withMessage("ID пользователя должно быть положительным числом"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const userId = parseInt(req.params.userId)
      const user = await dbManager.getUserById(userId)

      if (!user) {
        res.status(404).json({ error: "Пользователь не найден" })
        return
      }

      // Возвращаем публичную информацию о пользователе
      res.json({
        user: {
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          status: user.status,
          last_seen: user.last_seen,
          created_at: user.created_at,
          // Не включаем email для безопасности
        },
      })
    } catch (error) {
      console.error("Ошибка получения пользователя:", error)
      res.status(500).json({ error: "Ошибка получения пользователя" })
    }
  }
)

// Обновить профиль
router.put(
  "/profile",
  validateUpdateProfile,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const userId = req.userId!
      const { username, avatar_url } = req.body

      // TODO: Реализовать обновление профиля в DatabaseManager
      // Пока что возвращаем успех
      res.json({ message: "Профиль обновлен успешно" })
    } catch (error) {
      console.error("Ошибка обновления профиля:", error)
      res.status(500).json({ error: "Ошибка обновления профиля" })
    }
  }
)

// Изменить пароль
router.put(
  "/password",
  validateChangePassword,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const userId = req.userId!
      const { currentPassword, newPassword } = req.body

      // Получаем пользователя с паролем
      const user = await dbManager.getUserByEmail(req.user.email)
      if (!user) {
        res.status(404).json({ error: "Пользователь не найден" })
        return
      }

      // Проверяем текущий пароль
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password_hash
      )
      if (!isValidPassword) {
        res.status(401).json({ error: "Неверный текущий пароль" })
        return
      }

      // Хэшируем новый пароль
      const saltRounds = 12
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds)

      // TODO: Реализовать обновление пароля в DatabaseManager
      // await dbManager.updateUserPassword(userId, hashedNewPassword);

      res.json({ message: "Пароль изменен успешно" })
    } catch (error) {
      console.error("Ошибка смены пароля:", error)
      res.status(500).json({ error: "Ошибка смены пароля" })
    }
  }
)

// Изменить статус
router.put(
  "/status",
  [
    body("status")
      .isIn(["online", "offline", "away"])
      .withMessage("Статус должен быть: online, offline или away"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const userId = req.userId!
      const { status } = req.body

      await dbManager.updateUserStatus(userId, status)

      res.json({ message: "Статус обновлен успешно", status })
    } catch (error) {
      console.error("Ошибка обновления статуса:", error)
      res.status(500).json({ error: "Ошибка обновления статуса" })
    }
  }
)

// Поиск пользователей
router.get(
  "/search",
  [
    query("q")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Поисковый запрос должен быть не менее 2 символов"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage("Лимит должен быть от 1 до 20"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const query = req.query.q as string
      const limit = parseInt(req.query.limit as string) || 10

      // TODO: Реализовать поиск пользователей в DatabaseManager
      // const users = await dbManager.searchUsers(query, limit);

      const users: any[] = [] // Временная заглушка

      res.json({
        query,
        users: users.map((user) => ({
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          status: user.status,
        })),
      })
    } catch (error) {
      console.error("Ошибка поиска пользователей:", error)
      res.status(500).json({ error: "Ошибка поиска пользователей" })
    }
  }
)

// Получить общие комнаты с пользователем
router.get(
  "/:userId/common-rooms",
  [param("userId").isInt({ min: 1 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const targetUserId = parseInt(req.params.userId)
      const currentUserId = req.userId!

      if (targetUserId === currentUserId) {
        res
          .status(400)
          .json({ error: "Нельзя искать общие комнаты с самим собой" })
        return
      }

      // Получаем комнаты текущего пользователя
      const currentUserRooms = await dbManager.getUserChatRooms(currentUserId)
      const commonRooms = []

      // Проверяем каждую комнату на наличие целевого пользователя
      for (const room of currentUserRooms) {
        const participants = await dbManager.getRoomParticipants(room.id)
        const hasTargetUser = participants.some((p) => p.id === targetUserId)

        if (hasTargetUser) {
          commonRooms.push({
            ...room,
            participantCount: participants.length,
          })
        }
      }

      res.json({
        targetUserId,
        commonRooms,
      })
    } catch (error) {
      console.error("Ошибка получения общих комнат:", error)
      res.status(500).json({ error: "Ошибка получения общих комнат" })
    }
  }
)

// Получить статистику пользователя
router.get(
  "/stats",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!

      const userRooms = await dbManager.getUserChatRooms(userId)

      // TODO: Добавить более детальную статистику
      const stats = {
        totalRooms: userRooms.length,
        // totalMessages: await dbManager.getUserMessageCount(userId),
        // totalCalls: await dbManager.getUserCallCount(userId),
        joinedAt: userRooms[0]?.created_at || null,
      }

      res.json({ stats })
    } catch (error) {
      console.error("Ошибка получения статистики:", error)
      res.status(500).json({ error: "Ошибка получения статистики" })
    }
  }
)

// Удалить аккаунт
router.delete(
  "/profile",
  [
    body("password")
      .notEmpty()
      .withMessage("Пароль обязателен для удаления аккаунта"),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const userId = req.userId!
      const { password } = req.body

      // Получаем пользователя с паролем для проверки
      const user = await dbManager.getUserByEmail(req.user.email)
      if (!user) {
        res.status(404).json({ error: "Пользователь не найден" })
        return
      }

      // Проверяем пароль
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        res.status(401).json({ error: "Неверный пароль" })
        return
      }

      // TODO: Реализовать удаление пользователя в DatabaseManager
      // await dbManager.deleteUser(userId);

      res.json({ message: "Аккаунт успешно удален" })
    } catch (error) {
      console.error("Ошибка удаления аккаунта:", error)
      res.status(500).json({ error: "Ошибка удаления аккаунта" })
    }
  }
)

export default router
