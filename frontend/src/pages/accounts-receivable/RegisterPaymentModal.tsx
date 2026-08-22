import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  ar: any;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const RegisterPaymentModal: React.FC<Props> = ({ ar, onClose, onPaymentSuccess }) => {
  const [amount, setAmount] = useState<number | ''>(ar.balance);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Ingrese un monto válido');
    if (amount > ar.balance) return toast.error('El monto no puede superar el saldo restante');

    setIsSubmitting(true);
    try {
      await api.post(`/accounts-receivable/${ar.id}/payments`, {
        amount: Number(amount),
        paymentMethod
      });
      toast.success('Abono registrado exitosamente');
      onPaymentSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar el abono');
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} color="#10b981" /> Registrar Abono
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Factura:</span>
            <span style={{ fontWeight: 'bold' }}>{ar.invoice.invoiceNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
            <span style={{ fontWeight: 'bold' }}>{ar.customer.firstName} {ar.customer.lastName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Saldo Restante:</span>
            <span style={{ fontWeight: 'bold', color: '#ef4444' }}>C${ar.balance.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Monto a Abonar (C$)</label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              max={ar.balance}
              value={amount} 
              onChange={e => setAmount(Number(e.target.value))} 
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} 
              required
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Método de Pago</label>
            <select 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={isSubmitting}>
            {isSubmitting ? 'Procesando...' : 'Confirmar Abono'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default RegisterPaymentModal;
