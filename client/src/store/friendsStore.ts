import { create } from "zustand"
import { FriendsState, Friend, FriendRequest, FriendshipStatus } from "@/types"
import { apiService } from "@/services/api"
import { socketService } from "@/services/socket"
import toast from "react-hot-toast"

interface FriendsStore extends FriendsState {
  // Actions
  loadFriends: () => Promise<void>
  loadFriendRequests: () => Promise<void>
  loadSentRequests: () => Promise<void>
  sendFriendRequest: (userId: number, message?: string) => Promise<boolean>
  sendFriendRequestByUsername: (
    username: string,
    message?: string
  ) => Promise<boolean>
  acceptFriendRequest: (requestId: number) => Promise<boolean>
  declineFriendRequest: (requestId: number) => Promise<boolean>
  removeFriend: (friendId: number) => Promise<boolean>
  blockUser: (userId: number) => Promise<boolean>
  unblockUser: (userId: number) => Promise<boolean>
  getFriendshipStatus: (userId: number) => Promise<FriendshipStatus>

  // Internal actions
  addFriend: (friend: Friend) => void
  removeFriendFromStore: (friendId: number) => void
  addFriendRequest: (request: FriendRequest) => void
  addSentRequest: (request: FriendRequest) => void
  removeFriendRequest: (requestId: number) => void
  updateFriendRequest: (
    requestId: number,
    status: FriendRequest["status"]
  ) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
  // Initial state
  friends: [],
  friendRequests: [],
  sentRequests: [],
  isLoading: false,
  error: null,

  // Actions
  loadFriends: async () => {
    console.log(`👥 [LOAD] Загружаем список друзей`)
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.getFriends()
      console.log(`👥 [LOAD] Ответ API для друзей:`, response)

      if (response.success && response.data && response.data.friends) {
        console.log(
          `✅ [LOAD] Загружено ${response.data.friends.length} друзей`
        )

        // Проверяем на дубликаты на уровне API
        const friendIds = response.data.friends.map((f) => f.id)
        const uniqueIds = new Set(friendIds)
        if (friendIds.length !== uniqueIds.size) {
          console.warn(
            `⚠️ [LOAD] Обнаружены дубликаты в ответе API! Всего: ${friendIds.length}, уникальных: ${uniqueIds.size}`
          )
        }

        set({
          friends: response.data.friends,
          isLoading: false,
          error: null,
        })
      } else {
        console.error(`❌ [LOAD] Ошибка структуры ответа для друзей:`, response)
        set({
          isLoading: false,
          error: response.error || "Ошибка загрузки друзей",
          friends: [], // Устанавливаем пустой массив
        })
        toast.error(response.error || "Ошибка загрузки друзей")
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при загрузке друзей"
      console.error(`💥 [LOAD] Исключение при загрузке друзей:`, error)
      set({
        isLoading: false,
        error: errorMessage,
        friends: [], // Устанавливаем пустой массив
      })
      toast.error(errorMessage)
    }
  },

  loadFriendRequests: async () => {
    console.log(`📥 [LOAD] Загружаем входящие запросы`)
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.getFriendRequests()
      console.log(`📥 [LOAD] Ответ API для входящих запросов:`, response)

      if (response.success && response.data && response.data.requests) {
        console.log(
          `✅ [LOAD] Загружено ${response.data.requests.length} входящих запросов`
        )
        set({
          friendRequests: response.data.requests,
          isLoading: false,
          error: null,
        })
      } else {
        console.error(
          `❌ [LOAD] Ошибка загрузки входящих запросов:`,
          response.error ||
            "response.data или response.data.requests отсутствует"
        )
        console.error(`❌ [LOAD] Полная структура ответа:`, response)
        set({
          isLoading: false,
          error: response.error || "Ошибка загрузки запросов",
          friendRequests: [], // Устанавливаем пустой массив
        })
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при загрузке запросов"
      console.error(
        `💥 [LOAD] Исключение при загрузке входящих запросов:`,
        error
      )
      set({
        isLoading: false,
        error: errorMessage,
      })
    }
  },

