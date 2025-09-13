import { Router, Request, Response } from "express"
import { body, param, query, validationResult } from "express-validator"
import rateLimit from "express-rate-limit"
import { dbManager, io } from "../index"

interface AuthenticatedRequest extends Request {
  userId?: number
  user?: any
}

const router = Router()

// Rate limiting для отправки запросов на дружбу
const isDevMode =
  process.env.NODE_ENV === "development" || process.env.USE_MOCK_DB === "true"
const friendRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: isDevMode ? 10000 : 20, // 10000 в dev режиме, 20 в production
  message: { error: "Слишком много запросов на дружбу. Попробуйте позже." },
  skip: (req) => isDevMode, // Полностью пропускать в dev режиме
})

// Валидаторы
const validateSendFriendRequest = [
  body("userId")
    .isInt({ min: 1 })
    .withMessage("ID пользователя должно быть положительным числом"),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Сообщение не должно превышать 500 символов"),
]

const validateUsernameSearch = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Имя пользователя должно быть от 3 до 30 символов")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Имя пользователя может содержать только буквы, цифры, _ и -"),
  body("message")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Сообщение не должно превышать 500 символов"),
]

// Получить список друзей
router.get(
  "/",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!
      const friends = await dbManager.getFriends(userId)

      res.json({
        success: true,
        data: { friends },
        message: "Список друзей получен успешно",
      })
    } catch (error) {
      console.error("Ошибка получения друзей:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка получения списка друзей",
      })
    }
  }
)

// Получить входящие запросы на дружбу
router.get(
  "/requests",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!
      console.log(`📥 [API] GET /requests для пользователя ${userId}`)

      const requests = await dbManager.getFriendRequests(userId)
      console.log(
        `📥 [API] Получено ${requests.length} входящих запросов:`,
        requests
      )

      const responseData = {
        success: true,
        data: { requests },
        message: "Запросы на дружбу получены успешно",
      }

      console.log(`📥 [API] Отправляем ответ:`, responseData)
      res.json(responseData)
    } catch (error) {
      console.error("❌ [API] Ошибка получения запросов:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка получения запросов на дружбу",
      })
    }
  }
)

// Получить отправленные запросы на дружбу
router.get(
  "/requests/sent",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!
      console.log(`📤 [API] GET /requests/sent для пользователя ${userId}`)

      const sentRequests = await dbManager.getSentFriendRequests(userId)
      console.log(
        `📤 [API] Получено ${sentRequests.length} отправленных запросов:`,
        sentRequests
      )

      const responseData = {
        success: true,
        data: { requests: sentRequests },
        message: "Отправленные запросы получены успешно",
      }

      console.log(`📤 [API] Отправляем ответ:`, responseData)
      res.json(responseData)
    } catch (error) {
      console.error("❌ [API] Ошибка получения отправленных запросов:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка получения отправленных запросов",
      })
    }
  }
)

// Отправить запрос на дружбу по ID пользователя
router.post(
  "/request",
  friendRequestLimiter,
  validateSendFriendRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const { userId: targetUserId, message } = req.body
      const currentUserId = req.userId!

      if (targetUserId === currentUserId) {
        res.status(400).json({
          success: false,
          error: "Нельзя отправить запрос на дружбу самому себе",
        })
        return
      }

      const requestId = await dbManager.sendFriendRequest(
        currentUserId,
        targetUserId,
        message
      )

      res.status(201).json({
        success: true,
        data: { requestId },
        message: "Запрос на дружбу отправлен успешно",
      })
    } catch (error: any) {
      console.error("Ошибка отправки запроса:", error)
      res.status(400).json({
        success: false,
        error: error.message || "Ошибка отправки запроса на дружбу",
      })
    }
  }
)

// Отправить запрос на дружбу по имени пользователя
router.post(
  "/request/username",
  friendRequestLimiter,
  validateUsernameSearch,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const { username, message } = req.body
      const currentUserId = req.userId!

      // Ищем пользователя по имени
      const users = await dbManager.searchUsers(username)
      const targetUser = users.find(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      )

      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: "Пользователь не найден",
        })
        return
      }

      if (targetUser.id === currentUserId) {
        res.status(400).json({
          success: false,
          error: "Нельзя отправить запрос на дружбу самому себе",
        })
        return
      }

      const requestId = await dbManager.sendFriendRequest(
        currentUserId,
        targetUser.id,
        message
      )

      console.log(`✅ Запрос на дружбу создан с ID: ${requestId}`)

      // Отправляем Socket.IO уведомления
      try {
        // Загружаем полные данные запроса
        const friendRequests = await dbManager.getFriendRequests(targetUser.id)
        const sentRequests = await dbManager.getSentFriendRequests(
          currentUserId
        )

        console.log(
          `📨 Входящие запросы для пользователя ${targetUser.id}:`,
          friendRequests.length
        )
        console.log(
          `📤 Отправленные запросы пользователем ${currentUserId}:`,
          sentRequests.length
        )

        const newRequest = friendRequests.find((req) => req.id === requestId)
        const newSentRequest = sentRequests.find((req) => req.id === requestId)

        console.log(
          `🔍 Найден новый входящий запрос:`,
          newRequest ? `ID ${newRequest.id}` : "НЕ НАЙДЕН"
        )
        console.log(
          `🔍 Найден новый отправленный запрос:`,
          newSentRequest ? `ID ${newSentRequest.id}` : "НЕ НАЙДЕН"
        )

        // Уведомляем получателя о новом входящем запросе
        if (newRequest) {
          const eventData = {
            request: newRequest,
            fromUser: {
              id: currentUserId,
              username: (await dbManager.getUserById(currentUserId))?.username,
            },
          }
          console.log(
            `📨 [SOCKET] Отправляем friend_request_received в комнату user:${targetUser.id}`,
            eventData
          )
          io.to(`user:${targetUser.id}`).emit(
            "friend_request_received",
            eventData
          )
        } else {
          console.error(
            `❌ [SOCKET] Не удалось найти созданный входящий запрос для отправки события`
          )
        }

        // Уведомляем отправителя об обновлении отправленных запросов
        if (newSentRequest) {
          const eventData = {
            request: newSentRequest,
            toUser: {
              id: targetUser.id,
              username: targetUser.username,
            },
          }
          console.log(
            `📤 [SOCKET] Отправляем friend_request_sent в комнату user:${currentUserId}`,
            eventData
          )
          io.to(`user:${currentUserId}`).emit("friend_request_sent", eventData)
        } else {
          console.error(
            `❌ [SOCKET] Не удалось найти созданный отправленный запрос для отправки события`
          )
        }

        console.log(
          `✅ [SOCKET] Отправлены уведомления о запросе на дружбу ${requestId}`
        )
      } catch (socketError) {
        console.error("Ошибка отправки Socket.IO уведомлений:", socketError)
        // Не прерываем выполнение, так как основная операция прошла успешно
      }

      res.status(201).json({
        success: true,
        data: {
          requestId,
          targetUser: {
            id: targetUser.id,
            username: targetUser.username,
            avatar_url: targetUser.avatar_url,
          },
        },
        message: "Запрос на дружбу отправлен успешно",
      })
    } catch (error: any) {
      console.error("Ошибка отправки запроса:", error)
      res.status(400).json({
        success: false,
        error: error.message || "Ошибка отправки запроса на дружбу",
      })
    }
  }
)

