import React, { useState } from 'react';
import { X, Printer, Download, CheckCircle, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { downloadQuotationPDF, printQuotationTicket } from '../../utils/quotationPrinter';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface QuotationDetailModalProps {
  quotation: any;
  onClose: () => void;
  onRefresh: () => void;
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  quotation,
  onClose,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO'>('EFECTIVO');
  const [creditDays, setCreditDays] = useState<number>(30);

  if (!quotation) return null;

  const handleUpdateStatus = async (newStatus: string) => {
    if (!window.confirm(`¿Deseas cambiar el estado de la cotización a "${newStatus}"?`)) return;
    setLoading(true);
    try {
      await api.patch(`/quotations/${quotation.id}/status`, { status: newStatus });
      toast.success(`Estado actualizado a ${newStatus}`);
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/quotations/${quotation.id}/convert-invoice`, {
        paymentMethod,
        creditDays: paymentMethod === 'CREDITO' ? creditDays : undefined,
      });
      toast.success(`Cotización facturada exitosamente: #${res.data.invoice?.invoiceNumber || ''}`);
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al convertir cotización a factura');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>Pendiente</span>;
      case 'APROBADA':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>Aprobada</span>;
      case 'FACTURADA':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Facturada</span>;
      case 'RECHAZADA':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Rechazada</span>;
      case 'CANCELADA':
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af' }}>Cancelada</span>;
      default:
        return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}>{status}</span>;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                {quotation.quotationNumber}
              </h2>
              {getStatusBadge(quotation.status)}
            </div>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Emitida el {new Date(quotation.createdAt).toLocaleString()} {quotation.user?.firstName ? `por ${quotation.user.firstName} ${quotation.user.lastName || ''}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.4rem', borderRadius: '50%' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '10px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Cliente</span>
            <strong style={{ fontSize: '1rem' }}>
              {quotation.customer?.firstName} {quotation.customer?.lastName}
            </strong>
            {quotation.customer?.company && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{quotation.customer.company}</div>
            )}
            {quotation.customer?.documentNumber && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>RUC/Céd: {quotation.customer.documentNumber}</div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Vigencia</span>
            <strong style={{ fontSize: '1rem' }}>
              {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Sin fecha límite'}
            </strong>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Moneda: Córdobas (C$)
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Contacto</span>
            <div style={{ fontSize: '0.9rem' }}>{quotation.customer?.phone || 'Sin teléfono'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{quotation.customer?.email || 'Sin correo'}</div>
          </div>
        </div>

        {/* Items Table */}
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.75rem' }}>SKU</th>
                <th style={{ padding: '0.75rem' }}>Producto</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Cant.</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Precio Unit.</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Desc.</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {quotation.details?.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {item.product?.sku || '-'}
                  </td>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                    {item.product?.name || 'Producto'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    C${Number(item.unitPrice).toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', color: item.discount > 0 ? '#ef4444' : 'inherit' }}>
                    {item.discount > 0 ? `-C$${Number(item.discount).toFixed(2)}` : '-'}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                    C${Number(item.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Notes Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Notas / Observaciones:
            </span>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                minHeight: '60px',
                color: quotation.notes ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {quotation.notes || 'Ninguna observación registrada.'}
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
              <span>C${Number(quotation.subtotal || 0).toFixed(2)}</span>
            </div>
            {quotation.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ef4444' }}>
                <span>Descuento:</span>
                <span>-C${Number(quotation.discount).toFixed(2)}</span>
              </div>
            )}
            {quotation.tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>IVA (15%):</span>
                <span>+C${Number(quotation.tax).toFixed(2)}</span>
              </div>
            )}
            <div
              style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.15rem',
                fontWeight: 'bold',
              }}
            >
              <span>Total:</span>
              <span style={{ color: 'var(--primary-color)' }}>C${Number(quotation.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Convert Modal Overlay */}
        {showConvertModal && (
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              marginBottom: '1.5rem',
            }}
          >
            <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
              <ShieldCheck size={20} /> Convertir Cotización a Factura Oficial
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Se generará una factura activa, se descontarán las unidades del inventario y se registrará la cuenta/pago.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Método de Pago:</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}
                >
                  <option value="EFECTIVO">Efectivo / Contado</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>

              {paymentMethod === 'CREDITO' && (
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Plazo de Crédito:</label>
                  <select
                    value={creditDays}
                    onChange={(e) => setCreditDays(Number(e.target.value))}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}
                  >
                    <option value={8}>8 días</option>
                    <option value={15}>15 días</option>
                    <option value={30}>30 días</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleConvertToInvoice}
                disabled={loading}
                style={{ background: '#10b981', borderColor: '#10b981' }}
              >
                {loading ? 'Procesando...' : 'Confirmar y Facturar'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowConvertModal(false)}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => printQuotationTicket(quotation)}
              className="btn btn-secondary"
              title="Imprimir Ticket"
            >
              <Printer size={16} style={{ marginRight: '0.4rem' }} /> Ticket
            </button>
            <button
              onClick={() => downloadQuotationPDF(quotation)}
              className="btn btn-secondary"
              title="Descargar PDF membretado"
              style={{ color: '#3b82f6' }}
            >
              <Download size={16} style={{ marginRight: '0.4rem' }} /> Descargar PDF
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {quotation.status === 'PENDIENTE' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('APROBADA')}
                  className="btn btn-secondary"
                  style={{ color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                  disabled={loading}
                >
                  <CheckCircle size={16} style={{ marginRight: '0.4rem' }} /> Aprobar
                </button>
                <button
                  onClick={() => handleUpdateStatus('RECHAZADA')}
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  disabled={loading}
                >
                  <XCircle size={16} style={{ marginRight: '0.4rem' }} /> Rechazar
                </button>
              </>
            )}

            {quotation.status !== 'FACTURADA' && quotation.status !== 'CANCELADA' && quotation.status !== 'RECHAZADA' && !showConvertModal && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="btn btn-primary"
                style={{ background: '#10b981', borderColor: '#10b981' }}
                disabled={loading}
              >
                <ArrowRight size={16} style={{ marginRight: '0.4rem' }} /> Facturar Cotización
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
