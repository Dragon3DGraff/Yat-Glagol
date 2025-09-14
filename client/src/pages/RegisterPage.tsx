import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Divider,
  Alert,
} from "@mui/material"
import { useAuthStore } from "@/store/authStore"
import { RegisterForm } from "@/types"

const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [formData, setFormData] = useState<RegisterForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const [fieldErrors, setFieldErrors] = useState<{
    username?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const validateForm = (): boolean => {
    const errors: {
      username?: string
      email?: string
      password?: string
      confirmPassword?: string
    } = {}

    // Проверка имени пользователя
    if (!formData.username) {
      errors.username = "Имя пользователя обязательно"
    } else if (formData.username.length < 3) {
      errors.username = "Имя пользователя должно быть не менее 3 символов"
    } else if (formData.username.length > 30) {
      errors.username = "Имя пользователя должно быть не более 30 символов"
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      errors.username =
        "Имя пользователя может содержать только буквы, цифры, _ и -"
    }

    // Проверка email
    if (!formData.email) {
      errors.email = "Email обязателен"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Неверный формат email"
    }

    // Проверка пароля
    if (!formData.password) {
      errors.password = "Пароль обязателен"
    } else if (formData.password.length < 8) {
      errors.password = "Пароль должен быть не менее 8 символов"
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password =
        "Пароль должен содержать строчную букву, заглавную букву и цифру"
    }

    // Проверка подтверждения пароля
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Подтверждение пароля обязательно"
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Пароли не совпадают"
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

    const success = await register(formData)
    if (success) {
      navigate("/chat")
    }
  }

  const handleInputChange =
    (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Container maxWidth="sm">
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
              Создайте новый аккаунт
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
              label="Имя пользователя"
              value={formData.username}
              onChange={handleInputChange("username")}
              error={!!fieldErrors.username}
              helperText={fieldErrors.username || "Только буквы, цифры, _ и -"}
              margin="normal"
              required
              autoComplete="username"
              autoFocus
              InputProps={{
                sx: {
                  color: "black",
                },
              }}
              sx={{color: "black"}}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange("email")}
              error={!!fieldErrors.email}
              helperText={fieldErrors.email}
              margin="normal"
              required
              autoComplete="email"
              InputProps={{
                sx: {
                  color: "black",
                },
              }}
              sx={{color: "black"}}
            />

            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={formData.password}
              onChange={handleInputChange("password")}
              error={!!fieldErrors.password}
              helperText={
                fieldErrors.password ||
                "Минимум 8 символов, строчная буква, заглавная буква и цифра"
              }
              margin="normal"
              required
              autoComplete="new-password"
              InputProps={{
                sx: {
                  color: "black",
                },
              }}
              sx={{color: "black"}}
            />

            <TextField
              fullWidth
              label="Подтвердите пароль"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange("confirmPassword")}
              error={!!fieldErrors.confirmPassword}
              helperText={fieldErrors.confirmPassword}
              margin="normal"
              required
              autoComplete="new-password"
              InputProps={{
                sx: {
                  color: "black",
                },
              }}
              sx={{color: "black"}}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontSize: "1.1rem",
              }}
            >
              {isLoading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                или
              </Typography>
            </Divider>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Уже есть аккаунт?{" "}
                <Link
                  to="/login"
                  style={{
                    color: "#1976d2",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  Войти
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default RegisterPage
