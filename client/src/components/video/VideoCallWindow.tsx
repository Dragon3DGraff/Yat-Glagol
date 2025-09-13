import React, { useEffect, useRef, useState } from "react"
import { Box, Typography, Paper, IconButton, Fab } from "@mui/material"
import {
  VideoCall as VideoCallIcon,
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  ScreenShare,
  StopScreenShare,
} from "@mui/icons-material"
import { webrtcService } from "@/services/webrtc"

interface VideoCallWindowProps {
  roomId: number
  callType: "audio" | "video" | "screen"
  onClose: () => void
}

const VideoCallWindow = ({
  roomId,
  callType,
  onClose,
}: VideoCallWindowProps) => {
  const [isVideoEnabled, setIsVideoEnabled] = React.useState(
    callType !== "audio"
  )
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(true)
  const [isScreenSharing, setIsScreenSharing] = React.useState(
    callType === "screen"
  )
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Состояние для перетаскивания миниатюры
  const [thumbnailPosition, setThumbnailPosition] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    initialX: 0,
    initialY: 0,
  })

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideosRef = useRef<Map<number, HTMLVideoElement>>(new Map())
  const thumbnailRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [, forceRerender] = useState(0)

  useEffect(() => {
    console.log("🔄 VideoCallWindow useEffect сработал", {
      roomId,
      callType,
      isInitialized,
    })

    // Подписка на события WebRTC (СНАЧАЛА подписываемся)
    const handleLocalStream = ({ stream }: { stream: MediaStream }) => {
      console.log("🎥 Получен локальный поток:", stream)
      console.log(
        "📹 Видео треки:",
        stream.getVideoTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        }))
      )
      setLocalStream(stream)
      if (localVideoRef.current) {
        console.log("🎥 Устанавливаем поток в video элемент")
        localVideoRef.current.srcObject = stream
      } else {
        console.log("⚠️ localVideoRef.current не найден")
      }
    }

    const handleRemoteStream = ({
      userId,
      stream,
    }: {
      userId: number
      stream: MediaStream
    }) => {
      const videoElement = remoteVideosRef.current.get(userId)
      if (videoElement) {
        // @ts-ignore
        videoElement.srcObject = stream
        // Явно запускаем воспроизведение, чтобы обойти autoplay-политику
        try {
          // Some browsers need a small delay before play
          setTimeout(() => {
            ;(videoElement as HTMLVideoElement).play().catch(() => {})
          }, 0)
        } catch {}
      } else {
        forceRerender((n) => n + 1)
        setTimeout(() => {
          const el = remoteVideosRef.current.get(userId)
          if (el) {
            // @ts-ignore
            el.srcObject = stream
            try {
              setTimeout(() => {
                ;(el as HTMLVideoElement).play().catch(() => {})
              }, 0)
            } catch {}
          }
        }, 0)
      }
    }

    console.log("📡 Подписываемся на события WebRTC")
    webrtcService.on("localStreamReceived", handleLocalStream)
    webrtcService.on("remoteStreamReceived", handleRemoteStream)
    const trigger = () => forceRerender((n) => n + 1)
    webrtcService.on("peerConnected", trigger)
    webrtcService.on("peerDisconnected", trigger)
    webrtcService.on("userLeft", trigger)

    // Инициализация WebRTC при монтировании компонента только один раз (ПОСЛЕ подписки)
    if (!isInitialized) {
      console.log("🎬 Начинаем инициализацию звонка")
      const initializeCall = async () => {
        try {
          console.log("🚀 Инициализируем звонок:", { roomId, callType })
          await webrtcService.startCall(roomId, callType)
          console.log("✅ Звонок инициализирован")
          setIsInitialized(true)
        } catch (error) {
          console.error("❌ Ошибка инициализации звонка:", error)
        }
      }

      initializeCall()
    } else {
      console.log("⚠️ Звонок уже инициализирован, пропускаем")
    }

    return () => {
      // Очистка при размонтировании
      console.log("🧹 Очистка VideoCallWindow")
      webrtcService.off("localStreamReceived", handleLocalStream)
      webrtcService.off("remoteStreamReceived", handleRemoteStream)
      webrtcService.off("peerConnected", trigger)
      webrtcService.off("peerDisconnected", trigger)
      webrtcService.off("userLeft", trigger)
      if (isInitialized) {
        webrtcService.endCall()
      }
    }
  }, []) // Убираем зависимости, чтобы эффект сработал только один раз

  useEffect(() => {
    // Установка локального потока в video элемент при изменении потока
    console.log("🔄 localStream изменился:", {
      hasStream: !!localStream,
      hasVideoRef: !!localVideoRef.current,
      streamId: localStream?.id,
    })
    if (localVideoRef.current && localStream) {
      console.log("🎥 Привязываем поток к video элементу")
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  const handleToggleVideo = () => {
    webrtcService.toggleVideo()
    setIsVideoEnabled(!isVideoEnabled)
  }

  const handleToggleAudio = () => {
    webrtcService.toggleAudio()
    setIsAudioEnabled(!isAudioEnabled)
  }

  const handleToggleScreenShare = () => {
    if (isScreenSharing) {
      webrtcService.stopScreenShare()
    } else {
      webrtcService.startScreenShare()
    }
    setIsScreenSharing(!isScreenSharing)
  }

  const handleEndCall = () => {
    webrtcService.endCall()
    onClose()
  }

  // Обработчики для перетаскивания миниатюры
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!thumbnailRef.current || !containerRef.current) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialX: thumbnailPosition.x,
      initialY: thumbnailPosition.y,
    })

    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current || !thumbnailRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const thumbnailRect = thumbnailRef.current.getBoundingClientRect()

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    let newX = dragStart.initialX + deltaX
    let newY = dragStart.initialY + deltaY

    // Ограничения для удержания миниатюры в пределах контейнера
    const maxX = containerRect.width - thumbnailRect.width
    const maxY = containerRect.height - thumbnailRect.height

    newX = Math.max(0, Math.min(newX, maxX))
    newY = Math.max(0, Math.min(newY, maxY))

    setThumbnailPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Обработчики для touch устройств
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!thumbnailRef.current || !containerRef.current) return

    const touch = e.touches[0]

    setIsDragging(true)
    setDragStart({
      x: touch.clientX,
      y: touch.clientY,
      initialX: thumbnailPosition.x,
      initialY: thumbnailPosition.y,
    })

    e.preventDefault()
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !containerRef.current || !thumbnailRef.current) return

    const touch = e.touches[0]
    const containerRect = containerRef.current.getBoundingClientRect()
    const thumbnailRect = thumbnailRef.current.getBoundingClientRect()

    const deltaX = touch.clientX - dragStart.x
    const deltaY = touch.clientY - dragStart.y

    let newX = dragStart.initialX + deltaX
    let newY = dragStart.initialY + deltaY

    // Ограничения для удержания миниатюры в пределах контейнера
    const maxX = containerRect.width - thumbnailRect.width
    const maxY = containerRect.height - thumbnailRect.height

    newX = Math.max(0, Math.min(newX, maxX))
    newY = Math.max(0, Math.min(newY, maxY))

    setThumbnailPosition({ x: newX, y: newY })

    e.preventDefault()
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  // Добавляем глобальные обработчики событий для перетаскивания
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      })
      document.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isDragging, dragStart, thumbnailPosition])

  return (
    <Box
      ref={containerRef}
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "black",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Основная область видео */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Основное поле с сеткой удаленных видео */}
        <Box
          sx={{
            width: "100%",
            height: "100%",
            backgroundColor: "grey.900",
            position: "relative",
          }}
        >
          {/* Сетка удаленных видео участников */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 1,
              p: 1,
            }}
          >
            {Array.from(webrtcService.getPeerConnections().keys()).map(
              (userId) => (
                <Paper
                  key={userId}
                  elevation={2}
                  sx={{ position: "relative", overflow: "hidden" }}
                >
                  {/* @ts-ignore */}
                  <video
                    ref={(el) => {
                      if (el) remoteVideosRef.current.set(userId, el)
                      else remoteVideosRef.current.delete(userId)
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      backgroundColor: "#000",
                    }}
                    autoPlay
                    muted={false}
                    playsInline
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      position: "absolute",
                      bottom: 4,
                      left: 8,
                      color: "white",
                      backgroundColor: "rgba(0,0,0,0.5)",
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: "0.75rem",
                    }}
                  >
                    Участник {userId}
                  </Typography>
                </Paper>
              )
            )}
          </Box>

          {/* Заглушка при отсутствии удаленных участников и локального потока */}
          {webrtcService.getPeerConnections().size === 0 && !localStream && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "transparent",
                  color: "white",
                  textAlign: "center",
                }}
              >
                <VideoCallIcon sx={{ fontSize: 80, mb: 2, opacity: 0.5 }} />
                <Typography variant="h5" gutterBottom>
                  {callType === "screen"
                    ? "Демонстрация экрана"
                    : "Видеозвонок"}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.7 }}>
                  Ожидание подключения участников...
                </Typography>
              </Paper>
            </Box>
          )}
        </Box>

        {/* Миниатюра локального видео */}
        {localStream && callType !== "audio" ? (
          <Paper
            ref={thumbnailRef}
            elevation={4}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            sx={{
              position: "absolute",
              top: thumbnailPosition.y,
              left: thumbnailPosition.x,
              width: 200,
              height: 120,
              backgroundColor: "grey.800",
              borderRadius: 2,
              overflow: "hidden",
              cursor: isDragging ? "grabbing" : "grab",
              transition: isDragging ? "none" : "all 0.2s ease",
              userSelect: "none",
              zIndex: 1001,
            }}
          >
            {/* @ts-ignore */}
            <video
              ref={localVideoRef}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)", // Зеркальное отображение для локального видео
              }}
              autoPlay
              muted // Локальное видео всегда без звука
              playsInline
            />
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: 4,
                left: 8,
                color: "white",
                backgroundColor: "rgba(0,0,0,0.5)",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: "0.75rem",
              }}
            >
              Вы
            </Typography>
          </Paper>
        ) : null}

        {/* Миниатюра для аудио звонка */}
        {callType === "audio" ? (
          <Paper
            ref={thumbnailRef}
            elevation={4}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            sx={{
              position: "absolute",
              top: thumbnailPosition.y,
              left: thumbnailPosition.x,
              width: 120,
              height: 120,
              backgroundColor: "grey.800",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              cursor: isDragging ? "grabbing" : "grab",
              transition: isDragging ? "none" : "all 0.2s ease",
              userSelect: "none",
              zIndex: 1001,
            }}
          >
            <Typography variant="body2" color="white" sx={{ opacity: 0.7 }}>
              🎤
            </Typography>
          </Paper>
        ) : null}

        {/* Плавающая панель управления в центре экрана */}
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            p: 2,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            borderRadius: 4,
          }}
        >
          <IconButton
            onClick={handleToggleAudio}
            sx={{
              color: isAudioEnabled ? "white" : "error.main",
              backgroundColor: isAudioEnabled
                ? "rgba(255,255,255,0.1)"
                : "rgba(244,67,54,0.2)",
            }}
          >
            {isAudioEnabled ? <Mic /> : <MicOff />}
          </IconButton>

          {callType !== "audio" && (
            <IconButton
              onClick={handleToggleVideo}
              sx={{
                color: isVideoEnabled ? "white" : "error.main",
                backgroundColor: isVideoEnabled
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(244,67,54,0.2)",
              }}
            >
              {isVideoEnabled ? <Videocam /> : <VideocamOff />}
            </IconButton>
          )}

          <IconButton
            onClick={handleToggleScreenShare}
            sx={{
              color: isScreenSharing ? "primary.main" : "white",
              backgroundColor: isScreenSharing
                ? "rgba(25,118,210,0.2)"
                : "rgba(255,255,255,0.1)",
            }}
          >
            {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>

          <Fab
            color="error"
            onClick={handleEndCall}
            size="medium"
            sx={{
              mx: 1,
            }}
          >
            <CallEnd />
          </Fab>
        </Paper>
      </Box>
    </Box>
  )
}

export default VideoCallWindow
