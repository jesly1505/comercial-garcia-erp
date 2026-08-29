import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Search, Plus, CheckCircle, XCircle, ShoppingCart, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import ConfirmModal from '../../components/common/ConfirmModal';
import TableSkeleton from '../../components/common/TableSkeleton';
import Pagination from '../../components/common/Pagination';

export interface PurchaseItem {
  id: number;
  invoiceNumber?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  supplier?: {
    id: number;
    name: string;
    ruc?: string;
  };
  details?: any[];
}

const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'primary';
    action: (() => Promise<void>) | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: null
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchases');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setPurchases(data);
    } catch (err) {
      console.error('Error fetching purchases', err);
      toast.error('Error al cargar compras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const filteredPurchases = useMemo(() => {
    let result = purchases;
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter);
    }
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.id.toString().includes(lower) || 
        (p.supplier?.name || '').toLowerCase().includes(lower) ||
        (p.invoiceNumber || '').toLowerCase().includes(lower)
      );
    }
    return result;
  }, [searchTerm, statusFilter, purchases]);

  const handleUpdateStatus = (id: number, status: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cambiar Estado de Compra',
      message: `¿Estás seguro de marcar la orden de compra #${id} como ${status}?`,
      variant: status === 'CANCELLED' ? 'danger' : 'primary',
      action: async () => {
        try {
          await api.put(`/purchases/${id}/status`, { status });
          toast.success(`Compra marcada como ${status}`);
          fetchPurchases();
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Error al actualizar el estado');
        }
      }
    });
  };

  const handleDeletePurchase = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Compra',
      message: `¿Estás seguro de ELIMINAR la compra #${id}? Si fue recibida, los productos se descontarán del inventario de forma irreversible.`,
      variant: 'danger',
      action: async () => {
        try {
          await api.delete(`/purchases/${id}`);
          toast.success('Compra eliminada correctamente');
          fetchPurchases();
        } catch (err: any) {
          toast.error(err.response?.data?.error || 'Error al eliminar la compra');
        }
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#d97706', fontSize: '0.8rem', fontWeight: 'bold' }}>Pendiente</span>;
      case 'RECEIVED': return <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#d1fae5', color: '#059669', fontSize: '0.8rem', fontWeight: 'bold' }}>Recibida</span>;
      case 'CANCELLED': return <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 'bold' }}>Cancelada</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShoppingCart size={28} color="var(--primary-color)" />
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 'bold' }}>Historial de Compras</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            aria-label="Filtrar compras por estado"
            style={{ width: 'auto', padding: '0.5rem 1rem' }}
          >
            <option value="">Todos los Estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="RECEIVED">Recibidas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
          
          <button 
            onClick={() => navigate('/nueva-compra')}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            aria-label="Registrar nueva compra"
          >
            <Plus size={18} />
            Nueva Compra
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
          <input 
            type="text" 
            placeholder="Buscar compra por Proveedor o N° Factura..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            aria-label="Buscar compras"
            style={{ paddingLeft: '2.5rem', width: '100%' }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>ID</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Fecha</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Proveedor</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>N° Factura</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '1rem' }}>
                  <TableSkeleton rows={5} columns={7} />
                </td>
              </tr>
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No se encontraron registros de compras
                </td>
              </tr>
            ) : (
              filteredPurchases
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{p.id}</td>
                  <td style={{ padding: '1rem' }}>{formatDateTime(p.createdAt)}</td>
                  <td style={{ padding: '1rem' }}>{p.supplier?.name || '-'}</td>
                  <td style={{ padding: '1rem' }}>{p.invoiceNumber || 'S/N'}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{formatCurrency(p.totalAmount)}</td>
                  <td style={{ padding: '1rem' }}>{getStatusBadge(p.status)}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {p.status === 'PENDING' && (
                        <button 
                          onClick={() => handleUpdateStatus(p.id, 'RECEIVED')}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#10b981' }}
                          title="Recibir Mercadería"
                          aria-label={`Recibir mercadería orden #${p.id}`}
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {p.status === 'PENDING' && (
                        <button 
                          onClick={() => handleUpdateStatus(p.id, 'CANCELLED')}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#ef4444' }}
                          title="Cancelar Compra"
                          aria-label={`Cancelar compra orden #${p.id}`}
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                      {user?.role === 'ADMIN' && (
                        <button 
                          onClick={() => handleDeletePurchase(p.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#ef4444' }}
                          title="Eliminar Compra"
                          aria-label={`Eliminar compra orden #${p.id}`}
                        >
                          <Trash2 size={16} />
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
        totalItems={filteredPurchases.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        isLoading={isProcessing}
        onConfirm={async () => {
          if (confirmModal.action) {
            setIsProcessing(true);
            await confirmModal.action();
            setIsProcessing(false);
          }
          setConfirmModal({ isOpen: false, title: '', message: '', action: null });
        }}
        onCancel={() => setConfirmModal({ isOpen: false, title: '', message: '', action: null })}
      />
    </div>
  );
};

export default PurchasesPage;
