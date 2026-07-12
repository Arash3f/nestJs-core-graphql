import type { PrismaClient } from "@prisma/client"
import type { EnvConfigService } from "@src/modules/config/env-config.service"
import type { CreateUserInput } from "@src/modules/user/dto/create-user.input"
import type { GraphQLResponse } from "@src/utils/graphql/zeus"
import { Chain } from "@src/utils/graphql/zeus"
import * as argon2 from "argon2"

/**
 * Normalized error body the app surfaces to clients. The `CoreExceptionFilter`
 * stows it under `extensions.originalError` and `app.module.ts`'s `formatError`
 * promotes it to the GraphQL error's top-level `extensions`, so every handled
 * error arrives here under `response.errors[0].extensions`.
 */
export interface GraphqlErrorBody {
  code?: number | string
  module?: string
  message?: string
  persianTranslation?: string
  statusCode?: number
  [key: string]: unknown
}

/**
 * Pulls the normalized {@link GraphqlErrorBody} out of an error thrown by the
 * Zeus client.
 *
 * Zeus throws its own `GraphQLError` carrying the raw GraphQL response on
 * `.response`; the app's handled errors (AppException / ValidationPipe) live in
 * `response.errors[0].extensions`. Native GraphQL schema errors (a missing or
 * unknown input field, rejected before the resolver runs) have no `extensions`
 * body, so we fall back to the error message.
 *
 * @param err - The value thrown by an `api.query` / `api.mutation` call.
 * @returns The normalized error body, or a `{ message }` fallback.
 */
export function extractGraphqlError(err: unknown): GraphqlErrorBody | undefined {
  if (typeof err === "string") return { message: err }

  // Two shapes reach here from the Zeus client:
  //  - On HTTP 200 with an `errors` array (the app's handled errors — an
  //    AppException or a ValidationPipe `400` normalized by CoreExceptionFilter)
  //    Zeus throws its own `GraphQLError`, carrying the body on `.response`.
  //  - On a non-2xx response (e.g. Apollo's HTTP 400 for a schema-level
  //    validation failure: a missing or unknown input field) the parsed body
  //    is rejected directly, so it *is* the `{ errors }` object.
  const obj = err as { response?: GraphQLResponse; errors?: unknown[] }
  const response = obj?.response ?? obj
  const first = (
    response?.errors as Array<{ extensions?: GraphqlErrorBody; message?: string }> | undefined
  )?.[0]

  // The GraphQL error message lives on `errors[0].message`; the normalized app
  // body (for handled errors) lives on `errors[0].extensions`. Merge them so
  // callers can assert on either.
  if (first) return { message: first.message, ...first.extensions }
  if (err instanceof Error) return { message: err.message }
  return undefined
}

/**
 * Per-request overrides. Currently only used to send a different `User-Agent`
 * (the device fingerprint is a SHA-256 of that header), letting refresh-token
 * tests simulate a request from a device the session was not bound to.
 */
export interface RequestOptions {
  headers?: Record<string, string>
}

/** Reusable Zeus selections so specs don't repeat field lists. */
export const TOKENS_SELECTION = { accessToken: true, refreshToken: true } as const
export const SUCCESS_SELECTION = { success: true } as const
export const USER_SELECTION = {
  id: true,
  name: true,
  username: true,
  active: true,
  role: true,
  createdDate: true,
  updatedDate: true,
} as const

/**
 * Helper used by e2e specs to drive the running app through its GraphQL API
 * (via the generated Zeus client) and to seed/reset the database directly
 * through Prisma. A single instance is shared across a spec file: configure it
 * once with {@link TestApiCaller.setApiConfig} / {@link TestApiCaller.setPrismaClient},
 * then switch auth context per test with the `set*Mode` methods.
 *
 * Operations are NOT wrapped one-by-one: `query` / `mutation` are fully-typed
 * passthroughs to the Zeus client, so a new resolver needs no changes here —
 * regenerate the client (`pnpm run api`) and call it from the spec.
 *
 * Two roles can be impersonated, matching the app's single privileged guard:
 * - admin  (`Role.Admin`)  → passes `IsAdminGuard`
 * - member (`Role.Member`) → fails `IsAdminGuard`, passes `IsLoggedInGuard`
 *
 * Both fixtures come from the validated env config (`defaultSuperUser`, whose
 * role is `Role.Admin`, and `defaultMemberUser`), so credentials stay in sync
 * with what the app's `InitService` seeds.
 */
export class TestApiCaller {
  /**
   * Typed env-config service, source of the default admin/member credentials
   * and the Argon2 hash cost parameters.
   */
  private apiConfigService: EnvConfigService
  /**
   * Prisma client used for direct DB seeding/wiping (bypassing the GraphQL API).
   */
  private prisma: PrismaClient

  /** Absolute URL of the running app's GraphQL endpoint. */
  private url = ""
  /** Bearer token attached to every request, or `null` when anonymous. */
  private accessToken: string | null = null
  /**
   * Stable `User-Agent` for every request, so the device fingerprint (a
   * SHA-256 of this header) is identical across a login and its later refresh.
   */
  private userAgent = "e2e-test-runner/1.0"

