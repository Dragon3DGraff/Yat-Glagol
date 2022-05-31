import { Paper, Stack } from '@mui/material'
import {Chats} from 'Components/Chats'
import { Footer } from './Footer'
import { Header, ThemeType } from './Header'

import { ThemeProvider, createTheme } from '@mui/material/styles'
import { FC, useCallback, useState } from 'react'

type Props = {
  roomId?: string
}
const MainScreen: FC<Props> = ({roomId}) => {
  const [theme, setTheme ] = useState<ThemeType>('dark')

  const darkTheme = createTheme({
  palette: {
    mode: theme,
  },
})

const setThemeHandler = useCallback((theme: ThemeType) => {
  setTheme(theme)
},[setTheme])

  return (
    <ThemeProvider theme={darkTheme}>
      <Paper square>
        <Stack
          boxSizing="inherit"
          height="100vh"
          m={0}
          overflow="auto"
          width="100vw"
        >
          <Header
            theme={theme}
            onThemeChange={setThemeHandler}
          />

          <Stack
            flexGrow={1}
          >
            <Chats roomId={roomId} />
          </Stack>

          <Footer />

        </Stack>

      </Paper>

    </ThemeProvider>
  )
}

export default MainScreen