import { Role } from "@prisma/client"

/**
 * * This type is used to generate _tokenGuard in request header
 */
export type TokenGuardData = {
    user?: {
        id: string
        username: string
        active: boolean
        role: Role
    }
    payload?: {
        jwtInitDate: number
    }
    tokenError?: {
        name: string
        message: string
        date?: Date
        expiredAt?: number
    }
}

/**
 * * This type is used to generate jwt token without any field
 */
export type JwtPayloadType = {
    username: string
    id: string
}

/**
 * * This type is used to generate jwt token
 */
export type JwtType = {
    username: string
    id: string
    iat: number
    exp: number
}
