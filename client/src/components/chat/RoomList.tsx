import { useState } from "react"
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  Chip,
} from "@mui/material"
import {
  Add as AddIcon,
  Group as GroupIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material"
import { format, isToday, isYesterday } from "date-fns"
import { ru } from "date-fns/locale"
import { useChatStore } from "@/store/chatStore"
import { ChatRoom } from "@/types"

const RoomList = () => {
  const { rooms, activeRoom, selectRoom, createRoom, isLoading } =
    useChatStore()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newRoomData, setNewRoomData] = useState({
    name: "",
    description: "",
    type: "group" as "private" | "group" | "public",
  })

  const formatMessageTime = (dateString: string | Date): string => {
    const date = new Date(dateString)

    if (isToday(date)) {
      return format(date, "HH:mm", { locale: ru })
    } else if (isYesterday(date)) {
      return "Вчера"
    } else {
      return format(date, "dd.MM.yy", { locale: ru })
    }
  }

  const getRoomIcon = (type: string) => {
    switch (type) {
      case "private":
        return <PrivateIcon />
      case "public":
        return <PublicIcon />
      default:
        return <GroupIcon />
    }
  }

  const handleRoomClick = async (room: ChatRoom) => {
    if (activeRoom?.id !== room.id) {
      await selectRoom(room)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoomData.name.trim()) return

    const success = await createRoom(
      newRoomData.name,
      newRoomData.description,
      newRoomData.type
    )

    if (success) {
      setCreateDialogOpen(false)
      setNewRoomData({
        name: "",
        description: "",
        type: "group",
      })
    }
  }

  const getUnreadCount = (_room: ChatRoom): number => {
    // TODO: Реализовать подсчет непрочитанных сообщений
    return 0
  }

  const isRoomActive = (room: ChatRoom): boolean => {
    return activeRoom?.id === room.id
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Список комнат */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <List sx={{ p: 0 }}>
          {rooms.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography
                component="div"
                variant="body2"
                color="text.secondary"
              >
                У вас пока нет комнат
              </Typography>
              <Typography
                component="div"
                variant="caption"
                color="text.disabled"
                sx={{ mt: 1 }}
              >
                Создайте первую комнату, нажав на кнопку +
              </Typography>
            </Box>
          ) : (
            rooms.map((room) => {
              const unreadCount = getUnreadCount(room)
              const isActive = isRoomActive(room)

              return (
                <ListItem
                  key={room.id}
                  disablePadding
                  sx={{
                    backgroundColor: isActive
                      ? "action.selected"
                      : "transparent",
                    borderLeft: isActive ? 3 : 0,
                    borderColor: "primary.main",
                  }}
                >
                  <ListItemButton
                    onClick={() => handleRoomClick(room)}
                    sx={{
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        badgeContent={unreadCount}
                        color="error"
                        invisible={unreadCount === 0}
                        max={99}
                      >
                        <Avatar
                          sx={{
                            bgcolor: isActive
                              ? "primary.main"
                              : "primary.light",
                          }}
                        >
                          {getRoomIcon(room.type)}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>

                    <ListItemText
                      primary={room.name}
                      primaryTypographyProps={{
                        component: "div",
                        variant: "subtitle1",
                        noWrap: true,
                        sx: {
                          fontWeight: unreadCount > 0 ? 600 : 400,
                        },
                      }}
                      secondary={
                        <>
                          {room.lastMessage ? (
                            <Box
                              component="span"
                              sx={{
                                display: "block",
                                fontWeight: unreadCount > 0 ? 500 : 400,
                              }}
                            >
                              {room.lastMessage.user?.username}:{" "}
                              {room.lastMessage.content}
                            </Box>
                          ) : (
                            <Box
                              component="span"
                              sx={{
                                display: "block",
                                fontStyle: "italic",
                                color: "text.disabled",
                              }}
                            >
                              Нет сообщений
                            </Box>
                          )}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: 0.5,
                            }}
                          >
                            <Chip
                              label={
                                room.type === "private"
                                  ? "Приватная"
                                  : room.type === "public"
                                  ? "Публичная"
                                  : "Групповая"
                              }
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.7rem", height: 20 }}
                            />
                            <Box
                              component="span"
                              sx={{
                                fontSize: "0.75rem",
                                color: "text.disabled",
                              }}
                            >
                              {room.participantCount || 0} участников
                            </Box>
                            {room.lastMessage && (
                              <Box
                                component="span"
                                sx={{
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                  ml: "auto",
                                }}
                              >
                                {formatMessageTime(room.lastMessage.created_at)}
                              </Box>
                            )}
                          </Box>
                        </>
                      }
                      secondaryTypographyProps={{
                        component: "div",
                        variant: "body2",
                        color: "text.secondary",
                      }}
                    />

                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Открыть меню комнаты
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              )
            })
          )}
        </List>
      </Box>

      {/* Кнопка создания новой комнаты */}
      <Box sx={{ p: 2 }}>
        <Fab
          color="primary"
          aria-label="create room"
          onClick={() => setCreateDialogOpen(true)}
          sx={{ width: "100%", borderRadius: 2 }}
        >
          <AddIcon sx={{ mr: 1 }} />
          Создать комнату
        </Fab>
      </Box>

      {/* Диалог создания комнаты */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создать новую комнату</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название комнаты"
            fullWidth
            variant="outlined"
            value={newRoomData.name}
            onChange={(e) =>
              setNewRoomData((prev) => ({ ...prev, name: e.target.value }))
            }
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Описание (необязательно)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newRoomData.description}
            onChange={(e) =>
              setNewRoomData((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth>
            <InputLabel>Тип комнаты</InputLabel>
            <Select
              value={newRoomData.type}
              label="Тип комнаты"
              onChange={(e) =>
                setNewRoomData((prev) => ({
                  ...prev,
                  type: e.target.value as any,
                }))
              }
            >
              <MenuItem value="group">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <GroupIcon />
                  Групповая
                </Box>
              </MenuItem>
              <MenuItem value="private">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PrivateIcon />
                  Приватная
                </Box>
              </MenuItem>
              <MenuItem value="public">
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PublicIcon />
                  Публичная
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
          <Button
            onClick={handleCreateRoom}
            variant="contained"
            disabled={!newRoomData.name.trim() || isLoading}
          >
            {isLoading ? "Создание..." : "Создать"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default RoomList
