import { Router, Request, Response } from "express"
import { body, param, query, validationResult } from "express-validator"
import rateLimit from "express-rate-limit"
import { dbManager } from "../index"

interface AuthenticatedRequest extends Request {
  userId?: number
  user?: any
}

const router = Router()

// Rate limiting для создания комнат
const isDevMode =
  process.env.NODE_ENV === "development" || process.env.USE_MOCK_DB === "true"
const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: isDevMode ? 10000 : 10, // 10000 в dev режиме, 10 в production
  message: { error: "Слишком много созданных комнат. Попробуйте позже." },
  skip: (req) => isDevMode, // Полностью пропускать в dev режиме
})

// Rate limiting для отправки сообщений
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: isDevMode ? 10000 : 30, // 10000 в dev режиме, 30 в production
  message: { error: "Слишком много сообщений. Замедлитесь." },
  skip: (req) => isDevMode, // Полностью пропускать в dev режиме
})

// Валидаторы
const validateCreateRoom = [
  body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Название комнаты должно быть от 1 до 100 символов"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Описание не должно превышать 500 символов"),
  body("type")
    .isIn(["private", "group", "public"])
    .withMessage("Тип комнаты должен быть: private, group или public"),
]

const validateSendMessage = [
  body("content")
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage("Сообщение должно быть от 1 до 4000 символов"),
  body("messageType")
    .optional()
    .isIn(["text", "image", "file", "system"])
    .withMessage("Тип сообщения должен быть: text, image, file или system"),
  body("replyTo")
    .optional()
    .isInt({ min: 1 })
    .withMessage("ID сообщения для ответа должно быть положительным числом"),
]

// Получить список комнат пользователя
router.get(
  "/rooms",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!
      const rooms = await dbManager.getUserChatRooms(userId)

      // Получаем дополнительную информацию для каждой комнаты
      const roomsWithDetails = await Promise.all(
        rooms.map(async (room) => {
          const participants = await dbManager.getRoomParticipants(room.id)
          const messages = await dbManager.getRoomMessages(room.id, 1) // последнее сообщение

          return {
            ...room,
            participantCount: participants.length,
            participants: participants.slice(0, 5), // первые 5 участников для превью
            lastMessage: messages[0] || null,
          }
        })
      )

      res.json({ rooms: roomsWithDetails })
    } catch (error) {
      console.error("Ошибка получения комнат:", error)
      res.status(500).json({ error: "Ошибка получения списка комнат" })
    }
  }
)

// Создать новую комнату
router.post(
  "/rooms",
  createRoomLimiter,
  validateCreateRoom,
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

      const { name, description = "", type } = req.body
      const userId = req.userId!

      const roomId = await dbManager.createChatRoom(
        name,
        description,
        type,
        userId
      )
      const room = await dbManager.getChatRoom(roomId)

      res.status(201).json({
        message: "Комната создана успешно",
        room,
      })
    } catch (error) {
      console.error("Ошибка создания комнаты:", error)
      res.status(500).json({ error: "Ошибка создания комнаты" })
    }
  }
)

// Получить информацию о конкретной комнате
router.get(
  "/rooms/:roomId",
  [
    param("roomId")
      .isInt({ min: 1 })
      .withMessage("ID комнаты должно быть положительным числом"),
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

      const roomId = parseInt(req.params.roomId)
      const userId = req.userId!

      // Проверяем доступ к комнате
      const participants = await dbManager.getRoomParticipants(roomId)
      const isParticipant = participants.some((p) => p.id === userId)

      if (!isParticipant) {
        res.status(403).json({ error: "Нет доступа к этой комнате" })
        return
      }

      const room = await dbManager.getChatRoom(roomId)

      if (!room) {
        res.status(404).json({ error: "Комната не найдена" })
        return
      }

      res.json({ room })
    } catch (error) {
      console.error("Ошибка получения комнаты:", error)
      res.status(500).json({ error: "Ошибка получения информации о комнате" })
    }
  }
)

// Добавить участника в комнату
router.post(
  "/rooms/:roomId/participants",
  [
    param("roomId").isInt({ min: 1 }),
    body("userId")
      .isInt({ min: 1 })
      .withMessage("ID пользователя должно быть положительным числом"),
    body("role")
      .optional()
      .isIn(["admin", "moderator", "member"])
      .withMessage("Роль должна быть: admin, moderator или member"),
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

      const roomId = parseInt(req.params.roomId)
      const { userId: targetUserId, role = "member" } = req.body
      const currentUserId = req.userId!

      // Проверяем права текущего пользователя (должен быть админ или модератор)
      const participants = await dbManager.getRoomParticipants(roomId)
      const currentUser = participants.find((p) => p.id === currentUserId)

      if (!currentUser) {
        res
          .status(403)
          .json({ error: "Вы не являетесь участником этой комнаты" })
        return
      }

      // TODO: добавить проверку роли пользователя (admin/moderator могут добавлять)

      // Проверяем существование целевого пользователя
      const targetUser = await dbManager.getUserById(targetUserId)
      if (!targetUser) {
        res.status(404).json({ error: "Пользователь не найден" })
        return
      }

      await dbManager.addRoomParticipant(roomId, targetUserId, role)

      res.json({
        message: "Участник добавлен в комнату",
        participant: {
          id: targetUser.id,
          username: targetUser.username,
          avatar_url: targetUser.avatar_url,
          role,
        },
      })
    } catch (error) {
      console.error("Ошибка добавления участника:", error)
      res.status(500).json({ error: "Ошибка добавления участника" })
    }
  }
)

