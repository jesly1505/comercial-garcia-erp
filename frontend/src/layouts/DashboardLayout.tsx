import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  LayoutDashboard, Users, Truck, Archive,
  ArrowRightLeft, ShoppingBag, ShoppingCart,
  Wallet, CreditCard, PieChart,
  Settings, LogOut,
  Sun, Moon, FileText, Crown, FileSpreadsheet,
  ChevronDown, UserCog, Shield, History, Building2
} from 'lucide-react';
import { NotificationBell } from '../components/layout/NotificationBell';

import toast from 'react-hot-toast';
import styles from './DashboardLayout.module.css';

const DashboardLayout: React.FC = () => {
  // collapsed: sidebar icon‑only on desktop
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const roleName = typeof user?.role === 'string' ? user?.role : user?.role?.name;
  const isAdmin = roleName === 'ADMIN';

  const isConfigRoute = location.pathname.startsWith('/configuracion') || 
                        location.pathname.startsWith('/usuarios') || 
                        location.pathname.startsWith('/roles') || 
                        location.pathname.startsWith('/bitacora');
  const [configOpen, setConfigOpen] = useState(true);

  const handleLogout = () => {
    logout();
    toast.success('Sesión finalizada');
    navigate('/auth/login');
  };

  const navItems = [
    { path: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',           perm: null },
    { path: '/clientes',      icon: Users,            label: 'Clientes',            perm: 'customers:view' },
    { path: '/proveedores',   icon: Truck,            label: 'Proveedores',         perm: 'suppliers:view' },
    { path: '/inventario',    icon: Archive,          label: 'Inventario',          perm: 'inventory:view' },
    { path: '/movimientos',   icon: ArrowRightLeft,   label: 'Movimientos',         perm: 'inventory:view' },
    { path: '/compras',       icon: ShoppingBag,      label: 'Compras',             perm: 'purchases:view' },
    { path: '/ventas',        icon: ShoppingCart,     label: 'Ventas (POS)',        perm: 'sales_orders:view' },
    { path: '/facturacion',   icon: FileText,         label: 'Facturación',         perm: 'invoices:view' },
    { path: '/cotizaciones',  icon: FileSpreadsheet,  label: 'Cotizaciones',        perm: 'sales_orders:view' },
    { path: '/pedidos',       icon: ShoppingBag,      label: 'Pedidos',             perm: 'sales_orders:view' },
    { path: '/caja',          icon: Wallet,           label: 'Caja',                perm: 'cash:view' },
    { path: '/cuentas-cobrar',icon: CreditCard,       label: 'Cuentas por Cobrar',  perm: 'accounts_receivable:view' },
    { path: '/reportes',      icon: PieChart,         label: 'Reportes',            perm: 'reports:view' },
  ];

  const configSubItems = [
    { path: '/configuracion', label: 'General / Empresa', icon: Building2 },
    { path: '/usuarios', label: 'Usuarios', icon: UserCog },
    { path: '/roles', label: 'Roles', icon: Shield },
    { path: '/bitacora', label: 'Bitácora', icon: History },
  ];

  const filteredNavItems = navItems.filter(item => !item.perm || hasPermission(item.perm));

  return (
    <div className={`${styles.layout} ${collapsed ? styles.layoutCollapsed : ''}`}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''} glass-panel`}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          {!collapsed && (
            <div className={styles.logoContainer}>
              <div className={styles.logoMonogram}>
                <Crown className={styles.logoCrown} size={28} strokeWidth={2.5} />
                <span className={styles.logoG}>G</span>
                <span className={styles.logoR}>R</span>
              </div>
              <div className={styles.logoText}>
                <span>COMERCIAL</span>
                <span>GARCIA REYES S.A.</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className={styles.logoMiniOnly}>
              <Crown size={12} className={styles.logoCrownMini} />
              <div className={styles.logoMonogramMini}>
                <span className={styles.logoG}>G</span>
                <span className={styles.logoR}>R</span>
              </div>
            </div>
          )}
        </div>
        {/* Nav */}
        <nav className={styles.nav}>
          {filteredNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''} ${isActive ? styles.active : ''}`}
            >
              <item.icon size={20} className={styles.navIcon} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}

          {/* Configuración Expandable Submenu - Solo Administrador */}
          {isAdmin && (
            <div className={styles.submenuContainer}>
              <button
                type="button"
                onClick={() => setConfigOpen(o => !o)}
                title={collapsed ? 'Configuración' : undefined}
                className={`${styles.submenuTrigger} ${isConfigRoute ? styles.submenuTriggerActive : ''}`}
              >
                <div className={styles.submenuTriggerLeft}>
                  <Settings size={20} className={styles.navIcon} />
                  {!collapsed && <span>Configuración</span>}
                </div>
                {!collapsed && (
                  <ChevronDown
                    size={16}
                    className={`${styles.submenuChevron} ${configOpen ? styles.submenuChevronOpen : ''}`}
                  />
                )}
              </button>

              {!collapsed && configOpen && (
                <div className={styles.submenuList}>
                  {configSubItems.map(subItem => (
                    <NavLink
                      key={subItem.path}
                      to={subItem.path}
                      className={({ isActive }) => `${styles.submenuItem} ${isActive ? styles.submenuItemActive : ''}`}
                    >
                      <subItem.icon size={15} />
                      <span>{subItem.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
        {/* Footer */}
        <div className={styles.sidebarFooter}>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar Sesión' : undefined}
            className={`${styles.navItem} ${collapsed ? styles.navItemCollapsed : ''}`}
          >
            <LogOut size={20} className={styles.navIcon} />
            {!collapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Topbar */}
        <header className={`${styles.topbar} glass-panel`}>
          <div className={styles.topbarLeft}>

            {/* Desktop: collapse toggle */}
            <button
              className={`${styles.collapseBtn} ${styles.desktopOnly}`}
              onClick={() => setCollapsed(c => !c)}
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              <span className={styles.hamburger}>☰</span>
            </button>
            {/* Company branding */}
            <div className={styles.topbarBrand}>
              <div className={styles.topbarLogoMini}>
                <Crown size={13} strokeWidth={2.5} className={styles.topbarCrown} />
                <span className={styles.topbarG}>G</span>
                <span className={styles.topbarR}>R</span>
              </div>
              <span className={styles.topbarCompanyName}>COMERCIAL GARCÍA REYES S.A.</span>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <NotificationBell />
            <button onClick={toggleTheme} className={styles.iconBtn}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>{user?.firstName?.charAt(0) || 'U'}</div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
                <span className={styles.userRole}>{typeof user?.role === 'string' ? user.role : user?.role?.name || 'Usuario'}</span>
              </div>
            </div>
          </div>
        </header>
        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
