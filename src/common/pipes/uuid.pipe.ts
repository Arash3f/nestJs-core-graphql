import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common"
import { validate as isUUID } from "uuid"

/**
 * Parse UUID Pipe
 *
 * A NestJS pipe that validates and transforms incoming string values to ensure
 * they are valid UUIDs (Universally Unique Identifiers).
 *
 * @module ParseUUIDPipe
 * @implements {PipeTransform<string>}
 *
 *
 * @example
 * ```typescript
 * // Controller usage
 * \@Get(':id')
 * async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
 *   return this.service.findOne(id);
 * }
 *
 * // With custom parameter
 * \@Post(':fileId')
 * async upload(
 *   \@Param('fileId', new ParseUUIDPipe()) fileId: string,
 *   \@Body() data: UploadDto
 * ) {
 *   return this.service.upload(fileId, data);
 * }
 * ```
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string> {
  /**
   * Validates that the incoming value is a well-formed UUID.
   *
   * @param value - The raw parameter value to validate.
   * @returns The same value, unchanged, when it is a valid UUID.
   * @throws {BadRequestException} When `value` is not a valid UUID.
   */
  transform(value: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid UUID: ${value}`)
    }
    return value
  }
}
