import { Theme } from "@mui/material/styles"

// Кастомные стили для скролл-бара
export const getScrollbarStyles = (theme: Theme) => ({
  // Основной контейнер скролл-бара
  "&::-webkit-scrollbar": {
    width: "6px",
    height: "6px",
  },

  // Трек скролл-бара (фон)
  "&::-webkit-scrollbar-track": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.05)",
    borderRadius: "3px",
  },

  // Ползунок скролл-бара
  "&::-webkit-scrollbar-thumb": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(0, 0, 0, 0.2)",
    borderRadius: "3px",
    transition: "background-color 0.2s ease",

    "&:hover": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.3)"
          : "rgba(0, 0, 0, 0.3)",
    },

    "&:active": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.4)"
          : "rgba(0, 0, 0, 0.4)",
    },
  },

  // Угловой элемент (где встречаются вертикальный и горизонтальный скролл)
  "&::-webkit-scrollbar-corner": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.05)",
  },
})

// Стили для тонкого скролл-бара (еще тоньше)
export const getThinScrollbarStyles = (theme: Theme) => ({
  "&::-webkit-scrollbar": {
    width: "4px",
    height: "4px",
  },

  "&::-webkit-scrollbar-track": {
    backgroundColor: "transparent",
  },

  "&::-webkit-scrollbar-thumb": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.15)",
    borderRadius: "2px",
    transition: "all 0.2s ease",

    "&:hover": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? "rgba(255, 255, 255, 0.25)"
          : "rgba(0, 0, 0, 0.25)",
      width: "6px",
    },
  },

  "&::-webkit-scrollbar-corner": {
    backgroundColor: "transparent",
  },
})

// Стили для скролл-бара с акцентным цветом
export const getAccentScrollbarStyles = (theme: Theme) => ({
  "&::-webkit-scrollbar": {
    width: "6px",
    height: "6px",
  },

  "&::-webkit-scrollbar-track": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.05)",
    borderRadius: "3px",
  },

  "&::-webkit-scrollbar-thumb": {
    backgroundColor: theme.palette.primary.main + "40", // 25% прозрачности
    borderRadius: "3px",
    transition: "all 0.2s ease",

    "&:hover": {
      backgroundColor: theme.palette.primary.main + "60", // 37% прозрачности
    },

    "&:active": {
      backgroundColor: theme.palette.primary.main + "80", // 50% прозрачности
    },
  },

  "&::-webkit-scrollbar-corner": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.05)"
        : "rgba(0, 0, 0, 0.05)",
  },
})

// Универсальные стили для Firefox (поддержка ограничена)
export const getFirefoxScrollbarStyles = (theme: Theme) => ({
  scrollbarWidth: "thin" as const,
  scrollbarColor:
    theme.palette.mode === "dark"
      ? "rgba(255, 255, 255, 0.2) rgba(255, 255, 255, 0.05)"
      : "rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05)",
})

// Комбинированные стили (Webkit + Firefox)
export const getCombinedScrollbarStyles = (theme: Theme) => ({
  ...getScrollbarStyles(theme),
  ...getFirefoxScrollbarStyles(theme),
})

export const getCombinedThinScrollbarStyles = (theme: Theme) => ({
  ...getThinScrollbarStyles(theme),
  ...getFirefoxScrollbarStyles(theme),
})

export const getCombinedAccentScrollbarStyles = (theme: Theme) => ({
  ...getAccentScrollbarStyles(theme),
  ...getFirefoxScrollbarStyles(theme),
})
