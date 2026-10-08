import { UsersRepository } from './users.repository';
import { AppError } from '../../core/errors/AppError';

export class UsersService {
    private repo: UsersRepository;

    constructor() {
        this.repo = new UsersRepository();
    }

    /**
     * ARC-01: `id` must be the caller's own userId from the JWT.
     * The controller must never derive this from the request body.
     */
    async updateProfile(id: number, name: string, email: string, phone: string, address: string, emergency: string, tenantId: string) {
        const user = await this.repo.updateProfile(id, name, email, phone, address, emergency, tenantId);
        if (!user) throw AppError.notFound('User not found');
        return user;
    }

    async getUsers(tenantId: string, role?: string) {
        return this.repo.getUsers(tenantId, role);
    }
}
