import { FC } from 'react'

import { Box, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material'

export type ThemeType = 'dark' | 'light'

type OwnProps = {
  theme: ThemeType
  onThemeChange: (theme: ThemeType) => void
}

export const Header: FC<OwnProps> = ({theme, onThemeChange}) => {
  const onThemeSwitch = (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
    onThemeChange(checked ? 'dark' : 'light')
  }

  return (
    <Paper square>
      <Stack
        alignItems='center'
        direction="row"
        justifyContent="center"
      >
        <Box
          mr="auto"
          pl={2}
        >
          <FormControlLabel
            control={(
              <Switch
                checked={theme === 'dark'}
                name="themeSwitch"
                onChange={onThemeSwitch}
              />
            )}
            label={theme === 'dark' ? 'Тьма' : 'Свет'}
          />
        </Box>

        <Typography
          mr="auto"
          variant="h2"
        >
          &#1123;-ГлаголЪ
        </Typography>
      </Stack>

    </Paper>

  )
}