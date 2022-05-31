import { FC } from 'react'

import { Box, Stack, Typography } from '@mui/material'
import { Message } from 'model'

type OwnProps = {
  message: Message
  isAuthor: boolean
}

export const MessageBalloon: FC<OwnProps> = ({message, isAuthor}) => {
 return (
   <Stack
     alignSelf={isAuthor ? 'end' : 'start'}
     direction='column'
     maxWidth="300px"
   >
     <Stack
       direction="row"
       spacing={1}
     >
       <Typography
         className="messages-author"
         color="gray"
         variant='caption'
       >
         {message.author.name}
       </Typography>

       <Typography
         color='gray'
         variant='caption'
       >
         {new Date( message.time).toLocaleTimeString('ru')}
       </Typography>
     </Stack>

     <Box
       px={1.5}
       py={0.5}
       sx={
            isAuthor ?
              { backgroundColor: '#364954', borderRadius: 3, borderRightStyle: 'outset', borderRightWidth: '8px' } :
              { backgroundColor: '#616161', borderRadius: 3, borderLeftStyle: 'outset', borderLeftWidth: '8px' }
          }
     >
       <Typography color='white'>
         {message.text}
       </Typography>
     </Box>
   </Stack>
)
}