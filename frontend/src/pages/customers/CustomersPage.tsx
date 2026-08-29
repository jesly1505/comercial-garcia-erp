import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../services/api';
import { Trash2, FileText, Search, Plus, Edit2, User, Building2, Phone, MapPin, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomerHistoryModal } from './CustomerHistoryModal';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import styles from './CustomersPage.module.css';

const customerSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  company: z.string().optional(),
  ruc: z.string().optional(),
  documentNumber: z.string().min(5, 'La Cédula/DNI es requerida'),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  municipality: z.string().optional(),
  department: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'No puede ser negativo').default(0),
  isActive: z.boolean().default(true),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const { hasPermission } = useAuth();

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: { isActive: true, creditLimit: 0 },
  });

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (err) {
      console.error('Error fetching customers', err);
      toast.error('Error al cargar clientes');
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    if (searchTerm === '') {
      setFilteredCustomers(customers);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredCustomers(customers.filter(c =>
        c.firstName.toLowerCase().includes(lower) ||
        c.lastName.toLowerCase().includes(lower) ||
        c.documentNumber.includes(lower) ||
        (c.company && c.company.toLowerCase().includes(lower))
      ));
    }
  }, [searchTerm, customers]);

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      if (isEditing && editingId) {
        await api.put(`/customers/${editingId}`, data);
        toast.success('Cliente actualizado exitosamente');
      } else {
        await api.post('/customers', data);
        toast.success('Cliente registrado exitosamente');
      }
      fetchCustomers();
      handleCancel();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el cliente');
    }
  };

  const handleEdit = (customer: any) => {
    setIsEditing(true);
    setEditingId(customer.id);
    Object.keys(customer).forEach((key) => {
      setValue(key as keyof CustomerFormValues, customer[key]);
    });
    setShowForm(true);
  };

  const handleDeleteById = async (id: number) => {
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Cliente eliminado');
      setConfirmDelete(null);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleCancel = () => {
    reset({ isActive: true, creditLimit: 0 });
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
  };

  const openHistory = (customer: any) => {
    setSelectedCustomer(customer);
    setShowHistoryModal(true);
  };

  return (
    <div className={styles.page}>
      {/* ─── Page Header ─── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Cartera de Clientes</h1>

        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          {hasPermission('customers:create') && (
            <button
              className={styles.btnPrimary}
              onClick={() => { setIsEditing(false); reset(); setShowForm(true); }}
            >
              <Plus size={18} /> Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Identificación (DNI)</th>
              <th>Contacto</th>
              <th>Finanzas (C$)</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No hay clientes registrados o no coinciden con la búsqueda.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(c => {
                const balance = c.accountsReceivable?.reduce((sum: number, acc: any) => sum + Number(acc.balance || 0), 0) || 0;
                return (
                  <tr key={c.id} className={styles.row}>
                    <td className={styles.code}>{c.code?.substring(0, 8)}</td>
                    <td>
                      <div className={styles.customerName}>{c.firstName} {c.lastName}</div>
                      {c.company && <div className={styles.customerSub}>{c.company}</div>}
                    </td>
                    <td>{c.documentNumber}</td>
                    <td>{c.phone || c.whatsapp || <span className={styles.na}>N/A</span>}</td>
                    <td>
                      <div className={styles.finRow}>
                        <span className={styles.finLabel}>Saldo:</span>
                        <strong style={{ color: balance > 0 ? '#ef4444' : '#10b981' }}>
                          C${Number(balance).toFixed(2)}
                        </strong>
                      </div>
                      <div className={styles.finRow}>
                        <span className={styles.finLabel}>Límite:</span>
                        <span>C${Number(c.creditLimit || 0).toFixed(2)}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => openHistory(c)} className={styles.actionBtn} title="Historial">
                          <FileText size={16} />
                        </button>
                        {hasPermission('customers:edit') && (
                          <button onClick={() => handleEdit(c)} className={styles.actionBtn} title="Editar">
                            <Edit2 size={16} />
                          </button>
                        )}
                        {hasPermission('customers:delete') && (
                          <button onClick={() => setConfirmDelete(c.id)} className={`${styles.actionBtn} ${styles.actionBtnDanger}`} title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Customer Form Modal ─── */}
      <Modal
        isOpen={showForm}
        onClose={handleCancel}
        title={isEditing ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
        subtitle={isEditing ? 'Modifica los datos del cliente' : 'Completa los datos del nuevo cliente'}
        size="lg"
        footer={
          <>
            <button type="button" className={styles.btnCancel} onClick={handleCancel}>
              Cancelar
            </button>
            <button
              type="submit"
              form="customer-form"
              className={styles.btnPrimary}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Cliente'}
            </button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Sección: Información Personal */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <User size={16} />
              <span>Información Personal</span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre(s) <span className={styles.req}>*</span></label>
                <input type="text" className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`} {...register('firstName')} />
                {errors.firstName && <span className={styles.errMsg}>{errors.firstName.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Apellidos <span className={styles.req}>*</span></label>
                <input type="text" className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`} {...register('lastName')} />
                {errors.lastName && <span className={styles.errMsg}>{errors.lastName.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Cédula de Identidad <span className={styles.req}>*</span></label>
                <input type="text" className={`${styles.input} ${errors.documentNumber ? styles.inputError : ''}`} {...register('documentNumber')} />
                {errors.documentNumber && <span className={styles.errMsg}>{errors.documentNumber.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Correo Electrónico</label>
                <input type="email" className={`${styles.input} ${errors.email ? styles.inputError : ''}`} {...register('email')} />
                {errors.email && <span className={styles.errMsg}>{errors.email.message}</span>}
              </div>
            </div>
          </div>

          {/* Sección: Empresa */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <Building2 size={16} />
              <span>Datos Empresariales (Opcional)</span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Empresa</label>
                <input type="text" className={styles.input} {...register('company')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>RUC de la Empresa</label>
                <input type="text" className={styles.input} {...register('ruc')} />
              </div>
            </div>
          </div>

          {/* Sección: Contacto */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <Phone size={16} />
              <span>Contacto</span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Teléfono</label>
                <input type="tel" className={styles.input} {...register('phone')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>WhatsApp</label>
                <input type="tel" className={styles.input} {...register('whatsapp')} placeholder="Ej: +50512345678" />
              </div>
            </div>
          </div>

          {/* Sección: Ubicación */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <MapPin size={16} />
              <span>Ubicación</span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Departamento</label>
                <input type="text" className={styles.input} {...register('department')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Municipio</label>
                <input type="text" className={styles.input} {...register('municipality')} />
              </div>
              <div className={`${styles.field} ${styles.fullWidth}`}>
                <label className={styles.label}>Dirección Exacta</label>
                <input type="text" className={styles.input} {...register('address')} />
              </div>
            </div>
          </div>

          {/* Sección: Finanzas */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <DollarSign size={16} />
              <span>Configuración Financiera</span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Límite de Crédito (C$)</label>
                <input type="number" step="0.01" className={`${styles.input} ${errors.creditLimit ? styles.inputError : ''}`} {...register('creditLimit')} />
                {errors.creditLimit && <span className={styles.errMsg}>{errors.creditLimit.message}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Estado del Cliente</label>
                <select className={styles.input} {...register('isActive', { setValueAs: v => v === 'true' || v === true })}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* ─── Confirm Delete Modal ─── */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        type="danger"
        title="¿Eliminar cliente?"
        message="Esta acción es irreversible. Si el cliente tiene facturas, solo se desactivará."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={() => confirmDelete !== null && handleDeleteById(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ─── History Modal ─── */}
      {showHistoryModal && selectedCustomer && (
        <CustomerHistoryModal
          customer={selectedCustomer}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};

export default CustomersPage;
