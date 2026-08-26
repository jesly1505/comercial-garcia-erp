import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import CustomersPage from './pages/customers/CustomersPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import InventoryPage from './pages/inventory/InventoryPage';
import MovementsPage from './pages/inventory/MovementsPage';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import NewInvoicePage from './pages/invoices/NewInvoicePage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import PurchasesPage from './pages/purchases/PurchasesPage';
import NewPurchasePage from './pages/purchases/NewPurchasePage';
import CashDashboardPage from './pages/cash/CashDashboardPage';
import CashHistoryPage from './pages/cash/CashHistoryPage';
import OrdersPage from './pages/orders/OrdersPage';
import NewOrderPage from './pages/orders/NewOrderPage';
import QuotationsPage from './pages/quotations/QuotationsPage';
import NewQuotationPage from './pages/quotations/NewQuotationPage';
import AccountsReceivablePage from './pages/accounts-receivable/AccountsReceivablePage';
import UsersPage from './pages/users/UsersPage';
import RolesPage from './pages/roles/RolesPage';
import { AuditLogPage } from './pages/audit/AuditLogPage';
import { SettingsPage } from './pages/settings/SettingsPage';

// Rutas Privadas Wrapper
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth/login" replace />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <AuthProvider>
        <BrowserRouter>
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
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="bitacora" element={<AuditLogPage />} />
              <Route path="configuracion" element={<SettingsPage />} />
            </Route>

            {/* Redirección Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
