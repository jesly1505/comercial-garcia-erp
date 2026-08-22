import React, { useState } from 'react';
import { Key } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import mStyles from './UserModal.module.css';

interface ResetPasswordModalProps {
  user: any;
  onClose: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ user, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      await api.patch(`/users/${user.id}/reset-password`, { password });
      toast.success('Contraseña restablecida correctamente');
      onClose();
    } catch (error: any) {
      const errs = error.response?.data?.errors;
      if (errs) errs.forEach((e: any) => toast.error(e.message));
      else toast.error(error.response?.data?.error || 'Error al restablecer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Restablecer Contraseña"
      subtitle={`Cambiando contraseña de ${user.firstName} ${user.lastName}`}
      size="sm"
      footer={
        <>
          <button type="button" className={mStyles.btnCancel} onClick={onClose}>Cancelar</button>
          <button type="submit" form="reset-form" className={mStyles.btnPrimary} disabled={loading}>
            <Key size={16} /> {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </>
      }
    >
      <form id="reset-form" onSubmit={handleSubmit} className={mStyles.form}>
        <div className={mStyles.alertInfo}>
          🔐 Esta acción cambiará inmediatamente la contraseña de <strong>{user.firstName} {user.lastName}</strong>. El usuario deberá usar la nueva contraseña en su próximo inicio de sesión.
        </div>
        <div className={mStyles.field} style={{ marginTop: '1rem' }}>
          <label className={mStyles.label}>Nueva Contraseña <span className={mStyles.req}>*</span></label>
          <input type="password" required minLength={6} className={mStyles.input} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
        <div className={mStyles.field} style={{ marginTop: '1rem' }}>
          <label className={mStyles.label}>Confirmar Contraseña <span className={mStyles.req}>*</span></label>
          <input type="password" required minLength={6} className={mStyles.input} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
        </div>
      </form>
    </Modal>
  );
};

export default ResetPasswordModal;
