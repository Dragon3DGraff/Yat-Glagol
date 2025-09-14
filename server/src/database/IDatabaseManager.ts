export interface IUser {
  id: string
  email: string
  password_hash: string
  username: string
  avatar_url?: string
  status: string
  created_at: Date
  last_active: Date
  last_seen?: Date
}

export interface IChat {
  id: string
  name: string
  description?: string
  is_private: boolean
  created_by: string
  created_at: Date
  updated_at: Date
}

export interface IMessage {
  id: string
  chat_id: string
  user_id: string
  encrypted_content: string
  message_type: "text" | "file" | "image" | "video"
  created_at: Date
}

export interface IFriendship {
  id: number
  user_id: number
  friend_id: number
  status: "pending" | "accepted" | "blocked"
  room_id?: number
  created_at: Date
  updated_at: Date
}

export interface IFriendRequest {
  id: number
  from_user_id: number
  to_user_id: number
  status: "pending" | "accepted" | "declined" | "cancelled"
  message?: string
  created_at: Date
  updated_at: Date
}

export interface IDatabaseManager {
  // Методы пользователей
  getUserByEmail(email: string): Promise<IUser | null>
  getUserById(id: string): Promise<IUser | null>
  createUser(
    username: string,
    email: string,
    password_hash: string
  ): Promise<string>
  updateUserStatus(userId: string, status: string): Promise<void>

  // Методы чатов
  getUserChats(userId: string): Promise<any[]>
  createChat(
    name: string,
    description: string,
    isPrivate: boolean,
    createdBy: string
  ): Promise<IChat>
  addUserToChat(chatId: string, userId: string): Promise<boolean>
  isUserInChat(chatId: string, userId: string): Promise<boolean>

  // Методы сообщений
  getChatMessages(
    chatId: string,
    limit?: number,
    offset?: number
  ): Promise<any[]>
  createMessage(
    chatId: string,
    userId: string,
    content: string,
    messageType?: string
  ): Promise<IMessage>

  // Поиск
  searchUsers(query: string): Promise<any[]>

  // Методы друзей
  getFriends(userId: number): Promise<any[]>
  getFriendRequests(userId: number): Promise<any[]>
  getSentFriendRequests(userId: number): Promise<any[]>
  sendFriendRequest(
    fromUserId: number,
    toUserId: number,
    message?: string
  ): Promise<number>
  acceptFriendRequest(
    requestId: number,
    userId: number
  ): Promise<{ friendship: any; roomId?: number }>
  declineFriendRequest(requestId: number, userId: number): Promise<boolean>
  removeFriend(userId: number, friendId: number): Promise<boolean>
  blockUser(userId: number, blockedUserId: number): Promise<boolean>
  unblockUser(userId: number, unblockedUserId: number): Promise<boolean>
  getFriendshipStatus(userId: number, otherUserId: number): Promise<string>
  createFriendRoom(userId: number, friendId: number): Promise<number>
}
