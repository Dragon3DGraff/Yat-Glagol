import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
} from "@mui/material"
import { useAuthStore } from "@/store/authStore"
import { LoginForm } from "@/types"
import MockAccountsInfo from "@/components/dev/MockAccountsInfo"

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()

  const [formData, setFormData] = useState<LoginForm>({
    email: "",
    password: "",
    rememberMe: false,
  })

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
  }>({})

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {}

    if (!formData.email) {
      errors.email = "Email обязателен"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Неверный формат email"
    }

    if (!formData.password) {
      errors.password = "Пароль обязателен"
    } else if (formData.password.length < 8) {
      errors.password = "Пароль должен быть не менее 8 символов"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validateForm()) {
      return
    }

    const success = await login(formData)
    if (success) {
      navigate("/chat")
    }
  }

  const handleInputChange =
    (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "rememberMe" ? e.target.checked : e.target.value

      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))

      // Очищаем ошибку поля при вводе
      if (fieldErrors[field as keyof typeof fieldErrors]) {
        setFieldErrors((prev) => ({
          ...prev,
          [field]: undefined,
        }))
      }
    }

  const handleQuickLogin = (email: string, password: string) => {
    setFormData({
      email,
      password,
      rememberMe: false,
    })
    // Очищаем ошибки
    setFieldErrors({})
    clearError()
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          width: "100%",
          maxHeight: "100vh",
          overflow: "auto",
          py: 2,
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 4,
            borderRadius: 2,
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Ять-глагол
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Войдите в свой аккаунт
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
              margin="normal"
              required
              autoComplete="email"
              autoFocus
            />

            <TextField
              fullWidth
              label="Пароль"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange("password")}
              error={!!fieldErrors.password}
              helperText={fieldErrors.password}
              margin="normal"
              required
              autoComplete="current-password"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.rememberMe}
                  onChange={handleInputChange("rememberMe")}
                />
              }
              label="Запомнить меня"
              sx={{ mt: 1, mb: 2 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                fontSize: "1.1rem",
              }}
            >
              {isLoading ? "Вход..." : "Войти"}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                или
              </Typography>
            </Divider>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Нет аккаунта?{" "}
                <Box
                  component="span"
                  onClick={() => navigate("/register")}
                  sx={{
                    color: "#1976d2",
                    textDecoration: "none",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Зарегистрируйтесь
                </Box>
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Забыли пароль?{" "}
                <Box
                  component="span"
                  onClick={() => navigate("/forgot-password")}
                  sx={{
                    color: "#1976d2",
                    textDecoration: "none",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Восстановить
                </Box>
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Показываем информацию о тестовых аккаунтах в dev режиме */}
        <MockAccountsInfo onQuickLogin={handleQuickLogin} />
      </Container>
    </Box>
  )
}

export default LoginPage