  loadSentRequests: async () => {
    console.log(`📤 [LOAD] Загружаем отправленные запросы`)
    try {
      const response = await apiService.getSentFriendRequests()
      console.log(`📤 [LOAD] Ответ API для отправленных запросов:`, response)

      if (response.success && response.data && response.data.requests) {
        console.log(
          `✅ [LOAD] Загружено ${response.data.requests.length} отправленных запросов`
        )
        set({
          sentRequests: response.data.requests,
          error: null,
        })
      } else {
        console.error(
          `❌ [LOAD] Ошибка загрузки отправленных запросов:`,
          response.error ||
            "response.data или response.data.requests отсутствует"
        )
        console.error(
          `❌ [LOAD] Полная структура ответа для отправленных:`,
          response
        )
        set({
          sentRequests: [], // Устанавливаем пустой массив
          error: response.error || "Ошибка загрузки отправленных запросов",
        })
      }
    } catch (error: any) {
      console.error(
        "💥 [LOAD] Исключение при загрузке отправленных запросов:",
        error
      )
    }
  },

  sendFriendRequest: async (userId: number, message?: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.sendFriendRequest(userId, message)

      if (response.success) {
        set({ isLoading: false })
        toast.success("Запрос на дружбу отправлен")
        // Обновляем отправленные запросы
        await get().loadSentRequests()
        return true
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка отправки запроса",
        })
        toast.error(response.error || "Ошибка отправки запроса")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при отправке запроса"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  sendFriendRequestByUsername: async (username: string, message?: string) => {
    console.log(
      `🚀 [API] Отправляем запрос на дружбу пользователю: ${username}`
    )
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.sendFriendRequestByUsername(
        username,
        message
      )

      console.log(`📡 [API] Ответ от сервера:`, response)

      if (response.success) {
        console.log(
          `✅ [API] Запрос успешно отправлен, ID: ${response.data?.requestId}`
        )
        set({ isLoading: false })
        toast.success(`Запрос на дружбу отправлен пользователю ${username}`)
        // Обновляем отправленные запросы
        console.log(`🔄 [API] Обновляем отправленные запросы`)
        await get().loadSentRequests()
        return true
      } else {
        console.error(`❌ [API] Ошибка отправки запроса:`, response.error)
        set({
          isLoading: false,
          error: response.error || "Ошибка отправки запроса",
        })
        toast.error(response.error || "Ошибка отправки запроса")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при отправке запроса"
      console.error(`💥 [API] Исключение при отправке запроса:`, error)
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  acceptFriendRequest: async (requestId: number) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.acceptFriendRequest(requestId)

      if (response.success && response.data) {
        // Удаляем запрос из списка
        set((state) => ({
          friendRequests: state.friendRequests.filter(
            (req) => req.id !== requestId
          ),
          isLoading: false,
          error: null,
        }))

        toast.success("Запрос на дружбу принят")

        // Обновляем список друзей
        await get().loadFriends()

        return true
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка принятия запроса",
        })
        toast.error(response.error || "Ошибка принятия запроса")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при принятии запроса"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  declineFriendRequest: async (requestId: number) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.declineFriendRequest(requestId)