  /**
   * Builds a Zeus client bound to the current auth/device headers. Specs use the
   * typed {@link TestApiCaller.query} / {@link TestApiCaller.mutation} shortcuts;
   * reach for `gql({ headers })` directly only to override a header per request
   * (e.g. a different `User-Agent` to simulate another device).
   *
   * @param opts - Per-request header overrides.
   */
  gql(opts: RequestOptions = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": this.userAgent,
      ...opts.headers,
    }
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`
    }
    return Chain(this.url, { headers })
  }

  /** Run any typed GraphQL query with the current auth/device headers. */
  get query() {
    return this.gql()("query")
  }

  /** Run any typed GraphQL mutation with the current auth/device headers. */
  get mutation() {
    return this.gql()("mutation")
  }

  /**
   * Injects the env-config service (source of the default user credentials and
   * Argon2 cost parameters) and resolves the GraphQL endpoint URL from it.
   *
   * @param apiConfigService - The application's typed env-config service.
   */
  setApiConfig(apiConfigService: EnvConfigService) {
    this.apiConfigService = apiConfigService
    // The app binds 0.0.0.0 (all interfaces); connect over the loopback.
    this.url = `http://127.0.0.1:${apiConfigService.serverPort}/graphql`
  }

  /**
   * Injects the Prisma client used for direct database seeding and wiping.
   *
   * @param prisma - The application's Prisma client.
   */
  setPrismaClient(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Attaches (or clears) the bearer token sent on every subsequent request.
   *
   * @param accessToken - The token to attach, or `null` to go anonymous.
   */
  private setAuthToken(accessToken: string | null) {
    this.accessToken = accessToken
  }

  /**
   * Logs in as the default admin user (`Role.Admin`) and attaches the bearer
   * token to every subsequent request, granting admin-guarded routes
   * (`IsAdminGuard`).
   */
  async setAdminMode() {
    await this.loginAs(
      this.apiConfigService.defaultSuperUser.username,
      this.apiConfigService.defaultSuperUser.password,
    )
  }

  /**
   * Logs in as the member (non-privileged) fixture user and attaches the bearer
   * token to every subsequent request — used to assert access denial on
   * admin-guarded routes.
   */
  async setMemberMode() {
    await this.loginAs(
      this.apiConfigService.defaultMemberUser.username,
      this.apiConfigService.defaultMemberUser.password,
    )
  }

  /**
   * Clears any attached bearer token, so subsequent requests are anonymous.
   */
  setAnonymousMode() {
    this.setAuthToken(null)
  }

  /**
   * Logs in as an arbitrary user and attaches the resulting bearer token.
   *
   * @param username - The user's username.
   * @param password - The user's password.
   */
  async loginAs(username: string, password: string) {
    this.setAnonymousMode()

    const { logIn } = await this.mutation({
      logIn: [{ data: { username, password } }, TOKENS_SELECTION],
    })

    this.setAuthToken(logIn.accessToken)
  }

  /**
   * Wipes every application table so each test starts from a clean slate.
   *
   * Uses `TRUNCATE ... RESTART IDENTITY CASCADE` over all public tables
   * (excluding Prisma's migrations table), mirroring the seed script's wipe.
   * Because it discovers tables dynamically and relies on `CASCADE`, it needs
   * no manual table list or FK-ordering maintenance when the schema changes.
   */
  async resetDatabase() {
    const rows = await this.prisma.$queryRaw<{ tablename: string }[]>`
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
        `
    const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ")
    if (tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
    }
  }

  /**
   * Hashes a password exactly the way `AuthService.generatedHashedPassword`
   * does (Argon2id with the configured memory/time/parallelism cost), so a
   * directly-seeded user can authenticate through the real login flow.
   *
   * @param password - The plaintext password to hash.
   * @returns The encoded Argon2 hash.
   */
  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.apiConfigService.memoryCost,
      timeCost: this.apiConfigService.timeCost,
      parallelism: this.apiConfigService.parallelism,
    })
  }

  /**
   * Seeds a single user row directly via Prisma (bypassing the GraphQL API).
   *
   * The username is lower-cased to match the login lookup
   * (`AuthService.verifyUserExistenceByUsername`), and the password is hashed
   * with {@link TestApiCaller.hashPassword} so the seeded user can log in.
   *
   * @param user - Name, username, password and role for the new user.
   */
  private async seedUser(user: CreateUserInput) {
    await this.prisma.users.create({
      data: {
        name: user.name,
        username: user.username.toLowerCase(),
        passwordHash: await this.hashPassword(user.password),
        role: user.role,
      },
    })
  }

  /**
   * Seeds the default admin user (`Role.Admin`) directly via Prisma.
   *
   * The matching login helper is {@link TestApiCaller.setAdminMode}. Unlike the
   * app's `InitService`, this seeds only the user row, keeping the database
   * minimal for exact-count assertions.
   */
  async createAdminUser() {
    await this.seedUser(this.apiConfigService.defaultSuperUser)
  }

  /**
   * Seeds the default member (non-privileged) user (`Role.Member`) directly via
   * Prisma.
   *
   * The matching login helper is {@link TestApiCaller.setMemberMode}. The user
   * is deliberately not privileged so denial tests can verify guard behaviour.
   */
  async createMemberUser() {
    await this.seedUser(this.apiConfigService.defaultMemberUser)
  }
}
