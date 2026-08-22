import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, CheckCircle, XCircle, FilePlus, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      const res = await api.get('/sales-orders');
      setOrders(res.data);
      setFilteredOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders', err);
      toast.error('No se pudieron cargar los pedidos');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredOrders(orders);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredOrders(orders.filter(o => 
        o.id.toString().includes(lower) || 
        o.customer.firstName.toLowerCase().includes(lower) || 
        o.customer.lastName.toLowerCase().includes(lower)
      ));
    }
  }, [searchTerm, orders]);

  const updateStatus = async (id: number, status: string) => {
    if (!window.confirm(`¿Seguro que deseas cambiar el estado a ${status}?`)) return;
    try {
      await api.put(`/sales-orders/${id}/status`, { status });
      toast.success('Estado actualizado');
      fetchOrders();
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  const convertToInvoice = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas convertir este pedido a factura? Esto descontará el inventario de forma irreversible.')) return;
    try {
      await api.post(`/sales-orders/${id}/invoice`);
      toast.success('Pedido convertido a Factura y entregado exitosamente');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al convertir a factura');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Pendiente</span>;
      case 'IN_PROCESS':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>En Proceso</span>;
      case 'ENTREGADO':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Entregado / Facturado</span>;
      case 'CANCELED':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Cancelado</span>;
      default:
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af' }}>{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Gestión de Pedidos</h1>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar pedido..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/pedidos/nuevo')}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Nuevo Pedido
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem' }}>ID Pedido</th>
              <th style={{ padding: '1rem' }}>Cliente</th>
              <th style={{ padding: '1rem' }}>Fecha</th>
              <th style={{ padding: '1rem' }}>Estado</th>
              <th style={{ padding: '1rem' }}>Monto Total</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones Rápidas</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay pedidos registrados.
                </td>
              </tr>
            ) : (
              filteredOrders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>#ORD-{String(o.id).padStart(5, '0')}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{o.customer.firstName} {o.customer.lastName}</div>
                    {o.customer.company && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{o.customer.company}</div>}
                  </td>
                  <td style={{ padding: '1rem' }}>{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>
                    {getStatusBadge(o.status)}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    C${o.totalAmount.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    
                    {o.status === 'PENDING' && (
                      <>
                        <button onClick={() => updateStatus(o.id, 'IN_PROCESS')} className="btn btn-secondary" style={{ padding: '0.4rem', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }} title="Aprobar Pedido (En Proceso)">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => updateStatus(o.id, 'CANCELED')} className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} title="Rechazar Pedido (Cancelar)">
                          <XCircle size={16} />
                        </button>
                      </>
                    )}

                    {o.status === 'IN_PROCESS' && (
                      <button onClick={() => convertToInvoice(o.id)} className="btn btn-secondary" style={{ padding: '0.4rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }} title="Convertir a Factura y Entregar">
                        <FilePlus size={16} />
                      </button>
                    )}

                    {/* Button for view details if needed */}
                    <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Ver Detalles">
                       <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersPage;
