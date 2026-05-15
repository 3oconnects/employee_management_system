import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
            const parsed = schema.parse(data);

            if (source === 'body') req.body = parsed;
            else if (source === 'query') (req as any).validatedQuery = parsed;
            else (req as any).validatedParams = parsed;

            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const formattedErrors: Record<string, string[]> = {};
                err.issues.forEach((e: any) => {
                    const path = e.path.join('.');
                    if (!formattedErrors[path]) formattedErrors[path] = [];
                    formattedErrors[path].push(e.message);
                });

                res.status(400).json({
                    success: false,
                    message: 'Validation failed.',
                    errors: formattedErrors,
                });
                return;
            }
            next(err);
        }
    };
};
