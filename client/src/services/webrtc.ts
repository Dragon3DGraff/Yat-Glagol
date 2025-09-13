import { socketService } from "./socket"
import toast from "react-hot-toast"

interface PeerConnection {
  connection: RTCPeerConnection
  userId: number
  isInitiator: boolean
}

class WebRTCService {
  private peerConnections: Map<number, PeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private currentRoomId: number | null = null
  private isScreenSharing = false
  private isCallActive = false

  // ICE серверы для STUN/TURN
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // Добавьте свой TURN сервер для production
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ]

  // События для подписки компонентов
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map()

  constructor() {
    this.setupSocketListeners()
  }

  private setupSocketListeners(): void {
    // WebRTC сигналинг
    socketService.onWebRTCOffer(async (data) => {
      await this.handleOffer(data.fromUserId, data.offer)
    })

    socketService.onWebRTCAnswer(async (data) => {
      await this.handleAnswer(data.fromUserId, data.answer)
    })

    socketService.onWebRTCIceCandidate((data) => {
      this.handleIceCandidate(data.fromUserId, data.candidate)
    })

    // Управление медиа
    socketService.onVideoToggled((data) => {
      this.emit("videoToggled", data)
    })

    socketService.onAudioToggled((data) => {
      this.emit("audioToggled", data)
    })

    // Демонстрация экрана
    socketService.onScreenShareStarted((data) => {
      this.emit("screenShareStarted", data)
    })

    socketService.onScreenShareStopped((data) => {
      this.emit("screenShareStopped", data)
    })

    // Управление участниками
    socketService.onUserJoinedCall(async (data) => {
      await this.handleUserJoinedCall(
        data.userId,
        data.isVideoEnabled,
        data.isAudioEnabled
      )
    })

    socketService.onUserLeftCall((data) => {
      this.handleUserLeftCall(data.userId)
    })

    socketService.onCallEnded(() => {
      this.endCall()
    })
  }

  // Управление событиями
  public on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  public off(event: string, callback: (data: any) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }

  // Получение медиа потоков
  public async getUserMedia(
    video: boolean = true,
    audio: boolean = true
  ): Promise<MediaStream> {
    try {
      const constraints: MediaStreamConstraints = {
        video: video
          ? {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 30, max: 60 },
            }
          : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.localStream = stream
      console.log(
        "🎥 Локальный поток получен, эмиттим событие localStreamReceived",
        {
          streamId: stream.id,
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length,
          listeners:
            this.eventListeners.get("localStreamReceived")?.length || 0,
        }
      )
      this.emit("localStreamReceived", { stream, type: "camera" })

      return stream
    } catch (error) {
      console.error("Ошибка получения медиа потока:", error)
      toast.error("Не удалось получить доступ к камере/микрофону")
      throw error
    }
  }

  public async getDisplayMedia(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: true,
      })

      this.screenStream = stream
      this.isScreenSharing = true
      console.log(
        "🖥️ Поток экрана получен, эмиттим событие localStreamReceived"
      )
      this.emit("localStreamReceived", { stream, type: "screen" })

      // Обработка завершения демонстрации экрана
      stream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare()
      }

      return stream
    } catch (error) {
      console.error("Ошибка получения потока экрана:", error)
      toast.error("Не удалось получить доступ к экрану")
      throw error
    }
  }

  // Начало звонка
  public async startCall(
    roomId: number,
    type: "audio" | "video" | "screen"
  ): Promise<void> {
    console.log("📞 WebRTC: Начинаем звонок", {
      roomId,
      type,
      isCallActive: this.isCallActive,
    })

    // Проверяем, не идет ли уже звонок
    if (this.isCallActive && this.currentRoomId === roomId) {
      console.log("⚠️ Звонок уже активен в этой комнате, пропускаем", {
        currentRoomId: this.currentRoomId,
        requestedRoomId: roomId,
      })

      // Если поток уже есть, эмиттим его снова для новых подписчиков
      if (this.localStream) {
        console.log("📡 Повторно эмиттим локальный поток для новых слушателей")
        this.emit("localStreamReceived", {
          stream: this.localStream,
          type: "camera",
        })
      }
      return
    }

    // Завершаем предыдущий звонок если есть
    if (this.isCallActive && this.currentRoomId !== roomId) {
      console.log("🔚 Завершаем предыдущий звонок в другой комнате", {
        oldRoomId: this.currentRoomId,
        newRoomId: roomId,
      })
      this.endCall()
    }

    this.currentRoomId = roomId
    this.isCallActive = true

    try {
      if (type === "screen") {
        console.log("🖥️ Получаем поток экрана")
        await this.getDisplayMedia()
        socketService.startScreenShare(roomId)
      } else {
        console.log("🎥 Получаем пользовательский медиа поток", {
          video: type === "video",
          audio: true,
        })
        await this.getUserMedia(type === "video", true)
      }

      console.log("✅ Звонок инициализирован")
      socketService.startCall(roomId, type)
      this.emit("callStarted", { roomId, type })
    } catch (error) {
      console.error("❌ Ошибка начала звонка:", error)
      this.isCallActive = false
      throw error
    }
  }

  // Присоединение к звонку
  public async joinCall(
    roomId: number,
    video: boolean = true,
    audio: boolean = true
  ): Promise<void> {
    this.currentRoomId = roomId

    try {
      await this.getUserMedia(video, audio)
      socketService.joinCall(roomId)
    } catch (error) {
      console.error("Ошибка присоединения к звонку:", error)
      throw error
    }
  }

  // Обработка присоединения нового пользователя
  private async handleUserJoinedCall(
    userId: number,
    isVideoEnabled: boolean,
    isAudioEnabled: boolean
  ): Promise<void> {
    if (this.peerConnections.has(userId)) {
      return // Уже подключен
    }

    try {
      const peerConnection = this.createPeerConnection(userId, true)

      // Добавляем локальный поток
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          peerConnection.connection.addTrack(track, this.localStream!)
        })
      }

      if (this.screenStream) {
        this.screenStream.getTracks().forEach((track) => {
          peerConnection.connection.addTrack(track, this.screenStream!)
        })
      }

      // Создаем и отправляем offer
      const offer = await peerConnection.connection.createOffer()
      await peerConnection.connection.setLocalDescription(offer)

      socketService.sendWebRTCOffer(this.currentRoomId!, userId, offer)

      this.emit("userJoined", { userId, isVideoEnabled, isAudioEnabled })
    } catch (error) {
      console.error("Ошибка при обработке присоединения пользователя:", error)
    }
  }

  // Обработка offer
  private async handleOffer(
    fromUserId: number,
    offer: RTCSessionDescriptionInit
  ): Promise<void> {
    try {
      const peerConnection = this.createPeerConnection(fromUserId, false)

      await peerConnection.connection.setRemoteDescription(offer)

      // Добавляем локальный поток
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          peerConnection.connection.addTrack(track, this.localStream!)
        })
      }

      if (this.screenStream) {
        this.screenStream.getTracks().forEach((track) => {
          peerConnection.connection.addTrack(track, this.screenStream!)
        })
      }

      // Создаем и отправляем answer
      const answer = await peerConnection.connection.createAnswer()
      await peerConnection.connection.setLocalDescription(answer)

      socketService.sendWebRTCAnswer(this.currentRoomId!, fromUserId, answer)
    } catch (error) {
      console.error("Ошибка обработки offer:", error)
    }
  }

  // Обработка answer
  private async handleAnswer(
    fromUserId: number,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const peerConnection = this.peerConnections.get(fromUserId)
    if (!peerConnection) {
      console.warn("PeerConnection не найден для пользователя:", fromUserId)
      return
    }

    try {
      await peerConnection.connection.setRemoteDescription(answer)
    } catch (error) {
      console.error("Ошибка обработки answer:", error)
    }
  }

  // Обработка ICE кандидата
  private handleIceCandidate(
    fromUserId: number,
    candidate: RTCIceCandidateInit
  ): void {
    const peerConnection = this.peerConnections.get(fromUserId)
    if (!peerConnection) {
      console.warn(
        "PeerConnection не найден для ICE кандидата от пользователя:",
        fromUserId
      )
      return
    }

    try {
      peerConnection.connection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error("Ошибка добавления ICE кандидата:", error)
    }
  }

  // Создание peer connection
  private createPeerConnection(
    userId: number,
    isInitiator: boolean
  ): PeerConnection {
    const config: RTCConfiguration = {
      iceServers: this.iceServers,
      iceCandidatePoolSize: 10,
    }

    const connection = new RTCPeerConnection(config)
    const peerConnection: PeerConnection = {
      connection,
      userId,
      isInitiator,
    }

    // Обработка ICE кандидатов
    connection.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        socketService.sendWebRTCIceCandidate(
          this.currentRoomId,
          userId,
          event.candidate
        )
      }
    }

    // Обработка входящих потоков
    connection.ontrack = (event) => {
      console.log("Получен remote stream от пользователя:", userId)
      this.emit("remoteStreamReceived", {
        userId,
        stream: event.streams[0],
        track: event.track,
      })
    }

    // Обработка изменения состояния подключения
    connection.onconnectionstatechange = () => {
      console.log(`Connection state для ${userId}:`, connection.connectionState)

      if (connection.connectionState === "failed") {
        this.handlePeerConnectionFailed(userId)
      } else if (connection.connectionState === "connected") {
        this.emit("peerConnected", { userId })
      } else if (connection.connectionState === "disconnected") {
        this.emit("peerDisconnected", { userId })
      }
    }

    // Обработка изменения состояния ICE
    connection.oniceconnectionstatechange = () => {
      console.log(
        `ICE connection state для ${userId}:`,
        connection.iceConnectionState
      )
    }

    this.peerConnections.set(userId, peerConnection)
    return peerConnection
  }

  // Обработка неудачного подключения
  private handlePeerConnectionFailed(userId: number): void {
    console.warn("Peer connection failed для пользователя:", userId)
    this.removePeerConnection(userId)
    this.emit("peerConnectionFailed", { userId })
  }

  // Обработка выхода пользователя из звонка
  private handleUserLeftCall(userId: number): void {
    this.removePeerConnection(userId)
    this.emit("userLeft", { userId })
  }

  // Удаление peer connection
  private removePeerConnection(userId: number): void {
    const peerConnection = this.peerConnections.get(userId)
    if (peerConnection) {
      peerConnection.connection.close()
      this.peerConnections.delete(userId)
    }
  }

  // Управление медиа
  public toggleVideo(): void {
    if (!this.localStream || !this.currentRoomId) return

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      socketService.toggleVideo(this.currentRoomId, videoTrack.enabled)
      this.emit("localVideoToggled", { enabled: videoTrack.enabled })
    }
  }

  public toggleAudio(): void {
    if (!this.localStream || !this.currentRoomId) return

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      socketService.toggleAudio(this.currentRoomId, audioTrack.enabled)
      this.emit("localAudioToggled", { enabled: audioTrack.enabled })
    }
  }

  // Демонстрация экрана
  public async startScreenShare(): Promise<void> {
    if (!this.currentRoomId) return

    try {
      const screenStream = await this.getDisplayMedia()

      // Заменяем видео трек на экран
      const videoTrack = screenStream.getVideoTracks()[0]

      // Обновляем все peer connections
      for (const [_userId, peerConnection] of this.peerConnections) {
        const sender = peerConnection.connection
          .getSenders()
          .find((s) => s.track && s.track.kind === "video")

        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      }

      socketService.startScreenShare(this.currentRoomId)
    } catch (error) {
      console.error("Ошибка начала демонстрации экрана:", error)
    }
  }

  public async stopScreenShare(): Promise<void> {
    if (!this.currentRoomId || !this.isScreenSharing) return

    try {
      // Останавливаем stream демонстрации экрана
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((track) => track.stop())
        this.screenStream = null
      }

      this.isScreenSharing = false

      // Возвращаемся к камере
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0]

        // Обновляем все peer connections
        for (const [_userId, peerConnection] of this.peerConnections) {
          const sender = peerConnection.connection
            .getSenders()
            .find((s) => s.track && s.track.kind === "video")

          if (sender && videoTrack) {
            await sender.replaceTrack(videoTrack)
          }
        }
      }

      socketService.stopScreenShare(this.currentRoomId)
      this.emit("screenShareStopped", {})
    } catch (error) {
      console.error("Ошибка остановки демонстрации экрана:", error)
    }
  }

  // Завершение звонка
  public endCall(): void {
    console.log("🔚 Завершаем звонок")

    // Закрываем все peer connections
    for (const [_userId, peerConnection] of this.peerConnections) {
      peerConnection.connection.close()
    }
    this.peerConnections.clear()

    // Останавливаем локальные потоки
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop())
      this.screenStream = null
    }

    this.isScreenSharing = false
    this.isCallActive = false
    this.currentRoomId = null

    this.emit("callEnded", {})
  }

  // Выход из звонка
  public leaveCall(): void {
    if (this.currentRoomId) {
      socketService.leaveCall()
      this.endCall()
    }
  }

  // Геттеры
  public getLocalStream(): MediaStream | null {
    return this.localStream
  }

  public getScreenStream(): MediaStream | null {
    return this.screenStream
  }

  public getPeerConnections(): Map<number, PeerConnection> {
    return this.peerConnections
  }

  public getCurrentRoomId(): number | null {
    return this.currentRoomId
  }

  public isScreenSharingActive(): boolean {
    return this.isScreenSharing
  }

  // Проверка поддержки WebRTC
  public static isWebRTCSupported(): boolean {
    return !!(
      window.RTCPeerConnection &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    )
  }

  // Проверка поддержки демонстрации экрана
  public static isScreenShareSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
  }
}

// Создаем единственный экземпляр сервиса
export const webrtcService = new WebRTCService()
export default webrtcService
