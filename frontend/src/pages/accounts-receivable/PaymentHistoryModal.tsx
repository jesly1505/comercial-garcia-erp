import React, { useState, useEffect } from 'react';
import { X, History } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  ar: any;
  onClose: () => void;
}

const PaymentHistoryModal: React.FC<Props> = ({ ar, onClose }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/accounts-receivable/${ar.id}/payments`);
        setPayments(res.data);
      } catch (error) {
        toast.error('Error al cargar el historial de pagos');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [ar.id]);

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={20} color="var(--brand-primary)" /> Historial de Pagos
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
            <span style={{ fontWeight: 'bold' }}>{ar.customer.firstName} {ar.customer.lastName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Factura / Monto Inicial:</span>
            <span style={{ fontWeight: 'bold' }}>{ar.invoice.invoiceNumber} / C${ar.totalDebt.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Saldo Restante Actual:</span>
            <span style={{ fontWeight: 'bold', color: ar.balance > 0 ? '#ef4444' : '#10b981' }}>C${ar.balance.toFixed(2)}</span>
          </div>
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Cargando historial...</div>
          ) : payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              No hay pagos registrados para esta cuenta.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {payments.map(payment => (
                <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>C${payment.amount.toFixed(2)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Mótodo: {payment.paymentMethod}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(payment.paymentDate).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentHistoryModal;
