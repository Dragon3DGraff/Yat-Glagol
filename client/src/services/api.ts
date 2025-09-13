import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"
import {
  ApiResponse,
  LoginForm,
  RegisterForm,
  LoginResponse,
  RegisterResponse,
  User,
  ChatRoom,
  Message,
  CreateRoomForm,
  Friend,
  FriendRequest,
  FriendshipStatus,
} from "@/types"

class ApiService {
  private api: AxiosInstance
  private token: string | null = null

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || "/api",
      timeout: 10000,
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Загружаем токен из localStorage
    this.loadToken()

    // Настраиваем interceptors
    this.setupInterceptors()
  }

  private loadToken(): void {
    const savedToken = localStorage.getItem("auth_token")
    if (savedToken) {
      this.setToken(savedToken)
    }
  }

  private setupInterceptors(): void {
    // Request interceptor для добавления токена
    this.api.interceptors.request.use(
      (config) => {
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor для обработки ошибок
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config

        // Если получили 401 и запрос не на обновление токена
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Пытаемся обновить токен
            const response = await this.refreshToken()
            if (response.data.token) {
              this.setToken(response.data.token)
              originalRequest.headers.Authorization = `Bearer ${response.data.token}`
              return this.api(originalRequest)
            }
          } catch (refreshError) {
            // Если не удалось обновить токен, разлогиниваем
            this.clearToken()
            window.location.href = "/login"
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  public setToken(token: string): void {
    this.token = token
    localStorage.setItem("auth_token", token)
  }

  public clearToken(): void {
    this.token = null
    localStorage.removeItem("auth_token")
  }

  public getToken(): string | null {
    return this.token
  }

  // Методы аутентификации
  public async register(
    data: RegisterForm
  ): Promise<ApiResponse<RegisterResponse>> {
    const response = await this.api.post<RegisterResponse>(
      "/auth/register",
      data
    )
    return { success: true, data: response.data }
  }

  public async login(data: LoginForm): Promise<ApiResponse<LoginResponse>> {
    const response = await this.api.post<LoginResponse>("/auth/login", data)
    if (response.data.token) {
      this.setToken(response.data.token)
    }
    return { success: true, data: response.data }
  }

  public async logout(): Promise<ApiResponse> {
    try {
      await this.api.post("/auth/logout")
    } finally {
      this.clearToken()
    }
    return { success: true }
  }

  public async refreshToken(): Promise<AxiosResponse> {
    return this.api.post("/auth/refresh")
  }

  public async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.get<{ user: User }>("/auth/verify")
    return { success: true, data: response.data }
  }

  public async forgotPassword(email: string): Promise<ApiResponse> {
    const response = await this.api.post("/auth/forgot-password", { email })
    return { success: true, data: response.data }
  }

  // Методы пользователя
  public async getProfile(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.get<{ user: User }>("/user/profile")
    return { success: true, data: response.data }
  }

  public async getUserById(
    userId: number
  ): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.get<{ user: User }>(`/user/${userId}`)
    return { success: true, data: response.data }
  }

  public async updateProfile(data: Partial<User>): Promise<ApiResponse> {
    const response = await this.api.put("/user/profile", data)
    return { success: true, data: response.data }
  }

  public async changePassword(data: {
    currentPassword: string
    newPassword: string
  }): Promise<ApiResponse> {
    const response = await this.api.put("/user/password", data)
    return { success: true, data: response.data }
  }

  public async updateStatus(
    status: "online" | "offline" | "away"
  ): Promise<ApiResponse> {
    const response = await this.api.put("/user/status", { status })
    return { success: true, data: response.data }
  }

  public async searchUsers(
    query: string,
    limit = 10
  ): Promise<ApiResponse<{ users: User[] }>> {
    const response = await this.api.get<{ users: User[] }>("/user/search", {
      params: { q: query, limit },
    })
    return { success: true, data: response.data }
  }

  public async deleteAccount(password: string): Promise<ApiResponse> {
    const response = await this.api.delete("/user/profile", {
      data: { password },
    })
    return { success: true, data: response.data }
  }

  // Методы чата
  public async getRooms(): Promise<ApiResponse<{ rooms: ChatRoom[] }>> {
    const response = await this.api.get<{ rooms: ChatRoom[] }>("/chat/rooms")
    return { success: true, data: response.data }
  }

  public async createRoom(
    data: CreateRoomForm
  ): Promise<ApiResponse<{ room: ChatRoom }>> {
    const response = await this.api.post<{ room: ChatRoom }>(
      "/chat/rooms",
      data
    )
    return { success: true, data: response.data }
  }

  public async getRoom(
    roomId: number
  ): Promise<ApiResponse<{ room: ChatRoom }>> {
    const response = await this.api.get<{ room: ChatRoom }>(
      `/chat/rooms/${roomId}`
    )
    return { success: true, data: response.data }
  }

  public async getRoomParticipants(
    roomId: number
  ): Promise<ApiResponse<{ participants: User[] }>> {
    const response = await this.api.get<{ participants: User[] }>(
      `/chat/rooms/${roomId}/participants`
    )
    return { success: true, data: response.data }
  }

  public async addRoomParticipant(
    roomId: number,
    userId: number,
    role = "member"
  ): Promise<ApiResponse> {
    const response = await this.api.post(`/chat/rooms/${roomId}/participants`, {
      userId,
      role,
    })
    return { success: true, data: response.data }
  }

  public async getRoomMessages(
    roomId: number,
    limit = 50,
    offset = 0
  ): Promise<ApiResponse<{ messages: Message[]; hasMore: boolean }>> {
    const response = await this.api.get<{
      messages: Message[]
      hasMore: boolean
    }>(`/chat/rooms/${roomId}/messages`, { params: { limit, offset } })
    return { success: true, data: response.data }
  }

  public async sendMessage(
    roomId: number,
    content: string,
    messageType = "text",
    replyTo?: number
  ): Promise<ApiResponse<{ data: Message }>> {
    const response = await this.api.post<{ data: Message }>(
      `/chat/rooms/${roomId}/messages`,
      { content, messageType, replyTo }
    )
    return { success: true, data: response.data }
  }

  public async editMessage(
    messageId: number,
    content: string
  ): Promise<ApiResponse> {
    const response = await this.api.put(`/chat/messages/${messageId}`, {
      content,
    })
    return { success: true, data: response.data }
  }

  public async deleteMessage(messageId: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/chat/messages/${messageId}`)
    return { success: true, data: response.data }
  }

  public async searchMessages(
    roomId: number,
    query: string,
    limit = 20
  ): Promise<
    ApiResponse<{ messages: Message[]; query: string; total: number }>
  > {
    const response = await this.api.get<{
      messages: Message[]
      query: string
      total: number
    }>(`/chat/rooms/${roomId}/search`, { params: { q: query, limit } })
    return { success: true, data: response.data }
  }

  // Методы для работы с файлами
  public async uploadFile(
    file: File,
    roomId: number
  ): Promise<ApiResponse<{ url: string }>> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("roomId", roomId.toString())

    const response = await this.api.post<{ url: string }>("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        )
        // Можно добавить обработку прогресса загрузки
        console.log(`Upload Progress: ${percentCompleted}%`)
      },
    })

    return { success: true, data: response.data }
  }

  // ========================================
  // Методы для работы с друзьями
  // ========================================

  public async getFriends(): Promise<ApiResponse<{ friends: Friend[] }>> {
    try {
      console.log(`👥 [API-CLIENT] Запрашиваем GET /friends`)
      const response = await this.api.get<{ friends: Friend[] }>("/friends")
      console.log(`👥 [API-CLIENT] Ответ getFriends:`, response.data)

      // Проверяем структуру ответа от сервера: { success: true, data: { friends: [...] } }
      if (
        response.data &&
        typeof response.data === "object" &&
        "data" in response.data &&
        response.data.data &&
        typeof response.data.data === "object" &&
        response.data.data !== null &&
        "friends" in response.data.data
      ) {
        // Возвращаем только data.friends, так как store ожидает { friends: [...] }
        return {
          success: true,
          data: response.data.data as { friends: Friend[] },
        }
      } else {
        console.error(
          `❌ [API-CLIENT] Неправильная структура ответа getFriends:`,
          response.data
        )
        return {
          success: false,
          error: "Неправильная структура ответа сервера",
          data: { friends: [] },
        }
      }
    } catch (error: any) {
      console.error(`💥 [API-CLIENT] Ошибка запроса друзей:`, error)
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка загрузки друзей",
        data: { friends: [] },
      }
    }
  }

  public async getFriendRequests(): Promise<
    ApiResponse<{ requests: FriendRequest[] }>
  > {
    try {
      console.log(`📥 [API-CLIENT] Запрашиваем GET /friends/requests`)
      const response = await this.api.get<{ requests: FriendRequest[] }>(
        "/friends/requests"
      )
      console.log(`📥 [API-CLIENT] Ответ:`, response.data)
      console.log(`📥 [API-CLIENT] Полный response:`, response)
      console.log(`📥 [API-CLIENT] typeof response.data:`, typeof response.data)
      console.log(
        `📥 [API-CLIENT] response.data keys:`,
        response.data ? Object.keys(response.data) : "response.data отсутствует"
      )

      // Проверяем структуру ответа от сервера: { success: true, data: { requests: [...] } }
      if (
        response.data &&
        typeof response.data === "object" &&
        "data" in response.data &&
        response.data.data &&
        typeof response.data.data === "object" &&
        response.data.data !== null &&
        "requests" in response.data.data
      ) {
        // Возвращаем только data.requests, так как store ожидает { requests: [...] }
        return {
          success: true,
          data: response.data.data as { requests: FriendRequest[] },
        }
      } else {
        console.error(
          `❌ [API-CLIENT] Неправильная структура ответа для входящих запросов:`,
          response.data
        )
        console.error(
          `❌ [API-CLIENT] Ожидалось: { success: true, data: { requests: [...] } }, получено:`,
          response.data
        )
        return {
          success: false,
          error: "Неправильная структура ответа сервера",
          data: { requests: [] },
        }
      }
    } catch (error: any) {
      console.error(`💥 [API-CLIENT] Ошибка запроса входящих запросов:`, error)
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка загрузки запросов",
        data: { requests: [] },
      }
    }
  }

  public async getSentFriendRequests(): Promise<
    ApiResponse<{ requests: FriendRequest[] }>
  > {
    try {
      console.log(`📤 [API-CLIENT] Запрашиваем GET /friends/requests/sent`)
      const response = await this.api.get<{ requests: FriendRequest[] }>(
        "/friends/requests/sent"
      )
      console.log(`📤 [API-CLIENT] Ответ:`, response.data)
      console.log(`📤 [API-CLIENT] Полный response:`, response)
      console.log(`📤 [API-CLIENT] typeof response.data:`, typeof response.data)
      console.log(
        `📤 [API-CLIENT] response.data keys:`,
        response.data ? Object.keys(response.data) : "response.data отсутствует"
      )

      // Проверяем структуру ответа от сервера: { success: true, data: { requests: [...] } }
      if (
        response.data &&
        typeof response.data === "object" &&
        "data" in response.data &&
        response.data.data &&
        typeof response.data.data === "object" &&
        response.data.data !== null &&
        "requests" in response.data.data
      ) {
        // Возвращаем только data.requests, так как store ожидает { requests: [...] }
        return {
          success: true,
          data: response.data.data as { requests: FriendRequest[] },
        }
      } else {
        console.error(
          `❌ [API-CLIENT] Неправильная структура ответа для отправленных запросов:`,
          response.data
        )
        console.error(
          `❌ [API-CLIENT] Ожидалось: { success: true, data: { requests: [...] } }, получено:`,
          response.data
        )
        return {
          success: false,
          error: "Неправильная структура ответа сервера",
          data: { requests: [] },
        }
      }
    } catch (error: any) {
      console.error(
        `💥 [API-CLIENT] Ошибка запроса отправленных запросов:`,
        error
      )
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка загрузки отправленных запросов",
        data: { requests: [] },
      }
    }
  }

  public async sendFriendRequest(
    userId: number,
    message?: string
  ): Promise<ApiResponse<{ requestId: number }>> {
    const response = await this.api.post<{ requestId: number }>(
      "/friends/request",
      {
        userId,
        message,
      }
    )
    return { success: true, data: response.data }
  }

  public async sendFriendRequestByUsername(
    username: string,
    message?: string
  ): Promise<ApiResponse<{ requestId: number; targetUser: User }>> {
    try {
      console.log(
        `🚀 [API-CLIENT] Отправляем запрос POST /friends/request/username`,
        { username, message }
      )
      const response = await this.api.post<{
        requestId: number
        targetUser: User
      }>("/friends/request/username", { username, message })
      console.log(
        `🚀 [API-CLIENT] Ответ sendFriendRequestByUsername:`,
        response.data
      )

      // Проверяем структуру ответа от сервера: { success: true, data: { requestId, targetUser } }
      if (
        response.data &&
        typeof response.data === "object" &&
        "data" in response.data &&
        response.data.data &&
        typeof response.data.data === "object" &&
        response.data.data !== null
      ) {
        // Возвращаем только data, так как store ожидает { requestId, targetUser }
        return {
          success: true,
          data: response.data.data as { requestId: number; targetUser: User },
        }
      } else {
        console.error(
          `❌ [API-CLIENT] Неправильная структура ответа sendFriendRequestByUsername:`,
          response.data
        )
        return {
          success: false,
          error: "Неправильная структура ответа сервера",
        }
      }
    } catch (error: any) {
      console.error(`💥 [API-CLIENT] Ошибка отправки запроса на дружбу:`, error)
      return {
        success: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Ошибка отправки запроса на дружбу",
      }
    }
  }

  public async acceptFriendRequest(
    requestId: number
  ): Promise<ApiResponse<{ friendship: Friend; roomId?: number }>> {
    const response = await this.api.put<{
      friendship: Friend
      roomId?: number
    }>(`/friends/request/${requestId}/accept`)
    return { success: true, data: response.data }
  }

  public async declineFriendRequest(requestId: number): Promise<ApiResponse> {
    const response = await this.api.put(`/friends/request/${requestId}/decline`)
    return { success: true, data: response.data }
  }

  public async removeFriend(friendId: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/friends/${friendId}`)
    return { success: true, data: response.data }
  }

  public async blockUser(userId: number): Promise<ApiResponse> {
    const response = await this.api.post(`/friends/block/${userId}`)
    return { success: true, data: response.data }
  }

  public async unblockUser(userId: number): Promise<ApiResponse> {
    const response = await this.api.delete(`/friends/block/${userId}`)
    return { success: true, data: response.data }
  }

  public async getFriendshipStatus(
    userId: number
  ): Promise<ApiResponse<{ status: FriendshipStatus }>> {
    const response = await this.api.get<{ status: FriendshipStatus }>(
      `/friends/status/${userId}`
    )
    return { success: true, data: response.data }
  }

  // Общие методы
  public async request<T = any>(
    config: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.api.request<T>(config)
      return { success: true, data: response.data }
    } catch (error: any) {
      const message =
        error.response?.data?.error || error.message || "Произошла ошибка"
      return {
        success: false,
        error: message,
        details: error.response?.data?.details,
      }
    }
  }
}

// Создаем единственный экземпляр сервиса
export const apiService = new ApiService()
export default apiService
