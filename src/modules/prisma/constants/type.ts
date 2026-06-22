import type { Prisma } from "@prisma/client"
import type { AppErrorDescriptor } from "@src/app.exception"
import type { PRISMA_NOT_FOUND } from "@src/modules/prisma/constants/const"

export type PrismaKnownError = Prisma.PrismaClientKnownRequestError
export type PrismaNotFoundError = PrismaKnownError & { code: typeof PRISMA_NOT_FOUND }
export type PrismaDuplicatedError = {
  field: string
  error: AppErrorDescriptor
}
export type PrismaForeignKeyError = {
  field: string
  error: AppErrorDescriptor
}
export type DriverAdapterCause = {
  kind?: string
  constraint?: {
    fields?: unknown
    index?: unknown
  }
}
