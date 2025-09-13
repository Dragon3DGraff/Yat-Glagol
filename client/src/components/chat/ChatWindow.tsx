import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  List,
  ListItem,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material"
import {
  Chat as ChatIcon,
  Send as SendIcon,
  Reply as ReplyIcon,
  Person as PersonIcon,
  VideoCall,
  Phone,
  ScreenShare,
} from "@mui/icons-material"
import { useChatStore } from "@/store/chatStore"
import { useAuthStore } from "@/store/authStore"
import { socketService } from "@/services/socket"
import { Message } from "@/types"
import { formatDistanceToNow, format } from "date-fns"
import { ru } from "date-fns/locale"

// Компонент для отображения отдельного сообщения
const MessageItem = ({
  message,
  isOwn,
  onReply,
}: {
  message: Message
  isOwn: boolean
  onReply?: (message: Message) => void
}) => {
  const messageTime = new Date(message.created_at)
  const timeAgo = formatDistanceToNow(messageTime, {
    addSuffix: true,
    locale: ru,
  })
  const fullTime = format(messageTime, "HH:mm dd.MM.yyyy", { locale: ru })

  return (
    <ListItem
      sx={{
        display: "flex",
        justifyContent: isOwn ? "flex-end" : "flex-start",
        alignItems: "flex-start",
        px: 1,
        py: 0.5,
      }}
    >
      {!isOwn && (
        <Avatar
          src={message.user?.avatar_url}
          sx={{ width: 32, height: 32, mr: 1, mt: 0.5 }}
        >
          {message.user?.username?.[0]?.toUpperCase() || <PersonIcon />}
        </Avatar>
      )}

      <Paper
        elevation={1}
        sx={{
          maxWidth: "70%",
          p: 1.5,
          backgroundColor: isOwn ? "primary.main" : "background.paper",
          color: isOwn ? "primary.contrastText" : "text.primary",
          borderRadius: 2,
          position: "relative",
        }}
      >
        {!isOwn && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: isOwn ? "primary.contrastText" : "primary.main",
              mb: 0.5,
              display: "block",
            }}
          >
            {message.user?.username || "Неизвестный пользователь"}
          </Typography>
        )}

        <Typography variant="body1" sx={{ wordBreak: "break-word", mb: 0.5 }}>
          {message.content}
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              opacity: 0.7,
              fontSize: "0.75rem",
            }}
            title={fullTime}
          >
            {timeAgo}
            {message.edited_at && " (изменено)"}
          </Typography>

          {onReply && (
            <IconButton
              size="small"
              onClick={() => onReply(message)}
              sx={{
                opacity: 0.7,
                ml: 1,
                color: "inherit",
                "&:hover": { opacity: 1 },
              }}
            >
              <ReplyIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Paper>
    </ListItem>
  )
}

// Компонент индикатора печатания
const TypingIndicator = ({
  typingUsers,
  roomParticipants = [],
}: {
  typingUsers: number[]
  roomParticipants?: any[]
}) => {
  if (typingUsers.length === 0) return null

  const typingUsernames = typingUsers
    .map((userId) => {
      const user = roomParticipants.find((p) => p.id === userId)
      return user?.username || "Пользователь"
    })
    .slice(0, 3)

  const message =
    typingUsers.length === 1
      ? `${typingUsernames[0]} печатает...`
      : typingUsers.length === 2
      ? `${typingUsernames[0]} и ${typingUsernames[1]} печатают...`
      : `${typingUsernames[0]} и еще ${typingUsers.length - 1} печатают...`

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        px: 2,
        py: 1,
        color: "text.secondary",
      }}
    >
      <CircularProgress size={12} sx={{ mr: 1 }} />
      <Typography variant="caption" sx={{ fontStyle: "italic" }}>
        {message}
      </Typography>
    </Box>
  )
}

interface ChatWindowProps {
  onStartCall?: (type: "audio" | "video" | "screen") => void
  isCallActive?: boolean
  isMobile?: boolean
}

