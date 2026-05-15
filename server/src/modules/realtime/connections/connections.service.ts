import { Response } from 'express';

export interface RealtimeClient {
    id: number;
    tenantId: string;
    res: Response;
}

export class RealtimeConnectionsService {
    static clients: RealtimeClient[] = [];

    static addClient(userId: number, tenantId: string, res: Response) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const client: RealtimeClient = { id: userId, tenantId, res };
        this.clients.push(client);

        const keepAlive = setInterval(() => {
            res.write(': keepalive\n\n');
        }, 30000);

        res.on('close', () => {
            clearInterval(keepAlive);
            this.clients = this.clients.filter(c => c.res !== res);
        });

        res.write('data: {"type":"connected"}\n\n');
    }

    static getClients() {
        return this.clients;
    }
}
