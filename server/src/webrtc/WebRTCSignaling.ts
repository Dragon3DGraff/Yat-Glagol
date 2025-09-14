import { Server, Socket } from "socket.io"
import { SequelizeAdapter } from "../database/SequelizeAdapter"

interface AuthenticatedSocket extends Socket {
  userId: number
  user?: any
}

// Server-side minimal WebRTC type aliases (avoid DOM lib types)
type RTCSessionDescriptionInitLike = {
  type: "offer" | "answer" | "pranswer"
  sdp?: string
}

type RTCIceCandidateInitLike = {
  candidate?: string
  sdpMid?: string | null
  sdpMLineIndex?: number | null
  usernameFragment?: string | null
}

interface CallParticipant {
  userId: number
  socketId: string
  peerId?: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
}

interface ActiveCall {
  id: number
  roomId: number
  createdBy: number
  participants: Map<number, CallParticipant>
  type: "audio" | "video" | "screen"
  startedAt: Date
}

export class WebRTCSignaling {
  private io: Server
  private db: SequelizeAdapter
  private activeCalls: Map<number, ActiveCall> = new Map() // roomId -> ActiveCall
  private userCalls: Map<number, number> = new Map() // userId -> roomId

  constructor(io: Server, db: SequelizeAdapter) {
    this.io = io
    this.db = db
  }

  handleConnection(socket: AuthenticatedSocket): void {
    this.setupCallHandlers(socket)
    this.setupWebRTCHandlers(socket)
    this.setupScreenShareHandlers(socket)
  }

  handleDisconnection(socket: AuthenticatedSocket): void {
    this.handleUserLeftCall(socket.userId, socket.id)
  }

  private setupCallHandlers(socket: AuthenticatedSocket): void {
    // Начать звонок
    socket.on(
      "start_call",
      async (data: { roomId: number; type: "audio" | "video" | "screen" }) => {
        try {
          const { roomId, type } = data

          // Проверяем, является ли пользователь участником комнаты
          const roomParticipants = await this.db.getRoomParticipants(roomId)
          const isParticipant = roomParticipants.some(
            (p) => p.id === socket.userId
          )

          if (!isParticipant) {
            socket.emit("call_error", {
              message: "Вы не являетесь участником этой комнаты",
            })
            return
          }

          // Проверяем, нет ли уже активного звонка в комнате
          if (this.activeCalls.has(roomId)) {
            socket.emit("call_error", { message: "В комнате уже идет звонок" })
            return
          }

          // Создаем новый звонок
          const call: ActiveCall = {
            id: Date.now(),
            roomId,
            createdBy: socket.userId,
            participants: new Map(),
            type,
            startedAt: new Date(),
          }

          // Добавляем создателя звонка
          call.participants.set(socket.userId, {
            userId: socket.userId,
            socketId: socket.id,
            isVideoEnabled: type !== "audio",
            isAudioEnabled: true,
            isScreenSharing: type === "screen",
          })

          this.activeCalls.set(roomId, call)
          this.userCalls.set(socket.userId, roomId)

          // Присоединяем к комнате звонка
          socket.join(`call_${roomId}`)

          // Уведомляем всех участников комнаты о начале звонка
          this.io.to(`room_${roomId}`).emit("call_started", {
            callId: call.id,
            roomId,
            createdBy: socket.userId,
            type,
            startedAt: call.startedAt,
          })

          socket.emit("call_created", {
            callId: call.id,
            roomId,
            type,
          })

          console.log(
            `Звонок начат в комнате ${roomId} пользователем ${socket.userId}`
          )
        } catch (error) {
          console.error("Ошибка начала звонка:", error)
          socket.emit("call_error", { message: "Ошибка начала звонка" })
        }
      }
    )

    // Присоединиться к звонку
    socket.on("join_call", async (data: { roomId: number }) => {
      try {
        const { roomId } = data
        const call = this.activeCalls.get(roomId)

        if (!call) {
          socket.emit("call_error", { message: "Звонок не найден" })
          return
        }

        // Проверяем доступ к комнате
        const roomParticipants = await this.db.getRoomParticipants(roomId)
        const isParticipant = roomParticipants.some(
          (p) => p.id === socket.userId
        )

        if (!isParticipant) {
          socket.emit("call_error", { message: "Нет доступа к этой комнате" })
          return
        }

        // Добавляем участника к звонку
        call.participants.set(socket.userId, {
          userId: socket.userId,
          socketId: socket.id,
          isVideoEnabled: call.type !== "audio",
          isAudioEnabled: true,
          isScreenSharing: false,
        })

        this.userCalls.set(socket.userId, roomId)
        socket.join(`call_${roomId}`)

        // Уведомляем других участников
        socket.to(`call_${roomId}`).emit("user_joined_call", {
          userId: socket.userId,
          isVideoEnabled: call.type !== "audio",
          isAudioEnabled: true,
        })

        // Отправляем список участников новому пользователю
        const participants = Array.from(call.participants.values())
        socket.emit("call_participants", {
          callId: call.id,
          participants: participants.map((p) => ({
            userId: p.userId,
            isVideoEnabled: p.isVideoEnabled,
            isAudioEnabled: p.isAudioEnabled,
            isScreenSharing: p.isScreenSharing,
          })),
        })

        console.log(
          `Пользователь ${socket.userId} присоединился к звонку в комнате ${roomId}`
        )
      } catch (error) {
        console.error("Ошибка присоединения к звонку:", error)
        socket.emit("call_error", { message: "Ошибка присоединения к звонку" })
      }
    })

    // Покинуть звонок
    socket.on("leave_call", () => {
      this.handleUserLeftCall(socket.userId, socket.id)
    })

    // Завершить звонок (только для создателя)
    socket.on("end_call", (data: { roomId: number }) => {
      const { roomId } = data
      const call = this.activeCalls.get(roomId)

      if (!call) {
        socket.emit("call_error", { message: "Звонок не найден" })
        return
      }

      if (call.createdBy !== socket.userId) {
        socket.emit("call_error", {
          message: "Только создатель может завершить звонок",
        })
        return
      }

      this.endCall(roomId)
    })
  }

