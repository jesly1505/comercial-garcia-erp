import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Key, Shield, User, Power, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import UserFormModal from './UserFormModal';
import ResetPasswordModal from './ResetPasswordModal';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import api from '../../services/api';
import toast from 'react-hot-toast';
import u from './UsersPage.module.css';

interface Role { id: number; name: string; }

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string | null;
  isActive: boolean;
  role: Role;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    user: UserData | null;
    action: 'toggle' | 'delete' | null;
  }>({ isOpen: false, user: null, action: null });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const executeConfirmAction = async () => {
    const { user, action } = confirmModal;
    if (!user || !action) return;
    try {
      if (action === 'toggle') {
        const { data } = await api.patch(`/users/${user.id}/toggle-status`);
        setUsers(users.map(u => (u.id === data.id ? data : u)));
        toast.success(`Usuario ${data.isActive ? 'activado' : 'desactivado'}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error en la operación');
    } finally {
      setConfirmModal({ isOpen: false, user: null, action: null });
    }
  };

  const openEdit = (user: UserData) => { setSelectedUser(user); setShowFormModal(true); };
  const openReset = (user: UserData) => { setSelectedUser(user); setShowResetModal(true); };
  const handleToggleStatus = (user: UserData) => {
    setConfirmModal({ isOpen: true, user, action: 'toggle' });
  };

  const columns: Column<UserData>[] = [
    {
      header: 'Usuario',
      accessor: (row) => (
        <div className={u.userCell}>
          <div className={u.userAvatar}><User size={15} /></div>
          <span className={u.userName}>{row.firstName} {row.lastName}</span>
        </div>
      ),
      sortable: true,
      sortAccessor: (row) => `${row.firstName} ${row.lastName}`
    },
    { header: 'Username', accessor: 'username', sortable: true },
    { header: 'Correo', accessor: 'email', sortable: true },
    {
      header: 'Rol',
      accessor: (row) => (
        <span className={`${u.badge} ${row.role.name === 'ADMIN' ? u.badgeAdmin : u.badgeDefault}`}>
          {row.role.name === 'ADMIN' ? <ShieldAlert size={12} /> : <Shield size={12} />}
          {row.role.name}
        </span>
      ),
      sortable: true,
      sortAccessor: (row) => row.role.name
    },
    {
      header: 'Estado',
      accessor: (row) => (
        <span className={`${u.badge} ${row.isActive ? u.badgeActive : u.badgeInactive}`}>
          {row.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {row.isActive ? 'Activo' : 'Inactivo'}
        </span>
      ),
      sortable: true,
      sortAccessor: (row) => row.isActive ? 'Activo' : 'Inactivo'
    }
  ];

  const actions = (row: UserData) => (
    <div className={u.actionBtns}>
      <button onClick={() => openEdit(row)} className={`${u.actionBtn} ${u.actionEdit}`} title="Editar">
        <Edit2 size={16} />
      </button>
      <button onClick={() => openReset(row)} className={`${u.actionBtn} ${u.actionKey}`} title="Cambiar Contraseña">
        <Key size={16} />
      </button>
      <button
        onClick={() => handleToggleStatus(row)}
        className={`${u.actionBtn} ${row.isActive ? u.actionDeactivate : u.actionActivate}`}
        title={row.isActive ? 'Desactivar' : 'Activar'}
      >
        <Power size={16} />
      </button>
    </div>
  );

  return (
    <div className={u.page}>
      {/* Header */}
      <div className={u.header}>
        <div>
          <h1 className={u.title}>Gestión de Usuarios</h1>
          <p className={u.subtitle}>Crea y administra accesos al sistema</p>
        </div>
        <button
          onClick={() => { setSelectedUser(null); setShowFormModal(true); }}
          className={u.btnPrimary}
        >
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      {/* Table */}
      <div className={u.tableWrap}>
        {loading ? (
          <div className={u.loading}>Cargando usuarios...</div>
        ) : (
          <DataTable
            data={users}
            columns={columns}
            actions={actions}
            fileName="Usuarios_ERP"
            searchPlaceholder="Buscar por nombre, correo, usuario o rol..."
          />
        )}
      </div>

      {/* Modals */}
      {showFormModal && (
        <UserFormModal
          user={selectedUser}
          onClose={() => setShowFormModal(false)}
          onSaved={() => { setShowFormModal(false); fetchUsers(); }}
        />
      )}

      {showResetModal && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => setShowResetModal(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.user?.isActive ? 'Desactivar Usuario' : 'Activar Usuario'}
        message={`¿Estás seguro que deseas ${confirmModal.user?.isActive ? 'desactivar' : 'activar'} el acceso para ${confirmModal.user?.firstName}?`}
        confirmText={confirmModal.user?.isActive ? 'Sí, Desactivar' : 'Sí, Activar'}
        type={confirmModal.user?.isActive ? 'danger' : 'info'}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmModal({ isOpen: false, user: null, action: null })}
      />
    </div>
  );
};

export default UsersPage;
