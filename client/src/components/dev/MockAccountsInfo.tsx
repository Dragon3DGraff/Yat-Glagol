import { useState, useEffect } from "react"
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Collapse,
  Alert,
  Chip,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
} from "@mui/material"
import {
  ExpandMore,
  ExpandLess,
  ContentCopy,
  PersonAdd,
  Info,
  AccountBox,
} from "@mui/icons-material"

interface MockAccountInfo {
  email: string
  password: string
  nickname: string
}

interface MockInfo {
  users: number
  chats: number
  messages: number
  participants: number
  test_accounts: MockAccountInfo[]
}

interface MockAccountsInfoProps {
  onQuickLogin?: (email: string, password: string) => void
}

const MockAccountsInfo = ({ onQuickLogin }: MockAccountsInfoProps) => {
  const [mockInfo, setMockInfo] = useState<MockInfo | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    // Кэшируем данные в sessionStorage чтобы не делать частые запросы
    const cachedData = sessionStorage.getItem("mockInfo")
    if (cachedData) {
      try {
        setMockInfo(JSON.parse(cachedData))
        return
      } catch (e) {
        // Если кэш поврежден, удаляем его
        sessionStorage.removeItem("mockInfo")
      }
    }
    fetchMockInfo()
  }, [])

  const fetchMockInfo = async () => {
    try {
      setLoading(true)
      setError("")
      console.log("fetchMockInfo")
      const response = await fetch("/api/mock-info")

      if (response.ok) {
        const data = await response.json()
        setMockInfo(data)
        // Кэшируем полученные данные
        sessionStorage.setItem("mockInfo", JSON.stringify(data))
      } else if (response.status === 429) {
        setError(
          "Слишком много запросов. Данные могут быть временно недоступны."
        )
        console.warn("Rate limit exceeded for /api/mock-info")
      } else {
        setError(
          `Ошибка получения данных: ${response.status} ${response.statusText}`
        )
        console.error(`Failed to fetch mock info: ${response.status}`)
      }
    } catch (error) {
      setError("Не удалось подключиться к серверу")
      console.error("Ошибка получения mock информации:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCredentials = async (email: string, password: string) => {
    const credentials = `Email: ${email}\nPassword: ${password}`
    try {
      await navigator.clipboard.writeText(credentials)
      setCopyFeedback(`Скопированы данные для ${email}`)
      setTimeout(() => setCopyFeedback(""), 2000)
    } catch (error) {
      console.error("Ошибка копирования:", error)
    }
  }

  const handleQuickLogin = (email: string, password: string) => {
    if (onQuickLogin) {
      onQuickLogin(email, password)
      setCopyFeedback(`Данные заполнены для ${email}`)
      setTimeout(() => setCopyFeedback(""), 2000)
    }
  }

  //   if (!mockInfo && !loading) {
  //     return null // Не показываем компонент если mock данные не доступны
  //   }

  return (
    <Paper
      elevation={3}
      sx={{
        mt: 1,
        p: 1.5,
        border: "2px solid #ff9800",
        borderRadius: 2,
        backgroundColor: "#fff3e0",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        sx={{ cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Info color="warning" />
          <Typography variant="h6" color="warning.main">
            🧪 Dev Mode: Тестовые аккаунты
          </Typography>
        </Box>
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box mt={1}>
          {copyFeedback && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {copyFeedback}
            </Alert>
          )}

          {loading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Загрузка информации о тестовых аккаунтах...
            </Alert>
          )}

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
              {error.includes("Слишком много запросов") && (
                <Button size="small" onClick={fetchMockInfo} sx={{ ml: 1 }}>
                  Повторить
                </Button>
              )}
            </Alert>
          )}

          {mockInfo && (
            <>
              {/* Статистика */}
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <Card variant="outlined" sx={{ minHeight: "auto" }}>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        py: 0.5,
                        px: 1,
                        "&:last-child": { pb: 0.5 },
                      }}
                    >
                      <Typography
                        variant="h5"
                        color="primary"
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {mockInfo.users}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        Пользователей
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={3}>
                  <Card variant="outlined" sx={{ minHeight: "auto" }}>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        py: 0.5,
                        px: 1,
                        "&:last-child": { pb: 0.5 },
                      }}
                    >
                      <Typography
                        variant="h5"
                        color="secondary"
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {mockInfo.chats}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        Чатов
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={3}>
                  <Card variant="outlined" sx={{ minHeight: "auto" }}>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        py: 0.5,
                        px: 1,
                        "&:last-child": { pb: 0.5 },
                      }}
                    >
                      <Typography
                        variant="h5"
                        color="success.main"
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {mockInfo.messages}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        Сообщений
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={3}>
                  <Card variant="outlined" sx={{ minHeight: "auto" }}>
                    <CardContent
                      sx={{
                        textAlign: "center",
                        py: 0.5,
                        px: 1,
                        "&:last-child": { pb: 0.5 },
                      }}
                    >
                      <Typography
                        variant="h5"
                        color="info.main"
                        sx={{ fontSize: "1.5rem" }}
                      >
                        {mockInfo.participants}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        Участников
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1.5 }} />

              {/* Тестовые аккаунты */}
              <Typography variant="subtitle2" gutterBottom sx={{ mb: 1 }}>
                <AccountBox
                  sx={{ mr: 1, verticalAlign: "middle", fontSize: "1rem" }}
                />
                Доступные тестовые аккаунты:
              </Typography>

              <List dense sx={{ py: 0 }}>
                {mockInfo.test_accounts.map((account, index) => (
                  <ListItem
                    key={index}
                    sx={{
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                      mb: 0.5,
                      backgroundColor: "white",
                      py: 0.5,
                      px: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box
                          component="span"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <Typography variant="subtitle2" component="span">
                            {account.nickname}
                          </Typography>
                          {account.nickname === "Admin" && (
                            <Chip label="Admin" size="small" color="error" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box component="span">
                          <Typography
                            variant="caption"
                            component="span"
                            display="block"
                          >
                            Email: {account.email}
                          </Typography>
                          <Typography
                            variant="caption"
                            component="span"
                            display="block"
                          >
                            Пароль: {account.password}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box display="flex" gap={0.5}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PersonAdd fontSize="small" />}
                        onClick={() =>
                          handleQuickLogin(account.email, account.password)
                        }
                        title="Заполнить форму входа"
                        sx={{
                          minWidth: "auto",
                          px: 1,
                          py: 0.5,
                          fontSize: "0.75rem",
                        }}
                      >
                        Войти
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopyCredentials(account.email, account.password)
                        }
                        title="Скопировать данные"
                        sx={{ p: 0.5 }}
                      >
                        <ContentCopy sx={{ fontSize: "1rem" }} />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>

              <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.65rem", lineHeight: 1.3 }}
                >
                  💡 В dev режиме используется моковая база данных в памяти. Все
                  данные будут потеряны при перезапуске сервера. Для
                  использования реальной MySQL БД установите USE_MOCK_DB=false в
                  .env файле. Данные кэшируются в браузере для уменьшения
                  нагрузки на сервер.
                </Typography>
              </Alert>
            </>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}

export default MockAccountsInfo
