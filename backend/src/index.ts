import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import reportRoutes from './routes/report.routes';
import invoiceRoutes from './routes/invoice.routes';
import inventoryRoutes from './routes/inventory.routes';
import uploadRoutes from './routes/upload.routes';
import supplierRoutes from './routes/supplier.routes';
import purchaseRoutes from './routes/purchase.routes';
import cashRoutes from './routes/cash.routes';
import salesOrderRoutes from './routes/sales-order.routes';
import accountsReceivableRoutes from './routes/accounts-receivable.routes';
import userRoutes from './routes/user.routes';
import roleRoutes from './routes/role.routes';
import auditRoutes from './routes/audit.routes';
import settingsRoutes from './routes/settings.routes';
import notificationRoutes from './routes/notification.routes';
import quotationRoutes from './routes/quotation.routes';
import { authenticateToken } from './middlewares/auth.middleware';
import { setupSwagger } from './utils/swagger';
import { startCronJobs } from './jobs/notification.cron';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (Imágenes subidas)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/invoices', authenticateToken, invoiceRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/purchases', authenticateToken, purchaseRoutes);
app.use('/api/cash', authenticateToken, cashRoutes);
app.use('/api/sales-orders', authenticateToken, salesOrderRoutes);
app.use('/api/accounts-receivable', authenticateToken, accountsReceivableRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/roles', roleRoutes); // Auth inside routes
app.use('/api/audit', authenticateToken, auditRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/quotations', authenticateToken, quotationRoutes);

// Documentación
setupSwagger(app);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  startCronJobs();
});
