import React, { useState, useEffect } from 'react';
import { Save, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import rStyles from './RoleFormModal.module.css';

interface Permission {
  id: number;
  code: string;
  description: string;
}

interface RoleFormModalProps {
  role: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const MODULES = [
  { id: 'users', name: 'Usuarios' },
  { id: 'roles', name: 'Roles y Permisos' },
  { id: 'customers', name: 'Clientes' },
  { id: 'suppliers', name: 'Proveedores' },
  { id: 'inventory', name: 'Inventario' },
  { id: 'sales', name: 'Ventas y Pedidos' },
  { id: 'purchases', name: 'Compras' },
  { id: 'cash', name: 'Caja' },
  { id: 'accounts_receivable', name: 'Cuentas x Cobrar' },
  { id: 'reports', name: 'Reportes' },
  { id: 'settings', name: 'Configuración' },
  { id: 'audit', name: 'Bitácora' }
];

const ACTIONS = [
  { id: 'view', name: 'Ver' },
  { id: 'create', name: 'Crear' },
  { id: 'edit', name: 'Editar' },
  { id: 'delete', name: 'Eliminar' },
  { id: 'approve', name: 'Aprobar' },
  { id: 'export', name: 'Exportar' },
  { id: 'import', name: 'Importar' },
  { id: 'print', name: 'Imprimir' }
];

const RoleFormModal: React.FC<RoleFormModalProps> = ({ role, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || ''
  });
  
  const [_allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set(role?.permissions || []));
  const [loading, setLoading] = useState(false);
  const isAdmin = role?.name === 'ADMIN';

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const { data } = await api.get('/roles/permissions');
      setAllPermissions(data);
    } catch (error) {
      toast.error('Error al cargar permisos del sistema');
    }
  };

  const handleTogglePermission = (code: string) => {
    if (isAdmin) return; 

    const newSet = new Set(selectedPermissions);
    if (newSet.has(code)) {
      newSet.delete(code);
    } else {
      newSet.add(code);
    }
    setSelectedPermissions(newSet);
  };

  const handleToggleModule = (moduleId: string) => {
    if (isAdmin) return;
    
    const codes = ACTIONS.map(a => `${moduleId}:${a.id}`);
    const hasAll = codes.every(code => selectedPermissions.has(code));
    
    const newSet = new Set(selectedPermissions);
    if (hasAll) {
      codes.forEach(code => newSet.delete(code));
    } else {
      codes.forEach(code => newSet.add(code));
    }
    setSelectedPermissions(newSet);
  };

  const handleToggleActionColumn = (actionId: string) => {
    if (isAdmin) return;

    const codes = MODULES.map(m => `${m.id}:${actionId}`);
    const hasAll = codes.every(code => selectedPermissions.has(code));

    const newSet = new Set(selectedPermissions);
    if (hasAll) {
      codes.forEach(code => newSet.delete(code));
    } else {
      codes.forEach(code => newSet.add(code));
    }
    setSelectedPermissions(newSet);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payload = {
        ...formData,
        permissions: Array.from(selectedPermissions)
      };

      if (role) {
        await api.put(`/roles/${role.id}`, payload);
        toast.success('Rol actualizado');
      } else {
        await api.post('/roles', payload);
        toast.success('Rol creado');
      }
      onSaved();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al guardar rol');
    } finally {
      setLoading(false);
    }
  };

  const isChecked = (code: string) => isAdmin || selectedPermissions.has(code);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={role ? `Editar Rol: ${role.name}` : 'Nuevo Rol'}
      subtitle={isAdmin ? 'El rol Administrador tiene permisos totales e inamovibles.' : 'Define el nombre y la matriz de permisos para este rol.'}
      size="xl"
      footer={
        <>
          <button type="button" className={rStyles.btnCancel} onClick={onClose}>Cancelar</button>
          <button type="submit" form="roleForm" disabled={loading || isAdmin} className={rStyles.btnPrimary}>
            <Save size={16} /> {loading ? 'Guardando...' : 'Guardar Matriz'}
          </button>
        </>
      }
    >
      <form id="roleForm" onSubmit={handleSubmit} className={rStyles.form}>
        <div className={rStyles.grid2}>
          <div className={rStyles.field}>
            <label className={rStyles.label}>Nombre del Rol <span className={rStyles.req}>*</span></label>
            <input
              type="text" required
              className={rStyles.input}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              disabled={isAdmin || role?.name === 'Vendedor'}
            />
          </div>
          <div className={rStyles.field}>
            <label className={rStyles.label}>Descripción</label>
            <input
              type="text"
              className={rStyles.input}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              disabled={isAdmin}
            />
          </div>
        </div>

        <div className={rStyles.matrixWrap}>
          <div className={rStyles.matrixHead}>
            <Shield size={15} /><span>Matriz de Permisos</span>
            <span className={rStyles.matrixHint}>(Haz clic en el nombre del módulo o acción para seleccionar toda la fila/columna)</span>
          </div>
          <div className={rStyles.tableWrap}>
            <table className={rStyles.permTable}>
              <thead>
                <tr>
                  <th className={rStyles.moduleCol}>Módulo</th>
                  {ACTIONS.map(action => (
                    <th key={action.id} className={rStyles.actionCol}>
                      <button
                        type="button"
                        onClick={() => handleToggleActionColumn(action.id)}
                        disabled={isAdmin}
                        className={rStyles.headerBtn}
                        title={`Seleccionar toda la columna: ${action.name}`}
                      >
                        {action.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(mod => (
                  <tr key={mod.id} className={rStyles.permRow}>
                    <td className={rStyles.moduleCell}>
                      <button
                        type="button"
                        className={rStyles.moduleBtn}
                        onClick={() => handleToggleModule(mod.id)}
                        disabled={isAdmin}
                        title={`Seleccionar toda la fila: ${mod.name}`}
                      >
                        {mod.name}
                      </button>
                    </td>
                    {ACTIONS.map(action => {
                      const code = `${mod.id}:${action.id}`;
                      return (
                        <td key={code} className={rStyles.checkCell}>
                          <input
                            type="checkbox"
                            className={rStyles.checkbox}
                            checked={isChecked(code)}
                            onChange={() => handleTogglePermission(code)}
                            disabled={isAdmin}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default RoleFormModal;