  private setupWebRTCHandlers(socket: AuthenticatedSocket): void {
    // WebRTC сигналинг
    socket.on(
      "webrtc_offer",
      (data: {
        roomId: number
        targetUserId: number
        offer: RTCSessionDescriptionInitLike
      }) => {
        const { roomId, targetUserId, offer } = data
        const call = this.activeCalls.get(roomId)

        if (
          !call ||
          !call.participants.has(socket.userId) ||
          !call.participants.has(targetUserId)
        ) {
          socket.emit("call_error", { message: "Недопустимый WebRTC offer" })
          return
        }

        const targetParticipant = call.participants.get(targetUserId)
        if (targetParticipant) {
          this.io.to(targetParticipant.socketId).emit("webrtc_offer", {
            fromUserId: socket.userId,
            offer,
          })
        }
      }
    )

    socket.on(
      "webrtc_answer",
      (data: {
        roomId: number
        targetUserId: number
        answer: RTCSessionDescriptionInitLike
      }) => {
        const { roomId, targetUserId, answer } = data
        const call = this.activeCalls.get(roomId)

        if (
          !call ||
          !call.participants.has(socket.userId) ||
          !call.participants.has(targetUserId)
        ) {
          socket.emit("call_error", { message: "Недопустимый WebRTC answer" })
          return
        }

        const targetParticipant = call.participants.get(targetUserId)
        if (targetParticipant) {
          this.io.to(targetParticipant.socketId).emit("webrtc_answer", {
            fromUserId: socket.userId,
            answer,
          })
        }
      }
    )

    socket.on(
      "webrtc_ice_candidate",
      (data: {
        roomId: number
        targetUserId: number
        candidate: RTCIceCandidateInitLike
      }) => {
        const { roomId, targetUserId, candidate } = data
        const call = this.activeCalls.get(roomId)

        if (
          !call ||
          !call.participants.has(socket.userId) ||
          !call.participants.has(targetUserId)
        ) {
          return
        }

        const targetParticipant = call.participants.get(targetUserId)
        if (targetParticipant) {
          this.io.to(targetParticipant.socketId).emit("webrtc_ice_candidate", {
            fromUserId: socket.userId,
            candidate,
          })
        }
      }
    )

    // Управление медиа
    socket.on("toggle_video", (data: { roomId: number; enabled: boolean }) => {
      const { roomId, enabled } = data
      const call = this.activeCalls.get(roomId)

      if (call && call.participants.has(socket.userId)) {
        const participant = call.participants.get(socket.userId)!
        participant.isVideoEnabled = enabled

        socket.to(`call_${roomId}`).emit("user_video_toggled", {
          userId: socket.userId,
          enabled,
        })
      }
    })

    socket.on("toggle_audio", (data: { roomId: number; enabled: boolean }) => {
      const { roomId, enabled } = data
      const call = this.activeCalls.get(roomId)

      if (call && call.participants.has(socket.userId)) {
        const participant = call.participants.get(socket.userId)!
        participant.isAudioEnabled = enabled

        socket.to(`call_${roomId}`).emit("user_audio_toggled", {
          userId: socket.userId,
          enabled,
        })
      }
    })
  }