      if (response.success) {
        // Удаляем запрос из списка
        set((state) => ({
          friendRequests: state.friendRequests.filter(
            (req) => req.id !== requestId
          ),
          isLoading: false,
          error: null,
        }))

        toast.success("Запрос на дружбу отклонен")
        return true
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка отклонения запроса",
        })
        toast.error(response.error || "Ошибка отклонения запроса")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при отклонении запроса"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  removeFriend: async (friendId: number) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.removeFriend(friendId)

      if (response.success) {
        // Удаляем друга из списка
        set((state) => ({
          friends: state.friends.filter(
            (friend) => friend.friendId !== friendId
          ),
          isLoading: false,
          error: null,
        }))

        toast.success("Пользователь удален из друзей")
        return true
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка удаления из друзей",
        })
        toast.error(response.error || "Ошибка удаления из друзей")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при удалении из друзей"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  blockUser: async (userId: number) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.blockUser(userId)

      if (response.success) {
        // Удаляем пользователя из друзей, если он был другом
        set((state) => ({
          friends: state.friends.filter((friend) => friend.friendId !== userId),
          isLoading: false,
          error: null,
        }))

        toast.success("Пользователь заблокирован")
        return true
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка блокировки пользователя",
        })
        toast.error(response.error || "Ошибка блокировки пользователя")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при блокировке пользователя"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  unblockUser: async (userId: number) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiService.unblockUser(userId)

      if (response.success) {
        set({
          isLoading: false,
          error: null,
        })

        toast.success("Пользователь разблокирован")
        return true
      } else {
        set({
          isLoading: false,
          error: response.error || "Ошибка разблокировки пользователя",
        })
        toast.error(response.error || "Ошибка разблокировки пользователя")
        return false
      }
    } catch (error: any) {
      const errorMessage =
        error.message || "Произошла ошибка при разблокировке пользователя"
      set({
        isLoading: false,
        error: errorMessage,
      })
      toast.error(errorMessage)
      return false
    }
  },

  getFriendshipStatus: async (userId: number) => {
    try {
      const response = await apiService.getFriendshipStatus(userId)

      if (response.success && response.data) {
        return response.data.status
      } else {
        return "none"
      }
    } catch (error: any) {
      console.error("Ошибка получения статуса отношений:", error)
      return "none"
    }
  },

  // Internal actions
  addFriend: (friend: Friend) => {
    set((state) => {
      // Проверяем, нет ли уже такого друга в списке (избегаем дублирования)
      const existingFriend = state.friends.find(
        (f) => f.id === friend.id || f.friendId === friend.friendId
      )

      if (existingFriend) {
        console.log(`⚠️ [STORE] Друг уже существует в списке:`, friend.friendId)
        return state // Не добавляем дубликат
      }

      console.log(`➕ [STORE] Добавляем нового друга:`, friend.friendId)
      return {
        friends: [...state.friends, friend],
      }
    })
  },

  removeFriendFromStore: (friendId: number) => {
    set((state) => ({
      friends: state.friends.filter((friend) => friend.friendId !== friendId),
    }))
  },

  addFriendRequest: (request: FriendRequest) => {
    set((state) => {
      // Проверяем, нет ли уже такого запроса в списке (избегаем дублирования)
      const existingRequest = state.friendRequests.find(
        (r) => r.id === request.id
      )

      if (existingRequest) {
        console.log(`⚠️ [STORE] Входящий запрос уже существует:`, request.id)
        return state // Не добавляем дубликат
      }

      console.log(`📥 [STORE] Добавляем новый входящий запрос:`, request.id)
      return {
        friendRequests: [...state.friendRequests, request],
      }
    })
  },

  addSentRequest: (request: FriendRequest) => {
    set((state) => {
      // Проверяем, нет ли уже такого запроса в списке (избегаем дублирования)
      const existingRequest = state.sentRequests.find(
        (r) => r.id === request.id
      )

      if (existingRequest) {
        console.log(
          `⚠️ [STORE] Отправленный запрос уже существует:`,
          request.id
        )
        return state // Не добавляем дубликат
      }

      console.log(`📤 [STORE] Добавляем новый отправленный запрос:`, request.id)
      return {
        sentRequests: [...state.sentRequests, request],
      }
    })
  },

  removeFriendRequest: (requestId: number) => {
    set((state) => ({
      friendRequests: state.friendRequests.filter(
        (req) => req.id !== requestId
      ),
    }))
  },

  updateFriendRequest: (requestId: number, status: FriendRequest["status"]) => {
    set((state) => ({
      friendRequests: state.friendRequests.map((req) =>
        req.id === requestId ? { ...req, status } : req
      ),
    }))
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },
}))

// Флаг для отслеживания того, что listeners уже настроены
let friendsListenersSetup = false

// Сохраняем ссылки на обработчики для последующей очистки
let currentHandlers: { [key: string]: any } = {}

