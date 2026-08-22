import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import RoleFormModal from './RoleFormModal';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import r from './RolesPage.module.css';

interface Role {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  permissions: string[];
  userCount?: number;
}

type ConfirmAction = 'delete' | 'toggle' | null;

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    role: Role | null;
    action: ConfirmAction;
  }>({ isOpen: false, role: null, action: null });

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data);
    } catch {
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (role: Role) => { setSelectedRole(role); setShowFormModal(true); };

  const openConfirm = (role: Role, action: ConfirmAction) => {
    setConfirmModal({ isOpen: true, role, action });
  };

  const executeAction = async () => {
    const { role, action } = confirmModal;
    if (!role || !action) return;

    try {
      if (action === 'delete') {
        await api.delete(`/roles/${role.id}`);
        toast.success('Rol eliminado correctamente');
      } else if (action === 'toggle') {
        await api.patch(`/roles/${role.id}/toggle-status`);
        toast.success(`Rol ${role.isActive ? 'deshabilitado' : 'habilitado'} correctamente`);
      }
      fetchRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al realizar la acción');
    } finally {
      setConfirmModal({ isOpen: false, role: null, action: null });
    }
  };

  // Confirm modal content derived from action
  const confirmContent = () => {
    const { role, action } = confirmModal;
    if (!role || !action) return { title: '', message: '', type: 'warning' as const, confirmText: '' };

    if (action === 'delete') {
      return {
        title: `Eliminar rol "${role.name}"`,
        message: `Esta acción es permanente. El rol será eliminado del sistema. Asegúrate de que ningún usuario esté asignado a este rol antes de continuar.`,
        type: 'danger' as const,
        confirmText: 'Sí, eliminar'
      };
    }
    return {
      title: role.isActive ? `Deshabilitar rol "${role.name}"` : `Habilitar rol "${role.name}"`,
      message: role.isActive
        ? `Los usuarios con este rol no podrán acceder al sistema hasta que sea reactivado.`
        : `Los usuarios con este rol podrán acceder al sistema nuevamente.`,
      type: (role.isActive ? 'warning' : 'info') as 'warning' | 'info',
      confirmText: role.isActive ? 'Sí, deshabilitar' : 'Sí, habilitar'
    };
  };

  const cc = confirmContent();

  const columns: Column<Role>[] = [
    {
      header: 'Nombre del Rol',
      accessor: (row) => (
        <div className={r.roleCell}>
          <div className={r.roleIcon}><Shield size={15} /></div>
          <div>
            <div className={r.roleName}>{row.name}</div>
            {row.description && <div className={r.roleDesc}>{row.description}</div>}
          </div>
        </div>
      ),
      sortable: true,
      sortAccessor: 'name'
    },
    {
      header: 'Permisos',
      accessor: (row) => (
        <span className={r.badgeBlue}>
          {row.name === 'ADMIN' ? '🔑 Acceso Total' : `${row.permissions?.length || 0} permisos`}
        </span>
      ),
      sortable: true,
      sortAccessor: (row) => row.permissions?.length || 0
    },
    {
      header: 'Usuarios',
      accessor: (row) => (
        <span className={r.userCount}>{row.userCount || 0} asignados</span>
      ),
      sortable: true,
      sortAccessor: 'userCount'
    },
    {
      header: 'Estado',
      accessor: (row) => (
        <span className={`${r.badge} ${row.isActive ? r.badgeActive : r.badgeInactive}`}>
          {row.isActive ? '● Activo' : '○ Inactivo'}
        </span>
      ),
      sortable: true,
      sortAccessor: 'isActive'
    }
  ];

  const actions = (row: Role) => (
    <div className={r.actionBtns}>
      {/* Habilitar / Deshabilitar */}
      {row.name !== 'ADMIN' && (
        <button
          onClick={() => openConfirm(row, 'toggle')}
          className={`${r.actionBtn} ${row.isActive ? r.actionDeactivate : r.actionActivate}`}
          title={row.isActive ? 'Deshabilitar rol' : 'Habilitar rol'}
        >
          {row.isActive ? <ToggleRight size={17} /> : <ToggleLeft size={17} />}
        </button>
      )}

      {/* Editar */}
      <button
        onClick={() => handleEdit(row)}
        className={`${r.actionBtn} ${r.actionEdit}`}
        title="Editar permisos"
      >
        <Edit2 size={15} />
      </button>

      {/* Eliminar — solo para roles no del sistema */}
      {row.name !== 'ADMIN' && row.name !== 'Vendedor' && (
        <button
          onClick={() => openConfirm(row, 'delete')}
          className={`${r.actionBtn} ${r.actionDelete}`}
          title="Eliminar rol"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );

  return (
    <div className={r.page}>
      {/* Header */}
      <div className={r.header}>
        <div>
          <h1 className={r.title}>Roles y Permisos</h1>
          <p className={r.subtitle}>Controla el nivel de acceso al sistema (RBAC)</p>
        </div>
        <button
          onClick={() => { setSelectedRole(null); setShowFormModal(true); }}
          className={r.btnPrimary}
        >
          <Plus size={18} /> Nuevo Rol
        </button>
      </div>

      {/* Table */}
      <div className={r.tableWrap}>
        {loading ? (
          <div className={r.loading}>Cargando roles...</div>
        ) : (
          <DataTable
            data={roles}
            columns={columns}
            actions={actions}
            fileName="Roles_Permisos_ERP"
            searchPlaceholder="Buscar rol..."
          />
        )}
      </div>

      {/* Role Form Modal */}
      {showFormModal && (
        <RoleFormModal
          role={selectedRole}
          onClose={() => setShowFormModal(false)}
          onSaved={() => { setShowFormModal(false); fetchRoles(); }}
        />
      )}

      {/* Unified Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={cc.title}
        message={cc.message}
        confirmText={cc.confirmText}
        type={cc.type}
        onConfirm={executeAction}
        onCancel={() => setConfirmModal({ isOpen: false, role: null, action: null })}
      />
    </div>
  );
};

export default RolesPage;
