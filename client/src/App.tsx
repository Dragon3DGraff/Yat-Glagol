import { useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { Box } from "@mui/material"
import { useAuthStore } from "@/store/authStore"
import {
  setupChatSocketListeners,
  resetChatSocketListeners,
} from "@/store/chatStore"
import { socketService } from "@/services/socket"

// Страницы (будут созданы позже)
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import ChatPage from "@/pages/ChatPage"

// Компоненты
import PrivateRoute from "@/components/PrivateRoute"
import LoadingScreen from "@/components/LoadingScreen"

function App() {
  const { isAuthenticated, isLoading, verifyToken } = useAuthStore()

  useEffect(() => {
    // Проверяем токен при загрузке приложения
    const initAuth = async () => {
      try {
        await verifyToken()
      } catch (error) {
        console.error("Ошибка инициализации авторизации:", error)
      }
    }

    initAuth()
  }, [verifyToken])

  useEffect(() => {
    // Настраиваем Socket.IO слушатели для чата если пользователь авторизован
    if (isAuthenticated) {
      // Даем время на подключение socket, затем настраиваем listeners
      const setupListeners = async () => {
        // Ждем немного, чтобы socket успел подключиться
        let attempts = 0
        while (!socketService.isConnected() && attempts < 50) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          attempts++
        }

        if (socketService.isConnected()) {
          setupChatSocketListeners()
        } else {
          console.warn(
            "Socket не подключился после ожидания, повторяем попытку..."
          )
          setTimeout(setupChatSocketListeners, 1000)
        }
      }

      setupListeners()
    } else {
      // При выходе сбрасываем listeners
      resetChatSocketListeners()
    }
  }, [isAuthenticated])

  // Показываем загрузочный экран пока проверяется авторизация
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <Box sx={{ height: "100vh", overflow: "hidden" }}>
      <Routes>
        {/* Публичные маршруты */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/chat" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/chat" replace /> : <RegisterPage />
          }
        />

        {/* Приватные маршруты */}
        <Route
          path="/chat/*"
          element={
            <PrivateRoute>
              <ChatPage />
            </PrivateRoute>
          }
        />

        {/* Маршрут по умолчанию */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />
          }
        />

        {/* Обработка неизвестных маршрутов */}
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/chat" : "/login"} replace />
          }
        />
      </Routes>
    </Box>
  )
}

export default App
