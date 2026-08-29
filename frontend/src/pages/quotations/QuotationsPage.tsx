import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, FileText, Printer, Download, Eye, 
  ArrowRight, Trash2, Edit3, Clock, CheckSquare, FileCheck
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { downloadQuotationPDF, printQuotationTicket } from '../../utils/quotationPrinter';
import { QuotationDetailModal } from './QuotationDetailModal';

const QuotationsPage: React.FC = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [filteredQuotations, setFilteredQuotations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const navigate = useNavigate();

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/quotations');
      setQuotations(res.data);
      setFilteredQuotations(res.data);
    } catch (err) {
      console.error('Error fetching quotations:', err);
      toast.error('No se pudieron cargar las cotizaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = quotations;

    if (statusFilter !== 'ALL') {
      result = result.filter((q) => q.status === statusFilter);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((q) => {
        const customerName = `${q.customer?.firstName || ''} ${q.customer?.lastName || ''}`.toLowerCase();
        const company = (q.customer?.company || '').toLowerCase();
        const quoteNum = (q.quotationNumber || '').toLowerCase();
        return customerName.includes(term) || company.includes(term) || quoteNum.includes(term);
      });
    }

    setFilteredQuotations(result);
  }, [searchTerm, statusFilter, quotations]);

  const handleDelete = async (id: number, number: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la cotización ${number}?`)) return;
    try {
      await api.delete(`/quotations/${id}`);
      toast.success('Cotización eliminada');
      fetchQuotations();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar cotización');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>Pendiente</span>;
      case 'APROBADA':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>Aprobada</span>;
      case 'FACTURADA':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Facturada</span>;
      case 'RECHAZADA':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>Rechazada</span>;
      case 'CANCELADA':
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af' }}>Cancelada</span>;
      default:
        return <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' }}>{status}</span>;
    }
  };

  // Metrics
  const totalCount = quotations.length;
  const pendingCount = quotations.filter((q) => q.status === 'PENDIENTE').length;
  const approvedCount = quotations.filter((q) => q.status === 'APROBADA').length;
  const invoicedCount = quotations.filter((q) => q.status === 'FACTURADA').length;
  const totalAmountSum = quotations
    .filter((q) => q.status !== 'CANCELADA' && q.status !== 'RECHAZADA')
    .reduce((acc, q) => acc + Number(q.totalAmount || 0), 0);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>Módulo de Cotizaciones</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            Gestiona propuestas comerciales, imprime proformas en PDF y conviértelas a facturas
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => navigate('/cotizaciones/nueva')}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Nueva Cotización
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(197, 155, 109, 0.15)', color: '#c59b6d' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Cotizaciones</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{totalCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pendientes</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f59e0b' }}>{pendingCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <CheckSquare size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Aprobadas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#3b82f6' }}>{approvedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <FileCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Facturadas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#10b981' }}>{invoicedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(197, 155, 109, 0.15)', color: '#c59b6d' }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Cotizado</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>C${Number(totalAmountSum).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar por número, cliente o empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 1rem 0.5rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-glass)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'Todas' },
            { key: 'PENDIENTE', label: 'Pendientes' },
            { key: 'APROBADA', label: 'Aprobadas' },
            { key: 'FACTURADA', label: 'Facturadas' },
            { key: 'RECHAZADA', label: 'Rechazadas' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                border: '1px solid var(--border-color)',
                background: statusFilter === tab.key ? 'var(--primary-color)' : 'var(--bg-glass)',
                color: statusFilter === tab.key ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: statusFilter === tab.key ? 600 : 'normal',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem' }}>No. Cotización</th>
              <th style={{ padding: '1rem' }}>Cliente</th>
              <th style={{ padding: '1rem' }}>Fecha Emisión</th>
              <th style={{ padding: '1rem' }}>Válido Hasta</th>
              <th style={{ padding: '1rem' }}>Estado</th>
              <th style={{ padding: '1rem' }}>Total (C$)</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Cargando cotizaciones...
                </td>
              </tr>
            ) : filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron cotizaciones.
                </td>
              </tr>
            ) : (
              filteredQuotations.map((q) => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    <span style={{ color: 'var(--primary-color)' }}>{q.quotationNumber}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {q.details?.length || 0} productos
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{q.customer?.firstName} {q.customer?.lastName}</div>
                    {q.customer?.company && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.customer.company}</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    {new Date(q.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                    {q.validUntil ? (
                      <span style={{ color: new Date(q.validUntil) < new Date() && q.status === 'PENDIENTE' ? '#ef4444' : 'inherit' }}>
                        {new Date(q.validUntil).toLocaleDateString()}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>15 días</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {getStatusBadge(q.status)}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold', fontSize: '1rem' }}>
                    C${Number(q.totalAmount).toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                      
                      {/* View Details */}
                      <button
                        onClick={() => setSelectedQuotation(q)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem' }}
                        title="Ver Detalle"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Print Ticket */}
                      <button
                        onClick={() => printQuotationTicket(q)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem' }}
                        title="Imprimir Ticket"
                      >
                        <Printer size={16} />
                      </button>

                      {/* Download PDF */}
                      <button
                        onClick={() => downloadQuotationPDF(q)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem', color: '#3b82f6' }}
                        title="Descargar PDF"
                      >
                        <Download size={16} />
                      </button>

                      {/* Edit (only if pending) */}
                      {q.status === 'PENDIENTE' && (
                        <button
                          onClick={() => navigate(`/cotizaciones/${q.id}/editar`)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#f59e0b' }}
                          title="Editar Cotización"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}

                      {/* Quick Convert (if pending or approved) */}
                      {q.status !== 'FACTURADA' && q.status !== 'CANCELADA' && q.status !== 'RECHAZADA' && (
                        <button
                          onClick={() => setSelectedQuotation(q)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                          title="Facturar Cotización"
                        >
                          <ArrowRight size={16} />
                        </button>
                      )}

                      {/* Delete */}
                      {q.status !== 'FACTURADA' && (
                        <button
                          onClick={() => handleDelete(q.id, q.quotationNumber)}
                          className="btn btn-secondary"
                          style={{ padding: '0.4rem', color: '#ef4444' }}
                          title="Eliminar Cotización"
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

      {/* Modal for viewing quotation details */}
      {selectedQuotation && (
        <QuotationDetailModal
          quotation={selectedQuotation}
          onClose={() => setSelectedQuotation(null)}
          onRefresh={fetchQuotations}
        />
      )}
    </div>
  );
};

export default QuotationsPage;
