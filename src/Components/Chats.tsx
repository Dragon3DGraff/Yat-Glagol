import React, { useState, useEffect } from 'react'
import ChatWindow from './ChatWindow'
import io from 'socket.io-client'
import { Avatar, Button, IconButton, List, ListItemAvatar, ListItemButton, ListItemText, Menu, MenuItem, MenuList, Stack, TextField, Typography } from '@mui/material'
import { useLogout } from 'hooks/useLogout'
import { useRooms } from 'hooks'
import { Room } from 'model'
import MenuIcon from '@mui/icons-material/Menu'
import { RoomsList } from './RoomsList'
import axios from 'axios'

import { RootState } from '../redux/store'
import { useSelector } from 'react-redux'

// const SOCKET_IO_URL = "http://localhost:5000";
const SOCKET_IO_URL = 'http://192.168.50.232:5000'

const socket = io(SOCKET_IO_URL)

type OwnProps = {
  roomId?: string
}

export const Chats = ({ roomId }: OwnProps) => {
  const [nameOfRoom, setNameOfRoom] = useState('')
  const { rooms, loadRooms, isLoading: isRoomsLoading } = useRooms()
  const [connectedRooms, setConnectedRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState<Room>()

  const [isOpen, setIsOpen] = useState(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)

  const { sendLogout } = useLogout()

   const author = useSelector((state: RootState) => state.user.user)

  useEffect(() => {
    // let isSubscribed = true

    loadRooms()
    //add socket when room created
    socket.on('room created', loadRooms)

    return () => { socket.disconnect() }

    // return () => (isSubscribed = false)
  }, [])

  useEffect(() => {
    if (
      roomId !== '' &&
     rooms && rooms.some(item => item.id === roomId) &&
      !connectedRooms.includes(roomId)
    ) {
      setConnectedRooms([roomId, ...connectedRooms])
    }
    // return () => {socket.disconnect()}

    rooms && setSelectedRoom(rooms[0])

  }, [rooms])

  const onInputChange = (e: { target: { value: React.SetStateAction<string> } }) => {
    setNameOfRoom(e.target.value)
  }

  const onCreateRoomClick = async () => {
    if (!nameOfRoom) return alert('Please, enter name of room')
    // onRoomCreate(nameOfRoom)
    try {
      await axios.post('api/rooms/create', { author: author.id, nameOfRoom })
    socket.emit('room created', nameOfRoom)
    loadRooms()
    setConnectedRooms([nameOfRoom, ...connectedRooms])
    setNameOfRoom('')
    } catch (error) {
      alert(error.response.data.message)

    }

    // setSelectedRoom(nameOfRoom)
  }
  const onRoomNameClick = (room: Room) => {
    // if (connectedRooms.some(item => item.name === pathname).includes(room)) return
    // setConnectedRooms([room])
    setSelectedRoom(room)
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setIsOpen(true)
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setIsOpen(false)
    setAnchorEl(null)
  }

  return (
    <Stack
      alignItems='center'
      justifyContent="center"
      maxHeight="500px"
    >

      <Stack
        alignItems="baseline"
        direction='row'
        spacing={1}
      >
        <Typography>
          Вы -
        </Typography>

        <Typography
          color='primary'
          fontWeight="bold"
        >
          {author.name}
        </Typography>

        {/* <Button size='small' variant='text' onClick={() => sendLogout()}>Выйти</Button> */}

        <div>
          <IconButton
            aria-controls={open ? 'basic-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            aria-haspopup="true"
            id="basic-button"
            size='small'
            onClick={handleClick}
          >
            <MenuIcon />
          </IconButton>

          <Menu
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
            anchorEl={anchorEl}
            id="basic-menu"
            open={isOpen}
            onClose={handleClose}
          >
            <MenuItem>
              <Avatar
                src={`https://i.pravatar.cc/50?img=${6}`}
              />
            </MenuItem>

            <MenuItem onClick={handleClose}>
              Создать комнату
            </MenuItem>

            <MenuItem onClick={handleClose}>
              Настройки
            </MenuItem>

            <MenuItem onClick={() => {
              handleClose()
              sendLogout()
            }}
            >
              Выйти
            </MenuItem>
          </Menu>
        </div>
      </Stack>

      <Stack
        alignItems="center"
        direction='row'
        justifyContent='center'
        spacing={1}
        width='100%'
      >
        <TextField
          className="Chats-inputNewRoom"
          placeholder="Имя комнаты"
          size="small"
          value={nameOfRoom}
          variant='standard'
          onChange={onInputChange}
        >
        </TextField>

        <Button onClick={onCreateRoomClick}>
          Создать
        </Button>
      </Stack>

      <Stack direction="row">

        {rooms &&(
          <RoomsList
            rooms={rooms}
            selectedRoomName={selectedRoom?.name}
            onRoomNameClick={onRoomNameClick}
          />
)}

        {selectedRoom && (
          <ChatWindow
            author={author}
            room={selectedRoom}
          />
        )}
      </Stack>
    </Stack >
  )
}
