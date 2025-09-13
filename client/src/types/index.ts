// Пользователь
export interface User {
  id: number
  username: string
  email: string
  avatar_url?: string
  status: "online" | "offline" | "away"
  last_seen: Date | string
  created_at: Date | string
}

// Комната/чат
export interface ChatRoom {
  id: number
  name: string
  description?: string
  type: "private" | "group" | "public"
  created_by: number
  created_at: Date | string
  updated_at: Date | string
  participants?: User[]
  participantCount?: number
  lastMessage?: Message
}

// Сообщение
export interface Message {
  id: number
  room_id: number
  user_id: number
  content: string
  message_type: "text" | "image" | "file" | "system"
  reply_to?: number
  created_at: Date | string
  edited_at?: Date | string
  user?: User
}

// Участник комнаты
export interface RoomParticipant {
  id: number
  room_id: number
  user_id: number
  role: "admin" | "moderator" | "member"
  joined_at: Date | string
  user?: User
}

// Звонок
export interface Call {
  id: number
  roomId: number
  createdBy: number
  type: "audio" | "video" | "screen"
  startedAt: Date | string
  participants: CallParticipant[]
}

// Участник звонка
export interface CallParticipant {
  userId: number
  socketId: string
  peerId?: string
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  user?: User
}

// Вложение файла
export interface FileAttachment {
  id: number
  message_id: number
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: Date | string
}

// Состояние аутентификации
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Друг
export interface Friend {
  id: number
  userId: number
  friendId: number
  status: "accepted" | "pending" | "blocked"
  createdAt: Date | string
  roomId?: number
  user?: User
  friend?: User
}

// Запрос на дружбу
export interface FriendRequest {
  id: number
  fromUserId: number
  toUserId: number
  status: "pending" | "accepted" | "declined" | "cancelled"
  message?: string
  createdAt: Date | string
  fromUser?: User
  toUser?: User
}

// Статус дружбы
export type FriendshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "friends"
  | "blocked"

// Состояние друзей
export interface FriendsState {
  friends: Friend[]
  friendRequests: FriendRequest[]
  sentRequests: FriendRequest[]
  isLoading: boolean
  error: string | null
}

// Состояние чата
export interface ChatState {
  rooms: ChatRoom[]
  activeRoom: ChatRoom | null
  messages: Record<number, Message[]> // roomId -> messages
  isLoading: boolean
  error: string | null
  typingUsers: Record<number, number[]> // roomId -> userIds
}

// Состояние звонка
export interface CallState {
  activeCall: Call | null
  localStream: MediaStream | null
  remoteStreams: Record<number, MediaStream> // userId -> stream
  isCallActive: boolean
  isVideoEnabled: boolean
  isAudioEnabled: boolean
  isScreenSharing: boolean
  callError: string | null
}

// WebRTC события
export interface WebRTCOffer {
  fromUserId: number
  offer: RTCSessionDescriptionInit
}

export interface WebRTCAnswer {
  fromUserId: number
  answer: RTCSessionDescriptionInit
}

export interface WebRTCIceCandidate {
  fromUserId: number
  candidate: RTCIceCandidateInit
}

// Socket события
export interface SocketEvents {
  // Подключение
  connect: () => void
  disconnect: () => void

  // Сообщения
  send_message: (data: {
    roomId: number
    content: string
    messageType?: "text" | "image" | "file"
    replyTo?: number
  }) => void
  new_message: (message: Message) => void
  edit_message: (data: { messageId: number; newContent: string }) => void
  message_edited: (data: {
    messageId: number
    newContent: string
    editedAt: Date
  }) => void
  delete_message: (data: { messageId: number }) => void
  message_deleted: (data: { messageId: number; deletedAt: Date }) => void

  // Комнаты
  join_room: (data: { roomId: number }) => void
  joined_room: (data: {
    roomId: number
    messages: Message[]
    participants: User[]
  }) => void
  leave_room: (data: { roomId: number }) => void
  left_room: (data: { roomId: number }) => void
  user_joined_room: (data: {
    userId: number
    roomId: number
    timestamp: Date
  }) => void
  user_left_room: (data: {
    userId: number
    roomId: number
    timestamp: Date
  }) => void

