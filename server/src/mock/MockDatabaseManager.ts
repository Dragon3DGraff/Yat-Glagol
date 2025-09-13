import * as bcrypt from "bcryptjs"
import * as CryptoJS from "crypto-js"
import { DatabaseManager } from "../database/DatabaseManager"

// Используем те же интерфейсы что и в DatabaseManager для совместимости
interface MockUser {
  id: number
  username: string
  email: string
  password_hash: string
  avatar_url?: string
  status: "online" | "offline" | "away"
  created_at: Date
  last_active: Date
  last_seen: Date
}

interface MockChatRoom {
  id: number
  name: string
  description?: string
  type: "private" | "group" | "public"
  created_by: number
  created_at: Date
  updated_at: Date
  participants?: MockUser[]
}

interface MockMessage {
  id: number
  room_id: number
  user_id: number
  content: string // расшифрованное содержимое
  message_type: "text" | "image" | "file" | "system"
  reply_to?: number
  created_at: Date
  edited_at?: Date
  user?: MockUser
}

interface MockParticipant {
  room_id: number
  user_id: number
  role: "admin" | "moderator" | "member"
  joined_at: Date
}

export class MockDatabaseManager {
  private users: Map<number, MockUser> = new Map()
  private chatRooms: Map<number, MockChatRoom> = new Map()
  private messages: Map<number, MockMessage> = new Map()
  private participants: Map<string, MockParticipant> = new Map() // key: roomId_userId
  private encryptionKey: string
  private nextUserId = 1
  private nextRoomId = 1
  private nextMessageId = 1

  constructor() {
    this.encryptionKey =
      (process?.env?.ENCRYPTION_KEY as string) ||
      "mock-encryption-key-for-development"
    this.initializeMockData()
  }

  private async initializeMockData() {
    // Создаем тестовых пользователей
    const testUsers = [
      {
        email: "alice@example.com",
        password: "password123",
        username: "Alice",
        avatar_url: "👩‍💻",
      },
      {
        email: "bob@example.com",
        password: "password123",
        username: "Bob",
        avatar_url: "👨‍💼",
      },
      {
        email: "charlie@example.com",
        password: "password123",
        username: "Charlie",
        avatar_url: "🧑‍🎨",
      },
      {
        email: "diana@example.com",
        password: "password123",
        username: "Diana",
        avatar_url: "👩‍🔬",
      },
      {
        email: "admin@example.com",
        password: "admin123",
        username: "Admin",
        avatar_url: "👑",
      },
    ]

    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      const userId = this.nextUserId++

      this.users.set(userId, {
        id: userId,
        email: userData.email,
        password_hash: hashedPassword,
        username: userData.username,
        avatar_url: userData.avatar_url,
        status: "offline",
        created_at: new Date(),
        last_active: new Date(),
        last_seen: new Date(),
      })
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

  // Методы для работы с пользователями (совместимые с DatabaseManager)
  async getUserByEmail(email: string): Promise<MockUser | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  async getUserById(id: number): Promise<MockUser | null> {
    return this.users.get(id) || null
  }

  async createUser(
    username: string,
    email: string,
    password_hash: string
  ): Promise<number> {
    const userId = this.nextUserId++

    const user: MockUser = {
      id: userId,
      email,
      password_hash,
      username,
      avatar_url: undefined,
      status: "offline",
      created_at: new Date(),
      last_active: new Date(),
      last_seen: new Date(),
    }

    this.users.set(userId, user)
    return userId
  }

  async updateUserStatus(
    userId: number,
    status: "online" | "offline" | "away"
  ): Promise<void> {
    const user = this.users.get(userId)
    if (user) {
      user.status = status
      user.last_active = new Date()
    }
  }

  // Методы для работы с чатами (совместимые с DatabaseManager)
  async createChatRoom(
    name: string,
    description: string,
    type: "private" | "group" | "public",
    createdBy: number
  ): Promise<number> {
    const roomId = this.nextRoomId++

    const room: MockChatRoom = {
      id: roomId,
      name,
      description,
      type,
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    }

    this.chatRooms.set(roomId, room)

    // Добавляем создателя как администратора
    await this.addRoomParticipant(roomId, createdBy, "admin")

    return roomId
  }

  async getChatRoom(roomId: number): Promise<MockChatRoom | null> {
    const room = this.chatRooms.get(roomId)
    if (!room) return null

    // Получаем участников
    const participants = await this.getRoomParticipants(roomId)

    return {
      ...room,
      participants,
      participantCount: participants.length,
    } as any
  }

  async getUserChatRooms(userId: number): Promise<MockChatRoom[]> {
    const userRooms: MockChatRoom[] = []

    for (const [roomId, room] of this.chatRooms) {
      const participantKey = `${roomId}_${userId}`
      if (this.participants.has(participantKey)) {
        // Подсчитываем количество сообщений в комнате
        let messageCount = 0
        for (const message of this.messages.values()) {
          if (message.room_id === roomId) {
            messageCount++
          }
        }

        // Подсчитываем количество участников в комнате
        const participants = await this.getRoomParticipants(roomId)

        userRooms.push({
          ...room,
          message_count: messageCount,
          participantCount: participants.length,
        } as any)
      }
    }

    return userRooms.sort(
      (a, b) => b.updated_at.getTime() - a.updated_at.getTime()
    )
  }

  async addRoomParticipant(
    roomId: number,
    userId: number,
    role: "admin" | "moderator" | "member" = "member"
  ): Promise<void> {
    const participantKey = `${roomId}_${userId}`

    const participant: MockParticipant = {
      room_id: roomId,
      user_id: userId,
      role,
      joined_at: new Date(),
    }

    this.participants.set(participantKey, participant)
  }

  async getRoomParticipants(roomId: number): Promise<MockUser[]> {
    const participantUsers: MockUser[] = []

    for (const participant of this.participants.values()) {
      if (participant.room_id === roomId) {
        const user = this.users.get(participant.user_id)
        if (user) {
          participantUsers.push({
            ...user,
            role: participant.role,
          } as any)
        }
      }
    }

    return participantUsers.sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime()
    )
  }

