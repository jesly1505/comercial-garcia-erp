import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Edit, Trash2, FileText, Building2, Phone, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { SupplierHistoryModal } from './SupplierHistoryModal';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import Pagination from '../../components/common/Pagination';
import sStyles from './SuppliersPage.module.css';

const supplierSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  company: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  ruc: z.string().optional(),
  isActive: z.boolean().default(true),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const { user } = useAuth();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema) as any,
    defaultValues: { isActive: true },
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Error al cargar proveedores');
    }
  };

  const handleCreate = () => {
    reset({ name: '', company: '', contactName: '', phone: '', email: '', address: '', ruc: '', isActive: true });
    setIsEditing(false);
    setSelectedId(null);
    setShowForm(true);
  };

  const handleEdit = (supplier: any) => {
    reset({
      name: supplier.name, company: supplier.company || '',
      contactName: supplier.contactName || '', phone: supplier.phone || '',
      email: supplier.email || '', address: supplier.address || '',
      ruc: supplier.ruc || '', isActive: supplier.isActive,
    });
    setIsEditing(true);
    setSelectedId(supplier.id);
    setShowForm(true);
  };

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      if (isEditing && selectedId) {
        await api.put(`/suppliers/${selectedId}`, data);
        toast.success('Proveedor actualizado exitosamente');
      } else {
        await api.post('/suppliers', data);
        toast.success('Proveedor registrado exitosamente');
      }
      await fetchSuppliers();
      setShowForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar proveedor');
    }
  };

  const handleDeleteById = async (id: number) => {
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Proveedor eliminado');
      setConfirmDeleteId(null);
      await fetchSuppliers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al eliminar proveedor');
    }
  };

  const openHistory = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowHistoryModal(true);
  };

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.ruc && s.ruc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch && (showInactive ? true : s.isActive);
  });

  return (
    <div className={sStyles.page}>
      {/* Header */}
      <div className={sStyles.pageHeader}>
        <h1 className={sStyles.pageTitle}>Proveedores</h1>
        <div className={sStyles.headerActions}>
          <div className={sStyles.searchWrap}>
            <Search size={16} className={sStyles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar proveedor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={sStyles.searchInput}
            />
          </div>
          <label className={sStyles.checkLabel}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inactivos
          </label>
          <button className={sStyles.btnPrimary} onClick={handleCreate}>
            <Plus size={18} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={sStyles.card}>
        <table className={sStyles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Proveedor</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 ? (
              <tr><td colSpan={5} className={sStyles.empty}>No se encontraron proveedores</td></tr>
            ) : (
              filteredSuppliers
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map(s => (
                <tr key={s.id} className={sStyles.row}>
                  <td className={sStyles.code}>{s.code}</td>
                  <td>
                    <div className={sStyles.supplierName}>{s.name}</div>
                    {s.company && <div className={sStyles.supplierSub}>{s.company}</div>}
                    {s.ruc && <div className={sStyles.supplierRuc}>RUC: {s.ruc}</div>}
                  </td>
                  <td>
                    {s.contactName && <div>{s.contactName}</div>}
                    <div className={sStyles.contactSub}>{s.phone || 'Sin teléfono'}</div>
                    {s.email && <div className={sStyles.contactSub}>{s.email}</div>}
                  </td>
                  <td>
                    <span className={`${sStyles.badge} ${s.isActive ? sStyles.badgeActive : sStyles.badgeInactive}`}>
                      {s.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td>
                    <div className={sStyles.actions}>
                      <button onClick={() => openHistory(s)} className={sStyles.actionBtn} title="Historial">
                        <FileText size={16} />
                      </button>
                      {user?.role === 'ADMIN' && (
                        <>
                          <button onClick={() => handleEdit(s)} className={sStyles.actionBtn} title="Editar">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => setConfirmDeleteId(s.id)} className={`${sStyles.actionBtn} ${sStyles.actionBtnDanger}`} title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredSuppliers.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {/* Supplier Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        subtitle={isEditing ? 'Modifica los datos del proveedor' : 'Completa los datos del nuevo proveedor'}
        size="lg"
        footer={
          <>
            <button type="button" className={sStyles.btnCancel} onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="submit" form="supplier-form" className={sStyles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </button>
          </>
        }
      >
        <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} className={sStyles.form}>
          <div className={sStyles.formSection}>
            <div className={sStyles.sectionHead}><Building2 size={15} /><span>Datos Generales</span></div>
            <div className={sStyles.formGrid}>
              <div className={sStyles.field}>
                <label className={sStyles.label}>Nombre Comercial <span className={sStyles.req}>*</span></label>
                <input type="text" className={`${sStyles.input} ${errors.name ? sStyles.inputError : ''}`} {...register('name')} />
                {errors.name && <span className={sStyles.errMsg}>{errors.name.message}</span>}
              </div>
              <div className={sStyles.field}>
                <label className={sStyles.label}>Razón Social / Empresa</label>
                <input type="text" className={sStyles.input} {...register('company')} />
              </div>
              <div className={sStyles.field}>
                <label className={sStyles.label}>RUC</label>
                <input type="text" className={sStyles.input} {...register('ruc')} />
              </div>
              <div className={sStyles.field}>
                <label className={sStyles.label}>Estado</label>
                <select className={sStyles.input} {...register('isActive', { setValueAs: v => v === 'true' || v === true })}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          <div className={sStyles.formSection}>
            <div className={sStyles.sectionHead}><Phone size={15} /><span>Contacto</span></div>
            <div className={sStyles.formGrid}>
              <div className={sStyles.field}>
                <label className={sStyles.label}>Nombre de Contacto</label>
                <input type="text" className={sStyles.input} {...register('contactName')} />
              </div>
              <div className={sStyles.field}>
                <label className={sStyles.label}>Teléfono</label>
                <input type="tel" className={sStyles.input} {...register('phone')} />
              </div>
              <div className={sStyles.field}>
                <label className={sStyles.label}>Correo Electrónico</label>
                <input type="email" className={`${sStyles.input} ${errors.email ? sStyles.inputError : ''}`} {...register('email')} />
                {errors.email && <span className={sStyles.errMsg}>{errors.email.message}</span>}
              </div>
            </div>
          </div>

          <div className={sStyles.formSection}>
            <div className={sStyles.sectionHead}><MapPin size={15} /><span>Ubicación</span></div>
            <div className={sStyles.formGrid}>
              <div className={`${sStyles.field} ${sStyles.fullWidth}`}>
                <label className={sStyles.label}>Dirección Exacta</label>
                <input type="text" className={sStyles.input} {...register('address')} />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        type="danger"
        title="¿Eliminar proveedor?"
        message="Esta acción eliminará al proveedor del sistema de forma permanente."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={() => confirmDeleteId !== null && handleDeleteById(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* History Modal */}
      {showHistoryModal && selectedSupplier && (
        <SupplierHistoryModal supplier={selectedSupplier} onClose={() => setShowHistoryModal(false)} />
      )}
    </div>
  );
};

export default SuppliersPage;
