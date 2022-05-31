import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { login, LoginData, RegisterData } from '../services'

import { useDispatch } from 'react-redux'
import { setUser } from '../redux/slices/userSlice'

type Error = { message: string }

type UseLogin = {
  isLoading: boolean
  isLoged: boolean
  error: Error
  sendLogin: (data: LoginData) => void
}

export const useLogin = (): UseLogin => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoged, setIsLoged] = useState(false)
  const [error, setError] = useState<Error>()

  const dispatch = useDispatch()

  const navigate = useNavigate()

  useEffect(() => {
    isLoged && navigate('/chats')}, [isLoged])

  const sendLogin = (data: RegisterData) => {

    setIsLoading(true)
    login(data).then(res => {
      switch (res.status) {
      case 200:
        setIsLoged(true)
        dispatch(setUser(res.data))
        break
      case 204:
        // !res.data.errors.isEmpty && setError(res.data)
        break

      default:
        break
      }
    }).catch(err => {
     err.response && setError(err.response.data)
      }).finally(() => setIsLoading(false))
  }

  return {isLoading, isLoged, error, sendLogin}
}