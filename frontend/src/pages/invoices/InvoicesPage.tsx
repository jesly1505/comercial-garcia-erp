import React, { useState, useEffect, useMemo } from 'react';
import { Search, Printer, Download, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { downloadInvoicePDF, printInvoiceTicket } from '../../utils/invoicePrinter';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import ConfirmModal from '../../components/common/ConfirmModal';
import TableSkeleton from '../../components/common/TableSkeleton';
import Pagination from '../../components/common/Pagination';

export interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  totalAmount: number;
  status: string;
  customer?: {
    firstName: string;
    lastName: string;
  };
  user?: {
    firstName: string;
  };
}

const InvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [voidModal, setVoidModal] = useState<{ isOpen: boolean; id: number | null; invoiceNumber: string }>({
    isOpen: false,
    id: null,
    invoiceNumber: ''
  });
  const [voiding, setVoiding] = useState(false);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      const invoiceData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setInvoices(invoiceData);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleConfirmVoid = async () => {
    if (!voidModal.id) return;
    setVoiding(true);
    try {
      await api.patch(`/invoices/${voidModal.id}/void`);
      toast.success(`Factura ${voidModal.invoiceNumber} anulada correctamente`);
      setVoidModal({ isOpen: false, id: null, invoiceNumber: '' });
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al anular la factura');
    } finally {
      setVoiding(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return invoices.filter(inv => {
      const customerName = `${inv.customer?.firstName || ''} ${inv.customer?.lastName || ''}`.toLowerCase();
      const userName = `${inv.user?.firstName || ''}`.toLowerCase();
      return (inv.invoiceNumber || '').toLowerCase().includes(term) || customerName.includes(term) || userName.includes(term);
    });
  }, [invoices, searchTerm]);

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Historial de Facturación</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Consulta, imprime y anula facturas emitidas</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
            <input
              type="text"
              placeholder="Buscar por Consecutivo, Cliente o Vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar facturas"
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 3rem',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-glass)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Consecutivo</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Fecha</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Cliente</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Vendedor</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Estado</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '1rem' }}>
                  <TableSkeleton rows={5} columns={7} />
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>No se encontraron facturas</td></tr>
            ) : (
              filteredInvoices
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((inv) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '1rem' }}>{formatDateTime(inv.issueDate)}</td>
                  <td style={{ padding: '1rem' }}>{inv.customer?.firstName} {inv.customer?.lastName}</td>
                  <td style={{ padding: '1rem' }}>{inv.user?.firstName || '-'}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{formatCurrency(inv.totalAmount)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600,
                      background: inv.status === 'ANULADA' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      color: inv.status === 'ANULADA' ? '#ef4444' : '#10b981'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={() => printInvoiceTicket(inv)}
                      style={{ padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer', color: 'var(--text-primary)' }}
                      title="Imprimir Ticket"
                      aria-label={`Imprimir factura ${inv.invoiceNumber}`}
                    >
                      <Printer size={16} />
                    </button>
                    <button 
                      onClick={() => downloadInvoicePDF(inv)}
                      style={{ padding: '0.5rem', borderRadius: '6px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', cursor: 'pointer', color: '#3b82f6' }}
                      title="Descargar PDF"
                      aria-label={`Descargar PDF factura ${inv.invoiceNumber}`}
                    >
                      <Download size={16} />
                    </button>
                    {user?.role === 'ADMIN' && inv.status !== 'ANULADA' && (
                      <button 
                        onClick={() => setVoidModal({ isOpen: true, id: inv.id, invoiceNumber: inv.invoiceNumber })}
                        style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', color: '#ef4444' }}
                        title="Anular Factura"
                        aria-label={`Anular factura ${inv.invoiceNumber}`}
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredInvoices.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <ConfirmModal
        isOpen={voidModal.isOpen}
        title="Anular Factura"
        message={`¿Estás seguro que deseas ANULAR la factura ${voidModal.invoiceNumber}? Esta acción devolverá los productos al inventario y cancelará el pago de forma irreversible.`}
        confirmText="Sí, Anular Factura"
        variant="danger"
        isLoading={voiding}
        onConfirm={handleConfirmVoid}
        onCancel={() => setVoidModal({ isOpen: false, id: null, invoiceNumber: '' })}
      />
    </div>
  );
};

export default InvoicesPage;
