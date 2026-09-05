import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, CheckCircle, XCircle, FilePlus } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import ConfirmModal from '../../components/common/ConfirmModal';
import TableSkeleton from '../../components/common/TableSkeleton';
import Pagination from '../../components/common/Pagination';

export interface SalesOrderItem {
  id: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    company?: string;
  };
  details: any[];
}

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: (() => Promise<void>) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales-orders');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders', err);
      toast.error('No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const lower = searchTerm.toLowerCase();
    return orders.filter(o => 
      o.id.toString().includes(lower) || 
      (o.customer?.firstName || '').toLowerCase().includes(lower) || 
      (o.customer?.lastName || '').toLowerCase().includes(lower) ||
      (o.customer?.company || '').toLowerCase().includes(lower)
    );
  }, [searchTerm, orders]);

  const handleUpdateStatus = (id: number, status: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Actualizar Estado del Pedido',
      message: `¿Seguro que deseas cambiar el estado del pedido #${id} a ${status}?`,
      action: async () => {
        try {
          await api.put(`/sales-orders/${id}/status`, { status });
          toast.success('Estado del pedido actualizado');
          fetchOrders();
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Error al actualizar el estado');
        }
      }
    });
  };

  const handleConvertToInvoice = (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Convertir Pedido a Factura',
      message: `¿Seguro que deseas convertir el pedido #${id} a factura? Esta acción descontará automáticamente el inventario.`,
      action: async () => {
        try {
          await api.post(`/sales-orders/${id}/invoice`);
          toast.success('Pedido convertido a Factura y entregado exitosamente');
          fetchOrders();
        } catch (error: any) {
          toast.error(error.response?.data?.error || 'Error al convertir a factura');
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Pendiente</span>;
      case 'CONFIRMED':
      case 'IN_PROCESS':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Confirmado / En Proceso</span>;
      case 'SHIPPED':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>Enviado</span>;
      case 'DELIVERED':
      case 'ENTREGADO':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Entregado / Facturado</span>;
      case 'CANCELLED':
      case 'CANCELED':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Cancelado</span>;
      default:
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af' }}>{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Pedidos y Ventas Especiales</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gestiona pedidos de clientes, entregas y facturación</p>
        </div>
        <button 
          onClick={() => navigate('/pedidos/nuevo')}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          aria-label="Crear nuevo pedido"
        >
          <Plus size={18} />
          Nuevo Pedido
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
          <input
            type="text"
            placeholder="Buscar pedido por ID o nombre de cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar pedido"
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ID</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Cliente</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Fecha</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem' }}>
                  <TableSkeleton rows={5} columns={6} />
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No se encontraron pedidos registrados
                </td>
              </tr>
            ) : (
              filteredOrders
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{order.id}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>{order.customer?.firstName} {order.customer?.lastName}</div>
                    {order.customer?.company && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customer.company}</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>{formatDateTime(order.createdAt)}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(order.totalAmount)}</td>
                  <td style={{ padding: '1rem' }}>{getStatusBadge(order.status)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'CONFIRMED')}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#3b82f6' }}
                          title="Confirmar Pedido"
                          aria-label={`Confirmar pedido #${order.id}`}
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleConvertToInvoice(order.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Facturar y Entregar"
                          aria-label={`Facturar pedido #${order.id}`}
                        >
                          <FilePlus size={14} /> Facturar
                        </button>
                      )}
                      {order.status !== 'DELIVERED' && order.status !== 'ENTREGADO' && order.status !== 'CANCELLED' && order.status !== 'CANCELED' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#ef4444' }}
                          title="Cancelar Pedido"
                          aria-label={`Cancelar pedido #${order.id}`}
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredOrders.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isLoading={isProcessing}
        onConfirm={async () => {
          if (confirmState.action) {
            setIsProcessing(true);
            await confirmState.action();
            setIsProcessing(false);
          }
          setConfirmState({ isOpen: false, title: '', message: '', action: null });
        }}
        onCancel={() => setConfirmState({ isOpen: false, title: '', message: '', action: null })}
      />
    </div>
  );
};

export default OrdersPage;
