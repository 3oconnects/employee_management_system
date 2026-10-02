import { WorkspaceRepository } from './workspace.repository';

export interface Workspace {
    /** Customer organisation name, or null when not configured. */
    name: string | null;
    /** Organisation logo URL, or null when not configured. */
    logoUrl: string | null;
}

const repo = new WorkspaceRepository();

/**
 * Public-to-members workspace identity. Deliberately narrow: only the
 * organisation name and logo, never contact details, tax IDs or settings.
 */
export async function getWorkspace(tenantId: string): Promise<Workspace> {
    const s = await repo.getGeneralSettings(tenantId, ['org_name', 'logo_url']);
    const name = s.org_name?.trim() || null;
    const logo = s.logo_url?.trim() || null;
    return { name, logoUrl: logo && /^https?:\/\//i.test(logo) ? logo : null };
}

/** Organisation name for outgoing mail; null when not configured. */
export async function getOrganizationName(tenantId?: string | null): Promise<string | null> {
    if (!tenantId) return null;
    return (await getWorkspace(tenantId)).name;
}