  // Печатание
  typing_start: (data: { roomId: number }) => void
  typing_stop: (data: { roomId: number }) => void
  user_typing: (data: {
    userId: number
    roomId: number
    isTyping: boolean
  }) => void

  // Статус пользователей
  user_status_changed: (data: {
    userId: number
    status: "online" | "offline" | "away"
    timestamp: Date
  }) => void

  // Звонки
  start_call: (data: {
    roomId: number
    type: "audio" | "video" | "screen"
  }) => void
  call_started: (data: {
    callId: number
    roomId: number
    createdBy: number
    type: "audio" | "video" | "screen"
    startedAt: Date
  }) => void
  join_call: (data: { roomId: number }) => void
  user_joined_call: (data: {
    userId: number
    isVideoEnabled: boolean
    isAudioEnabled: boolean
  }) => void
  leave_call: () => void
  user_left_call: (data: { userId: number }) => void
  call_ended: (data: {
    callId: number
    roomId: number
    endedAt: Date
    duration: number
  }) => void

  // WebRTC
  webrtc_offer: (data: {
    roomId: number
    targetUserId: number
    offer: RTCSessionDescriptionInit
  }) => void
  webrtc_answer: (data: {
    roomId: number
    targetUserId: number
    answer: RTCSessionDescriptionInit
  }) => void
  webrtc_ice_candidate: (data: {
    roomId: number
    targetUserId: number
    candidate: RTCIceCandidateInit
  }) => void

  // Медиа управление
  toggle_video: (data: { roomId: number; enabled: boolean }) => void
  user_video_toggled: (data: { userId: number; enabled: boolean }) => void
  toggle_audio: (data: { roomId: number; enabled: boolean }) => void
  user_audio_toggled: (data: { userId: number; enabled: boolean }) => void

  // Демонстрация экрана
  start_screen_share: (data: { roomId: number }) => void
  screen_share_started: (data: { userId: number }) => void
  stop_screen_share: (data: { roomId: number }) => void
  screen_share_stopped: (data: { userId: number }) => void

  // Друзья
  send_friend_request: (data: { toUserId: number; message?: string }) => void
  friend_request_sent: (data: FriendRequest) => void
  friend_request_received: (data: FriendRequest) => void
  accept_friend_request: (data: { requestId: number }) => void
  decline_friend_request: (data: { requestId: number }) => void
  friend_request_accepted: (data: {
    requestId: number
    friendship: Friend
    newRoomId?: number
  }) => void
  friend_request_declined: (data: { requestId: number }) => void
  remove_friend: (data: { friendId: number }) => void
  friend_removed: (data: { friendId: number; roomId?: number }) => void
  block_user: (data: { userId: number }) => void
  unblock_user: (data: { userId: number }) => void
  user_blocked: (data: { userId: number }) => void
  user_unblocked: (data: { userId: number }) => void

  // Ошибки
  error: (data: { message: string }) => void
  call_error: (data: { message: string }) => void
  friend_error: (data: { message: string }) => void
}

// Конфигурация приложения
export interface AppConfig {
  apiUrl: string
  socketUrl: string
  maxFileSize: number
  allowedFileTypes: string[]
  iceServers: RTCIceServer[]
}

// Темы
export type ThemeMode = "light" | "dark" | "system"

// Настройки пользователя
export interface UserSettings {
  theme: ThemeMode
  notifications: {
    sound: boolean
    desktop: boolean
    vibration: boolean
  }
  privacy: {
    showOnlineStatus: boolean
    showLastSeen: boolean
  }
  calls: {
    autoAcceptCalls: boolean
    defaultCamera: string
    defaultMicrophone: string
  }
}

// API ответы
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  details?: any
}

export interface LoginResponse {
  token: string
  user: User
  message: string
}

export interface RegisterResponse {
  token: string
  user: User
  message: string
}

// Формы
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterForm {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface CreateRoomForm {
  name: string
  description?: string
  type: "private" | "group" | "public"
}

export interface EditProfileForm {
  username: string
  avatar_url?: string
}

export interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export interface SendFriendRequestForm {
  username: string
  message?: string
}

export interface FriendActionForm {
  action: "accept" | "decline" | "remove" | "block" | "unblock"
  requestId?: number
  friendId?: number
}
