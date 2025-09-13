import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"
import { Socket } from "socket.io"

interface AuthenticatedRequest extends Request {
  userId?: number
  user?: any
}

interface AuthenticatedSocket extends Socket {
  userId: number
  user?: any
}

export class AuthMiddleware {
  private static get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET || "your-secret-key"
    if (process.env.NODE_ENV === "development" && !process.env.JWT_SECRET) {
      console.warn(
        "[AUTH WARNING] JWT_SECRET not set in environment, using default"
      )
    }
    return secret
  }

  static generateToken(userId: number, email: string): string {
    return jwt.sign({ userId, email }, AuthMiddleware.JWT_SECRET, {
      expiresIn: "7d",
    })
  }

  static verifyToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    try {
      const authHeader = req.headers.authorization

      // Отладочная информация в dev режиме
      if (process.env.NODE_ENV === "development") {
        console.log(`[AUTH DEBUG] ${req.method} ${req.path}`)
        console.log(
          `[AUTH DEBUG] Authorization header:`,
          authHeader ? "Present" : "Missing"
        )
      }

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[AUTH DEBUG] Token not provided or invalid format`)
        }
        res.status(401).json({ error: "Токен не предоставлен" })
        return
      }

      const token = authHeader.substring(7)

      const decoded = jwt.verify(token, AuthMiddleware.JWT_SECRET) as any
      req.userId = decoded.userId
      req.user = decoded

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AUTH DEBUG] Token verified successfully for user:`,
          decoded.userId
        )
      }

      next()
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AUTH DEBUG] Token verification failed:`,
          error instanceof Error ? error.message : error
        )
      }

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: "Токен истек" })
      } else if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ error: "Недействительный токен" })
      } else {
        res.status(500).json({ error: "Ошибка сервера при проверке токена" })
      }
    }
  }

  static authenticateSocket(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
  ): void {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace("Bearer ", "")

      if (!token) {
        next(new Error("Токен не предоставлен"))
        return
      }

      const decoded = jwt.verify(token, AuthMiddleware.JWT_SECRET) as any
      socket.userId = decoded.userId
      socket.user = decoded

      next()
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(new Error("Токен истек"))
      } else if (error instanceof jwt.JsonWebTokenError) {
        next(new Error("Недействительный токен"))
      } else {
        next(new Error("Ошибка сервера при проверке токена"))
      }
    }
  }

  static optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    try {
      const authHeader = req.headers.authorization

      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, AuthMiddleware.JWT_SECRET) as any
        req.userId = decoded.userId
        req.user = decoded
      }

      next()
    } catch (error) {
      // Игнорируем ошибки для опционального middleware
      next()
    }
  }

  static refreshToken(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void {
    try {
      if (!req.userId) {
        res.status(401).json({ error: "Пользователь не аутентифицирован" })
        return
      }

      const newToken = this.generateToken(req.userId, req.user.email)
      res.json({ token: newToken })
    } catch (error) {
      res.status(500).json({ error: "Ошибка обновления токена" })
    }
  }

  static requireRole(roles: string[]) {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      if (!req.user || !roles.includes(req.user.role)) {
        res.status(403).json({ error: "Недостаточно прав доступа" })
        return
      }
      next()
    }
  }
}
