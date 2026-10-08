import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

// Smoke tests for the side-effect-free Express app (B0-03).
// These assert existing, intended behavior only; they never assert a known
// defect as correct.

describe('app (no database)', () => {
    it('GET /api/v1/health returns 200 with success:true', async () => {
        const res = await request(app).get('/api/v1/health');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('ok');
    });

    it('unknown routes return the JSON 404 shape', async () => {
        const res = await request(app).get('/api/v1/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({ success: false });
    });

    it('protected routes reject requests without a token', async () => {
        const res = await request(app).get('/api/v1/employees');
        expect(res.status).toBe(401);
    });

    it('protected routes reject a malformed token', async () => {
        const res = await request(app)
            .get('/api/v1/employees')
            .set('Authorization', 'Bearer not-a-jwt');
        expect(res.status).toBe(401);
    });
});
