import { io, Socket } from "socket.io-client"
import { SocketEvents, Message } from "@/types"
import { apiService } from "./api"

type EventCallback<T = any> = (data: T) => void

class SocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000
  private isConnecting = false

  constructor() {
    this.setupConnectionHandlers()
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve()
        return
      }

      if (this.isConnecting) {
        return
      }

      this.isConnecting = true
      const token = apiService.getToken()

      if (!token) {
        this.isConnecting = false
        reject(new Error("Токен аутентификации не найден"))
        return
      }

      // В development режиме используем текущий хост, в production - переменную окружения
      const socketUrl =
        (import.meta as any).env.VITE_SOCKET_URL ||
        ((import.meta as any).env.DEV ? window.location.origin : "")

      console.log("Подключаемся к Socket.IO:", socketUrl)

      this.socket = io(socketUrl, {
        auth: {
          token: token,
        },
        transports: [ "polling", "websocket",],
        timeout: 20000,
        forceNew: true,
        // Дополнительные настройки для стабильности
        upgrade: true,
        rememberUpgrade: true,
      })

      this.socket.on("connect", () => {
        console.log("Socket подключен:", this.socket?.id)
        this.reconnectAttempts = 0
        this.isConnecting = false
        resolve()
      })

      this.socket.on("connect_error", (error) => {
        console.error("Ошибка подключения Socket:", error)
        this.isConnecting = false

        if (
          error.message.includes("токен") ||
          error.message.includes("token") ||
          error.message.includes("unauthorized")
        ) {
          // Проблема с аутентификацией
          apiService.clearToken()
          window.location.href = "/login"
          reject(new Error("Ошибка аутентификации"))
        } else if (
          error.message.includes("websocket error") ||
          (error as any).type === "TransportError"
        ) {
          // Проблема с WebSocket соединением
          console.warn("WebSocket соединение недоступно, пробуем polling...")
          this.handleReconnect()
          reject(new Error("Ошибка WebSocket соединения"))
        } else {
          this.handleReconnect()
          reject(error)
        }
      })

      this.socket.on("disconnect", (reason) => {
        console.log("Socket отключен:", reason)

        if (reason === "io server disconnect") {
          // Сервер принудительно отключил соединение
          this.handleReconnect()
        }
      })

      this.setupDefaultEventHandlers()
    })
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.isConnecting = false
    this.reconnectAttempts = 0
  }

  public isConnected(): boolean {
    return this.socket?.connected || false
  }

  public isSocketConnecting(): boolean {
    return this.isConnecting
  }

  private setupConnectionHandlers(): void {
    // Обработка переподключения
    window.addEventListener("online", () => {
      if (!this.isConnected()) {
        console.log("Интернет восстановлен, переподключаемся...")
        this.connect().catch(console.error)
      }
    })

    window.addEventListener("beforeunload", () => {
      this.disconnect()
    })
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay =
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)

      console.log(
        `Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${delay}ms`
      )

      setTimeout(() => {
        this.connect().catch(console.error)
      }, delay)
    } else {
      console.error(
        "Максимальное количество попыток переподключения достигнуто"
      )
    }
  }

  private setupDefaultEventHandlers(): void {
    if (!this.socket) return

    // Обработка ошибок
    this.socket.on("error", (data: { message: string }) => {
      console.error("Socket ошибка:", data.message)
    })

    this.socket.on("call_error", (data: { message: string }) => {
      console.error("Ошибка звонка:", data.message)
    })
  }

  // Методы для работы с событиями
  public on<T = any>(
    event: keyof SocketEvents | string,
    callback: EventCallback<T>
  ): void {
    if (this.socket) {
      this.socket.on(event as string, callback)
    }
  }

  public off<T = any>(
    event: keyof SocketEvents | string,
    callback?: EventCallback<T>
  ): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event as string, callback)
      } else {
        this.socket.off(event as string)
      }
    }
  }

  public emit<T = any>(event: keyof SocketEvents | string, data?: T): void {
    if (this.socket?.connected) {
      this.socket.emit(event as string, data)
    } else {
      console.warn("Socket не подключен, событие не отправлено:", event)
    }
  }

  // Методы для работы с сообщениями
  public sendMessage(
    roomId: number,
    content: string,
    messageType = "text",
    replyTo?: number
  ): void {
    this.emit("send_message", {
      roomId,
      content,
      messageType,
      replyTo,
    })
  }

  public editMessage(messageId: number, newContent: string): void {
    this.emit("edit_message", {
      messageId,
      newContent,
    })
  }

  public deleteMessage(messageId: number): void {
    this.emit("delete_message", {
      messageId,
    })
  }

  public searchMessages(roomId: number, query: string, limit = 20): void {
    this.emit("search_messages", {
      roomId,
      query,
      limit,
    })
  }

  // Методы для работы с комнатами
  public joinRoom(roomId: number): void {
    this.emit("join_room", { roomId })
  }

  public leaveRoom(roomId: number): void {
    this.emit("leave_room", { roomId })
  }

  public loadMessages(roomId: number, offset = 0, limit = 50): void {
    this.emit("load_messages", {
      roomId,
      offset,
      limit,
    })
  }

  // Методы для работы с печатанием
  public startTyping(roomId: number): void {
    this.emit("typing_start", { roomId })
  }

  public stopTyping(roomId: number): void {
    this.emit("typing_stop", { roomId })
  }

  // Методы для работы со звонками
  public startCall(roomId: number, type: "audio" | "video" | "screen"): void {
    this.emit("start_call", {
      roomId,
      type,
    })
  }

  public joinCall(roomId: number): void {
    this.emit("join_call", { roomId })
  }

  public leaveCall(): void {
    this.emit("leave_call")
  }

  public endCall(roomId: number): void {
    this.emit("end_call", { roomId })
  }

  // WebRTC сигналинг
  public sendWebRTCOffer(
    roomId: number,
    targetUserId: number,
    offer: RTCSessionDescriptionInit
  ): void {
    this.emit("webrtc_offer", {
      roomId,
      targetUserId,
      offer,
    })
  }

  public sendWebRTCAnswer(
    roomId: number,
    targetUserId: number,
    answer: RTCSessionDescriptionInit
  ): void {
    this.emit("webrtc_answer", {
      roomId,
      targetUserId,
      answer,
    })
  }

  public sendWebRTCIceCandidate(
    roomId: number,
    targetUserId: number,
    candidate: RTCIceCandidateInit
  ): void {
    this.emit("webrtc_ice_candidate", {
      roomId,
      targetUserId,
      candidate,
    })
  }

  // Управление медиа
  public toggleVideo(roomId: number, enabled: boolean): void {
    this.emit("toggle_video", {
      roomId,
      enabled,
    })
  }

  public toggleAudio(roomId: number, enabled: boolean): void {
    this.emit("toggle_audio", {
      roomId,
      enabled,
    })
  }

  // Демонстрация экрана
  public startScreenShare(roomId: number): void {
    this.emit("start_screen_share", { roomId })
  }

  public stopScreenShare(roomId: number): void {
    this.emit("stop_screen_share", { roomId })
  }

  // Утилиты для удобной работы с событиями
  public onMessage(callback: EventCallback<Message>): void {
    this.on("new_message", callback)
  }

  public onUserJoined(
    callback: EventCallback<{ userId: number; roomId: number; timestamp: Date }>
  ): void {
    this.on("user_joined_room", callback)
  }

  public onUserLeft(
    callback: EventCallback<{ userId: number; roomId: number; timestamp: Date }>
  ): void {
    this.on("user_left_room", callback)
  }

  public onUserTyping(
    callback: EventCallback<{
      userId: number
      roomId: number
      isTyping: boolean
    }>
  ): void {
    this.on("user_typing", callback)
  }

  public onUserStatusChanged(
    callback: EventCallback<{
      userId: number
      status: "online" | "offline" | "away"
      timestamp: Date
    }>
  ): void {
    this.on("user_status_changed", callback)
  }

  public onCallStarted(
    callback: EventCallback<{
      callId: number
      roomId: number
      createdBy: number
      type: "audio" | "video" | "screen"
      startedAt: Date
    }>
  ): void {
    this.on("call_started", callback)
  }

  public onCallEnded(
    callback: EventCallback<{
      callId: number
      roomId: number
      endedAt: Date
      duration: number
    }>
  ): void {
    this.on("call_ended", callback)
  }

  public onUserJoinedCall(
    callback: EventCallback<{
      userId: number
      isVideoEnabled: boolean
      isAudioEnabled: boolean
    }>
  ): void {
    this.on("user_joined_call", callback)
  }

  public onUserLeftCall(callback: EventCallback<{ userId: number }>): void {
    this.on("user_left_call", callback)
  }

  // WebRTC события
  public onWebRTCOffer(
    callback: EventCallback<{
      fromUserId: number
      offer: RTCSessionDescriptionInit
    }>
  ): void {
    this.on("webrtc_offer", callback)
  }

  public onWebRTCAnswer(
    callback: EventCallback<{
      fromUserId: number
      answer: RTCSessionDescriptionInit
    }>
  ): void {
    this.on("webrtc_answer", callback)
  }

  public onWebRTCIceCandidate(
    callback: EventCallback<{
      fromUserId: number
      candidate: RTCIceCandidateInit
    }>
  ): void {
    this.on("webrtc_ice_candidate", callback)
  }

  public onVideoToggled(
    callback: EventCallback<{ userId: number; enabled: boolean }>
  ): void {
    this.on("user_video_toggled", callback)
  }

  public onAudioToggled(
    callback: EventCallback<{ userId: number; enabled: boolean }>
  ): void {
    this.on("user_audio_toggled", callback)
  }

  public onScreenShareStarted(
    callback: EventCallback<{ userId: number }>
  ): void {
    this.on("screen_share_started", callback)
  }

  public onScreenShareStopped(
    callback: EventCallback<{ userId: number }>
  ): void {
    this.on("screen_share_stopped", callback)
  }
}

// Создаем единственный экземпляр сервиса
export const socketService = new SocketService()
export default socketService
