import { create } from "zustand"
import { persist } from "zustand/middleware"
import { AuthState, User, LoginForm, RegisterForm } from "@/types"
import { apiService } from "@/services/api"
import { socketService } from "@/services/socket"
import { resetChatSocketListeners } from "./chatStore"
import toast from "react-hot-toast"

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginForm) => Promise<boolean>
  register: (data: RegisterForm) => Promise<boolean>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  verifyToken: () => Promise<boolean>
  updateUser: (userData: Partial<User>) => void
  setLoading: (loading: boolean) => void
  clearError: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginForm) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiService.login(credentials)

          if (response.success && response.data) {
            const { token, user } = response.data

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })

            // Устанавливаем токен в apiService
            apiService.setToken(token)

            // Подключаемся к Socket.IO после успешной авторизации
            try {
              await socketService.connect()
            } catch (socketError) {
              console.warn("Не удалось подключиться к Socket:", socketError)
              // Не блокируем вход из-за ошибки сокета
            }

            toast.success(response.data.message || "Вход выполнен успешно")
            return true
          } else {
            set({
              isLoading: false,
              error: response.error || "Ошибка входа",
            })
            toast.error(response.error || "Ошибка входа")
            return false
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            error.message ||
            "Произошла ошибка при входе"
          set({
            isLoading: false,
            error: errorMessage,
          })
          toast.error(errorMessage)
          return false
        }
      },

      register: async (data: RegisterForm) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiService.register(data)

          if (response.success && response.data) {
            const { token, user } = response.data

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })

            // Устанавливаем токен в apiService
            apiService.setToken(token)

            // Подключаемся к Socket.IO
            try {
              await socketService.connect()
            } catch (socketError) {
              console.warn("Не удалось подключиться к Socket:", socketError)
            }

            toast.success(response.data.message || "Регистрация прошла успешно")
            return true
          } else {
            set({
              isLoading: false,
              error: response.error || "Ошибка регистрации",
            })
            toast.error(response.error || "Ошибка регистрации")
            return false
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            error.message ||
            "Произошла ошибка при регистрации"
          set({
            isLoading: false,
            error: errorMessage,
          })
          toast.error(errorMessage)
          return false
        }
      },

      logout: async () => {
        set({ isLoading: true })

        try {
          await apiService.logout()
        } catch (error) {
          console.warn("Ошибка при выходе с сервера:", error)
        } finally {
          // Отключаемся от Socket.IO
          socketService.disconnect()

          // Сбрасываем chat listeners
          resetChatSocketListeners()

          // Очищаем токен в apiService
          apiService.clearToken()

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })

          toast.success("Вы успешно вышли из системы")
        }
      },

      refreshToken: async () => {
        try {
          const response = await apiService.refreshToken()

          if (response.data.token) {
            set({
              token: response.data.token,
              error: null,
            })
            return true
          }
          return false
        } catch (error) {
          console.error("Ошибка обновления токена:", error)
          // При ошибке обновления токена выполняем logout
          await get().logout()
          return false
        }
      },

      verifyToken: async () => {
        const token = get().token
        if (!token) {
          return false
        }

        // Убеждаемся что токен установлен в apiService
        apiService.setToken(token)

        set({ isLoading: true })

        try {
          const response = await apiService.verifyToken()

          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            })

            // Подключаемся к Socket.IO если еще не подключены
            if (!socketService.isConnected()) {
              try {
                await socketService.connect()
              } catch (socketError) {
                console.warn("Не удалось подключиться к Socket:", socketError)
              }
            }

            return true
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            })
            return false
          }
        } catch (error: any) {
          console.error("Ошибка верификации токена:", error)
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
          return false
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
