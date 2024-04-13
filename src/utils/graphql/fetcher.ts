import { PrismaClient, Role } from "@prisma/client"
import { serverAddress } from "@src/constants"
import { EnvConfigService } from "@src/modules/config/env-config.service"
import { Thunder } from "@src/utils/graphql/zeus"
import hasha from "hasha"

/**
 * * Implementation Fetch class for request to server (use in testing)
 */
class Fetch {
    jwtToken: string = null
    private apiConfigService: EnvConfigService = null
    private prisma: PrismaClient = null

    setApiConfig(apiConfigService: EnvConfigService) {
        this.apiConfigService = apiConfigService
    }

    setPrismaClient(prisma: PrismaClient) {
        this.prisma = prisma
    }

    /**
     * * Main point of send request
     */
    private thunder = Thunder(async (query, variables) => {
        try {
            const response = await fetch(serverAddress, {
                body: JSON.stringify({ query, variables }),
                method: "POST",
                headers: this.makeHeader(),
            })

            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            //@ts-ignore
            const { data, errors } = await response.json()
            const hasError = this.hasError(errors)

            if (hasError) throw errors

            return data
        } catch (err) {
            return Promise.reject(err)
        }
    })

    /**
     * * Handling Errors in request response
     * @param data request's response
     * @returns result of check that res have error
     */
    private hasError(data: any): boolean {
        let result = false
        if (data) {
            const value = Object.values(data).filter((val) => !!val)
            result = value.length > 0 ? true : false
        }
        return result
    }

    /**
     * * Generate header for request (add Authorization token)
     * @returns header for request
     */
    private makeHeader() {
        const token = this.jwtToken
        const result = {
            "Content-Type": "application/json",
        }

        if (token) result["Authorization"] = `jwt ${token}`

        return result
    }

    /**
     * * Common function for login to the server with username and password
     * @param username user's username
     * @param password user's password
     */
    async loginAs(username: string, password: string) {
        const {
            logIn: { jwt },
        } = await this.mutation({
            logIn: [{ data: { username, password: password } }, { jwt: true }],
        })

        this.jwtToken = jwt
    }

    async setAdminMode() {
        const username = this.apiConfigService.defaultSuperUser.username
        const password = this.apiConfigService.defaultSuperUser.password

        const {
            logIn: { jwt },
        } = await this.mutation({
            logIn: [{ data: { username, password: password } }, { jwt: true }],
        })

        this.jwtToken = jwt
    }

    async setMemberMode() {
        const username = this.apiConfigService.defaultMemberUser.username
        const password = this.apiConfigService.defaultMemberUser.password

        const {
            logIn: { jwt },
        } = await this.mutation({
            logIn: [{ data: { username, password: password } }, { jwt: true }],
        })

        this.jwtToken = jwt
    }

    setAnonymousMode() {
        this.jwtToken = ""
    }

    async resetDatabase() {
        await Promise.all([await this.prisma.users.deleteMany()])
    }

    async createSuperUser() {
        const password = await hasha.async(
            this.apiConfigService.defaultSuperUser.password,
            {
                algorithm: "sha1",
            },
        )
        await this.prisma.users.create({
            data: {
                name: this.apiConfigService.defaultSuperUser.name,
                password,
                username: this.apiConfigService.defaultSuperUser.username,
                role: Role.Admin,
            },
        })
    }

    async createMemberUser() {
        const password = await hasha.async(
            this.apiConfigService.defaultMemberUser.password,
            {
                algorithm: "sha1",
            },
        )
        await this.prisma.users.create({
            data: {
                name: this.apiConfigService.defaultMemberUser.name,
                password,
                username: this.apiConfigService.defaultMemberUser.username,
            },
        })
    }

    mutation = this.thunder("mutation")
    query = this.thunder("query")
}

export const fetchService = new Fetch()
