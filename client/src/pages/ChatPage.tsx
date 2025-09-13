import { useEffect, useRef, useState } from "react"
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material"
import {
  Menu as MenuIcon,
  VideoCall,
  ScreenShare,
  Phone,
  DarkMode,
  LightMode,
} from "@mui/icons-material"
import { useChatStore } from "@/store/chatStore"
import { useTheme as useCustomTheme } from "@/contexts/ThemeContext"

// Компоненты чата (будут созданы позже)
import Sidebar from "@/components/chat/Sidebar"
import ChatWindow from "@/components/chat/ChatWindow"
import VideoCallWindow from "@/components/video/VideoCallWindow"
import { webrtcService } from "@/services/webrtc"
import { socketService } from "@/services/socket"
import { useAuthStore } from "@/store/authStore"
import { CallEnd } from "@mui/icons-material"

const DRAWER_WIDTH = 320

const ChatPage = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const { mode, toggleTheme } = useCustomTheme()

  const { activeRoom, loadRooms } = useChatStore()
  const { user } = useAuthStore()

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [callType, setCallType] = useState<"audio" | "video" | "screen">(
    "video"
  )
  const [incomingCall, setIncomingCall] = useState<{
    callId: number
    roomId: number
    createdBy: number
    type: "audio" | "video" | "screen"
    startedAt: Date
  } | null>(null)
  const [isIncomingDialogOpen, setIsIncomingDialogOpen] = useState(false)

  // Простой рингтон через WebAudio (без файлов)
  const audioContextRef = useRef<AudioContext | null>(null)
  const ringtoneIntervalRef = useRef<number | null>(null)
  const startRingtone = () => {
    try {
      const AnyWindow = window as any
      if (!audioContextRef.current) {
        const Ctx = AnyWindow.AudioContext || AnyWindow.webkitAudioContext
        if (!Ctx) return
        audioContextRef.current = new Ctx()
      }
      const ctx = audioContextRef.current
      if (!ctx) return
      const playBeep = () => {
        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()
        oscillator.type = "sine"
        oscillator.frequency.value = 880
        gain.gain.value = 0.05
        oscillator.connect(gain)
        gain.connect(ctx.destination)
        const now = ctx.currentTime
        oscillator.start(now)
        oscillator.stop(now + 0.25)
      }
      playBeep()
      ringtoneIntervalRef.current = window.setInterval(() => {
        playBeep()
      }, 1000)
    } catch {
      // no-op
    }
  }
  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current)
      ringtoneIntervalRef.current = null
    }
  }

  useEffect(() => {
    // Загружаем комнаты при монтировании компонента
    loadRooms()
  }, [loadRooms])

  useEffect(() => {
    // Настраиваем слушатели WebRTC событий
    const handleCallStarted = () => {
      setIsCallActive(true)
      stopRingtone()
    }

    const handleCallEnded = () => {
      setIsCallActive(false)
    }

    webrtcService.on("callStarted", handleCallStarted)
    webrtcService.on("callEnded", handleCallEnded)

    return () => {
      webrtcService.off("callStarted", handleCallStarted)
      webrtcService.off("callEnded", handleCallEnded)
    }
  }, [])

  // Входящий звонок через сокет: показываем приглашение
  useEffect(() => {
    const handleSocketCallStarted = (data: {
      callId: number
      roomId: number
      createdBy: number
      type: "audio" | "video" | "screen"
      startedAt: Date
    }) => {
      if (!activeRoom || data.roomId !== activeRoom.id) return
      if (user?.id === data.createdBy) return // инициатору не показываем
      if (isCallActive) return
      setIncomingCall(data)
      setIsIncomingDialogOpen(true)
      startRingtone()
    }

    const handleSocketCallEnded = () => {
      setIsIncomingDialogOpen(false)
      setIncomingCall(null)
      stopRingtone()
    }

    socketService.onCallStarted(handleSocketCallStarted)
    socketService.on("call_ended", handleSocketCallEnded as any)

    return () => {
      socketService.off("call_started", handleSocketCallStarted as any)
      socketService.off("call_ended", handleSocketCallEnded as any)
    }
  }, [activeRoom, user?.id, isCallActive])

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen)
  }

  const handleStartCall = async (type: "audio" | "video" | "screen") => {
    if (!activeRoom) return

    try {
      setCallType(type)
      await webrtcService.startCall(activeRoom.id, type)
    } catch (error) {
      console.error("Ошибка начала звонка:", error)
    }
  }

  const acceptIncomingCall = async () => {
    if (!incomingCall) return
    try {
      setIsIncomingDialogOpen(false)
      stopRingtone()
      setCallType(incomingCall.type)
      setIsCallActive(true)
      await webrtcService.joinCall(
        incomingCall.roomId,
        incomingCall.type !== "audio",
        true
      )
    } catch (error) {
      console.error("Ошибка присоединения к звонку:", error)
    }
  }

  const declineIncomingCall = () => {
    setIsIncomingDialogOpen(false)
    setIncomingCall(null)
    stopRingtone()
  }

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Sidebar />
    </Box>
  )

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Мобильный AppBar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
            display: { md: "none" },
          }}
        >
          <Toolbar sx={{ position: "relative" }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ flexGrow: 1 }}
            >
              {activeRoom ? activeRoom.name : "Ять-глагол"}
            </Typography>
            {/* Кнопки звонка по центру (только если есть активная комната) */}
            {activeRoom && !isCallActive && (
              <Box
                sx={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <IconButton
                  color="inherit"
                  onClick={() => handleStartCall("audio")}
                  size="medium"
                  title="Аудио звонок"
                >
                  <Phone fontSize="medium" />
                </IconButton>
                <IconButton
                  color="inherit"
                  onClick={() => handleStartCall("video")}
                  size="medium"
                  title="Видео звонок"
                >
                  <VideoCall fontSize="medium" />
                </IconButton>
                <IconButton
                  color="inherit"
                  onClick={() => handleStartCall("screen")}
                  size="medium"
                  title="Демонстрация экрана"
                >
                  <ScreenShare fontSize="medium" />
                </IconButton>
              </Box>
            )}

            {/* Кнопка переключения темы в мобильной версии */}
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              size="small"
              title={
                mode === "light"
                  ? "Переключить на темную тему"
                  : "Переключить на светлую тему"
              }
            >
              {mode === "light" ? <DarkMode /> : <LightMode />}
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      {/* Боковая панель с комнатами */}
      <Box
        component="nav"
        sx={{
          width: { md: DRAWER_WIDTH },
          flexShrink: { md: 0 },
        }}
      >
        {/* Мобильный drawer */}
        <Drawer
          variant="temporary"
          open={mobileDrawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Лучшая производительность на мобильных
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Десктопный drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              borderRight: 1,
              borderColor: "divider",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Основная область чата */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Отступ для мобильного AppBar */}
        {isMobile && <Toolbar />}

        {/* Окно видеозвонка */}
        {isCallActive && (
          <VideoCallWindow
            roomId={activeRoom?.id || 0}
            callType={callType}
            onClose={() => setIsCallActive(false)}
          />
        )}

        {/* Диалог входящего звонка */}
        {incomingCall && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1300,
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: 4,
              p: 2,
              display: isIncomingDialogOpen ? "flex" : "none",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Typography component="div" variant="body1">
              Входящий{" "}
              {incomingCall.type === "audio"
                ? "аудио"
                : incomingCall.type === "screen"
                ? "звонок/экран"
                : "видео"}{" "}
              звонок
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                color="success"
                onClick={acceptIncomingCall}
                title="Принять"
                sx={{ bgcolor: "success.light", color: "success.contrastText" }}
              >
                <Phone />
              </IconButton>
              <IconButton
                color="error"
                onClick={declineIncomingCall}
                title="Отклонить"
                sx={{ bgcolor: "error.light", color: "error.contrastText" }}
              >
                <CallEnd />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Окно чата */}
        {!isCallActive && (
          <ChatWindow
            onStartCall={handleStartCall}
            isCallActive={isCallActive}
            isMobile={isMobile}
          />
        )}
      </Box>
    </Box>
  )
}

export default ChatPage
