import React, { useState } from "react"
import {
  Box,
  Tabs,
  Tab,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { Chat, People, DarkMode, LightMode } from "@mui/icons-material"
import { useAuthStore } from "@/store/authStore"
import { useTheme as useCustomTheme } from "@/contexts/ThemeContext"
import { useFriendsStore } from "@/store/friendsStore"
import RoomList from "./RoomList"
import FriendsPanel from "../friends/FriendsPanel"

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
      id={`sidebar-tabpanel-${index}`}
      aria-labelledby={`sidebar-tab-${index}`}
      style={{ height: "100%", overflow: "hidden" }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: "100%", overflow: "hidden" }}>{children}</Box>
      )}
    </div>
  )
}

function a11yProps(index: number) {
  return {
    id: `sidebar-tab-${index}`,
    "aria-controls": `sidebar-tabpanel-${index}`,
  }
}

const Sidebar: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const { mode, toggleTheme } = useCustomTheme()
  const { user } = useAuthStore()
  const { friendRequests } = useFriendsStore()

  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue)
  }

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
      }}
    >
      {/* Заголовок */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h6" noWrap>
              Ять-глагол
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.username}
            </Typography>
          </Box>

          {/* Переключатель темы только на десктопе */}
          {!isMobile && (
            <IconButton
              onClick={toggleTheme}
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "primary.main",
                  backgroundColor: "action.hover",
                  transform: "scale(1.1)",
                },
                transition: "all 0.2s ease",
              }}
              title={
                mode === "light"
                  ? "Переключить на темную тему"
                  : "Переключить на светлую тему"
              }
            >
              {mode === "light" ? <DarkMode /> : <LightMode />}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Вкладки */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            "& .MuiTab-root": {
              minHeight: 48,
              textTransform: "none",
              fontSize: "0.875rem",
            },
          }}
        >
          <Tab
            icon={<Chat />}
            label="Комнаты"
            iconPosition="start"
            {...a11yProps(0)}
          />
          <Tab
            icon={<People />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Друзья
                {friendRequests?.length > 0 && (
                  <Box
                    sx={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: "50%",
                      bgcolor: "error.main",
                      color: "error.contrastText",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {(friendRequests?.length || 0) > 99
                      ? "99+"
                      : friendRequests?.length || 0}
                  </Box>
                )}
              </Box>
            }
            iconPosition="start"
            {...a11yProps(1)}
          />
        </Tabs>
      </Box>

      {/* Содержимое вкладок */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <TabPanel value={activeTab} index={0}>
          <RoomList />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <FriendsPanel />
        </TabPanel>
      </Box>
    </Box>
  )
}

export default Sidebar