// Принять запрос на дружбу
router.put(
  "/request/:requestId/accept",
  [param("requestId").isInt({ min: 1 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const requestId = parseInt(req.params.requestId)
      const userId = req.userId!

      const result = await dbManager.acceptFriendRequest(requestId, userId)

      res.json({
        success: true,
        data: {
          friendship: result.friendship,
          roomId: result.roomId,
        },
        message: "Запрос на дружбу принят успешно",
      })
    } catch (error: any) {
      console.error("Ошибка принятия запроса:", error)
      res.status(400).json({
        success: false,
        error: error.message || "Ошибка принятия запроса на дружбу",
      })
    }
  }
)

// Отклонить запрос на дружбу
router.put(
  "/request/:requestId/decline",
  [param("requestId").isInt({ min: 1 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const requestId = parseInt(req.params.requestId)
      const userId = req.userId!

      const success = await dbManager.declineFriendRequest(requestId, userId)

      if (success) {
        res.json({
          success: true,
          message: "Запрос на дружбу отклонен",
        })
      } else {
        res.status(404).json({
          success: false,
          error: "Запрос не найден или уже обработан",
        })
      }
    } catch (error: any) {
      console.error("Ошибка отклонения запроса:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка отклонения запроса на дружбу",
      })
    }
  }
)

// Удалить из друзей
router.delete(
  "/:friendId",
  [param("friendId").isInt({ min: 1 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const friendId = parseInt(req.params.friendId)
      const userId = req.userId!

      const success = await dbManager.removeFriend(userId, friendId)

      if (success) {
        res.json({
          success: true,
          message: "Пользователь удален из друзей",
        })
      } else {
        res.status(404).json({
          success: false,
          error: "Дружба не найдена",
        })
      }
    } catch (error: any) {
      console.error("Ошибка удаления друга:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка удаления из друзей",
      })
    }
  }
)

// Заблокировать пользователя
router.post(
  "/block/:userId",
  [param("userId").isInt({ min: 1 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const blockedUserId = parseInt(req.params.userId)
      const userId = req.userId!

      if (blockedUserId === userId) {
        res.status(400).json({
          success: false,
          error: "Нельзя заблокировать самого себя",
        })
        return
      }

      const success = await dbManager.blockUser(userId, blockedUserId)

      if (success) {
        res.json({
          success: true,
          message: "Пользователь заблокирован",
        })
      } else {
        res.status(500).json({
          success: false,
          error: "Ошибка блокировки пользователя",
        })
      }
    } catch (error: any) {
      console.error("Ошибка блокировки:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка блокировки пользователя",
      })
    }
  }
)

// Разблокировать пользователя
router.delete(
  "/block/:userId",
  [param("userId").isInt({ min: 1 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const unblockedUserId = parseInt(req.params.userId)
      const userId = req.userId!

      const success = await dbManager.unblockUser(userId, unblockedUserId)

      if (success) {
        res.json({
          success: true,
          message: "Пользователь разблокирован",
        })
      } else {
        res.status(404).json({
          success: false,
          error: "Блокировка не найдена",
        })
      }
    } catch (error: any) {
      console.error("Ошибка разблокировки:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка разблокировки пользователя",
      })
    }
  }
)

// Получить статус отношений с пользователем
router.get(
  "/status/:userId",
  [param("userId").isInt({ min: 1 })],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: "Ошибки валидации",
          details: errors.array(),
        })
        return
      }

      const otherUserId = parseInt(req.params.userId)
      const userId = req.userId!

      const status = await dbManager.getFriendshipStatus(userId, otherUserId)

      res.json({
        success: true,
        data: { status },
        message: "Статус отношений получен успешно",
      })
    } catch (error: any) {
      console.error("Ошибка получения статуса:", error)
      res.status(500).json({
        success: false,
        error: "Ошибка получения статуса отношений",
      })
    }
  }
)

export default router
