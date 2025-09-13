import React from "react"
import { Box, CircularProgress, Typography } from "@mui/material"

interface LoadingScreenProps {
  message?: string
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Загрузка...",
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <CircularProgress size={60} sx={{ mb: 3 }} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
        Ять-глагол
      </Typography>
    </Box>
  )
}

export default LoadingScreen
