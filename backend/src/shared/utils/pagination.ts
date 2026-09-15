import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export function paginationArgs(input: PaginationInput) {
  const skip = (input.page - 1) * input.pageSize
  return { skip, take: input.pageSize }
}

export function paginatedResponse<T>(data: T[], total: number, input: PaginationInput) {
  return {
    data,
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages: Math.ceil(total / input.pageSize),
    },
  }
}
