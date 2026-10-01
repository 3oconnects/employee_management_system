import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError';

export const globalErrorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
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
        code = 'VALIDATION_ERROR';
    } else if ((err as any).code === '23505') {
        // PostgreSQL unique violation
        statusCode = 409;
        code = 'DUPLICATE_RESOURCE';
        const detail = (err as any).detail || '';
        const match = detail.match(/Key \((.+?)\)=\((.+?)\) already exists/);
        if (match) {
            const field = match[1];
            const value = match[2];
            message = `A record with ${field} '${value}' already exists.`;
        } else if ((err as any).constraint === 'employees_email_key') {
            message = 'An employee with this email address already exists.';
        } else if ((err as any).constraint === 'users_email_key') {
            message = 'A user account with this email address already exists.';
        } else {
            message = 'A record with duplicate unique information already exists.';
        }
    } else if ((err as any).code === '23503') {
        // PostgreSQL foreign key violation
        statusCode = 400;
        code = 'FOREIGN_KEY_VIOLATION';
        message = 'Referenced entity does not exist.';
    } else if ((err as any).code === '23502') {
        // PostgreSQL NOT NULL violation
        statusCode = 400;
        code = 'NOT_NULL_VIOLATION';
        const column = (err as any).column || 'required';
        message = `Field '${column}' is required and cannot be empty.`;
    }

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

export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};
