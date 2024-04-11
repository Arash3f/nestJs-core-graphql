import { PrismaClient } from "@prisma/client"

/**
 * * Reset all Database tables
 * @param prisma Prisma Service
 */
export async function resetDatabase(prisma: PrismaClient) {
    await Promise.all([await prisma.users.deleteMany()])
}
