import React from "react"
import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"

interface PrivateRouteProps {
  children: React.ReactNode
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default PrivateRoute
