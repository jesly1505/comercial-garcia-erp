import React, { useState, useEffect } from 'react';
import { CreditCard, History, DollarSign, Search, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import RegisterPaymentModal from './RegisterPaymentModal';
import PaymentHistoryModal from './PaymentHistoryModal';

const AccountsReceivablePage: React.FC = () => {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [filteredReceivables, setFilteredReceivables] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'OVERDUE' | 'PAID'>('PENDING');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAr, setSelectedAr] = useState<any>(null);

  const fetchReceivables = async () => {
    try {
      const res = await api.get('/accounts-receivable');
      setReceivables(res.data);
    } catch (err) {
      toast.error('Error al cargar cuentas por cobrar');
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  useEffect(() => {
    const now = new Date();
    
    let filtered = receivables.filter(r => {
      const isOverdue = r.dueDate && new Date(r.dueDate) < now && r.balance > 0;
      
      if (activeTab === 'PENDING') return !isOverdue && r.balance > 0;
      if (activeTab === 'OVERDUE') return isOverdue;
      if (activeTab === 'PAID') return r.balance <= 0 || r.status === 'PAID';
      return true;
    });

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.customer.firstName.toLowerCase().includes(lower) ||
        r.customer.lastName.toLowerCase().includes(lower) ||
        r.invoice.invoiceNumber.toLowerCase().includes(lower)
      );
    }

    setFilteredReceivables(filtered);
  }, [receivables, activeTab, searchTerm]);

  const handleOpenPayment = (ar: any) => {
    setSelectedAr(ar);
    setShowPaymentModal(true);
  };

  const handleOpenHistory = (ar: any) => {
    setSelectedAr(ar);
    setShowHistoryModal(true);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'PAID';
    if (isOverdue) return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>Vencida</span>;
    if (status === 'PAID') return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Pagada</span>;
    if (status === 'PARTIAL') return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>Abonada</span>;
    return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Pendiente</span>;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={28} /> Cuentas por Cobrar
        </h1>
        
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Buscar por cliente o factura..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', width: '300px' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('PENDING')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'PENDING' ? '2px solid var(--brand-primary)' : 'none', padding: '0.5rem 1rem', color: activeTab === 'PENDING' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'PENDING' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Clock size={18} /> Pendientes
        </button>
        <button 
          onClick={() => setActiveTab('OVERDUE')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'OVERDUE' ? '2px solid #ef4444' : 'none', padding: '0.5rem 1rem', color: activeTab === 'OVERDUE' ? '#ef4444' : 'var(--text-secondary)', fontWeight: activeTab === 'OVERDUE' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Clock size={18} /> Vencidas
        </button>
        <button 
          onClick={() => setActiveTab('PAID')}
          style={{ background: 'none', border: 'none', borderBottom: activeTab === 'PAID' ? '2px solid #10b981' : 'none', padding: '0.5rem 1rem', color: activeTab === 'PAID' ? '#10b981' : 'var(--text-secondary)', fontWeight: activeTab === 'PAID' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <CheckCircle size={18} /> Pagadas
        </button>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem' }}>Cliente</th>
              <th style={{ padding: '1rem' }}>N° Factura</th>
              <th style={{ padding: '1rem' }}>Fecha Emisión</th>
              <th style={{ padding: '1rem' }}>Vencimiento</th>
              <th style={{ padding: '1rem' }}>Deuda Total</th>
              <th style={{ padding: '1rem' }}>Saldo Restante</th>
              <th style={{ padding: '1rem' }}>Estado</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceivables.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron cuentas por cobrar en esta categoría.
                </td>
              </tr>
            ) : (
              filteredReceivables.map(ar => (
                <tr key={ar.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{ar.customer.firstName} {ar.customer.lastName}</div>
                    {ar.customer.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ar.customer.phone}</div>}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>{ar.invoice.invoiceNumber}</td>
                  <td style={{ padding: '1rem' }}>{new Date(ar.invoice.issueDate).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', color: (ar.dueDate && new Date(ar.dueDate) < new Date() && ar.balance > 0) ? '#ef4444' : 'inherit' }}>
                    {ar.dueDate ? new Date(ar.dueDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '1rem' }}>C${ar.totalDebt.toFixed(2)}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', color: ar.balance > 0 ? '#ef4444' : '#10b981' }}>
                    C${ar.balance.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {getStatusBadge(ar.status, ar.dueDate)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {ar.balance > 0 && (
                      <button 
                        onClick={() => handleOpenPayment(ar)} 
                        className="btn btn-primary" 
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} 
                        title="Registrar Abono"
                      >
                        <DollarSign size={16} style={{ marginRight: '0.25rem' }} /> Abono
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenHistory(ar)} 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem' }} 
                      title="Historial de Pagos"
                    >
                      <History size={16} />
                    </button>
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
          onClose={() => { setShowPaymentModal(false); setSelectedAr(null); }}
          onPaymentSuccess={() => { setShowPaymentModal(false); fetchReceivables(); }}
        />
      )}

      {showHistoryModal && selectedAr && (
        <PaymentHistoryModal
          ar={selectedAr}
          onClose={() => { setShowHistoryModal(false); setSelectedAr(null); }}
        />
      )}
    </div>
  );
};

export default AccountsReceivablePage;
