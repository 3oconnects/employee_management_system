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

        Error.captureStackTrace(this, this.constructor);
    }

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
