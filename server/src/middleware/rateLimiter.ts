import rateLimit from 'express-rate-limit';

// Strict limiter for auth endpoints (login / password recovery) — 20 attempts per 15 min per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Strict for brute-force login attempts
    standardHeaders: true,   // Return RateLimit-* headers
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

// General API limiter — 300 requests per minute per IP (generous for normal use)
export const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
});
