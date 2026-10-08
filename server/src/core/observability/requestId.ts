import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
    namespace Express {
        interface Request {
            id?: string;
            startTime?: number;
        }
    }
}

/**
 * Request ID & Tracing Middleware
 * Generates or propagates X-Request-ID across the request lifecycle.
 * Attaches request correlation ID to response headers and request context.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Read incoming header or generate new UUID
    const incomingId = req.headers['x-request-id'] as string | undefined;
    const requestId = (incomingId && incomingId.trim().length > 0)
        ? incomingId.trim()
        : crypto.randomUUID();

    req.id = requestId;
    req.startTime = Date.now();

    // Propagate to response header
    res.setHeader('x-request-id', requestId);

    // Structured logging on request completion
    res.on('finish', () => {
        const durationMs = req.startTime ? Date.now() - req.startTime : 0;
        const tenantId = (req as any).user?.tenantId || (req as any).tenantId || 'anonymous';
        const userId = (req as any).user?.userId || (req as any).user?.id || 'anonymous';

        // Log non-health requests in structured format
        if (!req.originalUrl.includes('/health')) {
            const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
            console.log(
                `[${level}] [REQ:${requestId}] ${req.method} ${req.originalUrl} | status=${res.statusCode} | duration=${durationMs}ms | tenant=${tenantId} | user=${userId}`
            );
        }
    });

    next();
};
