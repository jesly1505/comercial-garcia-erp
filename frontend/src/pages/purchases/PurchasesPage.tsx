import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Search, Plus, CheckCircle, XCircle, ShoppingCart, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchPurchases = async () => {
    try {
      const res = await api.get('/purchases');
      setPurchases(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Error fetching purchases', err);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    let result = purchases;
    
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.id.toString().includes(lower) || 
        p.supplier?.name.toLowerCase().includes(lower) ||
        p.invoiceNumber?.toLowerCase().includes(lower)
      );
    }
    
    setFiltered(result);
  }, [searchTerm, statusFilter, purchases]);

  const handleUpdateStatus = async (id: number, status: string) => {
    if (!window.confirm(`¿Estás seguro de marcar esta compra como ${status}?`)) return;

    try {
      await api.put(`/purchases/${id}/status`, { status });
      toast.success(`Compra marcada como ${status}`);
      fetchPurchases();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar el estado');
    }
  };

  const handleDeletePurchase = async (id: number) => {
    if (!window.confirm('¿Estás seguro de ELIMINAR esta compra por completo? Si fue recibida, los productos se descontarán del inventario. ESTO ES IRREVERSIBLE.')) return;
    try {
      await api.delete(`/purchases/${id}`);
      toast.success('Compra eliminada correctamente');
      fetchPurchases();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar la compra');
    }
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
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShoppingCart size={28} color="var(--primary-color)" />
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Historial de Compras</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
          >
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="RECEIVED">Recibida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar proveedor o factura..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', width: '250px' }}
            />
          </div>
          
          <button className="btn btn-primary" onClick={() => navigate('/nueva-compra')}>
            <Plus size={18} /> Nueva Compra
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem' }}>ID Compra</th>
              <th style={{ padding: '1rem' }}>Fecha</th>
              <th style={{ padding: '1rem' }}>Proveedor</th>
              <th style={{ padding: '1rem' }}>Factura / Doc.</th>
              <th style={{ padding: '1rem' }}>Total</th>
              <th style={{ padding: '1rem' }}>Estado</th>
              <th style={{ padding: '1rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>No hay compras registradas.</td></tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{p.id}</td>
                  <td style={{ padding: '1rem' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>{p.supplier?.name}</td>
                  <td style={{ padding: '1rem' }}>{p.invoiceNumber || '-'}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>C$ {p.totalAmount.toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>{getStatusBadge(p.status)}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {p.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(p.id, 'RECEIVED')} 
                              className="btn btn-secondary" 
                              title="Recibir Compra e Ingresar a Inventario"
                              style={{ padding: '0.4rem', color: '#059669', borderColor: '#059669' }}
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(p.id, 'CANCELLED')} 
                              className="btn btn-secondary" 
                              title="Cancelar Compra"
                              style={{ padding: '0.4rem', color: '#dc2626', borderColor: '#dc2626' }}
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {user?.role === 'ADMIN' && (
                          <button 
                            onClick={() => handleDeletePurchase(p.id)} 
                            className="btn btn-secondary" 
                            title="Eliminar de la Base de Datos (Admin)"
                            style={{ padding: '0.4rem', color: '#ef4444', borderColor: '#ef4444' }}
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
    </div>
  );
};

export default PurchasesPage;
