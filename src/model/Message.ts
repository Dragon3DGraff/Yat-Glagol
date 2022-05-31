import { User } from 'model'

export type Message = {
 id: string
 text: string
 author: User
 time: Date
}