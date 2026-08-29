import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Download, FileText, ArrowRightLeft, Plus, Edit, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import formStyles from '../../styles/forms.module.css';
import { FormActions } from '../../components/ui/FormActions';
import Pagination from '../../components/common/Pagination';

const movementSchema = z.object({
  productId: z.string().min(1, 'Debe seleccionar un producto'),
  movementType: z.enum(['Compra', 'Venta', 'Ajuste', 'Devolucion', 'Transferencia']),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser mayor a 0'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type MovementFormValues = z.infer<typeof movementSchema>;

const MovementsPage: React.FC = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: {
      movementType: 'Compra'
    }
  });

  const fetchMovements = async () => {
    try {
      const res = await api.get('/inventory/movements');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setMovements(data);
      setFiltered(data);
    } catch (err) {
      console.error('Error fetching movements', err);
      toast.error('Error al cargar movimientos de inventario');
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?all=true');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products', err);
      toast.error('Error al cargar productos');
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFiltered(movements);
    } else {
      const lower = searchTerm.toLowerCase();
      setFiltered(movements.filter(m => 
        m.referenceNumber?.toLowerCase().includes(lower) || 
        m.product?.name.toLowerCase().includes(lower) ||
        m.movementType.toLowerCase().includes(lower) ||
        m.reason?.toLowerCase().includes(lower)
      ));
    }
    setCurrentPage(1);
  }, [searchTerm, movements]);

  const onSubmit = async (data: MovementFormValues) => {
    try {
      // El backend espera movementType en mayúsculas
      const payload = {
        ...data,
        movementType: data.movementType.toUpperCase()
      };
      
      await api.post('/inventory/movements', payload);
      toast.success('Movimiento registrado exitosamente');
      fetchMovements();
      setShowForm(false);
      reset();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar movimiento');
    }
  };

  const handleDeleteMovement = async (id: number) => {
    if (!window.confirm('¿Estás seguro de ELIMINAR este movimiento? Esto revertirá el stock afectado y borrará el registro.')) return;
    try {
      await api.delete(`/inventory/movements/${id}`);
      toast.success('Movimiento eliminado y stock revertido');
      fetchMovements();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar el movimiento');
    }
  };

  const handleEditMovement = async (id: number, currentReason: string, currentNotes: string) => {
    const newReason = window.prompt('Nuevo motivo (o déjalo en blanco):', currentReason || '');
    if (newReason === null) return; // Canceló
    const newNotes = window.prompt('Nuevas observaciones (o déjalo en blanco):', currentNotes || '');
    if (newNotes === null) return; // Canceló

    try {
      await api.put(`/inventory/movements/${id}`, { reason: newReason, notes: newNotes });
      toast.success('Movimiento actualizado');
      fetchMovements();
    } catch (err: any) {
      toast.error('Error al actualizar el movimiento');
    }
  };

  const exportToExcel = () => {
    const dataToExport = filtered.map(m => ({
      'Número Movimiento': m.referenceNumber,
      'Fecha': new Date(m.createdAt).toLocaleDateString(),
      'Hora': new Date(m.createdAt).toLocaleTimeString(),
      'Producto': m.product?.name,
      'Tipo': m.movementType,
      'Cantidad': m.quantity,
      'Stock Antes': m.stockBefore,
      'Stock Después': m.stockAfter,
      'Usuario': m.user ? `${m.user.firstName} ${m.user.lastName}` : m.userId,
      'Motivo': m.reason || '-',
      'Observaciones': m.notes || '-'
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, "Historial_Movimientos.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text("Historial Global de Movimientos", 14, 15);
    const tableColumn = ["N° Mov", "Fecha y Hora", "Producto", "Tipo", "Cant.", "Antes", "Después", "Usuario"];
    const tableRows: any[] = [];
    filtered.forEach(m => {
      tableRows.push([
        m.referenceNumber,
        new Date(m.createdAt).toLocaleString(),
        m.product?.name,
        m.movementType,
        m.quantity,
        m.stockBefore,
        m.stockAfter,
        m.user ? `${m.user.firstName} ${m.user.lastName}` : m.userId
      ]);
    });
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 25, 48] }
    });
    doc.save("Movimientos.pdf");
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ArrowRightLeft size={28} color="var(--primary-color)" />
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Movimientos de Inventario</h1>
        </div>
        
        {!showForm && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar (N°, Producto, Motivo)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', width: '280px' }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Registrar Movimiento
            </button>
            <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <button className="btn btn-secondary" onClick={exportToExcel} title="Exportar a Excel" style={{ padding: '0.5rem' }}>
                <Download size={18} color="#10b981" />
              </button>
              <button className="btn btn-secondary" onClick={exportToPDF} title="Exportar a PDF" style={{ padding: '0.5rem' }}>
                <FileText size={18} color="#ef4444" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm ? (
        <div className={formStyles.formContainer}>
          <div className={formStyles.sectionTitle}>Registrar Movimiento</div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className={formStyles.grid2}>
              <div className={formStyles.formGroup}>
                <label>Producto *</label>
                <select className={formStyles.input} {...register('productId')}>
                  <option value="">Seleccione un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name} (Stock: {p.currentStock})</option>
                  ))}
                </select>
                {errors.productId && <span className={formStyles.error}>{errors.productId.message}</span>}
              </div>

              <div className={formStyles.formGroup}>
                <label>Tipo de Movimiento *</label>
                <select className={formStyles.input} {...register('movementType')}>
                  <option value="Compra">Compra (Entrada)</option>
                  <option value="Venta">Venta (Salida)</option>
                  <option value="Ajuste">Ajuste (+/-)</option>
                  <option value="Devolucion">Devolución (Entrada)</option>
                  <option value="Transferencia">Transferencia (Salida)</option>
                </select>
                {errors.movementType && <span className={formStyles.error}>{errors.movementType.message}</span>}
              </div>

              <div className={formStyles.formGroup}>
                <label>Cantidad (Usa valor negativo para salida de Ajuste) *</label>
                <input type="number" className={formStyles.input} placeholder="Ej. 10 o -5" {...register('quantity')} />
                {errors.quantity && <span className={formStyles.error}>{errors.quantity.message}</span>}
              </div>

              <div className={formStyles.formGroup}>
                <label>Motivo</label>
                <input type="text" className={formStyles.input} placeholder="Ej. Inventario inicial, daño..." {...register('reason')} />
                {errors.reason && <span className={formStyles.error}>{errors.reason.message}</span>}
              </div>
            </div>

            <div className={formStyles.formGroup} style={{ marginTop: '1rem' }}>
              <label>Observaciones</label>
              <textarea className={formStyles.input} placeholder="Detalles adicionales..." rows={3} {...register('notes')}></textarea>
              {errors.notes && <span className={formStyles.error}>{errors.notes.message}</span>}
            </div>

            <FormActions 
              isEditing={false}
              onCancel={() => { setShowForm(false); reset(); }} 
              isLoading={isSubmitting} 
            />
          </form>
        </div>
      ) : (
        <>
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem' }}>N° Movimiento</th>
                <th style={{ padding: '1rem' }}>Fecha y Hora</th>
                <th style={{ padding: '1rem' }}>Producto</th>
                <th style={{ padding: '1rem' }}>Tipo</th>
                <th style={{ padding: '1rem' }}>Cantidad</th>
                <th style={{ padding: '1rem' }}>Stock Antes</th>
                <th style={{ padding: '1rem' }}>Stock Después</th>
                <th style={{ padding: '1rem' }}>Usuario</th>
                <th style={{ padding: '1rem' }}>Motivo</th>
                {user?.role === 'ADMIN' && <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: '2rem', textAlign: 'center' }}>No hay movimientos registrados.</td></tr>
              ) : (
                filtered
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map(m => {
                  const color = m.stockAfter > m.stockBefore ? '#10b981' : (m.stockAfter < m.stockBefore ? '#ef4444' : 'var(--text-color)');
                  
                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{m.referenceNumber}</td>
                      <td style={{ padding: '1rem' }}>{new Date(m.createdAt).toLocaleString()}</td>
                      <td style={{ padding: '1rem' }}>{m.product?.name}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color }}>
                        {m.movementType}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: 'bold', color }}>{m.stockAfter > m.stockBefore ? '+' : (m.stockAfter < m.stockBefore ? '-' : '')}{m.quantity}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{m.stockBefore}</td>
                      <td style={{ padding: '1rem', fontWeight: 'bold' }}>{m.stockAfter}</td>
                      <td style={{ padding: '1rem' }}>{m.user ? `${m.user.firstName} ${m.user.lastName}` : `Usuario ${m.userId}`}</td>
                      <td style={{ padding: '1rem', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.reason}>
                        {m.reason || '-'}
                      </td>
                      {user?.role === 'ADMIN' && (
                        <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => handleEditMovement(m.id, m.reason, m.notes)} className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }} title="Editar Motivo/Notas">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteMovement(m.id)} className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444', borderColor: '#ef4444' }} title="Eliminar Movimiento (Revertir Stock)">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
};

export default MovementsPage;
