import { Avatar, List, ListItemAvatar, ListItemButton, ListItemText } from '@mui/material'
import { deepOrange } from '@mui/material/colors'
import { Room } from 'model'

type OwnProps ={
 rooms: Room[]
 onRoomNameClick: (room: Room) => void
 selectedRoomName: string
}

export const RoomsList = ({rooms, selectedRoomName, onRoomNameClick}:OwnProps) => {
return (
  <List
    dense
    component="nav"
  >
    {rooms.map((room, index) => (
      <ListItemButton
        key={room.id}
        selected={selectedRoomName === room.name}
        onClick={() => onRoomNameClick(room)}
      >
        <ListItemAvatar>
          <Avatar
            src={`https://i.pravatar.cc/50?img=${index + 6}`}
            sx={{ bgcolor: deepOrange[500] }}
          />

        </ListItemAvatar>

        <ListItemText>
          {room.name}
        </ListItemText>
      </ListItemButton>
          ))}
  </List>
)
}