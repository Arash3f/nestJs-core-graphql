import { HttpStatus } from "@nestjs/common"
import { ModuleNames } from "@src/common/constants"

export const PrismaErrors = {
  FieldIsDuplicated: {
    code: 1,
    statusCode: HttpStatus.CONFLICT,
    module: ModuleNames.PrismaModule,
    message: "Field is duplicate",
    persianTranslation: "مقدار وارد شده تکراری است",
  },
  RowNotFound: {
    code: 2,
    statusCode: HttpStatus.NOT_FOUND,
    module: ModuleNames.PrismaModule,
    message: "Filed not found",
    persianTranslation: "خروجی مورد نظر پیدا نشد",
  },
  InvalidSortField: {
    code: 3,
    statusCode: HttpStatus.BAD_REQUEST,
    module: ModuleNames.PrismaModule,
    message: "Invalid sort field",
    persianTranslation: "فیلد مرتب‌سازی نامعتبر است",
  },
  ForeignKeyConstraintFailed: {
    code: 4,
    statusCode: HttpStatus.CONFLICT,
    module: ModuleNames.PrismaModule,
    message: "Related record constraint failed",
    persianTranslation: "خطا در ارتباط با رکورد مرتبط",
  },
}
