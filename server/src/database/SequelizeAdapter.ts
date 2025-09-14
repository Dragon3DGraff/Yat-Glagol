import {
  IDatabaseManager,
  IUser,
  IChat,
  IMessage,
  IFriendship,
} from "./IDatabaseManager"
import { SequelizeDatabaseManager } from "./SequelizeDatabaseManager"

/**
 * Адаптер для SequelizeDatabaseManager, реализующий интерфейс IDatabaseManager
 * для совместимости с существующим кодом
 */
export class SequelizeAdapter implements IDatabaseManager {
  private sequelizeManager: SequelizeDatabaseManager

  constructor() {
    this.sequelizeManager = new SequelizeDatabaseManager()
  }

  async initialize(): Promise<void> {
    await this.sequelizeManager.initialize()
    console.log("✅ Sequelize успешно инициализирован")
  }

  async close(): Promise<void> {
    return this.sequelizeManager.close()
  }

  // Пользователи
  async getUserByEmail(email: string): Promise<IUser | null> {
    // Для совместимости - ищем по email через username (в нашем случае)
    const user = await this.sequelizeManager.getUserByUsername(email)
    if (!user) return null

    return {
      id: user.id.toString(),
      email: user.email,
      password_hash: user.password,
      username: user.username,
      status: "offline",
      created_at: new Date(),
      last_active: new Date(),
    }
  }

  async getUserById(id: string): Promise<IUser | null> {
    const user = await this.sequelizeManager.getUserById(parseInt(id))
    if (!user) return null

    return {
      id: user.id.toString(),
      email: user.email || "",
      password_hash: "",
      username: user.username,
      avatar_url: user.avatar,
      status: user.status,
      created_at: new Date(),
      last_active: new Date(),
    }
  }

  async createUser(
    username: string,
    email: string,
    password_hash: string
  ): Promise<string> {
    const user = await this.sequelizeManager.createUser(
      username,
      email,
      password_hash
    )
    return user.id.toString()
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await this.sequelizeManager.updateUserStatus(
      parseInt(userId),
      status as "online" | "offline" | "away"
    )
  }

  // Чаты
  async getUserChats(userId: string): Promise<any[]> {
    const rooms = await this.sequelizeManager.getChatRoomsByUserId(
      parseInt(userId)
    )
    return rooms.map((room) => ({
      id: room.id.toString(),
      name: room.name,
      is_private: room.isPrivate,
      role: room.role,
      last_activity: room.lastActivity,
    }))
  }

  async createChat(
    name: string,
    description: string,
    isPrivate: boolean,
    createdBy: string
  ): Promise<IChat> {
    const room = await this.sequelizeManager.createChatRoom(
      name,
      parseInt(createdBy),
      isPrivate,
      description
    )

    return {
      id: room.id.toString(),
      name: room.name,
      description,
      is_private: room.isPrivate,
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    }
  }

