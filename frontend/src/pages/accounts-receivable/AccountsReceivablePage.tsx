import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, History, DollarSign, Search, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import RegisterPaymentModal from './RegisterPaymentModal';
import PaymentHistoryModal from './PaymentHistoryModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import TableSkeleton from '../../components/common/TableSkeleton';

export interface ReceivableItem {
  id: number;
  totalDebt: number;
  balance: number;
  dueDate: string;
  status: string;
  customer: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  invoice: {
    id: number;
    invoiceNumber: string;
    totalAmount: number;
  };
  payments?: any[];
}

const AccountsReceivablePage: React.FC = () => {
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'OVERDUE' | 'PAID'>('PENDING');
  const [loading, setLoading] = useState(true);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAr, setSelectedAr] = useState<ReceivableItem | null>(null);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const res = await api.get('/accounts-receivable');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setReceivables(data);
    } catch (err) {
      toast.error('Error al cargar cuentas por cobrar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const filteredReceivables = useMemo(() => {
    const now = new Date();
    
    let filtered = receivables.filter(r => {
      const isOverdue = r.dueDate && new Date(r.dueDate) < now && Number(r.balance) > 0;
      
      if (activeTab === 'PENDING') return !isOverdue && Number(r.balance) > 0;
      if (activeTab === 'OVERDUE') return isOverdue;
      if (activeTab === 'PAID') return Number(r.balance) <= 0 || r.status === 'PAID';
      return true;
    });

    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        (r.customer?.firstName || '').toLowerCase().includes(lower) ||
        (r.customer?.lastName || '').toLowerCase().includes(lower) ||
        (r.invoice?.invoiceNumber || '').toLowerCase().includes(lower)
      );
    }

    return filtered;
  }, [receivables, activeTab, searchTerm]);

  const handleOpenPayment = (ar: ReceivableItem) => {
    setSelectedAr(ar);
    setShowPaymentModal(true);
  };

  const handleOpenHistory = (ar: ReceivableItem) => {
    setSelectedAr(ar);
    setShowHistoryModal(true);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={28} color="var(--primary-color)" />
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 'bold' }}>Cuentas por Cobrar</h1>
        </div>
      </div>

      {/* Tabs y Búsqueda */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`btn ${activeTab === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Clock size={16} /> Pendientes
          </button>
          <button
            onClick={() => setActiveTab('OVERDUE')}
            className={`btn ${activeTab === 'OVERDUE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Clock size={16} color="#ef4444" /> Vencidas
          </button>
          <button
            onClick={() => setActiveTab('PAID')}
            className={`btn ${activeTab === 'PAID' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <CheckCircle size={16} /> Pagadas
          </button>
        </div>

        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente o factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            aria-label="Buscar cuentas por cobrar"
            style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Factura</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Cliente</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Vencimiento</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Deuda Total</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Saldo Pendiente</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '1rem' }}>
                  <TableSkeleton rows={5} columns={6} />
                </td>
              </tr>
            ) : filteredReceivables.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No se encontraron cuentas por cobrar
                </td>
              </tr>
            ) : (
              filteredReceivables.map((ar) => (
                <tr key={ar.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{ar.invoice?.invoiceNumber}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>{ar.customer?.firstName} {ar.customer?.lastName}</div>
                    {ar.customer?.phone && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ar.customer.phone}</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      color: ar.dueDate && new Date(ar.dueDate) < new Date() && Number(ar.balance) > 0 ? '#ef4444' : 'inherit',
                      fontWeight: ar.dueDate && new Date(ar.dueDate) < new Date() && Number(ar.balance) > 0 ? 'bold' : 'normal'
                    }}>
                      {formatDate(ar.dueDate)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{formatCurrency(ar.totalDebt)}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: Number(ar.balance) > 0 ? '#f59e0b' : '#10b981' }}>
                    {formatCurrency(ar.balance)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {Number(ar.balance) > 0 && (
                        <button
                          onClick={() => handleOpenPayment(ar)}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          aria-label={`Abonar a factura ${ar.invoice?.invoiceNumber}`}
                        >
                          <DollarSign size={14} /> Abonar
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenHistory(ar)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', color: 'var(--text-secondary)' }}
                        title="Historial de Abonos"
                        aria-label={`Ver historial de pagos de factura ${ar.invoice?.invoiceNumber}`}
                      >
                        <History size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPaymentModal && selectedAr && (
        <RegisterPaymentModal
          ar={selectedAr}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedAr(null);
          }}
          onPaymentSuccess={fetchReceivables}
        />
      )}

      {showHistoryModal && selectedAr && (
        <PaymentHistoryModal
          ar={selectedAr}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedAr(null);
          }}
        />
      )}
    </div>
  );
};

export default AccountsReceivablePage;
