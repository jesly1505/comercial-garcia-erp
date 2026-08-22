import React, { useState } from 'react';
import ReportFilters from '../../components/ReportFilters';
import { downloadFile } from '../../services/api';
import { 
  FileText, Table, Package, Users, DollarSign, 
  TrendingUp, ShoppingCart, Truck, AlertTriangle, 
  XOctagon, Star, CreditCard, Activity, Briefcase
} from 'lucide-react';
import styles from './ReportsDashboard.module.css';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  pdfName: string;
  excelName: string;
  filterParam: string;
}

const ReportsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('monthly');
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'purchases' | 'customers'>('sales');

  const handleDownload = async (url: string, filename: string) => {
    try {
      setLoading(true);
      await downloadFile(url, filename);
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Hubo un error al generar el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const ReportCard: React.FC<ReportCardProps> = ({ title, description, icon, endpoint, pdfName, excelName, filterParam }) => (
    <div className={`glass-panel ${styles.card}`}>
      <div className={styles.cardHeader}>
        <div className={styles.iconBox}>{icon}</div>
        <h3 className={styles.cardTitle}>{title}</h3>
      </div>
      <p className={styles.cardDesc}>{description}</p>
      
      <div className={styles.actions}>
        <button 
          className={`${styles.btn} ${styles.pdfBtn}`} 
          onClick={() => handleDownload(`${endpoint}/pdf?range=${filterParam}`, pdfName)} 
          disabled={loading}
        >
          <FileText size={18} /> PDF
        </button>
        <button 
          className={`${styles.btn} ${styles.excelBtn}`} 
          onClick={() => handleDownload(`${endpoint}/excel?range=${filterParam}`, excelName)} 
          disabled={loading}
        >
          <Table size={18} /> Excel
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 className={styles.title}>Centro de Reportes</h1>
        <p className={styles.subtitle}>Genera y exporta análisis detallados en tiempo real.</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Filtros de Tiempo (Aplica donde corresponda)</h3>
        <ReportFilters onFilter={(r) => setFilter(r)} disabled={loading} />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        <button 
          onClick={() => setActiveTab('sales')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'sales' ? '2px solid var(--brand-primary)' : 'none', padding: '0.5rem 1rem', color: activeTab === 'sales' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'sales' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <TrendingUp size={18} /> Ventas y Finanzas
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'inventory' ? '2px solid var(--brand-primary)' : 'none', padding: '0.5rem 1rem', color: activeTab === 'inventory' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'inventory' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Package size={18} /> Inventario y Productos
        </button>
        <button 
          onClick={() => setActiveTab('purchases')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'purchases' ? '2px solid var(--brand-primary)' : 'none', padding: '0.5rem 1rem', color: activeTab === 'purchases' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'purchases' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <ShoppingCart size={18} /> Compras y Proveedores
        </button>
        <button 
          onClick={() => setActiveTab('customers')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'customers' ? '2px solid var(--brand-primary)' : 'none', padding: '0.5rem 1rem', color: activeTab === 'customers' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'customers' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
        >
          <Users size={18} /> Clientes y Cobranza
        </button>
      </div>

      <div className={styles.grid}>
        {activeTab === 'sales' && (
          <>
            <ReportCard 
              title="Ventas Totales" description="Resumen de todas las ventas facturadas." icon={<TrendingUp size={24} />}
              endpoint="/reports/sales" pdfName={`Ventas_${filter}.pdf`} excelName={`Ventas_${filter}.xlsx`} filterParam={filter}
            />
            <ReportCard 
              title="Facturas Emitidas" description="Listado detallado de facturas." icon={<FileText size={24} />}
              endpoint="/reports/invoices" pdfName={`Facturas_${filter}.pdf`} excelName={`Facturas_${filter}.xlsx`} filterParam={filter}
            />
            <ReportCard 
              title="Arqueo de Caja" description="Movimientos y saldos de caja." icon={<DollarSign size={24} />}
              endpoint="/reports/cash" pdfName={`Caja_${filter}.pdf`} excelName={`Caja_${filter}.xlsx`} filterParam={filter}
            />
            <ReportCard 
              title="Pedidos de Venta" description="Estado de los pedidos realizados." icon={<Briefcase size={24} />}
              endpoint="/reports/orders" pdfName={`Pedidos_${filter}.pdf`} excelName={`Pedidos_${filter}.xlsx`} filterParam={filter}
            />
          </>
        )}

        {activeTab === 'inventory' && (
          <>
            <ReportCard 
              title="Inventario General" description="Stock actual de todos los productos." icon={<Package size={24} />}
              endpoint="/reports/inventory" pdfName={`Inventario.pdf`} excelName={`Inventario.xlsx`} filterParam=""
            />
            <ReportCard 
              title="Movimientos" description="Entradas y salidas de bodega." icon={<Activity size={24} />}
              endpoint="/reports/movements" pdfName={`Movimientos_${filter}.pdf`} excelName={`Movimientos_${filter}.xlsx`} filterParam={filter}
            />
            <ReportCard 
              title="Productos Agotados" description="Productos sin existencias." icon={<XOctagon size={24} />}
              endpoint="/reports/out-of-stock" pdfName={`Agotados.pdf`} excelName={`Agotados.xlsx`} filterParam=""
            />
            <ReportCard 
              title="Bajo Stock" description="Productos por debajo del nivel mínimo." icon={<AlertTriangle size={24} />}
              endpoint="/reports/low-stock" pdfName={`BajoStock.pdf`} excelName={`BajoStock.xlsx`} filterParam=""
            />
            <ReportCard 
              title="Más Vendidos" description="Top 50 productos más vendidos." icon={<Star size={24} />}
              endpoint="/reports/best-sellers" pdfName={`MasVendidos_${filter}.pdf`} excelName={`MasVendidos_${filter}.xlsx`} filterParam={filter}
            />
          </>
        )}

        {activeTab === 'purchases' && (
          <>
            <ReportCard 
              title="Compras Realizadas" description="Registro de compras a proveedores." icon={<ShoppingCart size={24} />}
              endpoint="/reports/purchases" pdfName={`Compras_${filter}.pdf`} excelName={`Compras_${filter}.xlsx`} filterParam={filter}
            />
            <ReportCard 
              title="Directorio Proveedores" description="Lista de proveedores activos." icon={<Truck size={24} />}
              endpoint="/reports/suppliers" pdfName={`Proveedores.pdf`} excelName={`Proveedores.xlsx`} filterParam=""
            />
          </>
        )}

        {activeTab === 'customers' && (
          <>
            <ReportCard 
              title="Directorio de Clientes" description="Lista completa de clientes." icon={<Users size={24} />}
              endpoint="/reports/customers" pdfName={`Clientes.pdf`} excelName={`Clientes.xlsx`} filterParam=""
            />
            <ReportCard 
              title="Clientes con Deuda" description="Cuentas por cobrar y saldos pendientes." icon={<CreditCard size={24} />}
              endpoint="/reports/debtors" pdfName={`Deudores.pdf`} excelName={`Deudores.xlsx`} filterParam=""
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
