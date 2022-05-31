import { Message } from 'model'
import { User } from './User'

export type Room ={
  id: string
  name: string
  messages: Message[]
  users: User[]
  owner: string
}