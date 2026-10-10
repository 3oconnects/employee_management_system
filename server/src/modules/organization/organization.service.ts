import { OrganizationRepository } from './organization.repository';

export class OrganizationService {
    private repo: OrganizationRepository;

    constructor() {
        this.repo = new OrganizationRepository();
    }

    async getDepartments(tenantId: string) {
        return this.repo.getDepartments(tenantId);
    }

    async createDepartment(userId: string | number, tenantId: string, data: any) {
        const newDept = await this.repo.createDepartment(data, tenantId);
        try {
            const employeeId = await this.repo.getEmployeeIdByUserId(userId, tenantId);
            const approvalId = `STR-${Date.now()}`;
            await this.repo.insertApproval(approvalId, employeeId, 'department_creation', {
                id: newDept.id,
                name: data.name,
                description: data.description,
                owner_id: data.owner_id || data.manager_id,
                metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
                category: data.category || 'core'
            }, tenantId);
        } catch (err: any) {
            console.error('[OrganizationService] Failed to insert approval record:', err.message);
        }
        return newDept;
    }

    async updateDepartment(id: string, data: any, tenantId: string) {
        return this.repo.updateDepartment(id, data, tenantId);
    }

    async deleteDepartment(id: string, tenantId: string) {
        return this.repo.deleteDepartment(id, tenantId);
    }

    async getTeams(tenantId: string, departmentId?: string) {
        return this.repo.getTeams(tenantId, departmentId);
    }

    async createTeam(userId: string | number, tenantId: string, data: any) {
        const newTeam = await this.repo.createTeam(data, tenantId);
        try {
            const employeeId = await this.repo.getEmployeeIdByUserId(userId, tenantId);
            const approvalId = `STR-${Date.now()}`;
            await this.repo.insertApproval(approvalId, employeeId, 'team_creation', {
                id: newTeam.id,
                name: data.name,
                department_id: data.department_id,
                parent_team_id: data.parent_team_id,
                description: data.description,
                owner_id: data.owner_id || data.manager_id,
                metadata: typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata,
                category: data.category || 'core'
            }, tenantId);
        } catch (err: any) {
            console.error('[OrganizationService] Failed to insert approval record:', err.message);
        }
        return newTeam;
    }

    async updateTeam(id: string, data: any, tenantId: string) {
        return this.repo.updateTeam(id, data, tenantId);
    }

    async deleteTeam(id: string, tenantId: string) {
        return this.repo.deleteTeam(id, tenantId);
    }

    async getTeamStatus(userId: string | number, tenantId: string) {
        return this.repo.getTeamStatus(userId, tenantId);
    }
}
