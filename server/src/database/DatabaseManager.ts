import mysql from "mysql2/promise"
import CryptoJS from "crypto-js"
import dotenv from "dotenv"

dotenv.config()

export interface User {
  id: number
  username: string
  email: string
  avatar_url?: string
  status: "online" | "offline" | "away"
  last_seen: Date
  created_at: Date
}

export interface ChatRoom {
  id: number
  name: string
  description?: string
  type: "private" | "group" | "public"
  created_by: number
  created_at: Date
  participants?: User[]
}

export interface Message {
  id: number
  room_id: number
  user_id: number
  content: string // расшифрованное содержимое
  message_type: "text" | "image" | "file" | "system"
  reply_to?: number
  created_at: Date
  edited_at?: Date
  user?: User
}

export class DatabaseManager {
  private connection: mysql.Connection | null = null
  private encryptionKey: string

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || "default-secret-key"
  }

  async initialize(): Promise<void> {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "yat_glagol_chat",
        charset: "utf8mb4",
      })

      console.log("Подключение к базе данных установлено")

      // Проверяем подключение
      await this.connection.ping()
    } catch (error) {
      console.error("Ошибка подключения к базе данных:", error)
      throw error
    }
  }

  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString()
  }

  private decrypt(encryptedText: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey)
      return bytes.toString(CryptoJS.enc.Utf8)
    } catch (error) {
      console.error("Ошибка расшифровки:", error)
      return "[Сообщение не удалось расшифровать]"
    }
  }

  // Пользователи
  async createUser(
    username: string,
    email: string,
    passwordHash: string
  ): Promise<number> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [result] = await this.connection.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        [username, email, passwordHash]
      )

      return (result as mysql.ResultSetHeader).insertId
    } catch (error) {
      console.error("Ошибка создания пользователя:", error)
      throw error
    }
  }

  async getUserByEmail(
    email: string
  ): Promise<(User & { password_hash: string }) | null> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      )

      const users = rows as any[]
      return users.length > 0 ? users[0] : null
    } catch (error) {
      console.error("Ошибка получения пользователя:", error)
      throw error
    }
  }

  async getUserById(id: number): Promise<User | null> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        "SELECT id, username, email, avatar_url, status, last_seen, created_at FROM users WHERE id = ?",
        [id]
      )

      const users = rows as User[]
      return users.length > 0 ? users[0] : null
    } catch (error) {
      console.error("Ошибка получения пользователя:", error)
      throw error
    }
  }

  async updateUserStatus(
    userId: number,
    status: "online" | "offline" | "away"
  ): Promise<void> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      await this.connection.execute(
        "UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?",
        [status, userId]
      )
    } catch (error) {
      console.error("Ошибка обновления статуса:", error)
    }
  }

  // Чаты
  async createChatRoom(
    name: string,
    description: string,
    type: "private" | "group" | "public",
    createdBy: number
  ): Promise<number> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [result] = await this.connection.execute(
        "INSERT INTO chat_rooms (name, description, type, created_by) VALUES (?, ?, ?, ?)",
        [name, description, type, createdBy]
      )

      const roomId = (result as mysql.ResultSetHeader).insertId

      // Добавляем создателя как администратора
      await this.addRoomParticipant(roomId, createdBy, "admin")

      return roomId
    } catch (error) {
      console.error("Ошибка создания чата:", error)
      throw error
    }
  }

  async getChatRoom(roomId: number): Promise<ChatRoom | null> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        "SELECT * FROM chat_rooms WHERE id = ?",
        [roomId]
      )

      const rooms = rows as ChatRoom[]
      if (rooms.length === 0) return null

      // Получаем участников
      const participants = await this.getRoomParticipants(roomId)

      return {
        ...rooms[0],
        participants,
      }
    } catch (error) {
      console.error("Ошибка получения чата:", error)
      throw error
    }
  }

  async getUserChatRooms(userId: number): Promise<ChatRoom[]> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        `
        SELECT cr.*, COUNT(m.id) as message_count 
        FROM chat_rooms cr
        JOIN room_participants rp ON cr.id = rp.room_id
        LEFT JOIN messages m ON cr.id = m.room_id
        WHERE rp.user_id = ?
        GROUP BY cr.id
        ORDER BY cr.updated_at DESC
      `,
        [userId]
      )

      return rows as ChatRoom[]
    } catch (error) {
      console.error("Ошибка получения чатов пользователя:", error)
      throw error
    }
  }

  async addRoomParticipant(
    roomId: number,
    userId: number,
    role: "admin" | "moderator" | "member" = "member"
  ): Promise<void> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      await this.connection.execute(
        "INSERT INTO room_participants (room_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
        [roomId, userId, role]
      )
    } catch (error) {
      console.error("Ошибка добавления участника:", error)
      throw error
    }
  }

  async getRoomParticipants(roomId: number): Promise<User[]> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        `
        SELECT u.id, u.username, u.email, u.avatar_url, u.status, u.last_seen, u.created_at, rp.role
        FROM users u
        JOIN room_participants rp ON u.id = rp.user_id
        WHERE rp.room_id = ?
        ORDER BY rp.joined_at ASC
      `,
        [roomId]
      )

      return rows as User[]
    } catch (error) {
      console.error("Ошибка получения участников:", error)
      throw error
    }
  }

  // Сообщения
  async createMessage(
    roomId: number,
    userId: number,
    content: string,
    messageType: "text" | "image" | "file" | "system" = "text",
    replyTo?: number
  ): Promise<number> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const encryptedContent = this.encrypt(content)

      const [result] = await this.connection.execute(
        "INSERT INTO messages (room_id, user_id, encrypted_content, message_type, reply_to) VALUES (?, ?, ?, ?, ?)",
        [roomId, userId, encryptedContent, messageType, replyTo || null]
      )

      // Обновляем время последнего обновления чата
      await this.connection.execute(
        "UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [roomId]
      )

      return (result as mysql.ResultSetHeader).insertId
    } catch (error) {
      console.error("Ошибка создания сообщения:", error)
      throw error
    }
  }

  async getRoomMessages(
    roomId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        `
        SELECT m.*, u.username, u.avatar_url
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
      `,
        [roomId, limit, offset]
      )

      const messages = rows as any[]

      return messages
        .map((msg) => ({
          id: msg.id,
          room_id: msg.room_id,
          user_id: msg.user_id,
          content: this.decrypt(msg.encrypted_content),
          message_type: msg.message_type,
          reply_to: msg.reply_to,
          created_at: msg.created_at,
          edited_at: msg.edited_at,
          user: {
            id: msg.user_id,
            username: msg.username,
            email: "",
            avatar_url: msg.avatar_url,
            status: "offline" as const,
            last_seen: new Date(),
            created_at: new Date(),
          },
        }))
        .reverse()
    } catch (error) {
      console.error("Ошибка получения сообщений:", error)
      throw error
    }
  }

  async updateMessage(
    messageId: number,
    userId: number,
    newContent: string
  ): Promise<boolean> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const encryptedContent = this.encrypt(newContent)

      const [result] = await this.connection.execute(
        "UPDATE messages SET encrypted_content = ?, edited_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        [encryptedContent, messageId, userId]
      )

      return (result as mysql.ResultSetHeader).affectedRows > 0
    } catch (error) {
      console.error("Ошибка обновления сообщения:", error)
      return false
    }
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [result] = await this.connection.execute(
        "DELETE FROM messages WHERE id = ? AND user_id = ?",
        [messageId, userId]
      )

      return (result as mysql.ResultSetHeader).affectedRows > 0
    } catch (error) {
      console.error("Ошибка удаления сообщения:", error)
      return false
    }
  }

  async searchMessages(
    roomId: number,
    query: string,
    limit: number = 20
  ): Promise<Message[]> {
    // Примечание: поиск по зашифрованным сообщениям ограничен
    // В реальном проекте можно использовать отдельное поле для поискового индекса
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        `
        SELECT m.*, u.username, u.avatar_url
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = ?
        ORDER BY m.created_at DESC
        LIMIT ?
      `,
        [roomId, limit * 3]
      ) // Получаем больше сообщений для фильтрации

      const messages = rows as any[]
      const decryptedMessages = messages
        .map((msg) => ({
          id: msg.id,
          room_id: msg.room_id,
          user_id: msg.user_id,
          content: this.decrypt(msg.encrypted_content),
          message_type: msg.message_type,
          reply_to: msg.reply_to,
          created_at: msg.created_at,
          edited_at: msg.edited_at,
          user: {
            id: msg.user_id,
            username: msg.username,
            email: "",
            avatar_url: msg.avatar_url,
            status: "offline" as const,
            last_seen: new Date(),
            created_at: new Date(),
          },
        }))
        .filter((msg) =>
          msg.content.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)

      return decryptedMessages
    } catch (error) {
      console.error("Ошибка поиска сообщений:", error)
      return []
    }
  }

  // ============ МЕТОДЫ ДЛЯ ДРУЗЕЙ ============

  async getFriends(userId: number): Promise<any[]> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        `SELECT 
          f.id, f.user_id as userId, f.friend_id as friendId, f.status, f.created_at as createdAt, f.room_id as roomId,
          u.id as friend_id, u.username as friend_username, u.email as friend_email, 
          u.avatar_url as friend_avatar_url, u.status as friend_status, u.last_seen as friend_last_seen, u.created_at as friend_created_at
        FROM friendships f
        JOIN users u ON (f.friend_id = u.id AND f.user_id = ?) OR (f.user_id = u.id AND f.friend_id = ?)
        WHERE ((f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted') 
        AND u.id != ?`,
        [userId, userId, userId, userId, userId]
      )

      console.log(
        `👥 [PROD-DB] getFriends для пользователя ${userId}: найдено ${
          (rows as any[]).length
        } записей`
      )

      const result = []
      const seenFriendIds = new Set<number>()

      for (const row of rows as any[]) {
        const friendId = row.friend_id

        if (seenFriendIds.has(friendId)) {
          console.log(
            `⚠️ [PROD-DB] Пропускаем дубликат друга с ID: ${friendId}`
          )
          continue
        }
        seenFriendIds.add(friendId)

        console.log(
          `➕ [PROD-DB] Добавляем друга: ${row.friend_username} (ID: ${friendId})`
        )
        result.push({
          id: row.id,
          userId: row.userId,
          friendId: row.friendId,
          status: row.status,
          createdAt: row.createdAt,
          roomId: row.roomId,
          friend: {
            id: row.friend_id,
            username: row.friend_username,
            email: row.friend_email,
            avatar_url: row.friend_avatar_url,
            status: row.friend_status,
            last_seen: row.friend_last_seen,
            created_at: row.friend_created_at,
          },
        })
      }

      console.log(
        `✅ [PROD-DB] getFriends результат: ${result.length} уникальных друзей`
      )
      return result
    } catch (error) {
      console.error("Ошибка получения друзей:", error)
      throw error
    }
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        `SELECT 
          fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.message, fr.created_at, fr.updated_at,
          u.username as from_username, u.email as from_email, u.avatar_url as from_avatar_url
        FROM friend_requests fr
        JOIN users u ON fr.from_user_id = u.id
        WHERE fr.to_user_id = ? AND fr.status = 'pending'
        ORDER BY fr.created_at DESC`,
        [userId]
      )

      return (rows as any[]).map((row) => ({
        id: row.id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        fromUser: {
          id: row.from_user_id,
          username: row.from_username,
          email: row.from_email,
          avatar_url: row.from_avatar_url,
        },
      }))
    } catch (error) {
      console.error("Ошибка получения входящих запросов:", error)
      throw error
    }
  }

  async getSentFriendRequests(userId: number): Promise<any[]> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [rows] = await this.connection.execute(
        `SELECT 
          fr.id, fr.from_user_id, fr.to_user_id, fr.status, fr.message, fr.created_at, fr.updated_at,
          u.username as to_username, u.email as to_email, u.avatar_url as to_avatar_url
        FROM friend_requests fr
        JOIN users u ON fr.to_user_id = u.id
        WHERE fr.from_user_id = ? AND fr.status = 'pending'
        ORDER BY fr.created_at DESC`,
        [userId]
      )

      return (rows as any[]).map((row) => ({
        id: row.id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        status: row.status,
        message: row.message,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        toUser: {
          id: row.to_user_id,
          username: row.to_username,
          email: row.to_email,
          avatar_url: row.to_avatar_url,
        },
      }))
    } catch (error) {
      console.error("Ошибка получения отправленных запросов:", error)
      throw error
    }
  }

  async sendFriendRequest(
    fromUserId: number,
    toUserId: number,
    message?: string
  ): Promise<number> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      // Проверяем, не являются ли уже друзьями
      const [friendshipCheck] = await this.connection.execute(
        `SELECT id FROM friendships 
         WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
         AND status = 'accepted'`,
        [fromUserId, toUserId, toUserId, fromUserId]
      )

      if ((friendshipCheck as any[]).length > 0) {
        throw new Error("Пользователи уже являются друзьями")
      }

      // Проверяем существующие запросы
      const [requestCheck] = await this.connection.execute(
        `SELECT id FROM friend_requests 
         WHERE ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)) 
         AND status = 'pending'`,
        [fromUserId, toUserId, toUserId, fromUserId]
      )

      if ((requestCheck as any[]).length > 0) {
        throw new Error("Запрос уже отправлен")
      }

      const [result] = await this.connection.execute(
        "INSERT INTO friend_requests (from_user_id, to_user_id, message, status) VALUES (?, ?, ?, 'pending')",
        [fromUserId, toUserId, message || null]
      )

      return (result as mysql.ResultSetHeader).insertId
    } catch (error) {
      console.error("Ошибка отправки запроса на дружбу:", error)
      throw error
    }
  }

  async acceptFriendRequest(
    requestId: number,
    userId: number
  ): Promise<{ friendship: any; roomId?: number }> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      // Начинаем транзакцию
      await this.connection.beginTransaction()

      // Получаем запрос
      const [requestRows] = await this.connection.execute(
        "SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'",
        [requestId, userId]
      )

      const requests = requestRows as any[]
      if (requests.length === 0) {
        await this.connection.rollback()
        throw new Error("Запрос на дружбу не найден")
      }

      const request = requests[0]

      // Создаем приватную комнату для друзей
      const roomId = await this.createFriendRoom(
        request.from_user_id,
        request.to_user_id
      )

      // Создаем две записи дружбы (для каждого пользователя)
      const [friendship1] = await this.connection.execute(
        "INSERT INTO friendships (user_id, friend_id, status, room_id) VALUES (?, ?, 'accepted', ?)",
        [request.from_user_id, request.to_user_id, roomId]
      )

      const [friendship2] = await this.connection.execute(
        "INSERT INTO friendships (user_id, friend_id, status, room_id) VALUES (?, ?, 'accepted', ?)",
        [request.to_user_id, request.from_user_id, roomId]
      )

      // Обновляем статус запроса
      await this.connection.execute(
        "UPDATE friend_requests SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [requestId]
      )

      await this.connection.commit()

      const friendshipId1 = (friendship1 as mysql.ResultSetHeader).insertId
      return {
        friendship: {
          id: friendshipId1,
          user_id: request.from_user_id,
          friend_id: request.to_user_id,
          status: "accepted",
          room_id: roomId,
          created_at: new Date(),
        },
        roomId: roomId,
      }
    } catch (error) {
      await this.connection.rollback()
      console.error("Ошибка принятия запроса на дружбу:", error)
      throw error
    }
  }

  async declineFriendRequest(
    requestId: number,
    userId: number
  ): Promise<boolean> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [result] = await this.connection.execute(
        "UPDATE friend_requests SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND to_user_id = ? AND status = 'pending'",
        [requestId, userId]
      )

      return (result as mysql.ResultSetHeader).affectedRows > 0
    } catch (error) {
      console.error("Ошибка отклонения запроса на дружбу:", error)
      return false
    }
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      await this.connection.beginTransaction()

      // Удаляем все записи дружбы
      const [result] = await this.connection.execute(
        "DELETE FROM friendships WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'accepted'",
        [userId, friendId, friendId, userId]
      )

      await this.connection.commit()
      return (result as mysql.ResultSetHeader).affectedRows > 0
    } catch (error) {
      await this.connection.rollback()
      console.error("Ошибка удаления друга:", error)
      return false
    }
  }

  async blockUser(userId: number, blockedUserId: number): Promise<boolean> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      await this.connection.beginTransaction()

      // Удаляем дружбу, если есть
      await this.removeFriend(userId, blockedUserId)

      // Создаем блокировку
      await this.connection.execute(
        "INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'blocked') ON DUPLICATE KEY UPDATE status = 'blocked'",
        [userId, blockedUserId]
      )

      await this.connection.commit()
      return true
    } catch (error) {
      await this.connection.rollback()
      console.error("Ошибка блокировки пользователя:", error)
      return false
    }
  }

  async unblockUser(userId: number, unblockedUserId: number): Promise<boolean> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const [result] = await this.connection.execute(
        "DELETE FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'blocked'",
        [userId, unblockedUserId]
      )

      return (result as mysql.ResultSetHeader).affectedRows > 0
    } catch (error) {
      console.error("Ошибка разблокировки пользователя:", error)
      return false
    }
  }

  async getFriendshipStatus(
    userId: number,
    otherUserId: number
  ): Promise<string> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      // Проверяем блокировку
      const [blockedRows] = await this.connection.execute(
        "SELECT id FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'blocked'",
        [userId, otherUserId]
      )
      if ((blockedRows as any[]).length > 0) return "blocked"

      // Проверяем дружбу
      const [friendshipRows] = await this.connection.execute(
        "SELECT id FROM friendships WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'accepted'",
        [userId, otherUserId, otherUserId, userId]
      )
      if ((friendshipRows as any[]).length > 0) return "friends"

      // Проверяем отправленные запросы
      const [sentRequestRows] = await this.connection.execute(
        "SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'",
        [userId, otherUserId]
      )
      if ((sentRequestRows as any[]).length > 0) return "pending_sent"

      // Проверяем входящие запросы
      const [receivedRequestRows] = await this.connection.execute(
        "SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'",
        [otherUserId, userId]
      )
      if ((receivedRequestRows as any[]).length > 0) return "pending_received"

      return "none"
    } catch (error) {
      console.error("Ошибка получения статуса дружбы:", error)
      return "none"
    }
  }

  async createFriendRoom(userId: number, friendId: number): Promise<number> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      // Получаем информацию о пользователях
      const [user1] = await this.connection.execute(
        "SELECT username FROM users WHERE id = ?",
        [userId]
      )
      const [user2] = await this.connection.execute(
        "SELECT username FROM users WHERE id = ?",
        [friendId]
      )

      const users = [user1 as any[], user2 as any[]]
      if (users[0].length === 0 || users[1].length === 0) {
        throw new Error("Один из пользователей не найден")
      }

      const roomName = `${users[0][0].username} & ${users[1][0].username}`

      // Создаем приватную комнату
      const roomId = await this.createChatRoom(
        roomName,
        "Приватная комната друзей",
        "private",
        userId
      )

      // Добавляем обоих пользователей как участников
      await this.addRoomParticipant(roomId, userId, "admin")
      await this.addRoomParticipant(roomId, friendId, "admin")

      return roomId
    } catch (error) {
      console.error("Ошибка создания комнаты друзей:", error)
      throw error
    }
  }

  async searchUsers(query: string): Promise<any[]> {
    if (!this.connection) throw new Error("База данных не инициализирована")

    try {
      const searchQuery = `%${query.toLowerCase().trim()}%`

      if (!query.trim()) {
        return []
      }

      const [rows] = await this.connection.execute(
        `SELECT id, username, email, avatar_url, status, created_at
         FROM users 
         WHERE (LOWER(username) LIKE ? OR LOWER(email) LIKE ?)
         ORDER BY 
           CASE WHEN LOWER(username) = ? THEN 0 ELSE 1 END,
           username ASC
         LIMIT 50`,
        [searchQuery, searchQuery, query.toLowerCase().trim()]
      )

      return rows as any[]
    } catch (error) {
      console.error("Ошибка поиска пользователей:", error)
      return []
    }
  }

  // Закрытие соединения
  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end()
      this.connection = null
    }
  }
}
