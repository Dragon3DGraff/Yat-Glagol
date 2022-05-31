import axios from 'axios'

export const getRooms = async () => {
  return await axios.get('/api/rooms/all').catch((e) => console.log(e))

}