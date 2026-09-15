import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

/**
 * Generic request validation middleware.
 * Validates body, query, or params against a Zod schema.
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) throw result.error
    req[source] = result.data
    next()
  }
}
