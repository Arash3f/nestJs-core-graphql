import * as bcrypt from "bcryptjs"

/**
 * * Number of bcrypt salt rounds. 10 is a safe default that balances
 * * security and login latency. Increase as hardware gets faster.
 */
const SALT_ROUNDS = 10

/**
 * * Securely hash a plaintext password with a per-password random salt.
 * * Replaces the previous unsalted SHA-1 hashing, which is unsuitable for
 * * passwords.
 * @param password Plaintext password
 * @returns bcrypt hash (includes the salt)
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * * Verify a plaintext password against a stored bcrypt hash in constant time.
 * @param password Plaintext password supplied by the client
 * @param hash Stored bcrypt hash
 * @returns Whether the password matches
 */
export async function verifyPassword(
    password: string,
    hash: string,
): Promise<boolean> {
    return bcrypt.compare(password, hash)
}
