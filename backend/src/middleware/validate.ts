import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

type Target = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * Usage: router.post('/path', validate(MySchema), controller)
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const messages = (result.error as ZodError).errors
        .map((e) => `${e.path.join('.') || 'value'}: ${e.message}`)
        .join('; ');
      sendError(res, `Validation error — ${messages}`, 400);
      return;
    }
    // Replace the target with the parsed (coerced) data
    req[target] = result.data as any;
    next();
  };
}

