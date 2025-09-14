export interface ISequelizeUser {
  id: number
  username: string
  email: string
  avatar?: string
  status: "online" | "offline" | "away"
}

export interface ISequelizeChatRoom {
  id: number
  name: string
  description?: string
  isPrivate: boolean
  role: string
  lastActivity?: Date
}

export interface ISequelizeMessage {
  id: number
  content: string
  type: "text" | "image" | "file"
  createdAt: Date
  author: {
    id: number
    username: string
    avatar?: string
  }
  replyTo?: {
    id: number
    content: string
    author: {
      username: string
    }
  }
}

export interface ISequelizeFriend {
  id: number
  username: string
  status: string
  avatar?: string
}

export interface ISequelizeFriendRequest {
  id: number
  fromUser: {
    id: number
    username: string
    avatar?: string
  }
  createdAt: Date
}

export interface ISequelizeDatabaseManager {
  // База данных
  initialize(): Promise<void>
  close(): Promise<void>

  // Пользователи
  createUser(
    username: string,
    email: string,
    password: string
  ): Promise<{ id: number; username: string; email: string }>
  getUserByUsername(username: string): Promise<{
    id: number
    username: string
    email: string
    password: string
  } | null>
  getUserById(id: number): Promise<ISequelizeUser | null>
  updateUserStatus(
    userId: number,
    status: "online" | "offline" | "away"
  ): Promise<void>

  // Чат комнаты
  createChatRoom(
    name: string,
    createdBy: number,
    isPrivate?: boolean,
    description?: string
  ): Promise<{ id: number; name: string; isPrivate: boolean }>
  getChatRoomsByUserId(userId: number): Promise<Array<ISequelizeChatRoom>>
  getChatRoomParticipants(roomId: number): Promise<
    Array<{
      id: number
      username: string
      role: string
      status: string
      avatar?: string
    }>
  >
  addUserToRoom(
    userId: number,
    roomId: number,
    role?: "admin" | "member"
  ): Promise<void>
  removeUserFromRoom(userId: number, roomId: number): Promise<void>

  // Сообщения
  saveMessage(
    userId: number,
    roomId: number,
    content: string,
    type?: "text" | "image" | "file",
    replyToId?: number
  ): Promise<{ id: number; content: string; type: string; createdAt: Date }>
  getChatRoomMessages(
    roomId: number,
    page?: number,
    limit?: number
  ): Promise<Array<ISequelizeMessage>>

  // Друзья
  sendFriendRequest(
    userId: number,
    friendId: number,
    message?: string
  ): Promise<number>
  acceptFriendRequest(
    requestId: number,
    userId: number
  ): Promise<{ friendship: any; roomId: number }>
  getFriends(userId: number): Promise<Array<ISequelizeFriend>>
  getFriendRequests(userId: number): Promise<Array<ISequelizeFriendRequest>>
  getSentFriendRequests(userId: number): Promise<
    Array<{
      id: number
      toUser: { id: number; username: string; avatar?: string }
      createdAt: Date
    }>
  >
  declineFriendRequest(requestId: number, userId: number): Promise<boolean>
  removeFriend(userId: number, friendId: number): Promise<boolean>
  blockUser(userId: number, blockedUserId: number): Promise<boolean>
  unblockUser(userId: number, unblockedUserId: number): Promise<boolean>
  getFriendshipStatus(userId: number, otherUserId: number): Promise<string>
  createFriendRoom(userId: number, friendId: number): Promise<number>

  // Поиск
  searchUsers(query: string): Promise<
    Array<{
      id: number
      username: string
      email: string
      avatar_url?: string
      status: string
      created_at: Date
    }>
  >

  // Дополнительные методы для сообщений
  updateMessage(
    messageId: number,
    userId: number,
    newContent: string
  ): Promise<boolean>
  deleteMessage(messageId: number, userId: number): Promise<boolean>
  getMessageById(messageId: number): Promise<any | null>
}
