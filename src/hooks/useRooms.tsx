import { Room } from 'model'
import { useState } from 'react'
import { getRooms } from 'services'

type UseRooms = {
 rooms: Room[]
 loadRooms: () => void
 isLoading: boolean
}

export const useRooms = (): UseRooms => {
  const [isLoading, setIsLoading] = useState(false)

  const [rooms, setRooms] = useState<Room[]>([])

  const loadRooms = async () => {
    setIsLoading(true)
    const res = await getRooms()

    res && setRooms(res.data)
    setIsLoading(false)

  }

  return {rooms, loadRooms, isLoading}
}