import React, { useEffect, useState } from "react"
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
} from "@mui/material"
import {
  Chat,
  PersonRemove,
  Block,
  Refresh,
  Circle,
  Groups,
} from "@mui/icons-material"
import { useFriendsStore } from "@/store/friendsStore"
import { useChatStore } from "@/store/chatStore"
import { Friend } from "@/types"
import { getCombinedScrollbarStyles } from "@/utils/scrollbarStyles"
import toast from "react-hot-toast"

interface FriendsListProps {
  onFriendClick?: (friend: Friend) => void
}

const FriendsList: React.FC<FriendsListProps> = ({ onFriendClick }) => {
  const theme = useTheme()
  const { friends, isLoading, error, loadFriends, removeFriend, blockUser } =
    useFriendsStore()

  const { selectRoom, loadRooms } = useChatStore()
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    // Загружаем друзей только один раз при монтировании компонента
    console.log("🔄 [FriendsList] Компонент монтируется, загружаем друзей")
    loadFriends()
  }, []) // Убираем loadFriends из зависимостей, чтобы избежать перезагрузки

  const handleOpenChat = async (friend: Friend) => {
    if (friend.roomId) {
      // Загружаем комнаты если они еще не загружены
      await loadRooms()

      // Ищем комнату друга
      const { rooms } = useChatStore.getState()
      const friendRoom = rooms.find((room) => room.id === friend.roomId)

      if (friendRoom) {
        await selectRoom(friendRoom)
        toast.success(`Открыт чат с ${friend.friend?.username}`)
      } else {
        toast.error("Не удалось найти чат с другом")
      }
    } else {
      toast.error("У вас нет общего чата с этим другом")
    }
  }

  const handleRemoveFriend = async (friendId: number) => {
    if (
      window.confirm(
        "Вы уверены, что хотите удалить этого пользователя из друзей?"
      )
    ) {
      setActionLoading(friendId)
      const success = await removeFriend(friendId)
      setActionLoading(null)

      if (success) {
        toast.success("Пользователь удален из друзей")
      }
    }
  }

  const handleBlockUser = async (friendId: number) => {
    if (
      window.confirm(
        "Вы уверены, что хотите заблокировать этого пользователя? Он будет удален из друзей."
      )
    ) {
      setActionLoading(friendId)
      const success = await blockUser(friendId)
      setActionLoading(null)

      if (success) {
        toast.success("Пользователь заблокирован и удален из друзей")
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "success"
      case "away":
        return "warning"
      default:
        return "default"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "В сети"
      case "away":
        return "Отошел"
      default:
        return "Не в сети"
    }
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Загрузка друзей...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadFriends}>
              Повторить
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    )
  }

  if (!friends || friends.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 6,
          px: 3,
          textAlign: "center",
        }}
      >
        <Groups sx={{ fontSize: 72, color: "text.disabled", mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          У вас пока нет друзей
        </Typography>
        <Typography color="text.secondary">
          Добавьте друзей, чтобы начать общение с ними
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Заголовок */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: "medium" }}>
          Друзья ({friends?.length || 0})
        </Typography>
        <Tooltip title="Обновить">
          <IconButton onClick={loadFriends} size="small">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Список друзей */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          ...getCombinedScrollbarStyles(theme),
        }}
      >
        <List disablePadding>
          {friends.map((friend) => (
            <ListItem
              key={`friend-${friend.id}-${friend.friendId}`}
              divider
              sx={{
                py: 2,
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  badgeContent={
                    <Circle
                      sx={{
                        fontSize: 12,
                        color:
                          friend.friend?.status === "online"
                            ? "success.main"
                            : friend.friend?.status === "away"
                            ? "warning.main"
                            : "grey.500",
                      }}
                    />
                  }
                >
                  <Avatar
                    src={friend.friend?.avatar_url || undefined}
                    sx={{ width: 48, height: 48 }}
                  >
                    {friend.friend?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                </Badge>
              </ListItemAvatar>

              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: "medium" }}
                    >
                      {friend.friend?.username}
                    </Typography>
                    <Chip
                      label={getStatusText(friend.friend?.status || "offline")}
                      size="small"
                      color={
                        getStatusColor(
                          friend.friend?.status || "offline"
                        ) as any
                      }
                      variant="outlined"
                      sx={{ fontSize: "0.75rem", height: 20 }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    Друзья с {new Date(friend.createdAt).toLocaleDateString()}
                  </Typography>
                }
              />

              <ListItemSecondaryAction>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Tooltip title="Открыть чат">
                    <IconButton
                      onClick={() => handleOpenChat(friend)}
                      color="primary"
                      size="small"
                    >
                      <Chat />
                    </IconButton>
                  </Tooltip>

                  {onFriendClick && (
                    <Tooltip title="Подробнее">
                      <IconButton
                        onClick={() => onFriendClick(friend)}
                        size="small"
                      >
                        {/* Info icon можно добавить */}
                      </IconButton>
                    </Tooltip>
                  )}

                  <Tooltip title="Удалить из друзей">
                    <IconButton
                      onClick={() => handleRemoveFriend(friend.friendId)}
                      disabled={actionLoading === friend.friendId}
                      color="warning"
                      size="small"
                    >
                      {actionLoading === friend.friendId ? (
                        <CircularProgress size={16} />
                      ) : (
                        <PersonRemove />
                      )}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Заблокировать">
                    <IconButton
                      onClick={() => handleBlockUser(friend.friendId)}
                      disabled={actionLoading === friend.friendId}
                      color="error"
                      size="small"
                    >
                      {actionLoading === friend.friendId ? (
                        <CircularProgress size={16} />
                      ) : (
                        <Block />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  )
}

export default FriendsList
