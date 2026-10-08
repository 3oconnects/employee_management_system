import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// The repository is mocked so these tests need no database.
const { getGeneralSettings } = vi.hoisted(() => ({ getGeneralSettings: vi.fn() }));
vi.mock('../../src/modules/workspace/workspace.repository', () => ({
    WorkspaceRepository: vi.fn().mockImplementation(() => ({ getGeneralSettings })),
}));

import app from '../../src/app';
import { getWorkspace, getOrganizationName } from '../../src/modules/workspace/workspace.service';

describe('GET /api/v1/workspace', () => {
    it('rejects unauthenticated requests', async () => {
        const res = await request(app).get('/api/v1/workspace');
        expect(res.status).toBe(401);
    });
});

describe('workspace service', () => {
    beforeEach(() => getGeneralSettings.mockReset());

    it('returns the trimmed organisation name and an http(s) logo', async () => {
        getGeneralSettings.mockResolvedValue({ org_name: '  Ozofi Technologies  ', logo_url: 'https://cdn.example.com/logo.png' });
        await expect(getWorkspace('t1')).resolves.toEqual({
            name: 'Ozofi Technologies',
            logoUrl: 'https://cdn.example.com/logo.png',
        });
        expect(getGeneralSettings).toHaveBeenCalledWith('t1', ['org_name', 'logo_url']);
    });

    it('returns nulls when nothing is configured', async () => {
        getGeneralSettings.mockResolvedValue({});
        await expect(getWorkspace('t1')).resolves.toEqual({ name: null, logoUrl: null });
    });

    it('drops non-http(s) logo URLs', async () => {
        getGeneralSettings.mockResolvedValue({ org_name: 'Acme', logo_url: 'javascript:alert(1)' });
        await expect(getWorkspace('t1')).resolves.toEqual({ name: 'Acme', logoUrl: null });
    });

    it('getOrganizationName returns null without a tenant', async () => {
        await expect(getOrganizationName(undefined)).resolves.toBeNull();
        expect(getGeneralSettings).not.toHaveBeenCalled();
    });
});
