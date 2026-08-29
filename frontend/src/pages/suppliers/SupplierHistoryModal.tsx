import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShoppingBag } from 'lucide-react';
import api from '../../services/api';

interface SupplierHistoryModalProps {
  supplier: any;
  onClose: () => void;
}

export const SupplierHistoryModal: React.FC<SupplierHistoryModalProps> = ({ supplier, onClose }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/suppliers/${supplier.id}`);
        setDetails(res.data);
      } catch (err) {
        console.error('Error fetching supplier details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [supplier.id]);

  const purchaseOrders = details?.purchaseOrders || [];
  const totalPurchases = purchaseOrders.reduce((sum: number, po: any) => sum + Number(po.totalAmount || 0), 0);

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
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Historial del Proveedor</h2>
            <p style={{ color: 'var(--text-muted)' }}>{supplier.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="var(--text-secondary)" />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando información...</div>
        ) : (
          <>
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h4 style={{ color: '#3b82f6', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingBag size={18} /> Total Comprado (Órdenes de Compra)
              </h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                C${Number(totalPurchases).toFixed(2)}
              </p>
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                Últimas Órdenes de Compra
              </h3>
              
              {purchaseOrders.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '3rem' }}>
                  <ShoppingBag size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                  <p>No hay registro de compras aún.</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem 0' }}>Nº Orden</th>
                      <th style={{ padding: '0.75rem 0' }}>Fecha</th>
                      <th style={{ padding: '0.75rem 0' }}>Estado</th>
                      <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Total (C$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((po: any) => (
                      <tr key={po.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0' }}>OC-{po.id.toString().padStart(5, '0')}</td>
                        <td style={{ padding: '0.75rem 0' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem 0' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            fontSize: '0.75rem', 
                            backgroundColor: po.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: po.status === 'COMPLETED' ? '#10b981' : '#ef4444'
                          }}>
                            {po.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 'bold' }}>C${Number(po.totalAmount || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
