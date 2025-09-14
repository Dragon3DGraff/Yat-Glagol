import { Sequelize, Op } from "sequelize"
import { ISequelizeDatabaseManager } from "./ISequelizeDatabaseManager"
import { Models, User, ChatRoom, Message, Friend } from "../models"
import CryptoJS from "crypto-js"
import bcrypt from "bcryptjs"

export class SequelizeDatabaseManager implements ISequelizeDatabaseManager {
  private sequelize: Sequelize
  private models: Models
  private encryptionKey: string

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || "default-secret-key"

    // Initialize Sequelize
    this.sequelize = new Sequelize({
      dialect: "mysql",
      host: process.env.DB_HOST || "localhost",
      username: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "yat_glagol_chat",
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      timezone: "+00:00",
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })

    // Initialize models
    this.models = new Models(this.sequelize)
  }

  async initialize(): Promise<void> {
    try {
      // Test connection
      await this.sequelize.authenticate()
      console.log("✅ Sequelize подключился к базе данных")

      // Sync models (create tables if they don't exist)
      await this.models.sync({ alter: true })
      console.log("✅ Модели Sequelize синхронизированы")
    } catch (error) {
      console.error("❌ Ошибка инициализации Sequelize:", error)
      throw error
    }
  }

  async close(): Promise<void> {
    await this.sequelize.close()
  }

  // Encryption helpers
  private encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.encryptionKey).toString()
  }

  private decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  // User methods
  async createUser(
    username: string,
    email: string,
    password: string
  ): Promise<{ id: number; username: string; email: string }> {
    try {
      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await this.models.User.create({
        username,
        email,
        password: hashedPassword,
        status: "offline",
      })

      return {
        id: user.id,
        username: user.username,
        email: user.email,
      }
    } catch (error: any) {
      if (error.name === "SequelizeUniqueConstraintError") {
        if (error.errors?.[0]?.path === "username") {
          throw new Error("Пользователь с таким именем уже существует")
        }
        if (error.errors?.[0]?.path === "email") {
          throw new Error("Пользователь с таким email уже существует")
        }
      }
      throw error
    }
  }

  async getUserByUsername(username: string): Promise<{
    id: number
    username: string
    email: string
    password: string
  } | null> {
    const user = await this.models.User.findOne({
      where: { username },
    })

    if (!user) return null

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password,
    }
  }

  async getUserById(id: number): Promise<{
    id: number
    username: string
    email: string
    avatar?: string
    status: "online" | "offline" | "away"
  } | null> {
    const user = await this.models.User.findByPk(id)

    if (!user) return null

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
    }
  }

  async updateUserStatus(
    userId: number,
    status: "online" | "offline" | "away"
  ): Promise<void> {
    await this.models.User.update({ status }, { where: { id: userId } })
  }

  // Chat room methods
  async createChatRoom(
    name: string,
    createdBy: number,
    isPrivate: boolean = false,
    description?: string
  ): Promise<{ id: number; name: string; isPrivate: boolean }> {
    const room = await this.models.ChatRoom.create({
      name,
      description,
      isPrivate,
      createdBy,
    })

    // Add creator as owner
    await this.models.RoomParticipant.create({
      userId: createdBy,
      chatRoomId: room.id,
      role: "owner",
    })

    return {
      id: room.id,
      name: room.name,
      isPrivate: room.isPrivate,
    }
  }

  async getChatRoomsByUserId(userId: number): Promise<
    Array<{
      id: number
      name: string
      isPrivate: boolean
      role: string
      lastActivity?: Date
    }>
  > {
    const participantRecords = await this.models.RoomParticipant.findAll({
      where: { userId },
      include: [
        {
          model: this.models.ChatRoom,
          as: "room",
          include: [
            {
              model: this.models.Message,
              as: "messages",
              limit: 1,
              order: [["createdAt", "DESC"]],
              required: false,
            },
          ],
        },
      ],
    })

    return participantRecords.map((record) => {
      const room = (record as any).room
      return {
        id: room.id,
        name: room.name,
        isPrivate: room.isPrivate,
        role: record.role,
        lastActivity: room.messages?.[0]?.createdAt,
      }
    })
  }

  async getChatRoomParticipants(roomId: number): Promise<
    Array<{
      id: number
      username: string
      role: string
      status: string
      avatar?: string
    }>
  > {
    const participants = await this.models.RoomParticipant.findAll({
      where: { chatRoomId: roomId },
      include: [
        {
          model: this.models.User,
          as: "user",
        },
      ],
    })

    return participants.map((participant) => {
      const user = (participant as any).user
      return {
        id: user.id,
        username: user.username,
        role: participant.role,
        status: user.status,
        avatar: user.avatar,
      }
    })
  }

  async addUserToRoom(
    userId: number,
    roomId: number,
    role: "admin" | "member" = "member"
  ): Promise<void> {
    await this.models.RoomParticipant.create({
      userId,
      chatRoomId: roomId,
      role,
    })
  }

  async removeUserFromRoom(userId: number, roomId: number): Promise<void> {
    await this.models.RoomParticipant.destroy({
      where: {
        userId,
        chatRoomId: roomId,
      },
    })
  }

  // Message methods
  async saveMessage(
    userId: number,
    roomId: number,
    content: string,
    type: "text" | "image" | "file" = "text",
    replyToId?: number
  ): Promise<{ id: number; content: string; type: string; createdAt: Date }> {
    const encryptedContent = this.encrypt(content)

    const message = await this.models.Message.create({
      userId,
      chatRoomId: roomId,
      content: encryptedContent,
      type,
      replyToId,
    })

    return {
      id: message.id,
      content: this.decrypt(message.content),
      type: message.type,
      createdAt: message.createdAt,
    }
  }

  async getChatRoomMessages(
    roomId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<
    Array<{
      id: number
      content: string
      type: "text" | "image" | "file"
      createdAt: Date
      author: { id: number; username: string; avatar?: string }
      replyTo?: { id: number; content: string; author: { username: string } }
    }>
  > {
    const offset = (page - 1) * limit

    const messages = await this.models.Message.findAll({
      where: { chatRoomId: roomId },
      include: [
        {
          model: this.models.User,
          as: "author",
          attributes: ["id", "username", "avatar"],
        },
        {
          model: this.models.Message,
          as: "replyTo",
          required: false,
          attributes: ["id", "content"],
          include: [
            {
              model: this.models.User,
              as: "author",
              attributes: ["username"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    })

    return messages.reverse().map((message) => {
      const author = (message as any).author
      const replyTo = (message as any).replyTo

      return {
        id: message.id,
        content: this.decrypt(message.content),
        type: message.type,
        createdAt: message.createdAt,
        author: {
          id: author.id,
          username: author.username,
          avatar: author.avatar,
        },
        replyTo: replyTo
          ? {
              id: replyTo.id,
              content: this.decrypt(replyTo.content),
              author: {
                username: (replyTo as any).author.username,
              },
            }
          : undefined,
      }
    })
  }

  // Friend methods
  async sendFriendRequest(
    userId: number,
    friendUsername: string
  ): Promise<void> {
    const friend = await this.models.User.findOne({
      where: { username: friendUsername },
    })

    if (!friend) {
      throw new Error("Пользователь не найден")
    }

    if (friend.id === userId) {
      throw new Error("Нельзя добавить себя в друзья")
    }

    // Check if request already exists
    const existingRequest = await this.models.Friend.findOne({
      where: {
        [Op.or]: [
          { userId, friendId: friend.id },
          { userId: friend.id, friendId: userId },
        ],
      },
    })

    if (existingRequest) {
      throw new Error("Запрос дружбы уже существует")
    }

    await this.models.Friend.create({
      userId,
      friendId: friend.id,
      status: "pending",
    })
  }

  async acceptFriendRequest(userId: number, requestId: number): Promise<void> {
    const friendRequest = await this.models.Friend.findOne({
      where: {
        id: requestId,
        friendId: userId,
        status: "pending",
      },
    })

    if (!friendRequest) {
      throw new Error("Запрос дружбы не найден")
    }

    await friendRequest.update({ status: "accepted" })
  }

  async getFriends(
    userId: number
  ): Promise<
    Array<{ id: number; username: string; status: string; avatar?: string }>
  > {
    const friendships = await this.models.Friend.findAll({
      where: {
        [Op.or]: [
          { userId, status: "accepted" },
          { friendId: userId, status: "accepted" },
        ],
      },
      include: [
        {
          model: this.models.User,
          as: "user",
        },
        {
          model: this.models.User,
          as: "friend",
        },
      ],
    })

    return friendships.map((friendship) => {
      const friendUser =
        friendship.userId === userId
          ? (friendship as any).friend
          : (friendship as any).user
      return {
        id: friendUser.id,
        username: friendUser.username,
        status: friendUser.status,
        avatar: friendUser.avatar,
      }
    })
  }

  async getFriendRequests(userId: number): Promise<
    Array<{
      id: number
      fromUser: { id: number; username: string; avatar?: string }
      createdAt: Date
    }>
  > {
    const requests = await this.models.Friend.findAll({
      where: {
        friendId: userId,
        status: "pending",
      },
      include: [
        {
          model: this.models.User,
          as: "user",
          attributes: ["id", "username", "avatar"],
        },
      ],
    })

    return requests.map((request) => {
      const user = (request as any).user
      return {
        id: request.id,
        fromUser: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
        createdAt: request.createdAt,
      }
    })
  }
}
