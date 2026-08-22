import React, { useState } from 'react';
import { 
  TrendingUp, Users, ShoppingCart, FileText, AlertCircle, 
  DollarSign, PackagePlus, PlusCircle, Archive, ClipboardList,
  Truck, CheckCircle, XCircle
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import styles from './Dashboard.module.css';
import { Link } from 'react-router-dom';

// --- MOCK DATA ---
const monthlySales = [
  { name: 'Ene', ventas: 12000 }, { name: 'Feb', ventas: 15000 }, { name: 'Mar', ventas: 18000 },
  { name: 'Abr', ventas: 14000 }, { name: 'May', ventas: 22000 }, { name: 'Jun', ventas: 28000 },
];

const salesVsPurchases = [
  { name: 'Lun', compras: 4000, ventas: 6000 },
  { name: 'Mar', compras: 3000, ventas: 5000 },
  { name: 'Mié', compras: 2000, ventas: 8000 },
  { name: 'Jue', compras: 2780, ventas: 3908 },
  { name: 'Vie', compras: 1890, ventas: 4800 },
  { name: 'Sáb', compras: 2390, ventas: 3800 },
];

const topSellers = [
  { name: 'Carlos', value: 400 },
  { name: 'Ana', value: 300 },
  { name: 'Luis', value: 300 },
  { name: 'Marta', value: 200 },
];

const topProducts = [
  { name: 'Cemento Cruz Azul', qty: 120 },
  { name: 'Varilla 3/8', qty: 98 },
  { name: 'Pintura Blanca 19L', qty: 86 },
  { name: 'Clavos 2"', qty: 70 },
  { name: 'Alambre Recocido', qty: 65 },
];

const topClients = [
  { name: 'Constructora Alfa', total: 15000 },
  { name: 'Ing. Méndez', total: 12000 },
  { name: 'Desarrollos Beta', total: 9500 },
];

const COLORS = ['#0b1930', '#c59b6d', '#3b82f6', '#10b981', '#f59e0b'];

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'finanzas' | 'operaciones'>('finanzas');

  return (
    <div className={`animate-fade-in ${styles.dashboard}`}>
      
      {/* HEADER & QUICK ACTIONS */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Panel de Control</h1>
          <p className={styles.subtitle}>Resumen analítico de la actividad comercial.</p>
        </div>
        <div className={styles.quickActions}>
          <Link to="/nueva-venta" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={18} /> Nueva Venta
          </Link>
          <Link to="/inventario" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackagePlus size={18} /> Producto
          </Link>
          <Link to="/clientes" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={18} /> Cliente
          </Link>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'finanzas' ? styles.active : ''}`}
          onClick={() => setActiveTab('finanzas')}
        >
          Finanzas y Ventas
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'operaciones' ? styles.active : ''}`}
          onClick={() => setActiveTab('operaciones')}
        >
          Inventario y Operaciones
        </button>
      </div>

      {/* TAB CONTENT: FINANZAS Y VENTAS */}
      {activeTab === 'finanzas' && (
        <div className="animate-fade-in">
          {/* FINANZAS KPIs (7 Cards) */}
          <div className={styles.kpiGridDense}>
            {/* 1. Ventas del día */}
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px' }}>
                <DollarSign size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Ventas del Día</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>C$1,240</h3>
              </div>
            </div>
            {/* 2. Ventas de la semana */}
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '40px', height: '40px' }}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Ventas Semana</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>C$8,450</h3>
              </div>
            </div>
            {/* 3. Ventas del mes */}
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(197, 155, 109, 0.1)', color: '#c59b6d', width: '40px', height: '40px' }}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Ventas del Mes</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>C$34,500</h3>
              </div>
            </div>
            {/* 4. Ventas del año */}
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(11, 25, 48, 0.1)', color: '#0b1930', width: '40px', height: '40px' }}>
                <TrendingUp size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Ventas del Año</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>C$142,000</h3>
              </div>
            </div>
            {/* 5. Total Ingresos */}
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px' }}>
                <ArrowUpCircleIcon />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Total Ingresos</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>C$48,500</h3>
              </div>
            </div>
            {/* 6. Total Egresos */}
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '40px', height: '40px' }}>
                <ArrowDownCircleIcon />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Total Egresos</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>C$14,200</h3>
              </div>
            </div>
            {/* 7. Utilidad */}
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: '40px', height: '40px' }}>
                <DollarSign size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Utilidad Neta</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>C$34,300</h3>
              </div>
            </div>
          </div>

          {/* FINANZAS CHARTS (4 Charts) */}
          <div className={styles.chartsGrid}>
            
            {/* Ventas Mensuales (BarChart) */}
            <div className={`glass-panel ${styles.chartWidget}`} style={{ minHeight: '300px' }}>
              <h3 className={styles.widgetTitle}>Ventas Mensuales</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `C$${value/1000}k`} />
                    <Tooltip cursor={{fill: 'var(--hover-bg)'}} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="ventas" fill="#0b1930" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparativa Compras vs Ventas (AreaChart) */}
            <div className={`glass-panel ${styles.chartWidget}`} style={{ minHeight: '300px' }}>
              <h3 className={styles.widgetTitle}>Compras vs Ventas (7 días)</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesVsPurchases}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `C$${value/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Legend />
                    <Area type="monotone" dataKey="ventas" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                    <Area type="monotone" dataKey="compras" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ventas por Vendedor (PieChart) */}
            <div className={`glass-panel ${styles.chartWidget}`} style={{ minHeight: '300px' }}>
              <h3 className={styles.widgetTitle}>Ventas por Vendedor</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topSellers}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {topSellers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Clientes con mayor compra (BarChart Horizontal) */}
            <div className={`glass-panel ${styles.chartWidget}`} style={{ minHeight: '300px' }}>
              <h3 className={styles.widgetTitle}>Top 3 Clientes (Monto)</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'var(--hover-bg)'}} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="total" fill="#c59b6d" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB CONTENT: INVENTARIO Y OPERACIONES */}
      {activeTab === 'operaciones' && (
        <div className="animate-fade-in">
          {/* OPERACIONES KPIs (8 Cards) */}
          <div className={styles.kpiGridDense}>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '40px', height: '40px' }}>
                <Archive size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Productos Registrados</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>1,452</h3>
              </div>
            </div>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(11, 25, 48, 0.1)', color: '#0b1930', width: '40px', height: '40px' }}>
                <Users size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Clientes Registrados</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>342</h3>
              </div>
            </div>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(197, 155, 109, 0.1)', color: '#c59b6d', width: '40px', height: '40px' }}>
                <Truck size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Proveedores Registrados</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>45</h3>
              </div>
            </div>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: '40px', height: '40px' }}>
                <FileText size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Facturas Pendientes</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>18</h3>
              </div>
            </div>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px' }}>
                <CheckCircle size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Facturas Pagadas</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>1,204</h3>
              </div>
            </div>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '40px', height: '40px' }}>
                <ClipboardList size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Pedidos Pendientes</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>5</h3>
              </div>
            </div>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '40px', height: '40px' }}>
                <AlertCircle size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Poco Stock</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>12</h3>
              </div>
            </div>
            <div className={`glass-panel ${styles.kpiCard}`} style={{ padding: '1rem', gap: '1rem' }}>
              <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', width: '40px', height: '40px' }}>
                <XCircle size={20} />
              </div>
              <div className={styles.kpiInfo}>
                <p className={styles.kpiLabel}>Productos Agotados</p>
                <h3 className={styles.kpiValue} style={{ fontSize: '1.25rem' }}>3</h3>
              </div>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            {/* Productos más vendidos (BarChart Horizontal) */}
            <div className={`glass-panel ${styles.chartWidget}`} style={{ minHeight: '300px' }}>
              <h3 className={styles.widgetTitle}>Top 5 Productos (Unidades)</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'var(--hover-bg)'}} contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="qty" fill="#0b1930" radius={[0, 4, 4, 0]} barSize={20}>
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Compras Mensuales (LineChart) */}
            <div className={`glass-panel ${styles.chartWidget}`} style={{ minHeight: '300px' }}>
              <h3 className={styles.widgetTitle}>Compras Mensuales</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySales} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `C$${(value*0.6)/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    />
                    <Line type="monotone" dataKey="ventas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

// Pequeños componentes SVG en línea para no añadir más dependencias si no están en lucide
const ArrowUpCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 8v8"/></svg>
);
const ArrowDownCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8 12 4 4 4-4"/><path d="M12 8v8"/></svg>
);

export default Dashboard;
