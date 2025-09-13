import { create } from "zustand"
import { ChatState, ChatRoom, Message, User } from "@/types"
import { apiService } from "@/services/api"
import { socketService } from "@/services/socket"
import toast from "react-hot-toast"

interface ChatStore extends ChatState {
  // Actions
  loadRooms: () => Promise<void>
  createRoom: (
    name: string,
    description?: string,
    type?: "private" | "group" | "public"
  ) => Promise<boolean>
  selectRoom: (room: ChatRoom) => Promise<void>
  joinRoom: (roomId: number) => void
  leaveRoom: (roomId: number) => void
  sendMessage: (
    roomId: number,
    content: string,
    messageType?: "text" | "image" | "file",
    replyTo?: number
  ) => void
  loadMessages: (
    roomId: number,
    offset?: number,
    limit?: number
  ) => Promise<void>
  addMessage: (message: Message) => void
  updateMessage: (messageId: number, newContent: string, editedAt: Date) => void
  removeMessage: (messageId: number) => void
  setTypingUser: (roomId: number, userId: number, isTyping: boolean) => void
  updateRoomParticipants: (roomId: number, participants: User[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: (roomId: number) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial state
  rooms: [],
  activeRoom: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: {},

  // Actions
  loadRooms: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.getRooms()

      if (response.success && response.data) {
        set({
          rooms: response.data.rooms,
          isLoading: false,
          error: null,
        })
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка загрузки комнат",
        })
        toast.error(response.error || "Ошибка загрузки комнат")
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при загрузке комнат"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
    }
  },

  createRoom: async (name: string, description = "", type = "group") => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.createRoom({ name, description, type })

      if (response.success && response.data) {
        const newRoom = response.data.room

        set((state) => ({
          rooms: [newRoom, ...state.rooms],
          isLoading: false,
          error: null,
        }))

        toast.success("Комната создана успешно")
        return true
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка создания комнаты",
        })
        toast.error(response.error || "Ошибка создания комнаты")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при создании комнаты"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  selectRoom: async (room: ChatRoom) => {
    set({ activeRoom: room, isLoading: true })

    try {
      // Проверяем, что socket подключен и listeners настроены
      if (!socketService.isConnected()) {
        console.warn("Socket не подключен при выборе комнаты")
        set({ isLoading: false })
        return
      }

      // Если listeners не настроены, пробуем переподключить
      // Проверяем через внутренний механизм
      if (!chatListenersSetup) {
        console.log("Listeners не настроены, переподключаем...")
        // Вызываем функцию через setTimeout чтобы избежать циклической зависимости
        setTimeout(() => setupChatSocketListeners(), 0)
      }

      // Присоединяемся к комнате через Socket.IO
      console.log(`🏠 Присоединяемся к комнате: ${room.name} (ID: ${room.id})`)
      socketService.joinRoom(room.id)

      // Загружаем сообщения если их еще нет
      const currentMessages = get().messages[room.id]
      if (!currentMessages || currentMessages.length === 0) {
        await get().loadMessages(room.id)
      }

      set({ isLoading: false })
    } catch (error) {
      console.error("Ошибка при выборе комнаты:", error)
      set({ isLoading: false })
    }
  },

  joinRoom: (roomId: number) => {
    socketService.joinRoom(roomId)
  },

  leaveRoom: (roomId: number) => {
    socketService.leaveRoom(roomId)

    // Если покидаем активную комнату, сбрасываем ее
    const currentActiveRoom = get().activeRoom
    if (currentActiveRoom && currentActiveRoom.id === roomId) {
      set({ activeRoom: null })
    }
  },

  sendMessage: (
    roomId: number,
    content: string,
    messageType = "text",
    replyTo
  ) => {
    console.log("📤 Отправляем сообщение:", {
      roomId,
      content,
      messageType,
      replyTo,
      socketConnected: socketService.isConnected(),
    })

    if (!socketService.isConnected()) {
      console.error("❌ Socket не подключен, сообщение не отправлено")
      toast.error("Нет связи с сервером. Проверьте подключение.")
      return
    }

    socketService.sendMessage(roomId, content, messageType, replyTo)
  },

  loadMessages: async (roomId: number, offset = 0, limit = 50) => {
    try {
      const response = await apiService.getRoomMessages(roomId, limit, offset)

      if (response.success && response.data) {
        const messages = response.data.messages

        set((state) => ({
          messages: {
            ...state.messages,
            [roomId]:
              offset === 0
                ? messages
                : [...(state.messages[roomId] || []), ...messages],
          },
        }))
      }
    } catch (error: any) {
      console.error("Ошибка загрузки сообщений:", error)
      toast.error("Ошибка загрузки сообщений")
    }
  },

  addMessage: (message: Message) => {
    console.log("📨 Добавляем сообщение в store:", {
      messageId: message.id,
      roomId: message.room_id,
      content: message.content.substring(0, 50),
      userId: message.user_id,
      timestamp: message.created_at,
    })

    set((state) => {
      const roomMessages = state.messages[message.room_id] || []
      console.log(
        `📋 Текущих сообщений в комнате ${message.room_id}: ${roomMessages.length}`
      )

      // Проверяем, нет ли уже такого сообщения
      const existingMessageIndex = roomMessages.findIndex(
        (m) => m.id === message.id
      )

      let updatedMessages
      if (existingMessageIndex >= 0) {
        // Обновляем существующее сообщение
        console.log("🔄 Обновляем существующее сообщение")
        updatedMessages = [...roomMessages]
        updatedMessages[existingMessageIndex] = message
      } else {
        // Добавляем новое сообщение
        console.log("➕ Добавляем новое сообщение")
        updatedMessages = [...roomMessages, message]
      }

      console.log(
        `✅ Обновленное количество сообщений: ${updatedMessages.length}`
      )

      return {
        messages: {
          ...state.messages,
          [message.room_id]: updatedMessages,
        },
      }
    })

    // Обновляем последнее сообщение в списке комнат
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === message.room_id
          ? { ...room, lastMessage: message, updated_at: message.created_at }
          : room
      ),
    }))
  },

  updateMessage: (messageId: number, newContent: string, editedAt: Date) => {
    set((state) => {
      const updatedMessages = { ...state.messages }

      // Ищем сообщение во всех комнатах
      for (const roomId in updatedMessages) {
        const messages = updatedMessages[roomId]
        const messageIndex = messages.findIndex((m) => m.id === messageId)

        if (messageIndex >= 0) {
          updatedMessages[roomId] = [...messages]
          updatedMessages[roomId][messageIndex] = {
            ...messages[messageIndex],
            content: newContent,
            edited_at: editedAt,
          }
          break
        }
      }

      return { messages: updatedMessages }
    })
  },

  removeMessage: (messageId: number) => {
    set((state) => {
      const updatedMessages = { ...state.messages }

      // Ищем и удаляем сообщение из всех комнат
      for (const roomId in updatedMessages) {
        const messages = updatedMessages[roomId]
        const filteredMessages = messages.filter((m) => m.id !== messageId)

        if (filteredMessages.length !== messages.length) {
          updatedMessages[roomId] = filteredMessages
          break
        }
      }

      return { messages: updatedMessages }
    })
  },

  setTypingUser: (roomId: number, userId: number, isTyping: boolean) => {
    set((state) => {
      const currentTypingUsers = state.typingUsers[roomId] || []

      let updatedTypingUsers
      if (isTyping) {
        // Добавляем пользователя, если его еще нет
        if (!currentTypingUsers.includes(userId)) {
          updatedTypingUsers = [...currentTypingUsers, userId]
        } else {
          updatedTypingUsers = currentTypingUsers
        }
      } else {
        // Удаляем пользователя
        updatedTypingUsers = currentTypingUsers.filter((id) => id !== userId)
      }

      return {
        typingUsers: {
          ...state.typingUsers,
          [roomId]: updatedTypingUsers,
        },
      }
    })
  },

  updateRoomParticipants: (roomId: number, participants: User[]) => {
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? { ...room, participants, participantCount: participants.length }
          : room
      ),
      activeRoom:
        state.activeRoom?.id === roomId
          ? { ...state.activeRoom, participants }
          : state.activeRoom,
    }))
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearMessages: (roomId: number) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [],
      },
    }))
  },
}))

