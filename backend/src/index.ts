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

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Headers de seguridad con Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Configuración de CORS con orígenes permitidos
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) 
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  credentials: true
}));

// Body size limit (Límite de tamaño de cuerpo)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // 300 solicitudes por IP por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta IP, intente de nuevo en 15 minutos.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // 15 intentos de auth por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de acceso desde esta IP, intente de nuevo en 15 minutos.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);

// Servir archivos estáticos (Imágenes subidas)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', async (req: any, res: any) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        latencyMs: dbLatencyMs,
      },
      version: process.env.npm_package_version || '1.0.0',
    });
  } catch (error: any) {
    logger.error('Health check database error', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'disconnected',
        error: error.message || 'Database unavailable',
      }
    });
  }
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/invoices', authenticateToken, invoiceRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/suppliers', authenticateToken, supplierRoutes);
app.use('/api/purchases', authenticateToken, purchaseRoutes);
app.use('/api/cash', authenticateToken, cashRoutes);
app.use('/api/sales-orders', authenticateToken, salesOrderRoutes);
app.use('/api/accounts-receivable', authenticateToken, accountsReceivableRoutes);
app.use('/api/users', authenticateToken, userRoutes); 
app.use('/api/roles', authenticateToken, roleRoutes);
app.use('/api/audit', authenticateToken, auditRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/quotations', authenticateToken, quotationRoutes);

import logger from './utils/logger';
import prisma from './utils/prisma';
import { auditLogMiddleware } from './middlewares/audit.middleware';

// Documentación
setupSwagger(app);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Error no manejado en ${req.method} ${req.originalUrl}:`, err);
  
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
  startCronJobs();
});

// Graceful Shutdown Handlers
const shutdown = async (signal: string) => {
  logger.info(`Señal ${signal} recibida. Cerrando servidor HTTP y conexiones...`);
  server.close(async () => {
    logger.info('Servidor HTTP cerrado.');
    try {
      await prisma.$disconnect();
      logger.info('Conexión con base de datos desconectada correctamente.');
      process.exit(0);
    } catch (dbErr) {
      logger.error('Error al desconectar base de datos:', dbErr);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
