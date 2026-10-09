import { Request, Response, NextFunction } from 'express';
import { OfferAcceptanceService } from './offer-acceptance.service';

const service = new OfferAcceptanceService();

export class OfferAcceptanceController {
    /**
     * Public endpoint to fetch candidate appointment details for acceptance page.
     * GET /api/v1/offer/details/:token
     */
    async getOfferDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const token = req.params.token as string;
            const data = await service.getOfferSummary(token);
            res.json({
                success: true,
                data,
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * Public endpoint for candidate to accept the employment offer.
     * POST /api/v1/offer/accept/:token
     */
    async acceptOffer(req: Request, res: Response, next: NextFunction) {
        try {
            const token = req.params.token as string;
            const { remarks, acceptedDate } = req.body;
            const result = await service.acceptOffer(token, { remarks, acceptedDate });
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Landing redirect handler for email clicks.
     * GET /api/v1/offer/accept/:token
     */
    async renderAcceptLanding(req: Request, res: Response) {
        const token = req.params.token as string;
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        const targetUrl = `${appUrl}/offer/accept/${encodeURIComponent(token)}`;
        return res.redirect(targetUrl);
    }
}