// Флаг для отслеживания того, что listeners уже настроены
let chatListenersSetup = false

// Сохраняем ссылки на обработчики для последующей очистки
let currentHandlers: { [key: string]: any } = {}

// Настройка Socket.IO слушателей для чата
export const setupChatSocketListeners = () => {
  // Проверяем, подключен ли socket
  if (!socketService.isConnected()) {
    console.warn("Socket не подключен, пропускаем настройку listeners")
    return
  }

  // Избегаем дублирования listeners
  if (chatListenersSetup) {
    console.log("Chat listeners уже настроены")
    return
  }

  console.log("Настраиваем chat socket listeners...")

  const store = useChatStore.getState()

  // Обработчики для сообщений
  const handleNewMessage = (message: Message) => {
    console.log("Получено новое сообщение:", message)
    store.addMessage(message)
  }

  const handleMessageEdited = (data: {
    messageId: number
    newContent: string
    editedAt: Date
  }) => {
    console.log("Сообщение отредактировано:", data)
    store.updateMessage(data.messageId, data.newContent, data.editedAt)
  }

  const handleMessageDeleted = (data: { messageId: number }) => {
    console.log("Сообщение удалено:", data)
    store.removeMessage(data.messageId)
  }

  const handleUserTyping = (data: {
    userId: number
    roomId: number
    isTyping: boolean
  }) => {
    store.setTypingUser(data.roomId, data.userId, data.isTyping)
  }

  const handleJoinedRoom = (data: {
    roomId: number
    messages: Message[]
    participants: User[]
  }) => {
    console.log("Присоединились к комнате:", data)
    // Устанавливаем сообщения комнаты
    useChatStore.setState((state) => ({
      messages: {
        ...state.messages,
        [data.roomId]: data.messages,
      },
    }))

    store.updateRoomParticipants(data.roomId, data.participants)
  }

  const handleUserJoined = (data: { userId: number; roomId: number }) => {
    console.log(
      `Пользователь ${data.userId} присоединился к комнате ${data.roomId}`
    )
  }

  const handleUserLeft = (data: { userId: number; roomId: number }) => {
    console.log(`Пользователь ${data.userId} покинул комнату ${data.roomId}`)
  }

  const handleUserStatusChanged = (data: {
    userId: number
    status: "online" | "offline" | "away"
  }) => {
    // Обновляем статус пользователя в участниках комнат
    const state = useChatStore.getState()
    const updatedRooms = state.rooms.map((room) => {
      if (room.participants) {
        const updatedParticipants = room.participants.map((participant) =>
          participant.id === data.userId
            ? { ...participant, status: data.status }
            : participant
        )
        return { ...room, participants: updatedParticipants }
      }
      return room
    })

    useChatStore.setState({ rooms: updatedRooms })
  }

  // Сохраняем ссылки на обработчики
  currentHandlers = {
    handleNewMessage,
    handleMessageEdited,
    handleMessageDeleted,
    handleUserTyping,
    handleJoinedRoom,
    handleUserJoined,
    handleUserLeft,
    handleUserStatusChanged,
  }

  // Настраиваем listeners
  socketService.onMessage(handleNewMessage)
  socketService.on("message_edited", handleMessageEdited)
  socketService.on("message_deleted", handleMessageDeleted)
  socketService.onUserTyping(handleUserTyping)
  socketService.on("joined_room", handleJoinedRoom)
  socketService.onUserJoined(handleUserJoined)
  socketService.onUserLeft(handleUserLeft)
  socketService.onUserStatusChanged(handleUserStatusChanged)

  chatListenersSetup = true
  console.log("✅ Chat socket listeners настроены успешно")
}

