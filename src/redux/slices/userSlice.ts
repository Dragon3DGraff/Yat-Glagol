import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User } from 'model'

export interface UserState {
  user: User | null
}

const initialState: UserState = {
  user: null,
}

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: ((state, action: PayloadAction<User>) => ({...state, user : action.payload}))
  },
})

// Action creators are generated for each case reducer function
export const { setUser } = userSlice.actions

export default userSlice.reducer