  private setupScreenShareHandlers(socket: AuthenticatedSocket): void {
    // Начать демонстрацию экрана
    socket.on("start_screen_share", (data: { roomId: number }) => {
      const { roomId } = data
      const call = this.activeCalls.get(roomId)

      if (!call || !call.participants.has(socket.userId)) {
        socket.emit("call_error", { message: "Нет активного звонка" })
        return
      }

      // Проверяем, не демонстрирует ли уже кто-то экран
      const isAnyoneSharing = Array.from(call.participants.values()).some(
        (p) => p.isScreenSharing
      )

      if (isAnyoneSharing) {
        socket.emit("call_error", { message: "Кто-то уже демонстрирует экран" })
        return
      }

      const participant = call.participants.get(socket.userId)!
      participant.isScreenSharing = true

      socket.to(`call_${roomId}`).emit("screen_share_started", {
        userId: socket.userId,
      })

      socket.emit("screen_share_started_self")

      console.log(
        `Пользователь ${socket.userId} начал демонстрацию экрана в комнате ${roomId}`
      )
    })

    // Прекратить демонстрацию экрана
    socket.on("stop_screen_share", (data: { roomId: number }) => {
      const { roomId } = data
      const call = this.activeCalls.get(roomId)

      if (call && call.participants.has(socket.userId)) {
        const participant = call.participants.get(socket.userId)!
        participant.isScreenSharing = false

        socket.to(`call_${roomId}`).emit("screen_share_stopped", {
          userId: socket.userId,
        })

        socket.emit("screen_share_stopped_self")

        console.log(
          `Пользователь ${socket.userId} прекратил демонстрацию экрана в комнате ${roomId}`
        )
      }
    })
  }

  private handleUserLeftCall(userId: number, socketId: string): void {
    const roomId = this.userCalls.get(userId)
    if (!roomId) return

    const call = this.activeCalls.get(roomId)
    if (!call) return

    // Удаляем участника из звонка
    call.participants.delete(userId)
    this.userCalls.delete(userId)

    // Уведомляем других участников
    this.io.to(`call_${roomId}`).emit("user_left_call", {
      userId,
    })

    // Если участников не осталось или звонок создал покинувший пользователь
    if (call.participants.size === 0 || call.createdBy === userId) {
      this.endCall(roomId)
    }

    console.log(`Пользователь ${userId} покинул звонок в комнате ${roomId}`)
  }

  private endCall(roomId: number): void {
    const call = this.activeCalls.get(roomId)
    if (!call) return

    // Уведомляем всех участников о завершении звонка
    this.io.to(`call_${roomId}`).emit("call_ended", {
      callId: call.id,
      roomId,
      endedAt: new Date(),
      duration: Date.now() - call.startedAt.getTime(),
    })

    // Удаляем всех участников из маппинга
    for (const participantId of call.participants.keys()) {
      this.userCalls.delete(participantId)
    }

    // Удаляем звонок
    this.activeCalls.delete(roomId)

    console.log(`Звонок завершен в комнате ${roomId}`)
  }

  // Вспомогательные методы
  getActiveCall(roomId: number): ActiveCall | undefined {
    return this.activeCalls.get(roomId)
  }

  getUserCall(userId: number): number | undefined {
    return this.userCalls.get(userId)
  }

  isUserInCall(userId: number): boolean {
    return this.userCalls.has(userId)
  }

  getCallParticipants(roomId: number): CallParticipant[] {
    const call = this.activeCalls.get(roomId)
    return call ? Array.from(call.participants.values()) : []
  }
}
