import React, { useEffect, useState } from "react"
import {
  Box,
  Avatar,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  useTheme,
  ListItemSecondaryAction,
} from "@mui/material"
import { Check, Close, Inbox, Send, Schedule } from "@mui/icons-material"
import { useFriendsStore } from "@/store/friendsStore"
import { FriendRequest } from "@/types"
import { getCombinedScrollbarStyles } from "@/utils/scrollbarStyles"
import toast from "react-hot-toast"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`requests-tabpanel-${index}`}
      aria-labelledby={`requests-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 1 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `requests-tab-${index}`,
    "aria-controls": `requests-tabpanel-${index}`,
  }
}

const FriendRequests: React.FC = () => {
  const theme = useTheme()
  const {
    friendRequests,
    sentRequests,
    isLoading,
    error,
    loadFriendRequests,
    loadSentRequests,
    acceptFriendRequest,
    declineFriendRequest,
  } = useFriendsStore()

  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    loadFriendRequests()
    loadSentRequests()
  }, [loadFriendRequests, loadSentRequests])

  const handleAccept = async (requestId: number) => {
    setActionLoading(requestId)
    const success = await acceptFriendRequest(requestId)
    setActionLoading(null)

    if (success) {
      toast.success("Запрос принят! Пользователь добавлен в друзья")
    }
  }

  const handleDecline = async (requestId: number) => {
    if (
      window.confirm("Вы уверены, что хотите отклонить этот запрос на дружбу?")
    ) {
      setActionLoading(requestId)
      await declineFriendRequest(requestId)
      setActionLoading(null)
    }
  }

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    )

    if (diffInHours < 1) {
      return "Только что"
    } else if (diffInHours < 24) {
      return `${diffInHours}ч назад`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}д назад`
    }
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  const renderRequestItem = (request: FriendRequest, isReceived: boolean) => {
    const user = isReceived ? request.fromUser : request.toUser

    return (
      <ListItem
        key={request.id}
        divider
        sx={{
          py: 2,
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        <ListItemAvatar>
          <Avatar
            src={user?.avatar_url || undefined}
            sx={{ width: 48, height: 48 }}
          >
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                {user?.username}
              </Typography>
              <Chip
                icon={<Schedule />}
                label={formatTime(request.createdAt)}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.75rem", height: 20 }}
              />
            </Box>
          }
          secondary={
            <Box>
              {request.message && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontStyle: "italic",
                    mb: 0.5,
                    p: 1,
                    bgcolor: "grey.100",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "grey.300",
                  }}
                >
                  "{request.message}"
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {isReceived
                  ? "Хочет добавить вас в друзья"
                  : "Ожидает ответа на запрос дружбы"}
              </Typography>
            </Box>
          }
        />

        {isReceived && (
          <ListItemSecondaryAction>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={
                  actionLoading === request.id ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Check />
                  )
                }
                onClick={() => handleAccept(request.id)}
                disabled={actionLoading === request.id}
              >
                Принять
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={
                  actionLoading === request.id ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Close />
                  )
                }
                onClick={() => handleDecline(request.id)}
                disabled={actionLoading === request.id}
              >
                Отклонить
              </Button>
            </Box>
          </ListItemSecondaryAction>
        )}
      </ListItem>
    )
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
        <Typography color="text.secondary">Загрузка запросов...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                loadFriendRequests()
                loadSentRequests()
              }}
            >
              Повторить
            </Button>
          }
        >
          {error}
        </Alert>
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
      {/* Вкладки */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab
            icon={<Inbox />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <span>Входящие</span>
                {friendRequests?.length > 0 && (
                  <Badge
                    badgeContent={friendRequests.length}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        position: "static",
                        transform: "none",
                        fontSize: "0.75rem",
                        height: "16px",
                        minWidth: "16px",
                      },
                    }}
                  />
                )}
              </Box>
            }
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            icon={<Send />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <span>Отправленные</span>
                {sentRequests?.length > 0 && (
                  <Badge
                    badgeContent={sentRequests.length}
                    color="primary"
                    sx={{
                      "& .MuiBadge-badge": {
                        position: "static",
                        transform: "none",
                        fontSize: "0.75rem",
                        height: "16px",
                        minWidth: "16px",
                      },
                    }}
                  />
                )}
              </Box>
            }
            iconPosition="start"
            {...a11yProps(1)}
          />
        </Tabs>
      </Box>

      {/* Содержимое */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <TabPanel value={activeTab} index={0}>
          {!friendRequests || friendRequests.length === 0 ? (
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
              <Inbox sx={{ fontSize: 72, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Нет входящих запросов
              </Typography>
              <Typography color="text.secondary">
                Здесь будут отображаться запросы на дружбу от других
                пользователей
              </Typography>
            </Box>
          ) : (
            <List
              disablePadding
              sx={{
                overflow: "auto",
                height: "100%",
                ...getCombinedScrollbarStyles(theme),
              }}
            >
              {friendRequests.map((request) =>
                renderRequestItem(request, true)
              )}
            </List>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {!sentRequests || sentRequests.length === 0 ? (
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
              <Send sx={{ fontSize: 72, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Нет отправленных запросов
              </Typography>
              <Typography color="text.secondary">
                Здесь будут отображаться ваши запросы на дружбу, ожидающие
                ответа
              </Typography>
            </Box>
          ) : (
            <List
              disablePadding
              sx={{
                overflow: "auto",
                height: "100%",
                ...getCombinedScrollbarStyles(theme),
              }}
            >
              {sentRequests.map((request) => renderRequestItem(request, false))}
            </List>
          )}
        </TabPanel>
      </Box>
    </Box>
  )
}

export default FriendRequests
