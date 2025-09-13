import { Server, Socket } from "socket.io"
// import { IDatabaseManager } from "../database/IDatabaseManager"

interface AuthenticatedSocket extends Socket {
  userId: number
  user?: any
}

export class SocketHandler {
  private io: Server
  private db: any
  private userSockets: Map<number, string[]> = new Map() // userId -> socketIds
  private socketUsers: Map<string, number> = new Map() // socketId -> userId

  constructor(io: Server, db: any) {
    this.io = io
    this.db = db
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket) => {
      const authSocket = socket as AuthenticatedSocket
      this.handleUserConnection(authSocket)
      this.setupMessageHandlers(authSocket)
      this.setupRoomHandlers(authSocket)
      this.setupTypingHandlers(authSocket)
      this.setupFriendsHandlers(authSocket)
      this.setupDisconnectionHandler(authSocket)
    })
  }

  handleUserConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId

    // Добавляем сокет в маппинг
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, [])
    }
    this.userSockets.get(userId)!.push(socket.id)
    this.socketUsers.set(socket.id, userId)

    // Присоединяем пользователя к его персональной комнате для уведомлений
    socket.join(`user:${userId}`)
    console.log(
      `👤 Пользователь ${userId} присоединен к комнате user:${userId}`
    )

    // Присоединяем пользователя к его комнатам
    this.joinUserRooms(socket)

    // Уведомляем о подключении пользователя
    this.broadcastUserStatus(userId, "online")

    console.log(`✅ Пользователь ${userId} подключился (socket: ${socket.id})`)
  }

  private async joinUserRooms(socket: AuthenticatedSocket): Promise<void> {
    try {
      const userRooms = await this.db.getUserChatRooms(socket.userId)

      for (const room of userRooms) {
        socket.join(`room_${room.id}`)

        // Уведомляем участников комнаты о подключении
        socket.to(`room_${room.id}`).emit("user_joined_room", {
          userId: socket.userId,
          roomId: room.id,
          timestamp: new Date(),
        })
      }
    } catch (error) {
      console.error("Ошибка присоединения к комнатам:", error)
    }
  }

  private setupMessageHandlers(socket: AuthenticatedSocket): void {
    // Отправка сообщения
    socket.on(
      "send_message",
      async (data: {
        roomId: number
        content: string
        messageType?: "text" | "image" | "file"
        replyTo?: number
      }) => {
        try {
          const { roomId, content, messageType = "text", replyTo } = data

          // Проверяем, является ли пользователь участником комнаты
          const roomParticipants = await this.db.getRoomParticipants(roomId)
          const isParticipant = roomParticipants.some(
            (p: any) => p.id === socket.userId
          )

          if (!isParticipant) {
            socket.emit("error", {
              message: "Вы не являетесь участником этой комнаты",
            })
            return
          }

          console.log(
            `📝 Создаем сообщение в комнате ${roomId} от пользователя ${socket.userId}:`,
            { content, messageType, replyTo }
          )

          // Создаем сообщение
          const messageId = await this.db.createMessage(
            roomId,
            socket.userId,
            content,
            messageType,
            replyTo
          )

          console.log(`✅ Сообщение создано с ID: ${messageId}`)

          // Получаем созданное сообщение по ID
          let newMessage
          if (typeof (this.db as any).getMessageById === "function") {
            // Используем новый метод если он есть (MockDatabaseManager)
            newMessage = await (this.db as any).getMessageById(messageId)
          } else {
            // Fallback для старой логики
            const messages = await this.db.getRoomMessages(roomId, 50, 0)
            newMessage = messages.find((m: any) => m.id === messageId)
          }

          console.log(
            `🔍 Найдено сообщение:`,
            newMessage
              ? { id: newMessage.id, content: newMessage.content }
              : "НЕ НАЙДЕНО"
          )

          if (newMessage) {
            console.log(
              `📤 Отправляем сообщение всем участникам комнаты ${roomId}`
            )

            // Отправляем сообщение всем участникам комнаты
            this.io.to(`room_${roomId}`).emit("new_message", newMessage)

            // Обновляем последнее сообщение в комнате
            this.io.to(`room_${roomId}`).emit("room_updated", {
              roomId,
              lastMessage: newMessage,
              timestamp: new Date(),
            })
          } else {
            console.error(
              `❌ Не удалось найти созданное сообщение с ID ${messageId}`
            )
          }
        } catch (error) {
          console.error("Ошибка отправки сообщения:", error)
          socket.emit("error", { message: "Ошибка отправки сообщения" })
        }
      }
    )

    // Редактирование сообщения
    socket.on(
      "edit_message",
      async (data: { messageId: number; newContent: string }) => {
        try {
          const { messageId, newContent } = data

          const success = await this.db.updateMessage(
            messageId,
            socket.userId,
            newContent
          )

          if (success) {
            // Находим комнату сообщения и уведомляем участников
            // TODO: добавить получение roomId по messageId
            socket.emit("message_edited", {
              messageId,
              newContent,
              editedAt: new Date(),
            })
          } else {
            socket.emit("error", {
              message: "Не удалось отредактировать сообщение",
            })
          }
        } catch (error) {
          console.error("Ошибка редактирования сообщения:", error)
          socket.emit("error", { message: "Ошибка редактирования сообщения" })
        }
      }
    )

    // Удаление сообщения
    socket.on("delete_message", async (data: { messageId: number }) => {
      try {
        const { messageId } = data

        const success = await this.db.deleteMessage(messageId, socket.userId)

        if (success) {
          socket.emit("message_deleted", {
            messageId,
            deletedAt: new Date(),
          })
        } else {
          socket.emit("error", { message: "Не удалось удалить сообщение" })
        }
      } catch (error) {
        console.error("Ошибка удаления сообщения:", error)
        socket.emit("error", { message: "Ошибка удаления сообщения" })
      }
    })

    // Поиск сообщений
    socket.on(
      "search_messages",
      async (data: { roomId: number; query: string; limit?: number }) => {
        try {
          const { roomId, query, limit = 20 } = data

          // Проверяем доступ к комнате
          const roomParticipants = await this.db.getRoomParticipants(roomId)
          const isParticipant = roomParticipants.some(
            (p: any) => p.id === socket.userId
          )

          if (!isParticipant) {
            socket.emit("error", { message: "Нет доступа к этой комнате" })
            return
          }

          const messages = await this.db.searchMessages(roomId, query, limit)

          socket.emit("search_results", {
            query,
            messages,
            roomId,
          })
        } catch (error) {
          console.error("Ошибка поиска сообщений:", error)
          socket.emit("error", { message: "Ошибка поиска сообщений" })
        }
      }
    )
  }

  private setupRoomHandlers(socket: AuthenticatedSocket): void {
    // Присоединение к комнате
    socket.on("join_room", async (data: { roomId: number }) => {
      try {
        const { roomId } = data

        // Проверяем доступ к комнате
        const roomParticipants = await this.db.getRoomParticipants(roomId)
        const isParticipant = roomParticipants.some(
          (p: any) => p.id === socket.userId
        )

        if (isParticipant) {
          socket.join(`room_${roomId}`)

          // Получаем последние сообщения
          const messages = await this.db.getRoomMessages(roomId, 50)

          socket.emit("joined_room", {
            roomId,
            messages,
            participants: roomParticipants,
          })

          // Уведомляем других участников
          socket.to(`room_${roomId}`).emit("user_joined_room", {
            userId: socket.userId,
            roomId,
            timestamp: new Date(),
          })
        } else {
          socket.emit("error", { message: "Нет доступа к этой комнате" })
        }
      } catch (error) {
        console.error("Ошибка присоединения к комнате:", error)
        socket.emit("error", { message: "Ошибка присоединения к комнате" })
      }
    })

    // Покидание комнаты
    socket.on("leave_room", (data: { roomId: number }) => {
      const { roomId } = data
      socket.leave(`room_${roomId}`)

      // Уведомляем других участников
      socket.to(`room_${roomId}`).emit("user_left_room", {
        userId: socket.userId,
        roomId,
        timestamp: new Date(),
      })

      socket.emit("left_room", { roomId })
    })

    // Загрузка истории сообщений
    socket.on(
      "load_messages",
      async (data: { roomId: number; offset?: number; limit?: number }) => {
        try {
          const { roomId, offset = 0, limit = 50 } = data

          // Проверяем доступ к комнате
          const roomParticipants = await this.db.getRoomParticipants(roomId)
          const isParticipant = roomParticipants.some(
            (p: any) => p.id === socket.userId
          )

          if (!isParticipant) {
            socket.emit("error", { message: "Нет доступа к этой комнате" })
            return
          }

          const messages = await this.db.getRoomMessages(roomId, limit, offset)

          socket.emit("messages_loaded", {
            roomId,
            messages,
            offset,
            hasMore: messages.length === limit,
          })
        } catch (error) {
          console.error("Ошибка загрузки сообщений:", error)
          socket.emit("error", { message: "Ошибка загрузки сообщений" })
        }
      }
    )
  }

  private setupTypingHandlers(socket: AuthenticatedSocket): void {
    // Пользователь печатает
    socket.on("typing_start", (data: { roomId: number }) => {
      const { roomId } = data
      socket.to(`room_${roomId}`).emit("user_typing", {
        userId: socket.userId,
        roomId,
        isTyping: true,
      })
    })

    // Пользователь прекратил печатать
    socket.on("typing_stop", (data: { roomId: number }) => {
      const { roomId } = data
      socket.to(`room_${roomId}`).emit("user_typing", {
        userId: socket.userId,
        roomId,
        isTyping: false,
      })
    })
  }

  private setupFriendsHandlers(socket: AuthenticatedSocket): void {
    // Отправка запроса на дружбу
    socket.on(
      "send_friend_request",
      async (data: { toUserId: number; message?: string }) => {
        try {
          const fromUserId = socket.userId

          if (fromUserId === data.toUserId) {
            socket.emit("friend_error", {
              message: "Нельзя отправить запрос на дружбу самому себе",
            })
            return
          }

          const requestId = await this.db.sendFriendRequest(
            fromUserId,
            data.toUserId,
            data.message
          )

          // Уведомляем отправителя
          socket.emit("friend_request_sent", {
            id: requestId,
            fromUserId,
            toUserId: data.toUserId,
            status: "pending",
            message: data.message,
            createdAt: new Date(),
          })

          // Уведомляем получателя
          const fromUser = await this.db.getUserById(fromUserId)
          if (fromUser) {
            this.sendToUser(data.toUserId, "friend_request_received", {
              id: requestId,
              fromUserId,
              toUserId: data.toUserId,
              status: "pending",
              message: data.message,
              createdAt: new Date(),
              fromUser: {
                id: fromUser.id,
                username: fromUser.username,
                avatar_url: fromUser.avatar_url,
                status: fromUser.status,
              },
            })
          }

          console.log(
            `Запрос на дружбу отправлен: ${fromUserId} -> ${data.toUserId}`
          )
        } catch (error: any) {
          console.error("Ошибка отправки запроса на дружбу:", error)
          socket.emit("friend_error", {
            message: error.message || "Ошибка отправки запроса",
          })
        }
      }
    )

    // Принятие запроса на дружбу
    socket.on("accept_friend_request", async (data: { requestId: number }) => {
      try {
        const userId = socket.userId
        const result = await this.db.acceptFriendRequest(data.requestId, userId)

        // Уведомляем принимающего
        socket.emit("friend_request_accepted", {
          requestId: data.requestId,
          friendship: result.friendship,
          newRoomId: result.roomId,
        })

        // Уведомляем отправителя запроса
        this.sendToUser(result.friendship.user_id, "friend_request_accepted", {
          requestId: data.requestId,
          friendship: result.friendship,
          newRoomId: result.roomId,
        })

        console.log(`Запрос на дружбу принят: request ${data.requestId}`)
      } catch (error: any) {
        console.error("Ошибка принятия запроса на дружбу:", error)
        socket.emit("friend_error", {
          message: error.message || "Ошибка принятия запроса",
        })
      }
    })

    // Отклонение запроса на дружбу
    socket.on("decline_friend_request", async (data: { requestId: number }) => {
      try {
        const userId = socket.userId
        const success = await this.db.declineFriendRequest(
          data.requestId,
          userId
        )

        if (success) {
          // Уведомляем отклоняющего
          socket.emit("friend_request_declined", { requestId: data.requestId })

          // Можно также уведомить отправителя (опционально)
          // this.sendToUser(fromUserId, "friend_request_declined", { requestId: data.requestId })

          console.log(`Запрос на дружбу отклонен: request ${data.requestId}`)
        } else {
          socket.emit("friend_error", {
            message: "Не удалось отклонить запрос",
          })
        }
      } catch (error: any) {
        console.error("Ошибка отклонения запроса на дружбу:", error)
        socket.emit("friend_error", {
          message: error.message || "Ошибка отклонения запроса",
        })
      }
    })

    // Удаление из друзей
    socket.on("remove_friend", async (data: { friendId: number }) => {
      try {
        const userId = socket.userId
        const success = await this.db.removeFriend(userId, data.friendId)

        if (success) {
          // Уведомляем инициатора
          socket.emit("friend_removed", { friendId: data.friendId })

          // Уведомляем удаляемого друга
          this.sendToUser(data.friendId, "friend_removed", { friendId: userId })

          console.log(`Дружба удалена: ${userId} <-> ${data.friendId}`)
        } else {
          socket.emit("friend_error", {
            message: "Не удалось удалить из друзей",
          })
        }
      } catch (error: any) {
        console.error("Ошибка удаления друга:", error)
        socket.emit("friend_error", {
          message: error.message || "Ошибка удаления из друзей",
        })
      }
    })

    // Блокировка пользователя
    socket.on("block_user", async (data: { userId: number }) => {
      try {
        const blockerId = socket.userId
        const success = await this.db.blockUser(blockerId, data.userId)

        if (success) {
          // Уведомляем блокирующего
          socket.emit("user_blocked", { userId: data.userId })

          console.log(
            `Пользователь заблокирован: ${blockerId} заблокировал ${data.userId}`
          )
        } else {
          socket.emit("friend_error", {
            message: "Не удалось заблокировать пользователя",
          })
        }
      } catch (error: any) {
        console.error("Ошибка блокировки пользователя:", error)
        socket.emit("friend_error", {
          message: error.message || "Ошибка блокировки пользователя",
        })
      }
    })

    // Разблокировка пользователя
    socket.on("unblock_user", async (data: { userId: number }) => {
      try {
        const unblockerId = socket.userId
        const success = await this.db.unblockUser(unblockerId, data.userId)

        if (success) {
          // Уведомляем разблокирующего
          socket.emit("user_unblocked", { userId: data.userId })

          console.log(
            `Пользователь разблокирован: ${unblockerId} разблокировал ${data.userId}`
          )
        } else {
          socket.emit("friend_error", {
            message: "Не удалось разблокировать пользователя",
          })
        }
      } catch (error: any) {
        console.error("Ошибка разблокировки пользователя:", error)
        socket.emit("friend_error", {
          message: error.message || "Ошибка разблокировки пользователя",
        })
      }
    })
  }

  private setupDisconnectionHandler(socket: AuthenticatedSocket): void {
    socket.on("disconnect", () => {
      const userId = this.socketUsers.get(socket.id)

      if (userId) {
        // Удаляем сокет из маппинга
        const userSocketIds = this.userSockets.get(userId)
        if (userSocketIds) {
          const index = userSocketIds.indexOf(socket.id)
          if (index > -1) {
            userSocketIds.splice(index, 1)
          }

          // Если у пользователя не осталось активных сокетов
          if (userSocketIds.length === 0) {
            this.userSockets.delete(userId)
            this.broadcastUserStatus(userId, "offline")
          }
        }

        this.socketUsers.delete(socket.id)
      }

      console.log(`Пользователь отключился (socket: ${socket.id})`)
    })
  }

  private async broadcastUserStatus(
    userId: number,
    status: "online" | "offline" | "away"
  ): Promise<void> {
    try {
      // Обновляем статус в базе данных
      await this.db.updateUserStatus(userId, status)

      // Получаем комнаты пользователя
      const userRooms = await this.db.getUserChatRooms(userId)

      // Уведомляем участников всех комнат о смене статуса
      for (const room of userRooms) {
        this.io.to(`room_${room.id}`).emit("user_status_changed", {
          userId,
          status,
          timestamp: new Date(),
        })
      }
    } catch (error) {
      console.error("Ошибка broadcast статуса пользователя:", error)
    }
  }

  // Вспомогательные методы
  getUserSocketIds(userId: number): string[] {
    return this.userSockets.get(userId) || []
  }

  isUserOnline(userId: number): boolean {
    return this.userSockets.has(userId)
  }

  sendToUser(userId: number, event: string, data: any): void {
    const socketIds = this.getUserSocketIds(userId)
    for (const socketId of socketIds) {
      this.io.to(socketId).emit(event, data)
    }
  }

  sendToRoom(roomId: number, event: string, data: any): void {
    this.io.to(`room_${roomId}`).emit(event, data)
  }
}