// Функция для очистки всех listeners
export const clearChatSocketListeners = () => {
  if (!chatListenersSetup || !socketService.isConnected()) {
    return
  }

  console.log("🧹 Очищаем chat socket listeners...")

  // Удаляем все обработчики
  socketService.off("new_message", currentHandlers.handleNewMessage)
  socketService.off("message_edited", currentHandlers.handleMessageEdited)
  socketService.off("message_deleted", currentHandlers.handleMessageDeleted)
  socketService.off("user_typing", currentHandlers.handleUserTyping)
  socketService.off("joined_room", currentHandlers.handleJoinedRoom)
  socketService.off("user_joined_room", currentHandlers.handleUserJoined)
  socketService.off("user_left_room", currentHandlers.handleUserLeft)
  socketService.off(
    "user_status_changed",
    currentHandlers.handleUserStatusChanged
  )

  currentHandlers = {}
  chatListenersSetup = false
  console.log("✅ Chat listeners очищены")
}

// Функция для сброса статуса listeners (при logout)
export const resetChatSocketListeners = () => {
  clearChatSocketListeners()
  console.log("Chat listeners сброшены")
}

// Функция для переподключения listeners (при проблемах)
export const reconnectChatSocketListeners = () => {
  console.log("🔄 Переподключаем chat socket listeners...")
  clearChatSocketListeners()
  setTimeout(() => {
    setupChatSocketListeners()
  }, 100)
}

// Функция для проверки состояния listeners
export const areChatListenersSetup = () => {
  return chatListenersSetup
}
