import { Router } from 'express';
import { 
  getCustomers, 
  getCustomerById, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer 
} from '../controllers/customer.controller';
import * as customerController from '../controllers/customer.controller';
import { requirePermission } from '../middlewares/role.middleware';

const router = Router();

router.get('/', requirePermission('customers:view'), customerController.getCustomers);
router.get('/:id', requirePermission('customers:view'), customerController.getCustomerById);
router.post('/', requirePermission('customers:create'), customerController.createCustomer);
router.put('/:id', requirePermission('customers:edit'), customerController.updateCustomer);
router.delete('/:id', requirePermission('customers:delete'), customerController.deleteCustomer);

export default router;