  // Методы для работы с сообщениями
  async createMessage(
    roomId: number,
    userId: number,
    content: string,
    messageType: "text" | "image" | "file" | "system" = "text",
    replyTo?: number
  ): Promise<number> {
    const messageId = this.nextMessageId++
    const encryptedContent = this.encrypt(content)

    const message: MockMessage = {
      id: messageId,
      room_id: roomId,
      user_id: userId,
      content: encryptedContent,
      message_type: messageType,
      reply_to: replyTo,
      created_at: new Date(),
    }

    this.messages.set(messageId, message)

    // Обновляем время последнего обновления чата
    const room = this.chatRooms.get(roomId)
    if (room) {
      room.updated_at = new Date()
    }

    return messageId
  }

  async getMessageById(messageId: number): Promise<MockMessage | null> {
    const message = this.messages.get(messageId)
    if (!message) {
      return null
    }

    const user = this.users.get(message.user_id)
    const decryptedMessage: MockMessage = {
      ...message,
      content: this.decrypt(message.content),
      user: user
        ? ({
            id: user.id,
            username: user.username,
            email: "",
            avatar_url: user.avatar_url || "",
            status: user.status,
            last_seen: user.last_active,
            created_at: user.created_at,
          } as any)
        : undefined,
    }

    return decryptedMessage
  }

