import { Router } from 'express';
import connectionsRoutes from './connections/connections.routes';
import { RealtimeConnectionsService } from './connections/connections.service';
import { RealtimeEventsService } from './events/events.service';

const router = Router();

router.use('/', connectionsRoutes);

export const RealtimeService = {
    addClient: RealtimeConnectionsService.addClient.bind(RealtimeConnectionsService),
    broadcastStatusUpdate: RealtimeEventsService.broadcastStatusUpdate.bind(RealtimeEventsService),
};

export default router;
