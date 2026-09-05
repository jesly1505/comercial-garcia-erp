import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt, ShoppingBag, CreditCard } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface HistoryModalProps {
  customer: any;
  onClose: () => void;
}

export const CustomerHistoryModal: React.FC<HistoryModalProps> = ({ customer, onClose }) => {
  const [activeTab, setActiveTab] = useState<'facturas' | 'cuentas_pendientes' | 'pagos'>('facturas');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/customers/${customer.id}`);
        setDetails(res.data);
      } catch (err) {
        console.error('Error fetching customer details', err);
        toast.error('Error al cargar historial del cliente');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [customer.id]);

  const totalPending = details?.accountsReceivable?.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0) || 0;
  
  // Extraer todos los pagos de las cuentas por cobrar
  const payments = details?.accountsReceivable?.flatMap((acc: any) => acc.payments || []) || [];
  // Ordenar pagos del más reciente al más antiguo
  payments.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
      display: 'flex', justifyContent: 'flex-end'
    }}>
      <div className="animate-fade-in" style={{
        backgroundColor: 'var(--bg-base)', width: '100%', maxWidth: 'min(100vw, 650px)',
        height: '100%', overflowY: 'auto', padding: 'clamp(1rem, 3vw, 2rem)',
        boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Historial de Cliente</h2>
            <p style={{ color: 'var(--text-muted)' }}>{customer.firstName} {customer.lastName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="var(--text-secondary)" />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando información...</div>
        ) : (
          <>
            {/* Cuentas Pendientes (KPI rápido) */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: totalPending > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', border: `1px solid ${totalPending > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
              <h4 style={{ color: totalPending > 0 ? '#ef4444' : '#10b981', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} /> Cuentas Pendientes (Saldo Actual)
              </h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                C${Number(totalPending).toFixed(2)}
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
              <button 
                style={{ 
                  background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600,
                  borderBottom: activeTab === 'facturas' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                  color: activeTab === 'facturas' ? 'var(--brand-primary)' : 'var(--text-secondary)'
                }}
                onClick={() => setActiveTab('facturas')}
              >
                <Receipt size={16} style={{ display: 'inline', marginRight: '5px' }}/> Últimas Facturas
              </button>
              <button 
                style={{ 
                  background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600,
                  borderBottom: activeTab === 'cuentas_pendientes' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                  color: activeTab === 'cuentas_pendientes' ? 'var(--brand-primary)' : 'var(--text-secondary)'
                }}
                onClick={() => setActiveTab('cuentas_pendientes')}
              >
                <ShoppingBag size={16} style={{ display: 'inline', marginRight: '5px' }}/> Cuentas Pendientes
              </button>
              <button 
                style={{ 
                  background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600,
                  borderBottom: activeTab === 'pagos' ? '3px solid var(--brand-primary)' : '3px solid transparent',
                  color: activeTab === 'pagos' ? 'var(--brand-primary)' : 'var(--text-secondary)'
                }}
                onClick={() => setActiveTab('pagos')}
              >
                <CreditCard size={16} style={{ display: 'inline', marginRight: '5px' }}/> Historial de Pagos
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
              {activeTab === 'facturas' && (
                <div>
                  {details?.invoices?.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>
                      <Receipt size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                      <p>No hay facturas registradas.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.75rem 0' }}>Número</th>
                          <th style={{ padding: '0.75rem 0' }}>Fecha</th>
                          <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Total (C$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.invoices.map((inv: any) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 0' }}>{inv.invoiceNumber}</td>
                            <td style={{ padding: '0.75rem 0' }}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>C${Number(inv.totalAmount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'cuentas_pendientes' && (
                <div>
                  {details?.accountsReceivable?.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>
                      <ShoppingBag size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                      <p>No hay cuentas pendientes de pago.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.75rem 0' }}>ID Deuda</th>
                          <th style={{ padding: '0.75rem 0' }}>Deuda Total</th>
                          <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Saldo Pendiente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.accountsReceivable.map((acc: any) => (
                          <tr key={acc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 0' }}>Cta. #{acc.id}</td>
                            <td style={{ padding: '0.75rem 0' }}>C${Number(acc.totalDebt || 0).toFixed(2)}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>C${Number(acc.balance || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'pagos' && (
                <div>
                  {payments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>
                      <CreditCard size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                      <p>No hay pagos registrados.</p>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.75rem 0' }}>Fecha</th>
                          <th style={{ padding: '0.75rem 0' }}>Método</th>
                          <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Monto (C$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p: any) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 0' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                            <td style={{ padding: '0.75rem 0' }}>{p.paymentMethod}</td>
                            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>C${Number(p.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
