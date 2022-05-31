import { Box, Button, Card, CardContent, Chip, Divider, IconButton, Paper, Stack, TextField, Typography } from '@mui/material'
import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import VideoPanel from './VideoPanel'
import ShareIcon from '@mui/icons-material/Share'
import VideocamIcon from '@mui/icons-material/Videocam'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import InsertPhotoOutlinedIcon from '@mui/icons-material/InsertPhotoOutlined'
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation'
import { Message, Room, User } from 'model'
import { MessageBalloon } from './MessageBalloon'

const SOCKET_IO_URL = 'http://localhost:5000'
// const SOCKET_IO_URL = 'http://192.168.50.232:5000'

type Props = {
  author: User
  room: Room
}

function ChatWindow({ author, room }: Props) {
  const messagesRef = useRef<HTMLUListElement>()
  const inputRef = useRef(null)
  const nameofRoomRef = useRef(null)
  const [message, setMessage] = useState('')
  const [messagesArr, setMessagesArr] = useState([])
  const [chatSocket, setChatsocket] = useState(null)
  const [users, setUsers] = useState([])
  const [chatStyle, setChatStyle] = useState('ChatWindow')
  const [enableVideo, setEnableVideo] = useState(false)
  const [localStream, setLocalStream] = useState(null)

  useEffect(() => {
    const socket = io(SOCKET_IO_URL)

    setChatsocket(socket)
    socket.on('chat message', function (msg) {
      updateMessages(msg)
    })
    socket.emit('user connected', room.id, author.id)
    socket.on('user connected', (fromServer) => {
      setUsers(fromServer.users)
      updateMessages(fromServer.messages)
    })

    return () => {socket.disconnect()}
  }, [room.id, author.id])

  useEffect(() => {
    messagesRef.current.scrollTo(0, 99999)
  }, [messagesArr])

  function updateMessages(messages: Message[]) {
    const messagesComponent = messages.map((message: Message) => (
      <MessageBalloon
        key={message.author.name + message.text}
        isAuthor={message.author.id === author.id}
        message={message}
      />
      // <Stack
      //   key={msg.text + msg.time}
      //   alignSelf={msg.author === author ? 'end' : 'start'}
      //   direction='column'
      //   maxWidth="300px"
      // >
      //   <Stack
      //     direction="row"
      //     spacing={1}
      //   >
      //     <Typography
      //       className="messages-author"
      //       color="gray"
      //       variant='caption'
      //     >
      //       {msg.author}
      //     </Typography>

      //     <Typography
      //       color='gray'
      //       variant='caption'
      //     >
      //       {msg.time}
      //     </Typography>
      //   </Stack>

      //   <Box
      //     px={1.5}
      //     py={0.5}
      //     sx={
      //       msg.author === author ?
      //         { backgroundColor: '#1a237e', borderRadius: 3, borderRightStyle: 'outset', borderRightWidth: '8px' } :
      //         { backgroundColor: '#616161', borderRadius: 3, borderLeftStyle: 'outset', borderLeftWidth: '8px' }
      //     }
      //   >
      //     <Typography color='white'>
      //       {msg.text}
      //     </Typography>

      //   </Box>

      // </Stack>
    ))

    setMessagesArr(messagesComponent)
  }

  function sendMessage(e) {
    e.preventDefault()
    if (message === '') return
    chatSocket.emit('chat message', room.id, {
      text: message,
      author: author,
      time: new Date()
      // .toLocaleString('ru', {
      //   hour: 'numeric',
      //   minute: 'numeric',
      //   second: 'numeric',
      // }
      // ),
    })
    setMessage('')
    inputRef.current.focus()
  }

  function changeMessage(e) {
    setMessage(e.target.value)
  }

  function onCopyLink() {
    const range = document.createRange()
    const selection = window.getSelection()

    selection.removeAllRanges()
    range.selectNodeContents(nameofRoomRef.current)
    selection.addRange(range)
    document.execCommand('copy')
    selection.removeAllRanges()
    alert(`Link "${range}" copied`)
  }

  function onInputFocus(e) {
    setChatStyle('ChatWindow-Activated')
  }

  function onInputFocusOut(e) {
    setChatStyle('ChatWindow')
  }

  const onVideoClick = () => {
    console.log(navigator.mediaDevices)
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream)
        setEnableVideo((prev) => !prev)
      })
  }

  return (

    <Stack direction="row">
      <Card>
        <CardContent>
          <Stack direction="row" >
            <Stack spacing={2}>
              <Stack
                ref={messagesRef}
                alignItems="flex-end"
                direction="column"
                height="350px"
                id="messages"
                maxHeight="300px"
                maxWidth="400px"
                minWidth="100px"
                overflow='auto'
                px={1}
                spacing={2}
              >
                {messagesArr}
              </Stack>

              <Stack
                direction="row"
                spacing={0.5}
                width="100%"
              >
                <TextField
                  multiline
                  autoComplete="off"
                  className="messageInput"
                  id={`messageInput${room.name}`}
                  inputRef={inputRef}
                  size='small'
                  value={message}
                  onBlur={onInputFocusOut}
                  onChange={changeMessage}
                  onFocus={onInputFocus}
                />

                <Button
                  size='small'
                  variant="contained"
                  onClick={sendMessage}
                >
                  Молвить
                </Button>

                <IconButton>
                  <SentimentSatisfiedAltIcon />
                </IconButton>

                <IconButton>
                  <InsertPhotoOutlinedIcon />
                </IconButton>

              </Stack>

            </Stack>

            <Divider
              flexItem
              orientation="vertical"
            />

            <Stack
              pl={2}
              width="220px"
            >
              <Stack
                alignItems="center"
                direction="row"
              >
                <Typography color="GrayText">
                  {room.name}
                </Typography>

                <Box ml="auto">
                  <IconButton onClick={onCopyLink}>
                    <ShareIcon fontSize='small' />
                  </IconButton>

                  <IconButton onClick={onVideoClick}>
                    <VideocamIcon />
                  </IconButton>

                  <IconButton >
                    <ThreeDRotationIcon />
                  </IconButton>

                </Box>

              </Stack>

              <Typography>
                {`В сети (${users.length})`}
              </Typography>

              {enableVideo ? (
                <VideoPanel
                  author={author}
                  localStream={localStream}
                  roomName={room.name}
                  socket={chatSocket}
                  users={users}
                />
              ) : null}

              <Stack
                // height="270px"
                overflow="auto"
              >
                {users.map((user) => (
                  <Stack key={user.id + user.name}>
                    {user.name}
                  </Stack>
                ))}

              </Stack>

            </Stack>
          </Stack>

          <Typography ref={nameofRoomRef}>
            {encodeURI(window.location.origin + '/?' + room.id)}
          </Typography>
        </CardContent>
      </Card>

    </Stack>

  )
}

export default ChatWindow