// Получить участников комнаты
router.get(
  "/rooms/:roomId/participants",
  [param("roomId").isInt({ min: 1 })],
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

      const roomId = parseInt(req.params.roomId)
      const userId = req.userId!

      // Проверяем доступ к комнате
      const participants = await dbManager.getRoomParticipants(roomId)
      const isParticipant = participants.some((p) => p.id === userId)

      if (!isParticipant) {
        res.status(403).json({ error: "Нет доступа к этой комнате" })
        return
      }

      res.json({ participants })
    } catch (error) {
      console.error("Ошибка получения участников:", error)
      res.status(500).json({ error: "Ошибка получения списка участников" })
    }
  }
)

// Получить сообщения комнаты
router.get(
  "/rooms/:roomId/messages",
  [
    param("roomId").isInt({ min: 1 }),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Лимит должен быть от 1 до 100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Смещение должно быть не отрицательным"),
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

      const roomId = parseInt(req.params.roomId)
      const limit = parseInt(req.query.limit as string) || 50
      const offset = parseInt(req.query.offset as string) || 0
      const userId = req.userId!

      // Проверяем доступ к комнате
      const participants = await dbManager.getRoomParticipants(roomId)
      const isParticipant = participants.some((p) => p.id === userId)

      if (!isParticipant) {
        res.status(403).json({ error: "Нет доступа к этой комнате" })
        return
      }

      const messages = await dbManager.getRoomMessages(roomId, limit, offset)

      res.json({
        messages,
        hasMore: messages.length === limit,
      })
    } catch (error) {
      console.error("Ошибка получения сообщений:", error)
      res.status(500).json({ error: "Ошибка получения сообщений" })
    }
  }
)

// Отправить сообщение (альтернативный HTTP способ, основной через WebSocket)
router.post(
  "/rooms/:roomId/messages",
  messageLimiter,
  [param("roomId").isInt({ min: 1 }), ...validateSendMessage],
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

      const roomId = parseInt(req.params.roomId)
      const { content, messageType = "text", replyTo } = req.body
      const userId = req.userId!

      // Проверяем доступ к комнате
      const participants = await dbManager.getRoomParticipants(roomId)
      const isParticipant = participants.some((p) => p.id === userId)

      if (!isParticipant) {
        res.status(403).json({ error: "Нет доступа к этой комнате" })
        return
      }

      const messageId = await dbManager.createMessage(
        roomId,
        userId,
        content,
        messageType,
        replyTo
      )
      const messages = await dbManager.getRoomMessages(roomId, 1, 0)
      const newMessage = messages[0]

      res.status(201).json({
        message: "Сообщение отправлено",
        data: newMessage,
      })
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error)
      res.status(500).json({ error: "Ошибка отправки сообщения" })
    }
  }
)

// Поиск сообщений
router.get(
  "/rooms/:roomId/search",
  [
    param("roomId").isInt({ min: 1 }),
    query("q").notEmpty().withMessage("Поисковый запрос обязателен"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Лимит должен быть от 1 до 50"),
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

      const roomId = parseInt(req.params.roomId)
      const query = req.query.q as string
      const limit = parseInt(req.query.limit as string) || 20
      const userId = req.userId!

      // Проверяем доступ к комнате
      const participants = await dbManager.getRoomParticipants(roomId)
      const isParticipant = participants.some((p) => p.id === userId)

      if (!isParticipant) {
        res.status(403).json({ error: "Нет доступа к этой комнате" })
        return
      }

      const messages = await dbManager.searchMessages(roomId, query, limit)

      res.json({
        query,
        messages,
        total: messages.length,
      })
    } catch (error) {
      console.error("Ошибка поиска сообщений:", error)
      res.status(500).json({ error: "Ошибка поиска сообщений" })
    }
  }
)

// Редактировать сообщение
router.put(
  "/messages/:messageId",
  [
    param("messageId").isInt({ min: 1 }),
    body("content").trim().isLength({ min: 1, max: 4000 }),
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

      const messageId = parseInt(req.params.messageId)
      const { content } = req.body
      const userId = req.userId!

      const success = await dbManager.updateMessage(messageId, userId, content)

      if (success) {
        res.json({ message: "Сообщение обновлено" })
      } else {
        res.status(404).json({
          error: "Сообщение не найдено или нет прав на редактирование",
        })
      }
    } catch (error) {
      console.error("Ошибка редактирования сообщения:", error)
      res.status(500).json({ error: "Ошибка редактирования сообщения" })
    }
  }
)

// Удалить сообщение
router.delete(
  "/messages/:messageId",
  [param("messageId").isInt({ min: 1 })],
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

      const messageId = parseInt(req.params.messageId)
      const userId = req.userId!

      const success = await dbManager.deleteMessage(messageId, userId)

      if (success) {
        res.json({ message: "Сообщение удалено" })
      } else {
        res
          .status(404)
          .json({ error: "Сообщение не найдено или нет прав на удаление" })
      }
    } catch (error) {
      console.error("Ошибка удаления сообщения:", error)
      res.status(500).json({ error: "Ошибка удаления сообщения" })
    }
  }
)

export default router
