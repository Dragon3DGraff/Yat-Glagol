import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "react-hot-toast"
import { CustomThemeProvider } from "./contexts/ThemeContext"
import App from "./App"

// Настройка React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 минут
      gcTime: 10 * 60 * 1000, // 10 минут
    },
  },
})

// Service Worker регистрируется автоматически через VitePWA plugin

// Обработка установки PWA
let deferredPrompt: any = null
window.addEventListener("beforeinstallprompt", (e) => {
  // Предотвращаем стандартный баннер установки
  e.preventDefault()
  // Сохраняем событие для использования позже
  deferredPrompt = e

  // Можно показать пользовательскую кнопку установки
  console.log("PWA готово к установке", deferredPrompt)
})

// Обработка успешной установки PWA
window.addEventListener("appinstalled", () => {
  console.log("PWA установлено")
  deferredPrompt = null
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CustomThemeProvider>
        <BrowserRouter>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                iconTheme: {
                  primary: "#4caf50",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#f44336",
                  secondary: "#fff",
                },
              },
            }}
          />
        </BrowserRouter>
      </CustomThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
