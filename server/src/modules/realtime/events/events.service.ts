import { RealtimeConnectionsService } from '../connections/connections.service';

export class RealtimeEventsService {
    static broadcastStatusUpdate(tenantId: string, userId: number, email: string, status: string) {
        const payload = JSON.stringify({
            type: 'STATUS_UPDATE',
            data: { userId, email, status }
        });

        RealtimeConnectionsService.getClients().forEach(client => {
            if (client.tenantId === tenantId) {
                client.res.write(`data: ${payload}\n\n`);
            }
        });
    }
}
