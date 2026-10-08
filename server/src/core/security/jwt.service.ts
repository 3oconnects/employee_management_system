import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { JwtPayload } from '../../types';

const ACCESS_TOKEN_EXPIRY: any = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY: any = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

import crypto from 'crypto';

export class JwtService {
    static generateAccessToken(payload: JwtPayload): string {
        return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
    }

    static generateRefreshToken(payload: Pick<JwtPayload, 'userId' | 'tenantId'>): string {
        return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
            expiresIn: REFRESH_TOKEN_EXPIRY,
            jwtid: crypto.randomUUID(),
        });
    }

    static verifyAccessToken(token: string): JwtPayload {
        return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    }

    static verifyRefreshToken(token: string): Pick<JwtPayload, 'userId' | 'tenantId'> {
        return jwt.verify(token, env.JWT_REFRESH_SECRET) as Pick<JwtPayload, 'userId' | 'tenantId'>;
    }
}
