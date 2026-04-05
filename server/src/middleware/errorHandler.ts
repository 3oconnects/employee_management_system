// ============================================================================
// EMS BACKEND — GLOBAL ERROR HANDLER + VALIDATION MIDDLEWARE
// ============================================================================
// Provides:
//   1. AsyncHandler wrapper — eliminates try/catch in every controller
//   2. Central error handler — uniform JSON error responses
//   3. Zod validation middleware — request body/query/params validation
//   4. AppError class — structured application errors with status codes
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ─── APP ERROR CLASS ────────────────────────────────────────────────────────

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        code?: string,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;

        // Maintain proper stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    // Factory methods for common errors
    static badRequest(message: string, code?: string) {
        return new AppError(message, 400, code);
    }

    static unauthorized(message: string = 'Unauthorized') {
        return new AppError(message, 401, 'UNAUTHORIZED');
    }

    static forbidden(message: string = 'Forbidden') {
        return new AppError(message, 403, 'FORBIDDEN');
    }

    static notFound(entity: string = 'Resource') {
        return new AppError(`${entity} not found.`, 404, 'NOT_FOUND');
    }

    static conflict(message: string) {
        return new AppError(message, 409, 'CONFLICT');
    }

    static internal(message: string = 'Internal server error') {
        return new AppError(message, 500, 'INTERNAL_ERROR', false);
    }
}

// ─── ASYNC HANDLER WRAPPER ──────────────────────────────────────────────────
// Wraps async controller functions so thrown errors flow to the error handler.
// Usage:  router.get('/', asyncHandler(myController.list));

export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// ─── ZOD VALIDATION MIDDLEWARE ──────────────────────────────────────────────
// Validates req.body, req.query, or req.params against a Zod schema.
// Usage:  router.post('/', validate(createEmployeeSchema), handler);

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
            const parsed = schema.parse(data);

            // Replace the raw data with the parsed & validated version
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

// ─── GLOBAL ERROR HANDLER ───────────────────────────────────────────────────
// Must be the LAST middleware added to Express app.
// Usage:  app.use(globalErrorHandler);

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Default to 500
    let statusCode = 500;
    let message = 'An unexpected error occurred.';
    let code: string | undefined;

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        code = err.code;
    } else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation failed.';
    }

    // Log non-operational (unexpected) errors for debugging
    if (!(err instanceof AppError) || !err.isOperational) {
        console.error('🔴 Unhandled Error:', {
            message: err.message,
            stack: err.stack,
            url: req.originalUrl,
            method: req.method,
        });
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(code && { code }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

// ─── NOT FOUND HANDLER ─────────────────────────────────────────────────────
// For any unmatched routes.

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};
