import { Router } from 'express';
import * as quotationController from '../controllers/quotation.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', quotationController.getQuotations);
router.get('/:id', quotationController.getQuotationById);
router.post('/', quotationController.createQuotation);
router.put('/:id', quotationController.updateQuotation);
router.patch('/:id/status', quotationController.updateStatus);
router.post('/:id/convert-invoice', quotationController.convertToInvoice);
router.delete('/:id', quotationController.deleteQuotation);

export default router;
