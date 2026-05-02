import { Response } from 'express';

interface Client {
    id: number;
    tenantId: string;
    res: Response;
}

export class RealtimeService {
    private static clients: Client[] = [];

    static addClient(userId: number, tenantId: string, res: Response) {
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const client: Client = { id: userId, tenantId, res };
        this.clients.push(client);

        // Keep connection alive
        const keepAlive = setInterval(() => {
            res.write(': keepalive\n\n');
        }, 30000);

        res.on('close', () => {
            clearInterval(keepAlive);
            this.clients = this.clients.filter(c => c.res !== res);
        });

        // Send initial heartbeat
        res.write('data: {"type":"connected"}\n\n');
    }

    static broadcastStatusUpdate(tenantId: string, userId: number, email: string, status: string) {
        const payload = JSON.stringify({
            type: 'STATUS_UPDATE',
            data: { userId, email, status }
        });

        // Broadcast to everyone in the same tenant
        this.clients.forEach(client => {
            if (client.tenantId === tenantId) {
                client.res.write(`data: ${payload}\n\n`);
            }
        });
    }
}