const ChatWindow = ({
  onStartCall,
  isCallActive = false,
  isMobile = false,
}: ChatWindowProps) => {
  const { activeRoom, messages, sendMessage, typingUsers } = useChatStore()
  const { user } = useAuthStore()
  const [messageText, setMessageText] = useState("")
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<number | null>(null)

  // Автопрокрутка к последнему сообщению
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Прокручиваем вниз при новых сообщениях
  useEffect(() => {
    const roomMessages = activeRoom ? messages[activeRoom.id] || [] : []
    if (roomMessages.length > 0) {
      scrollToBottom()
    }
  }, [messages, activeRoom?.id, scrollToBottom])

  // Обработка печатания
  const handleTyping = useCallback(() => {
    if (!activeRoom || !user) return

    if (!isTyping) {
      setIsTyping(true)
      // Уведомляем о начале печатания через socket
      socketService.startTyping(activeRoom.id)
    }

    // Сбрасываем таймер
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Устанавливаем новый таймер для остановки печатания
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      // Уведомляем об остановке печатания через socket
      socketService.stopTyping(activeRoom.id)
    }, 2000)
  }, [activeRoom, user, isTyping])

  // Отправка сообщения
  const handleSendMessage = useCallback(() => {
    if (!messageText.trim() || !activeRoom || !user) return

    const content = messageText.trim()
    const replyToId = replyToMessage?.id

    // Отправляем сообщение через store
    sendMessage(activeRoom.id, content, "text", replyToId)

    // Очищаем поля
    setMessageText("")
    setReplyToMessage(null)

    // Останавливаем печатание
    if (isTyping) {
      setIsTyping(false)
      socketService.stopTyping(activeRoom.id)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [messageText, activeRoom, user, replyToMessage, sendMessage, isTyping])

  // Обработка нажатия Enter
  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage]
  )

  // Обработка ответа на сообщение
  const handleReply = useCallback((message: Message) => {
    setReplyToMessage(message)
  }, [])

  // Отмена ответа
  const cancelReply = useCallback(() => {
    setReplyToMessage(null)
  }, [])

  // Cleanup таймера
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  if (!activeRoom) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          p: 3,
          textAlign: "center",
        }}
      >
        <ChatIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
        <Typography
          component="div"
          variant="h5"
          gutterBottom
          color="text.secondary"
        >
          Добро пожаловать в Ять-глагол!
        </Typography>
        <Typography component="div" variant="body1" color="text.disabled">
          Выберите комнату из списка, чтобы начать общение
        </Typography>
        <Typography
          component="div"
          variant="body2"
          color="text.disabled"
          sx={{ mt: 1 }}
        >
          Или создайте новую комнату, нажав кнопку "+"
        </Typography>
      </Box>
    )
  }

  const roomMessages = messages[activeRoom.id] || []
  const currentTypingUsers = typingUsers[activeRoom.id] || []

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Заголовок чата */}
      <Paper
        elevation={1}
        sx={{
          p: 2,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: "divider",
          position: "relative",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            position: "relative",
            width: "100%",
          }}
        >
          {/* Название комнаты слева */}
          <Box sx={{ flex: 1 }}>
            <Typography component="div" variant="h6">
              {activeRoom.name}
            </Typography>
            <Typography component="div" variant="body2" color="text.secondary">
              {activeRoom.description ||
                `${activeRoom.participantCount || 0} участников`}
            </Typography>
          </Box>

          {/* Кнопки звонков по центру (только на десктопе) */}
          {onStartCall && !isCallActive && !isMobile && (
            <Box
              sx={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 2,
                alignItems: "center",
              }}
            >
              <IconButton
                size="large"
                onClick={() => onStartCall("audio")}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: "secondary.main",
                    backgroundColor: "action.hover",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.2s ease",
                }}
                title="Аудио звонок"
              >
                <Phone fontSize="large" />
              </IconButton>
              <IconButton
                size="large"
                onClick={() => onStartCall("video")}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: "primary.main",
                    backgroundColor: "action.hover",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.2s ease",
                }}
                title="Видео звонок"
              >
                <VideoCall fontSize="large" />
              </IconButton>
              <IconButton
                size="large"
                onClick={() => onStartCall("screen")}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    color: "info.main",
                    backgroundColor: "action.hover",
                    transform: "scale(1.1)",
                  },
                  transition: "all 0.2s ease",
                }}
                title="Демонстрация экрана"
              >
                <ScreenShare fontSize="large" />
              </IconButton>
            </Box>
          )}

          {/* Пустое место справа для баланса */}
          <Box sx={{ flex: 1 }} />
        </Box>
      </Paper>

      {/* Область сообщений */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          backgroundColor: "background.default",
        }}
      >
        {roomMessages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              p: 3,
              textAlign: "center",
            }}
          >
            <ChatIcon sx={{ fontSize: 60, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Пока нет сообщений
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Начните общение, отправив первое сообщение!
            </Typography>
          </Box>
        ) : (
          <List sx={{ pt: 1, pb: 0 }}>
            {roomMessages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.user_id === user?.id}
                onReply={handleReply}
              />
            ))}
          </List>
        )}

        {/* Индикатор печатания */}
        <TypingIndicator
          typingUsers={currentTypingUsers.filter(
            (userId) => userId !== user?.id
          )}
          roomParticipants={activeRoom.participants}
        />

        {/* Элемент для автопрокрутки */}
        <Box ref={messagesEndRef} />
      </Box>

      {/* Область ввода */}
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 0,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {/* Показываем на какое сообщение отвечаем */}
        {replyToMessage && (
          <Box sx={{ mb: 1 }}>
            <Chip
              label={`Ответ на: ${replyToMessage.content.substring(0, 50)}${
                replyToMessage.content.length > 50 ? "..." : ""
              }`}
              onDelete={cancelReply}
              variant="outlined"
              size="small"
              icon={<ReplyIcon />}
              sx={{ mb: 1 }}
            />
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Введите сообщение..."
            value={messageText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setMessageText(e.target.value)
              handleTyping()
            }}
            onKeyPress={handleKeyPress}
            variant="outlined"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            sx={{
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "&:hover": {
                bgcolor: "primary.dark",
              },
              "&.Mui-disabled": {
                bgcolor: "action.disabledBackground",
                color: "action.disabled",
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  )
}

export default ChatWindow
