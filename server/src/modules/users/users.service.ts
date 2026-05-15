import { UsersRepository } from './users.repository';
import { AppError } from '../../core/errors/AppError';

export class UsersService {
    private repo: UsersRepository;

    constructor() {
        this.repo = new UsersRepository();
    }

    async updateProfile(id: string, name: string, email: string, phone: string, address: string, emergency: string, tenantId: string) {
        const user = await this.repo.updateProfile(id, name, email, phone, address, emergency, tenantId);
        if (!user) throw AppError.notFound('User not found');
        return user;
    }

    async getUsers(tenantId: string, role?: string) {
        return this.repo.getUsers(tenantId, role);
    }
}
