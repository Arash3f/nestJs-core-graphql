// import { INestApplication, ValidationPipe } from "@nestjs/common"
// import { JwtService } from "@nestjs/jwt"
// import { Test } from "@nestjs/testing"
// import { AppModule } from "@src/app.module"
// import { TokenGuard } from "@src/common/guard/token.guard"
// import { EnvConfigService } from "@src/modules/config/env-config.service"
// import { InitModule } from "@src/modules/init/init.module"
// import { PrismaService } from "@src/modules/prisma/prisma.service"
// import { fetchService } from "@src/utils/graphql/fetcher"
// import { resetDatabase } from "@src/utils/test-utils"

// describe("Error Module", () => {
//     let app: INestApplication
//     let prisma: PrismaService
//     let apiConfig: EnvConfigService
//     let jwt: JwtService

//     /**
//      * * Create a Instance of project
//      */
//     async function createModule() {
//         const module = await Test.createTestingModule({
//             imports: [AppModule, InitModule],
//         }).compile()

//         app = module.createNestApplication()
//         prisma = module.get(PrismaService)
//         app.useGlobalPipes(new ValidationPipe({ transform: true }))

//         const prismaService = app.get(PrismaService)
//         const jwtService = app.get(JwtService)
//         const apiConfigService = app.get(EnvConfigService)
//         app.useGlobalGuards(
//             new TokenGuard(jwtService, prismaService, apiConfigService),
//         )

//         /**
//          * * For access to project modules, we need this lines
//          */
//         apiConfig = module.get(EnvConfigService)
//         jwt = module.get(JwtService)

//         await app.listen(apiConfig.serverPort)
//     }

//     beforeAll(async () => {
//         await createModule()
//     })

//     beforeEach(async () => {
//         await resetDatabase(prisma)
//         fetchService.jwtToken = ""
//     })

//     afterAll(async () => {
//         await app.close()
//     })

//     /**
//      * ! Auto Operations
//      */
//     it("+ Auto Successfully", async () => {
//         return true
//     })
// })
