import { Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './Components/Auth/HomePage'
import { useTestAuth } from 'hooks/useTestAuth'
import { Box, LinearProgress } from '@mui/material'

import { Suspense, lazy } from 'react'

const MainScreen = lazy(() => import('./Components/Layout/MainScreen'))
const LogiIn = lazy(() => import('./Components/Auth/LoginIn'))
const Registration = lazy(() => import('./Components/Auth/Registration'))

function App() {
  const { isLoading } = useTestAuth()
   const location = useLocation()

  if (isLoading) return (
    <Box>
      <LinearProgress />
    </Box>
  )

  return (
    <Suspense fallback='Загрузка...'>

      <Routes>
        <Route
          element={
            <HomePage />
          }
          path="/"
        />

        <Route
          element={<MainScreen roomId={location.search} />}
          path="/chats"
        />

        <Route
          element={<LogiIn />}
          path="/login"
        />

        <Route
          element={<Registration />}
          path="/registration"
        />

      </Routes>

    </Suspense>
  )
}

export default App
