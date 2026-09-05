import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Lazy loading de páginas para optimización de bundle (TICKET-044)
const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));
const SuppliersPage = lazy(() => import('./pages/suppliers/SuppliersPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const MovementsPage = lazy(() => import('./pages/inventory/MovementsPage'));
const ReportsDashboard = lazy(() => import('./pages/reports/ReportsDashboard'));
const NewInvoicePage = lazy(() => import('./pages/invoices/NewInvoicePage'));
const InvoicesPage = lazy(() => import('./pages/invoices/InvoicesPage'));
const PurchasesPage = lazy(() => import('./pages/purchases/PurchasesPage'));
const NewPurchasePage = lazy(() => import('./pages/purchases/NewPurchasePage'));
const CashDashboardPage = lazy(() => import('./pages/cash/CashDashboardPage'));
const CashHistoryPage = lazy(() => import('./pages/cash/CashHistoryPage'));
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'));
const NewOrderPage = lazy(() => import('./pages/orders/NewOrderPage'));
const QuotationsPage = lazy(() => import('./pages/quotations/QuotationsPage'));
const NewQuotationPage = lazy(() => import('./pages/quotations/NewQuotationPage'));
const AccountsReceivablePage = lazy(() => import('./pages/accounts-receivable/AccountsReceivablePage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const RolesPage = lazy(() => import('./pages/roles/RolesPage'));
const AuditLogPage = lazy(() => import('./pages/audit/AuditLogPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));

// Loading Fallback Component
const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Cargando módulo...</span>
    </div>
  </div>
);

// Rutas Privadas Wrapper
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth/login" replace />;
};

// Rutas Exclusivas para Administrador
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/auth/login" replace />;
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name;
  if (roleName !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// Toaster dinámico que se adapta al tema Claro / Oscuro del ERP
const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Toaster 
      position="top-right" 
      toastOptions={{ 
        duration: 4000,
        style: isDark ? {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.45)',
          fontSize: '0.9rem',
          fontWeight: 500,
          borderRadius: '10px',
          padding: '12px 16px'
        } : {
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
          fontSize: '0.9rem',
          fontWeight: 500,
          borderRadius: '10px',
          padding: '12px 16px'
        },
        success: {
          iconTheme: {
            primary: isDark ? '#34d399' : '#10b981',
            secondary: isDark ? '#1e293b' : '#ffffff'
          }
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: isDark ? '#1e293b' : '#ffffff'
          }
        }
      }} 
    />
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ThemedToaster />
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Rutas Públicas */}
                <Route path="/auth" element={<AuthLayout />}>
                  <Route path="login" element={<Login />} />
                  <Route index element={<Navigate to="login" replace />} />
                </Route>

                {/* Rutas Privadas (Dashboard ERP) */}
                <Route path="/" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="clientes" element={<CustomersPage />} />
                  <Route path="proveedores" element={<SuppliersPage />} />
                  <Route path="inventario" element={<InventoryPage />} />
                  <Route path="movimientos" element={<MovementsPage />} />
                  <Route path="compras" element={<PurchasesPage />} />
                  <Route path="nueva-compra" element={<NewPurchasePage />} />
                  <Route path="ventas" element={<NewInvoicePage />} />
                  <Route path="facturacion" element={<InvoicesPage />} />
                  <Route path="cotizaciones" element={<QuotationsPage />} />
                  <Route path="cotizaciones/nueva" element={<NewQuotationPage />} />
                  <Route path="cotizaciones/:id/editar" element={<NewQuotationPage />} />
                  <Route path="caja" element={<CashDashboardPage />} />
                  <Route path="caja/historial" element={<CashHistoryPage />} />
                  <Route path="pedidos" element={<OrdersPage />} />
                  <Route path="pedidos/nuevo" element={<NewOrderPage />} />
                  <Route path="cuentas-cobrar" element={<AccountsReceivablePage />} />
                  <Route path="reportes" element={<ReportsDashboard />} />
                  <Route path="usuarios" element={<AdminRoute><UsersPage /></AdminRoute>} />
                  <Route path="roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
                  <Route path="bitacora" element={<AdminRoute><AuditLogPage /></AdminRoute>} />
                  <Route path="configuracion" element={<AdminRoute><SettingsPage /></AdminRoute>} />
                </Route>

                {/* Redirección Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
