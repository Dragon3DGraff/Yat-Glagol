import {
  IDatabaseManager,
  IUser,
  IChat,
  IMessage,
  IFriendship,
} from "../database/IDatabaseManager"
import { MockDatabaseManager } from "./MockDatabaseManager"

/**
 * Адаптер для MockDatabaseManager, реализующий интерфейс IDatabaseManager
 * для совместимости с существующим кодом
 */
export class MockAdapter implements IDatabaseManager {
  private mockManager: MockDatabaseManager

  constructor() {
    this.mockManager = new MockDatabaseManager()
  }

  async initialize(): Promise<void> {
    await this.mockManager.initialize()
  }

  async close(): Promise<void> {
    // Mock не требует закрытия соединения
    console.log("Mock Database закрыт")
  }

  // Пользователи
  async getUserByEmail(email: string): Promise<IUser | null> {
    const user = await this.mockManager.getUserByEmail(email)
    if (!user) return null

    return {
      id: user.id.toString(),
      email: user.email,
      password_hash: user.password_hash,
      username: user.username,
      status: user.status,
      created_at: user.created_at,
      last_active: user.last_active,
    }
  }

  async getUserById(id: string): Promise<IUser | null> {
    const user = await this.mockManager.getUserById(parseInt(id))
    if (!user) return null

    return {
      id: user.id.toString(),
      email: user.email || "",
      password_hash: "",
      username: user.username,
      avatar_url: user.avatar_url,
      status: user.status,
      created_at: user.created_at,
      last_active: user.last_active,
    }
  }

  async createUser(
    username: string,
    email: string,
    password_hash: string
  ): Promise<string> {
    const userId = await this.mockManager.createUser(
      username,
      email,
      password_hash
    )
    return userId.toString()
  }

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await this.mockManager.updateUserStatus(
      parseInt(userId),
      status as "online" | "offline" | "away"
    )
  }

  // Чаты
  async getUserChats(userId: string): Promise<any[]> {
    const rooms = await this.mockManager.getUserChatRooms(parseInt(userId))
    return rooms.map((room) => ({
      id: room.id.toString(),
      name: room.name,
      is_private: room.type === "private",
      role: "member",
      last_activity: room.created_at,
    }))
  }

  async createChat(
    name: string,
    description: string,
    isPrivate: boolean,
    createdBy: string
  ): Promise<IChat> {
    const roomId = await this.mockManager.createChatRoom(
      name,
      description,
      isPrivate ? "private" : "public",
      parseInt(createdBy)
    )

    return {
      id: roomId.toString(),
      name: name,
      description,
      is_private: isPrivate,
      created_by: createdBy,
      created_at: new Date(),
      updated_at: new Date(),
    }
  }

  async addUserToChat(chatId: string, userId: string): Promise<boolean> {
    try {
      await this.mockManager.addRoomParticipant(
        parseInt(chatId),
        parseInt(userId)
      )
      return true
    } catch {
      return false
    }
  }

  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    try {
      const participants = await this.mockManager.getRoomParticipants(
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
    const messages = await this.mockManager.getRoomMessages(
      parseInt(chatId),
      limit
    )

    return messages.map((msg) => ({
      id: msg.id.toString(),
      chat_id: chatId,
      user_id: msg.user_id.toString(),
      content: msg.content,
      message_type: msg.message_type,
      created_at: msg.created_at,
      username: msg.user?.username,
      avatar: msg.user?.avatar_url,
    }))
  }

  async createMessage(
    chatId: string,
    userId: string,
    content: string,
    messageType: string = "text"
  ): Promise<IMessage> {
    const messageId = await this.mockManager.createMessage(
      parseInt(chatId),
      parseInt(userId),
      content,
      messageType as "text" | "image" | "file"
    )

    return {
      id: messageId.toString(),
      chat_id: chatId,
      user_id: userId,
      encrypted_content: content,
      message_type: messageType as any,
      created_at: new Date(),
    }
  }

  async updateMessage(
    messageId: number,
    userId: number,
    newContent: string
  ): Promise<boolean> {
    return await this.mockManager.updateMessage(messageId, userId, newContent)
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    return await this.mockManager.deleteMessage(messageId, userId)
  }

  async getMessageById(messageId: number): Promise<any | null> {
    return await this.mockManager.getMessageById(messageId)
  }

  // Поиск пользователей
  async searchUsers(query: string): Promise<any[]> {
    return await this.mockManager.searchUsers(query)
  }

  // Друзья
  async getFriends(userId: number): Promise<any[]> {
    return await this.mockManager.getFriends(userId)
  }

  async getFriendRequests(userId: number): Promise<any[]> {
    return await this.mockManager.getFriendRequests(userId)
  }

  async getSentFriendRequests(userId: number): Promise<any[]> {
    return await this.mockManager.getSentFriendRequests(userId)
  }

  async sendFriendRequest(
    fromUserId: number,
    toUserId: number,
    message?: string
  ): Promise<number> {
    return await this.mockManager.sendFriendRequest(
      fromUserId,
      toUserId,
      message
    )
  }

  async acceptFriendRequest(
    requestId: number,
    userId: number
  ): Promise<{ friendship: any; roomId?: number }> {
    const result = await this.mockManager.acceptFriendRequest(requestId, userId)
    return {
      friendship: result.friendship,
      roomId: result.roomId,
    }
  }

  async declineFriendRequest(
    requestId: number,
    userId: number
  ): Promise<boolean> {
    return await this.mockManager.declineFriendRequest(requestId, userId)
  }

  async removeFriend(userId: number, friendId: number): Promise<boolean> {
    return await this.mockManager.removeFriend(userId, friendId)
  }

  async blockUser(userId: number, blockedUserId: number): Promise<boolean> {
    return await this.mockManager.blockUser(userId, blockedUserId)
  }

  async unblockUser(userId: number, unblockedUserId: number): Promise<boolean> {
    return await this.mockManager.unblockUser(userId, unblockedUserId)
  }

  async getFriendshipStatus(
    userId: number,
    otherUserId: number
  ): Promise<string> {
    return await this.mockManager.getFriendshipStatus(userId, otherUserId)
  }

  async createFriendRoom(userId: number, friendId: number): Promise<number> {
    return await this.mockManager.createFriendRoom(userId, friendId)
  }

  // Дополнительные методы для совместимости с routes
  async getUserChatRooms(userId: number): Promise<any[]> {
    return await this.mockManager.getUserChatRooms(userId)
  }

  async getRoomParticipants(roomId: number): Promise<any[]> {
    return await this.mockManager.getRoomParticipants(roomId)
  }

  async getRoomMessages(roomId: number, limit?: number): Promise<any[]> {
    return await this.mockManager.getRoomMessages(roomId, limit)
  }

  async createChatRoom(
    name: string,
    type: string,
    createdBy: number
  ): Promise<any> {
    const roomId = await this.mockManager.createChatRoom(
      name,
      "",
      type as "private" | "group" | "public",
      createdBy
    )
    return {
      id: roomId,
      name: name,
      type: type,
      created_at: new Date(),
    }
  }

  async getChatRoom(roomId: number): Promise<any | null> {
    return await this.mockManager.getChatRoom(roomId)
  }

  async addRoomParticipant(roomId: number, userId: number): Promise<void> {
    await this.mockManager.addRoomParticipant(roomId, userId, "member")
  }

  async searchMessages(query: string, roomId?: number): Promise<any[]> {
    return await this.mockManager.searchMessages(query, roomId)
  }
}
