import { useState } from "react"
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
  Paper,
  Chip,
  useTheme,
} from "@mui/material"
import { PersonAdd, Send, Clear, Info, Search } from "@mui/icons-material"
import { useFriendsStore } from "@/store/friendsStore"
import { getCombinedThinScrollbarStyles } from "@/utils/scrollbarStyles"
import toast from "react-hot-toast"

interface AddFriendProps {
  onSuccess?: () => void
}

const AddFriend = ({ onSuccess }: AddFriendProps) => {
  const theme = useTheme()
  const { sendFriendRequestByUsername, isLoading } = useFriendsStore()

  const [username, setUsername] = useState("")
  const [message, setMessage] = useState("")
  const [showMessageInput, setShowMessageInput] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim()) {
      toast.error("Введите имя пользователя")
      return
    }

    if (username.length < 3) {
      toast.error("Имя пользователя должно содержать минимум 3 символа")
      return
    }

    const success = await sendFriendRequestByUsername(
      username.trim(),
      message.trim() || undefined
    )

    if (success) {
      // Сбрасываем форму
      setUsername("")
      setMessage("")
      setShowMessageInput(false)

      if (onSuccess) {
        onSuccess()
      }
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Разрешаем только буквы, цифры, подчеркивания и дефисы
    if (/^[a-zA-Z0-9_-]*$/.test(value)) {
      setUsername(value)
    }
  }

  const handleClear = () => {
    setUsername("")
    setMessage("")
    setShowMessageInput(false)
  }

  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        ...getCombinedThinScrollbarStyles(theme),
      }}
    >
      {/* Заголовок */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <PersonAdd sx={{ color: "primary.main" }} />
          <Typography variant="h6" sx={{ fontWeight: "medium" }}>
            Добавить друга
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Найдите и добавьте друзей по их точному имени пользователя
        </Typography>
      </Box>

      {/* Форма */}
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 3,
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        {/* Поле ввода имени пользователя */}
        <TextField
          fullWidth
          label="Имя пользователя"
          value={username}
          onChange={handleUsernameChange}
          placeholder="Введите имя пользователя"
          disabled={isLoading}
          inputProps={{ maxLength: 30 }}
          InputProps={{
            startAdornment: <Search sx={{ color: "action.active", mr: 1 }} />,
          }}
          helperText={
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                Можно использовать буквы, цифры, подчеркивания и дефисы
              </span>
              <span>{username.length}/30</span>
            </Box>
          }
          sx={{ mb: 2 }}
        />

        {/* Переключатель сообщения */}
        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showMessageInput}
                onChange={(e) => setShowMessageInput(e.target.checked)}
                disabled={isLoading}
              />
            }
            label="Добавить приветственное сообщение"
          />
        </Box>

        {/* Поле сообщения */}
        {showMessageInput && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Сообщение (необязательно)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Напишите приветствие (необязательно)"
            disabled={isLoading}
            inputProps={{ maxLength: 500 }}
            helperText={
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <span>Добавьте личное сообщение к запросу</span>
                <span>{message.length}/500</span>
              </Box>
            }
            sx={{ mb: 2, resize: "none" }}
          />
        )}

        {/* Кнопки */}
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          {(username || message || showMessageInput) && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleClear}
              disabled={isLoading}
              startIcon={<Clear />}
            >
              Очистить
            </Button>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !username.trim()}
            startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
            sx={{ minWidth: 140 }}
          >
            {isLoading ? "Отправка..." : "Отправить запрос"}
          </Button>
        </Box>
      </Paper>

      {/* Подсказки */}
      <Alert
        severity="info"
        icon={<Info />}
        sx={{
          bgcolor: "primary.50",
          color: "primary.900",
          "& .MuiAlert-icon": {
            color: "primary.main",
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: "medium", mb: 1 }}>
          Как добавить друга:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          <li>
            <Typography variant="body2">
              Узнайте точное имя пользователя
            </Typography>
          </li>
          <li>
            <Typography variant="body2">Введите его в поле выше</Typography>
          </li>
          <li>
            <Typography variant="body2">
              При желании добавьте приветственное сообщение
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              Отправьте запрос и дождитесь подтверждения
            </Typography>
          </li>
        </Box>
      </Alert>

      {/* Информация о правилах */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Chip
          label="Только точные имена"
          variant="outlined"
          size="small"
          color="primary"
        />
        <Chip
          label="Без пробелов"
          variant="outlined"
          size="small"
          color="primary"
        />
        <Chip
          label="3-30 символов"
          variant="outlined"
          size="small"
          color="primary"
        />
        <Chip
          label="Буквы, цифры, _ и -"
          variant="outlined"
          size="small"
          color="primary"
        />
      </Box>
    </Box>
  )
}

export default AddFriend
