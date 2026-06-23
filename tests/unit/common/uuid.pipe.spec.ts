import { BadRequestException } from "@nestjs/common"
import { ParseUUIDPipe } from "@src/common/pipes/uuid.pipe"

describe("ParseUUIDPipe", () => {
  const pipe = new ParseUUIDPipe()

  it("returns the value unchanged for a valid UUID", () => {
    const uuid = "3f1e7c0a-2b6d-4c8e-9a1f-0b2c3d4e5f60"
    expect(pipe.transform(uuid)).toBe(uuid)
  })

  it("throws BadRequestException for a non-UUID value", () => {
    expect(() => pipe.transform("not-a-uuid")).toThrow(BadRequestException)
    expect(() => pipe.transform("not-a-uuid")).toThrow("Invalid UUID: not-a-uuid")
  })

  it("throws BadRequestException for an empty string", () => {
    expect(() => pipe.transform("")).toThrow(BadRequestException)
  })
})
