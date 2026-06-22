import { Transform } from "class-transformer"

/**
 * Coerces a raw env value to a number for validation.
 *
 * Unlike `@Type(() => Number)`, an empty string is NOT coerced to `0`
 * (`Number("") === 0`); empty, missing, and non-numeric input is returned
 * untouched so the accompanying `@IsNumber()` rejects it instead of letting a
 * blank/invalid env var silently become `0`.
 *
 * @returns A property decorator that transforms the value during `plainToInstance`.
 *
 * @example
 * ```ts
 * @IsNumber()
 * @ToNumber()
 * SERVER_PORT: number
 * ```
 */
export const ToNumber = (): PropertyDecorator =>
  Transform(({ value }): unknown => {
    if (typeof value === "number") return value
    if (typeof value !== "string" || value.trim() === "") return value
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  })

/**
 * Coerces a raw env value to a boolean for validation.
 *
 * Only the explicit literals `"true"`/`"1"` and `"false"`/`"0"` are mapped;
 * missing/empty/unknown input is returned untouched so the accompanying
 * `@IsBoolean()` rejects it instead of silently defaulting a missing required
 * var to `false`.
 *
 * @returns A property decorator that transforms the value during `plainToInstance`.
 *
 * @example
 * ```ts
 * @IsBoolean()
 * @ToBoolean()
 * SEED_ON_BOOT: boolean
 * ```
 */
export const ToBoolean = (): PropertyDecorator =>
  Transform(({ value }): unknown => {
    if (typeof value === "boolean") return value
    if (value === "true" || value === "1") return true
    if (value === "false" || value === "0") return false
    return value
  })

/**
 * Splits a comma-separated env string into a trimmed, non-empty string array.
 *
 * Missing/non-string input is returned untouched so the accompanying
 * `@IsArray()` rejects it instead of silently producing an empty list.
 *
 * @returns A property decorator that transforms the value during `plainToInstance`.
 *
 * @example
 * ```ts
 * @IsArray()
 * @IsString({ each: true })
 * @ToStringArray()
 * MINIO_BUCKET_LIST: string[]
 * ```
 */
export const ToStringArray = (): PropertyDecorator =>
  Transform(({ value }): unknown => {
    if (typeof value !== "string") return value
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  })
