import React, { createContext, useContext, useState, ReactNode } from "react"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { CssBaseline } from "@mui/material"

type ThemeMode = "light" | "dark"

interface ThemeContextType {
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

interface CustomThemeProviderProps {
  children: ReactNode
}

export const CustomThemeProvider: React.FC<CustomThemeProviderProps> = ({
  children,
}) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    // Загружаем сохраненную тему из localStorage
    const savedTheme = localStorage.getItem("theme") as ThemeMode
    return savedTheme || "light"
  })

  const toggleTheme = () => {
    const newMode = mode === "light" ? "dark" : "light"
    setMode(newMode)
    localStorage.setItem("theme", newMode)
  }

  // Создаем тему на основе текущего режима
  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "light" ? "#1976d2" : "#90caf9",
      },
      secondary: {
        main: mode === "light" ? "#dc004e" : "#f48fb1",
      },
      background: {
        default: mode === "light" ? "#f5f5f5" : "#121212",
        paper: mode === "light" ? "#ffffff" : "#1e1e1e",
      },
      text: {
        primary: mode === "light" ? "#000000" : "#ffffff",
        secondary: mode === "light" ? "#666666" : "#b3b3b3",
      },
    },
    typography: {
      fontFamily: '"Roboto", "Arial", sans-serif',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            margin: 0,
            padding: 0,
            fontFamily: '"Roboto", "Arial", sans-serif',
            backgroundColor: mode === "light" ? "#f5f5f5" : "#121212",
            color: mode === "light" ? "#000000" : "#ffffff",
          },
          "*": {
            boxSizing: "border-box",
            // Firefox скролл-бар
            scrollbarWidth: "thin",
            scrollbarColor:
              mode === "dark"
                ? "rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)",
          },
          "html, body, #root": {
            height: "100%",
          },
          // Webkit скролл-бары (Chrome, Safari, Edge)
          "*::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
          },
          "*::-webkit-scrollbar-track": {
            backgroundColor:
              mode === "dark"
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
            borderRadius: "3px",
          },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor:
              mode === "dark"
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.2)",
            borderRadius: "3px",
            transition: "background-color 0.2s ease",
            "&:hover": {
              backgroundColor:
                mode === "dark"
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(0, 0, 0, 0.3)",
            },
          },
          "*::-webkit-scrollbar-corner": {
            backgroundColor:
              mode === "dark"
                ? "rgba(255, 255, 255, 0.05)"
                : "rgba(0, 0, 0, 0.05)",
          },
        },
      },
      // Дополнительные стили для лучшей поддержки темной темы
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage:
              mode === "dark"
                ? "linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))"
                : "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "light" ? "#1976d2" : "#1e1e1e",
          },
        },
      },
    },
  })

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}
