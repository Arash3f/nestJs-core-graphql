import { PaginationData } from "@src/common/input/pagination.input"
import { SortByData } from "@src/common/input/sort-by.input"

/**
 * The final type for the input of create API, When sending a request
 * after the resolver layer the information is sent to the service
 * layer with this type
 */
export type ApiCreateType<T extends Record<string, any>> = {
    data: T
}

/**
 * The final type for the input of read API, When sending a request
 * after the resolver layer the information is sent to the service
 * layer with this type
 */
export type ApiReadType<T extends Record<string, any>> = {
    pagination?: PaginationData
    sortBy?: SortByData
    where: T
}

/**
 * The final type for the input of update API, When sending a request
 * after the resolver layer the information is sent to the service
 * layer with this type
 */
export type ApiUpdateType<
    T extends Record<string, any>,
    B extends Record<string, any>,
> = {
    data: T
    where: B
}

/**
 * It is implemented only for the output type of the
 * {@link "common/input/sort-by.input".SortByData.convertToPrismaFilter} method
 */
export type OrderByType = {
    orderBy: Record<string, any>
}
