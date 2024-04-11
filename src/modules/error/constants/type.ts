import { HttpStatus } from "@nestjs/common"
import { ModuleNames } from "@src/constants"

/**
 * * The Error Information Type
 */
export type ErrorInfo = {
    code: number
    module: ModuleNames
    translation: string
    message: string
    statusCode?: HttpStatus
}

/**
 * * This type used for the object that collects all the errors
 */
export type TranslationMapRecordType = Record<string, ErrorUnit>
export type ErrorUnit = {
    [key: number]: ErrorInfo
}

/**
 * * Used for Find Error
 */
export type FindErrorInput = Omit<CreateErrorInput, "error">
export type CreateErrorInput = {
    module: string
    code: number
    error?: Error
}

/**
 * * Used for creating new error
 */
export type GenerateErrorType = Record<string, ErrorType>
export type ErrorType = {
    message: string
    translation?: string
    code?: number
    module?: ModuleNames
    statusCode?: number
    timestamp?: string
}