  async getRoomMessages(
    roomId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<MockMessage[]> {
    const roomMessages: MockMessage[] = []

    for (const message of this.messages.values()) {
      if (message.room_id === roomId) {
        const user = this.users.get(message.user_id)
        const decryptedMessage: MockMessage = {
          ...message,
          content: this.decrypt(message.content),
          user: user
            ? ({
                id: user.id,
                username: user.username,
                email: "",
                avatar_url: user.avatar_url || "",
                status: user.status,
                last_seen: user.last_active,
                created_at: user.created_at,
              } as any)
            : undefined,
        }
        roomMessages.push(decryptedMessage)
      }
    }

    // Сортируем по времени создания (новые последними)
    roomMessages.sort((a, b) => a.created_at.getTime() - b.created_at.getTime())

    // Применяем пагинацию
    return roomMessages.slice(offset, offset + limit)
  }

  async updateMessage(
    messageId: number,
    userId: number,
    newContent: string
  ): Promise<boolean> {
    const message = this.messages.get(messageId)

    if (!message || message.user_id !== userId) {
      return false
    }

    message.content = this.encrypt(newContent)
    message.edited_at = new Date()

    return true
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const message = this.messages.get(messageId)

    if (!message || message.user_id !== userId) {
      return false
    }

    this.messages.delete(messageId)
    return true
  }

  async searchMessages(
    roomId: number,
    query: string,
    limit: number = 20
  ): Promise<MockMessage[]> {
    const roomMessages = await this.getRoomMessages(roomId, limit * 3) // Получаем больше для фильтрации

    const filteredMessages = roomMessages
      .filter((msg) => msg.content.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit)

    return filteredMessages
  }

  // Служебный метод для получения информации о моковых данных
  getMockDataInfo(): any {
    return {
      users: this.users.size,
      chats: this.chatRooms.size,
      messages: this.messages.size,
      participants: this.participants.size,
      test_accounts: [
        {
          email: "alice@example.com",
          password: "password123",
          nickname: "Alice",
        },
        { email: "bob@example.com", password: "password123", nickname: "Bob" },
        {
          email: "charlie@example.com",
          password: "password123",
          nickname: "Charlie",
        },
        {
          email: "diana@example.com",
          password: "password123",
          nickname: "Diana",
        },
        { email: "admin@example.com", password: "admin123", nickname: "Admin" },
      ],
    }
  }

  // Методы для работы с друзьями

  private friendships: Map<string, any> = new Map()
  private friendRequests: Map<string, any> = new Map()
  private friendshipIdCounter = 1
  private requestIdCounter = 1

  async getFriends(userId: number): Promise<any[]> {
    const friends = Array.from(this.friendships.values()).filter(
      (friendship) =>
        (friendship.user_id === userId || friendship.friend_id === userId) &&
        friendship.status === "accepted"
    )

    console.log(
      `👥 [MOCK-DB] getFriends для пользователя ${userId}: найдено ${friends.length} friendship записей`
    )

    const result = []
    const seenFriendIds = new Set<number>() // Отслеживаем уже добавленных друзей

    for (const friendship of friends) {
      const friendId =
        friendship.user_id === userId
          ? friendship.friend_id
          : friendship.user_id

      // Проверяем, не добавляли ли уже этого друга
      if (seenFriendIds.has(friendId)) {
        console.log(`⚠️ [MOCK-DB] Пропускаем дубликат друга с ID: ${friendId}`)
        continue
      }
      seenFriendIds.add(friendId)

      const friendUser = await this.getUserById(friendId)
      if (friendUser) {
        console.log(
          `➕ [MOCK-DB] Добавляем друга: ${friendUser.username} (ID: ${friendId})`
        )
        result.push({
          id: friendship.id,
          userId: friendship.user_id,
          friendId: friendship.friend_id,
          status: friendship.status,
          createdAt: friendship.created_at,
          roomId: friendship.room_id,
          friend: {
            id: friendUser.id,
            username: friendUser.username,
            email: friendUser.email,
            avatar_url: friendUser.avatar_url,
            status: friendUser.status,
            last_seen: friendUser.last_active,
            created_at: friendUser.created_at,
          },
        })
      }
    }

    console.log(
      `✅ [MOCK-DB] getFriends результат: ${result.length} уникальных друзей`
    )
    return result
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    const requests = Array.from(this.friendRequests.values()).filter(
      (request) => request.to_user_id === userId && request.status === "pending"
    )

    const result = []
    for (const request of requests) {
      const fromUser = await this.getUserById(request.from_user_id)
      if (fromUser) {
        result.push({
          id: request.id,
          fromUserId: request.from_user_id,
          toUserId: request.to_user_id,
          status: request.status,
          message: request.message,
          createdAt: request.created_at,
          fromUser: {
            id: fromUser.id,
            username: fromUser.username,
            email: fromUser.email,
            avatar_url: fromUser.avatar_url,
            status: fromUser.status,
            last_seen: fromUser.last_active,
            created_at: fromUser.created_at,
          },
        })
      }
    }
    return result
  }

  async getSentFriendRequests(userId: number): Promise<any[]> {
    const requests = Array.from(this.friendRequests.values()).filter(
      (request) =>
        request.from_user_id === userId && request.status === "pending"
    )

    const result = []
    for (const request of requests) {
      const toUser = await this.getUserById(request.to_user_id)
      if (toUser) {
        result.push({
          id: request.id,
          fromUserId: request.from_user_id,
          toUserId: request.to_user_id,
          status: request.status,
          message: request.message,
          createdAt: request.created_at,
          toUser: {
            id: toUser.id,
            username: toUser.username,
            email: toUser.email,
            avatar_url: toUser.avatar_url,
            status: toUser.status,
            last_seen: toUser.last_active,
            created_at: toUser.created_at,
          },
        })
      }
    }
    return result
  }

  async sendFriendRequest(
    fromUserId: number,
    toUserId: number,
    message?: string
  ): Promise<number> {
    // Проверяем, что пользователи существуют
    const fromUser = await this.getUserById(fromUserId)
    const toUser = await this.getUserById(toUserId)
    if (!fromUser || !toUser) {
      throw new Error("Пользователь не найден")
    }

    // Проверяем, нет ли уже запроса
    const existingRequest = Array.from(this.friendRequests.values()).find(
      (request) =>
        ((request.from_user_id === fromUserId &&
          request.to_user_id === toUserId) ||
          (request.from_user_id === toUserId &&
            request.to_user_id === fromUserId)) &&
        request.status === "pending"
    )

    if (existingRequest) {
      throw new Error("Запрос на дружбу уже существует")
    }

    // Проверяем, не являются ли уже друзьями
    const existingFriendship = Array.from(this.friendships.values()).find(
      (friendship) =>
        ((friendship.user_id === fromUserId &&
          friendship.friend_id === toUserId) ||
          (friendship.user_id === toUserId &&
            friendship.friend_id === fromUserId)) &&
        friendship.status === "accepted"
    )

    if (existingFriendship) {
      throw new Error("Пользователи уже являются друзьями")
    }

    const requestId = this.requestIdCounter++
    const request = {
      id: requestId,
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: "pending",
      message: message || null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    this.friendRequests.set(requestId.toString(), request)
    return requestId
  }

  async acceptFriendRequest(
    requestId: number,
    userId: number
  ): Promise<{ friendship: any; roomId?: number }> {
    const request = this.friendRequests.get(requestId.toString())

    if (!request) {
      throw new Error("Запрос на дружбу не найден")
    }

    if (request.to_user_id !== userId) {
      throw new Error("Нет прав на принятие этого запроса")
    }

    if (request.status !== "pending") {
      throw new Error("Запрос уже обработан")
    }

    // Обновляем статус запроса
    request.status = "accepted"
    request.updated_at = new Date()
    this.friendRequests.set(requestId.toString(), request)

    // Создаем приватную комнату для друзей
    const roomId = await this.createFriendRoom(
      request.from_user_id,
      request.to_user_id
    )

    // Создаем дружбу
    const friendshipId = this.friendshipIdCounter++
    const friendship = {
      id: friendshipId,
      user_id: request.from_user_id,
      friend_id: request.to_user_id,
      status: "accepted",
      room_id: roomId,
      created_at: new Date(),
      updated_at: new Date(),
    }

    this.friendships.set(friendshipId.toString(), friendship)

    // Также создаем обратную связь
    const friendshipId2 = this.friendshipIdCounter++
    const friendship2 = {
      id: friendshipId2,
      user_id: request.to_user_id,
      friend_id: request.from_user_id,
      status: "accepted",
      room_id: roomId,
      created_at: new Date(),
      updated_at: new Date(),
    }

    this.friendships.set(friendshipId2.toString(), friendship2)

    return { friendship: friendship, roomId: roomId }
  }

  async declineFriendRequest(
    requestId: number,
    userId: number
  ): Promise<boolean> {
    const request = this.friendRequests.get(requestId.toString())

    if (!request) {
      return false
    }

    if (request.to_user_id !== userId) {
      return false
    }

    if (request.status !== "pending") {
      return false
    }

    request.status = "declined"
    request.updated_at = new Date()
    this.friendRequests.set(requestId.toString(), request)

    return true
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    const friendships = Array.from(this.friendships.values()).filter(
      (friendship) =>
        ((friendship.user_id === userId && friendship.friend_id === friendId) ||
          (friendship.user_id === friendId &&
            friendship.friend_id === userId)) &&
        friendship.status === "accepted"
    )

    if (friendships.length === 0) {
      return false
    }

    // Удаляем все связанные дружбы
    for (const friendship of friendships) {
      this.friendships.delete(friendship.id.toString())
    }

    return true
  }

  async blockUser(userId: number, blockedUserId: number): Promise<boolean> {
    // Сначала удаляем дружбу, если есть
    await this.removeFriend(userId, blockedUserId)

    // Создаем блокировку
    const friendshipId = this.friendshipIdCounter++
    const friendship = {
      id: friendshipId,
      user_id: userId,
      friend_id: blockedUserId,
      status: "blocked",
      room_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    this.friendships.set(friendshipId.toString(), friendship)
    return true
  }

  async unblockUser(userId: number, unblockedUserId: number): Promise<boolean> {
    const friendship = Array.from(this.friendships.values()).find(
      (f) =>
        f.user_id === userId &&
        f.friend_id === unblockedUserId &&
        f.status === "blocked"
    )

    if (!friendship) {
      return false
    }

    this.friendships.delete(friendship.id.toString())
    return true
  }

  async getFriendshipStatus(
    userId: number,
    otherUserId: number
  ): Promise<string> {
    // Проверяем заблокирован ли пользователь
    const blocked = Array.from(this.friendships.values()).find(
      (f) =>
        f.user_id === userId &&
        f.friend_id === otherUserId &&
        f.status === "blocked"
    )
    if (blocked) return "blocked"

    // Проверяем являются ли друзьями
    const friendship = Array.from(this.friendships.values()).find(
      (f) =>
        ((f.user_id === userId && f.friend_id === otherUserId) ||
          (f.user_id === otherUserId && f.friend_id === userId)) &&
        f.status === "accepted"
    )
    if (friendship) return "friends"

    // Проверяем pending запросы
    const sentRequest = Array.from(this.friendRequests.values()).find(
      (r) =>
        r.from_user_id === userId &&
        r.to_user_id === otherUserId &&
        r.status === "pending"
    )
    if (sentRequest) return "pending_sent"

    const receivedRequest = Array.from(this.friendRequests.values()).find(
      (r) =>
        r.from_user_id === otherUserId &&
        r.to_user_id === userId &&
        r.status === "pending"
    )
    if (receivedRequest) return "pending_received"

    return "none"
  }

  async createFriendRoom(userId: number, friendId: number): Promise<number> {
    const user1 = await this.getUserById(userId)
    const user2 = await this.getUserById(friendId)

    if (!user1 || !user2) {
      throw new Error("Пользователь не найден")
    }

    // Создаем приватную комнату для двух друзей
    const roomName = `${user1.username} & ${user2.username}`
    const roomId = await this.createChatRoom(
      roomName,
      "Приватный чат между друзьями",
      "private",
      userId
    )

    // Добавляем обоих пользователей в комнату
    await this.addRoomParticipant(roomId, userId, "admin")
    await this.addRoomParticipant(roomId, friendId, "admin")

    return roomId
  }

  async searchUsers(query: string): Promise<MockUser[]> {
    const searchQuery = query.toLowerCase().trim()

    if (!searchQuery) {
      return []
    }

    // Ищем пользователей по username и email
    const matchingUsers: MockUser[] = []

    for (const user of this.users.values()) {
      const matchesUsername = user.username.toLowerCase().includes(searchQuery)
      const matchesEmail = user.email.toLowerCase().includes(searchQuery)

      if (matchesUsername || matchesEmail) {
        matchingUsers.push(user)
      }
    }

    // Сортируем результаты: точные совпадения username в начале
    matchingUsers.sort((a, b) => {
      const aExactUsername = a.username.toLowerCase() === searchQuery ? 0 : 1
      const bExactUsername = b.username.toLowerCase() === searchQuery ? 0 : 1

      if (aExactUsername !== bExactUsername) {
        return aExactUsername - bExactUsername
      }

      // Затем по алфавиту
      return a.username.localeCompare(b.username)
    })

    // Ограничиваем результат (максимум 50 пользователей)
    return matchingUsers.slice(0, 50)
  }
}