  async addUserToChat(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.sequelizeManager.addUserToRoom(
        parseInt(userId),
        parseInt(chatId)
      )
      return true
    } catch {
      return false
    }
  }

  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const participants = await this.sequelizeManager.getChatRoomParticipants(
        parseInt(chatId)
      )
      return participants.some((p) => p.id === parseInt(userId))
    } catch {
      return false
    }
  }

  // Сообщения
  async getChatMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const page = Math.floor(offset / limit) + 1
    const messages = await this.sequelizeManager.getChatRoomMessages(
      parseInt(chatId),
      page,
      limit
    )

    return messages.map((msg) => ({
      id: msg.id.toString(),
      chat_id: chatId,
      user_id: msg.author.id.toString(),
      content: msg.content,
      message_type: msg.type,
      created_at: msg.createdAt,
      username: msg.author.username,
      avatar: msg.author.avatar,
    }))
  }

  async createMessage(
    chatId: string,
    userId: string,
    content: string,
    messageType: string = "text"
  ): Promise<IMessage> {
    const message = await this.sequelizeManager.saveMessage(
      parseInt(userId),
      parseInt(chatId),
      content,
      messageType as "text" | "image" | "file"
    )

    return {
      id: message.id.toString(),
      chat_id: chatId,
      user_id: userId,
      encrypted_content: content,
      message_type: message.type as any,
      created_at: message.createdAt,
    }
  }

  // Поиск пользователей (простая заглушка)
  async searchUsers(query: string): Promise<any[]> {
    // TODO: Реализовать поиск в Sequelize
    return []
  }

  // Друзья
  async getFriends(userId: number): Promise<any[]> {
    const friends = await this.sequelizeManager.getFriends(userId)
    return friends.map((friend) => ({
      id: friend.id,
      username: friend.username,
      status: friend.status,
      avatar: friend.avatar,
    }))
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    const requests = await this.sequelizeManager.getFriendRequests(userId)
    return requests.map((req) => ({
      id: req.id,
      from_user_id: req.fromUser.id,
      from_username: req.fromUser.username,
      from_avatar: req.fromUser.avatar,
      created_at: req.createdAt,
    }))
  }

  async getSentFriendRequests(userId: number): Promise<any[]> {
    // TODO: Реализовать в SequelizeDatabaseManager
    return []
  }

  async sendFriendRequest(
    fromUserId: number,
    toUserId: number,
    message?: string
  ): Promise<number> {
    // В SequelizeDatabaseManager используется username, здесь нужна адаптация
    // TODO: Найти username по ID и отправить запрос
    throw new Error("Not implemented: use sendFriendRequest with username")
  }

  async acceptFriendRequest(
    requestId: number,
    userId: number
  ): Promise<{ friendship: any; roomId?: number }> {
    await this.sequelizeManager.acceptFriendRequest(userId, requestId)
    return { friendship: {}, roomId: undefined }
  }

  // Остальные методы - заглушки для совместимости
  async declineFriendRequest(
    requestId: number,
    userId: number
  ): Promise<boolean> {
    // TODO: Реализовать
    return false
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    // TODO: Реализовать
    return false
  }

  async blockUser(userId: number, blockedUserId: number): Promise<boolean> {
    // TODO: Реализовать
    return false
  }

  async unblockUser(userId: number, unblockedUserId: number): Promise<boolean> {
    // TODO: Реализовать
    return false
  }

  async getFriendshipStatus(
    userId: number,
    otherUserId: number
  ): Promise<string> {
    // TODO: Реализовать
    return "none"
  }

  async createFriendRoom(userId: number, friendId: number): Promise<number> {
    // TODO: Реализовать
    return 0
  }

  // Дополнительные методы для совместимости с routes
  async getUserChatRooms(userId: number): Promise<any[]> {
    const rooms = await this.sequelizeManager.getChatRoomsByUserId(userId)
    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.isPrivate ? "private" : "public",
      created_at: room.lastActivity || new Date(),
    }))
  }

  async getRoomParticipants(roomId: number): Promise<any[]> {
    const participants = await this.sequelizeManager.getChatRoomParticipants(
      roomId
    )
    return participants.map((p) => ({
      id: (p as any).user.id,
      username: (p as any).user.username,
      avatar: (p as any).user.avatar,
    }))
  }

  async getRoomMessages(roomId: number, limit?: number): Promise<any[]> {
    const messages = await this.sequelizeManager.getChatRoomMessages(
      roomId,
      limit
    )
    return messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      message_type: msg.type,
      created_at: msg.createdAt,
      author: {
        id: (msg as any).author.id,
        username: (msg as any).author.username,
        avatar: (msg as any).author.avatar,
      },
    }))
  }

  async createChatRoom(
    name: string,
    type: string,
    createdBy: number
  ): Promise<any> {
    const isPrivate = type === "private"
    const room = await this.sequelizeManager.createChatRoom(
      name,
      createdBy,
      isPrivate
    )
    return {
      id: room.id,
      name: room.name,
      type: room.isPrivate ? "private" : "public",
      created_at: new Date(),
    }
  }

  async getChatRoom(roomId: number): Promise<any | null> {
    // Простая реализация - можно расширить позже
    try {
      const participants = await this.sequelizeManager.getChatRoomParticipants(
        roomId
      )
      if (participants.length === 0) return null

      return {
        id: roomId,
        name: `Room ${roomId}`,
        type: "public",
        created_at: new Date(),
      }
    } catch {
      return null
    }
  }

  async addRoomParticipant(roomId: number, userId: number): Promise<void> {
    await this.sequelizeManager.addUserToRoom(userId, roomId)
  }

  async searchMessages(query: string, roomId?: number): Promise<any[]> {
    // Простая реализация - получаем все сообщения комнаты и фильтруем
    if (!roomId) return []
    const messages = await this.sequelizeManager.getChatRoomMessages(roomId)
    return messages
      .filter((msg) => msg.content.toLowerCase().includes(query.toLowerCase()))
      .map((msg) => ({
        id: msg.id,
        content: msg.content,
        message_type: msg.type,
        created_at: msg.createdAt,
        author: {
          id: (msg as any).author.id,
          username: (msg as any).author.username,
          avatar: (msg as any).author.avatar,
        },
      }))
  }

  async updateMessage(messageId: number, newContent: string): Promise<void> {
    // Пока что заглушка - можно реализовать позже через Sequelize
    console.log(`Updating message ${messageId} with content: ${newContent}`)
  }

  async deleteMessage(messageId: number): Promise<void> {
    // Пока что заглушка - можно реализовать позже через Sequelize
    console.log(`Deleting message ${messageId}`)
  }
}
