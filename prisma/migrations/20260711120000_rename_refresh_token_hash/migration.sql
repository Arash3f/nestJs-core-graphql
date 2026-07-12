-- Rename the poorly-cased refresh-token column to match the REST core schema.
ALTER TABLE "users" RENAME COLUMN "reFreshTokenHash" TO "refreshTokenHash";
