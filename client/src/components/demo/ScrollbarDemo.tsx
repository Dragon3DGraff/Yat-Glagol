import React from "react"
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  useTheme,
} from "@mui/material"
import {
  getCombinedScrollbarStyles,
  getCombinedThinScrollbarStyles,
  getCombinedAccentScrollbarStyles,
} from "@/utils/scrollbarStyles"

const ScrollbarDemo: React.FC = () => {
  const theme = useTheme()

  const demoItems = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    title: `Элемент списка ${i + 1}`,
    description: `Описание для элемента ${
      i + 1
    }. Это демонстрация того, как выглядит скролл-бар в разных стилях.`,
  }))

  return (
    <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎨 Демонстрация скролл-баров
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 3,
        }}
      >
        {/* Стандартный скролл-бар */}
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            📜 Стандартный скролл-бар
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Обычный скролл-бар (6px) с адаптацией к теме
          </Typography>

          <Box
            sx={{
              height: 300,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              ...getCombinedScrollbarStyles(theme),
            }}
          >
            <List disablePadding>
              {demoItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                    />
                  </ListItem>
                  {index < demoItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Paper>

        {/* Тонкий скролл-бар */}
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            ✨ Тонкий скролл-бар
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ультра-тонкий скролл-бар (4px) с hover эффектом
          </Typography>

          <Box
            sx={{
              height: 300,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              ...getCombinedThinScrollbarStyles(theme),
            }}
          >
            <List disablePadding>
              {demoItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                    />
                  </ListItem>
                  {index < demoItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Paper>

        {/* Акцентный скролл-бар */}
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            🎯 Акцентный скролл-бар
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Скролл-бар в цвете основной темы приложения
          </Typography>

          <Box
            sx={{
              height: 300,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              ...getCombinedAccentScrollbarStyles(theme),
            }}
          >
            <List disablePadding>
              {demoItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                    />
                  </ListItem>
                  {index < demoItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Paper>

        {/* Глобальные стили */}
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            🌍 Глобальные стили
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Автоматически применяется ко всем элементам
          </Typography>

          <Box
            sx={{
              height: 300,
              overflow: "auto",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              // Без дополнительных стилей - используется глобальный
            }}
          >
            <List disablePadding>
              {demoItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <ListItem>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                    />
                  </ListItem>
                  {index < demoItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Paper>
      </Box>

      {/* Инструкции */}
      <Paper sx={{ p: 3, bgcolor: "primary.50" }}>
        <Typography variant="h6" gutterBottom>
          📚 Как использовать:
        </Typography>

        <Box component="ol" sx={{ m: 0, pl: 2 }}>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Импортируйте нужный стиль:</strong>
              <br />
              <code>
                import {`{ getCombinedScrollbarStyles }`} from
                "@/utils/scrollbarStyles"
              </code>
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Получите тему:</strong>
              <br />
              <code>const theme = useTheme()</code>
            </Typography>
          </li>
          <li>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Примените стили:</strong>
              <br />
              <code>sx={`{{ ...getCombinedScrollbarStyles(theme) }}`}</code>
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Глобальные стили</strong> уже настроены в ThemeContext и
              применяются автоматически!
            </Typography>
          </li>
        </Box>
      </Paper>
    </Box>
  )
}

export default ScrollbarDemo
