import React, { useState, useEffect } from 'react';
import { Save, User, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import mStyles from './UserModal.module.css';

interface Role { id: number; name: string; }

interface UserFormModalProps {
  user: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ user, onClose, onSaved }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    roleId: user?.role?.id || ''
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/users/roles').then(({ data }) => {
      setRoles(data);
      if (!user && data.length > 0) {
        setFormData(prev => ({ ...prev, roleId: data[0].id }));
      }
    }).catch(() => toast.error('Error al cargar roles'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        roleId: Number(formData.roleId)
      };
      if (formData.username.trim()) payload.username = formData.username;
      if (user) {
        await api.put(`/users/${user.id}`, payload);
        toast.success('Usuario actualizado');
      } else {
        if (!formData.password) { toast.error('La contraseña es requerida'); setLoading(false); return; }
        payload.password = formData.password;
        await api.post('/users', payload);
        toast.success('Usuario creado');
      }
      onSaved();
    } catch (error: any) {
      const errs = error.response?.data?.errors;
      if (errs) errs.forEach((e: any) => toast.error(e.message));
      else toast.error(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={user ? 'Editar Usuario' : 'Nuevo Usuario'}
      subtitle={user ? `Modificando datos de ${user.firstName} ${user.lastName}` : 'Completa los datos del nuevo usuario del sistema'}
      size="md"
      footer={
        <>
          <button type="button" className={mStyles.btnCancel} onClick={onClose}>Cancelar</button>
          <button type="submit" form="user-form" className={mStyles.btnPrimary} disabled={loading}>
            <Save size={16} /> {loading ? 'Guardando...' : user ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className={mStyles.form}>
        <div className={mStyles.section}>
          <div className={mStyles.sectionHead}><User size={15} /><span>Información Personal</span></div>
          <div className={mStyles.grid2}>
            <div className={mStyles.field}>
              <label className={mStyles.label}>Nombre <span className={mStyles.req}>*</span></label>
              <input type="text" required className={mStyles.input} value={formData.firstName} onChange={e => set('firstName', e.target.value)} />
            </div>
            <div className={mStyles.field}>
              <label className={mStyles.label}>Apellido <span className={mStyles.req}>*</span></label>
              <input type="text" required className={mStyles.input} value={formData.lastName} onChange={e => set('lastName', e.target.value)} />
            </div>
            <div className={mStyles.field}>
              <label className={mStyles.label}>Username (Opcional)</label>
              <input type="text" className={mStyles.input} placeholder="ej: jperez" value={formData.username} onChange={e => set('username', e.target.value)} />
            </div>
            <div className={mStyles.field}>
              <label className={mStyles.label}>Correo Electrónico <span className={mStyles.req}>*</span></label>
              <input type="email" required className={mStyles.input} value={formData.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={mStyles.section}>
          <div className={mStyles.sectionHead}><Shield size={15} /><span>Acceso y Seguridad</span></div>
          <div className={mStyles.grid2}>
            {!user && (
              <div className={mStyles.field}>
                <label className={mStyles.label}>Contraseña <span className={mStyles.req}>*</span></label>
                <input type="password" required minLength={6} className={mStyles.input} value={formData.password} onChange={e => set('password', e.target.value)} />
              </div>
            )}
            <div className={mStyles.field}>
              <label className={mStyles.label}>Rol <span className={mStyles.req}>*</span></label>
              <select className={mStyles.input} required value={formData.roleId} onChange={e => set('roleId', e.target.value)}>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
