import React, { useState, useEffect } from "react"
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Badge,
  Paper,
  useTheme,
} from "@mui/material"
import { People, PersonAdd, MailOutline } from "@mui/icons-material"
import {
  useFriendsStore,
  setupFriendsSocketListeners,
} from "@/store/friendsStore"
import { getCombinedScrollbarStyles } from "@/utils/scrollbarStyles"
import FriendsList from "./FriendsList"
import FriendRequests from "./FriendRequests"
import AddFriend from "./AddFriend"

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const theme = useTheme()
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`friends-tabpanel-${index}`}
      aria-labelledby={`friends-tab-${index}`}
      style={{ height: "100%", overflow: "hidden" }}
      {...other}
    >
      {value === index && (
        <Box
          sx={{
            height: "100%",
            overflow: "auto",
            p: 0,
            ...getCombinedScrollbarStyles(theme),
          }}
        >
          {children}
        </Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `friends-tab-${index}`,
    "aria-controls": `friends-tabpanel-${index}`,
  }
}

const FriendsPanel = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState(0)
  const { friendRequests, friends, loadFriendRequests } = useFriendsStore()

  useEffect(() => {
    console.log("🔄 [FriendsPanel] Компонент монтируется")
    // Настраиваем socket listeners для друзей
    setupFriendsSocketListeners()

    // Загружаем данные только в FriendsPanel (центральный компонент)
    console.log("📥 [FriendsPanel] Загружаем запросы на дружбу")
    loadFriendRequests()
    // loadFriends() убираем отсюда - пусть загружается только в FriendsList
  }, []) // Убираем зависимости, чтобы избежать перезагрузки

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Paper
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
      }}
      elevation={0}
    >
      {/* Заголовок */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <People sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
            Друзья
          </Typography>
        </Box>
      </Box>

      {/* Вкладки */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 56,
            "& .MuiTab-root": {
              minHeight: 56,
              textTransform: "none",
              fontSize: "0.875rem",
              fontWeight: 500,
            },
          }}
        >
          <Tab
            icon={<People />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Друзья</span>
                {friends?.length > 0 && (
                  <Badge
                    badgeContent={friends.length}
                    color="primary"
                    sx={{
                      "& .MuiBadge-badge": {
                        position: "static",
                        transform: "none",
                        fontSize: "0.75rem",
                        height: "18px",
                        minWidth: "18px",
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
            icon={<MailOutline />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span>Запросы</span>
                {friendRequests?.length > 0 && (
                  <Badge
                    badgeContent={friendRequests.length}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        position: "static",
                        transform: "none",
                        fontSize: "0.75rem",
                        height: "18px",
                        minWidth: "18px",
                      },
                    }}
                  />
                )}
              </Box>
            }
            iconPosition="start"
            {...a11yProps(1)}
          />
          <Tab
            icon={<PersonAdd />}
            label="Добавить"
            iconPosition="start"
            {...a11yProps(2)}
          />
        </Tabs>
      </Box>

      {/* Содержимое */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <TabPanel value={activeTab} index={0}>
          <FriendsList />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <FriendRequests />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <AddFriend onSuccess={() => setActiveTab(1)} />
        </TabPanel>
      </Box>

      {/* Подвал с полезной информацией */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          textAlign: "center",
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {activeTab === 0 &&
            "💡 Кликните на друга, чтобы открыть приватный чат"}
          {activeTab === 1 && "📨 Новые запросы появятся автоматически"}
          {activeTab === 2 &&
            "🔍 Найдите друзей по их точному имени пользователя"}
        </Typography>
      </Box>
    </Paper>
  )
}

export default FriendsPanel
