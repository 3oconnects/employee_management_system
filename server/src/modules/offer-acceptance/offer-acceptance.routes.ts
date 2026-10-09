import { Router } from 'express';
import { OfferAcceptanceController } from './offer-acceptance.controller';

const router = Router();
const controller = new OfferAcceptanceController();

// Public routes for prospective candidates
router.get('/details/:token', (req, res, next) => controller.getOfferDetails(req, res, next));
router.post('/accept/:token', (req, res, next) => controller.acceptOffer(req, res, next));
router.get('/accept/:token', (req, res) => controller.renderAcceptLanding(req, res));

export default router;