// Настройка Socket.IO слушателей для друзей
export const setupFriendsSocketListeners = () => {
  // Проверяем, подключен ли socket
  if (!socketService.isConnected()) {
    console.warn("Socket не подключен, пропускаем настройку friends listeners")
    return
  }

  // Избегаем дублирования listeners
  if (friendsListenersSetup) {
    console.log("Friends listeners уже настроены")
    return
  }

  console.log("Настраиваем friends socket listeners...")

  const store = useFriendsStore.getState()

  // Обработчики для запросов на дружбу
  const handleFriendRequestReceived = (data: {
    request: FriendRequest
    fromUser: any
  }) => {
    console.log("🎉 [SOCKET] Получен запрос на дружбу:", data)
    if (data.request) {
      console.log("🔄 [SOCKET] Обновляем список входящих запросов")
      // Только перезагружаем список, чтобы избежать дублирования
      store.loadFriendRequests()

      toast.success(
        `${
          data.fromUser?.username || data.request.fromUser?.username
        } отправил вам запрос на дружбу`
      )
    } else {
      console.warn("⚠️ [SOCKET] Получен пустой запрос на дружбу")
    }
  }

  const handleFriendRequestSent = (data: {
    request: FriendRequest
    toUser: any
  }) => {
    console.log("📤 [SOCKET] Запрос на дружбу отправлен:", data)
    if (data.request) {
      console.log("🔄 [SOCKET] Обновляем список отправленных запросов")
      // Только перезагружаем список, чтобы избежать дублирования
      store.loadSentRequests()
    } else {
      console.warn("⚠️ [SOCKET] Получен пустой отправленный запрос")
    }
  }

  const handleFriendRequestAccepted = (data: {
    requestId: number
    friendship: Friend
    newRoomId?: number
  }) => {
    console.log("✅ [SOCKET] Запрос на дружбу принят:", data)
    console.log("🔄 [SOCKET] Обновляем списки друзей и запросов")

    // Обновляем список друзей из API (чтобы избежать дублирования)
    console.log("⏳ [SOCKET] Ожидание 100ms перед обновлением списка друзей...")
    // Небольшая задержка, чтобы избежать race condition с другими операциями
    setTimeout(() => {
      store.loadFriends()
    }, 100)

    // Удаляем из отправленных запросов
    useFriendsStore.setState((state) => ({
      sentRequests: state.sentRequests.filter(
        (req) => req.id !== data.requestId
      ),
    }))

    toast.success("Ваш запрос на дружбу был принят")
  }

  const handleFriendRequestDeclined = (data: { requestId: number }) => {
    console.log("Запрос на дружбу отклонен:", data)
    // Удаляем из отправленных запросов
    useFriendsStore.setState((state) => ({
      sentRequests: state.sentRequests.filter(
        (req) => req.id !== data.requestId
      ),
    }))
    toast("Ваш запрос на дружбу был отклонен")
  }

  const handleFriendRemoved = (data: { friendId: number; roomId?: number }) => {
    console.log("Друг удален:", data)
    store.removeFriendFromStore(data.friendId)
    toast("Пользователь удалил вас из друзей")
  }

  const handleUserBlocked = (data: { userId: number }) => {
    console.log("Пользователь заблокирован:", data)
    store.removeFriendFromStore(data.userId)
  }

  const handleUserUnblocked = (data: { userId: number }) => {
    console.log("Пользователь разблокирован:", data)
    // Особой логики не требуется, просто логируем
  }

  // Сохраняем ссылки на обработчики
  currentHandlers = {
    handleFriendRequestReceived,
    handleFriendRequestSent,
    handleFriendRequestAccepted,
    handleFriendRequestDeclined,
    handleFriendRemoved,
    handleUserBlocked,
    handleUserUnblocked,
  }

  // Настраиваем listeners
  socketService.on("friend_request_received", handleFriendRequestReceived)
  socketService.on("friend_request_sent", handleFriendRequestSent)
  socketService.on("friend_request_accepted", handleFriendRequestAccepted)
  socketService.on("friend_request_declined", handleFriendRequestDeclined)
  socketService.on("friend_removed", handleFriendRemoved)
  socketService.on("user_blocked", handleUserBlocked)
  socketService.on("user_unblocked", handleUserUnblocked)

  friendsListenersSetup = true
  console.log("✅ Friends socket listeners настроены успешно")
}

// Функция для очистки всех listeners
export const clearFriendsSocketListeners = () => {
  if (!friendsListenersSetup || !socketService.isConnected()) {
    return
  }

  console.log("🧹 Очищаем friends socket listeners...")

  // Удаляем все обработчики
  socketService.off(
    "friend_request_received",
    currentHandlers.handleFriendRequestReceived
  )
  socketService.off(
    "friend_request_sent",
    currentHandlers.handleFriendRequestSent
  )
  socketService.off(
    "friend_request_accepted",
    currentHandlers.handleFriendRequestAccepted
  )
  socketService.off(
    "friend_request_declined",
    currentHandlers.handleFriendRequestDeclined
  )
  socketService.off("friend_removed", currentHandlers.handleFriendRemoved)
  socketService.off("user_blocked", currentHandlers.handleUserBlocked)
  socketService.off("user_unblocked", currentHandlers.handleUserUnblocked)

  currentHandlers = {}
  friendsListenersSetup = false
  console.log("✅ Friends listeners очищены")
}

// Функция для сброса статуса listeners (при logout)
export const resetFriendsSocketListeners = () => {
  clearFriendsSocketListeners()
  console.log("Friends listeners сброшены")
}

// Функция для переподключения listeners (при проблемах)
export const reconnectFriendsSocketListeners = () => {
  console.log("🔄 Переподключаем friends socket listeners...")
  clearFriendsSocketListeners()
  setTimeout(() => {
    setupFriendsSocketListeners()
  }, 100)
}

// Функция для проверки состояния listeners
export const areFriendsListenersSetup = () => {
  return friendsListenersSetup
}
