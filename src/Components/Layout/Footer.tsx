import { Link, Stack } from '@mui/material'

export const Footer = () => {
  return (
    <Stack
      alignItems='center'
      bgcolor="#424242"
      direction="row"
      height="40px"
      justifyContent="right"
      minHeight="40px"
      px={2}
    >
      <Link
        href='https://dragon3dgraff.ru/'
        rel="noopener noreferrer"
        target="_blank"
      >
        Dragon3DGraff ®
      </Link>

    </Stack>
  )
}