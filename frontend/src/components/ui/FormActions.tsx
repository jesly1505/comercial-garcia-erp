import React from 'react';
import { Save, Trash2, X, Edit3 } from 'lucide-react';
import styles from '../../styles/forms.module.css';

interface FormActionsProps {
  isEditing: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
}

export const FormActions: React.FC<FormActionsProps> = ({ 
  isEditing, 
  onCancel, 
  onDelete, 
  isLoading = false 
}) => {
  return (
    <div className={styles.formActions}>
      {/* Left side actions (like Delete) */}
      <div className={styles.actionsLeft}>
        {isEditing && onDelete && (
          <button 
            type="button" 
            className="btn btn-danger" 
            onClick={onDelete}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Trash2 size={18} /> Eliminar
          </button>
        )}
      </div>

      {/* Right side actions (Save / Cancel) */}
      <div className={styles.actionsRight}>
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onCancel}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <X size={18} /> Cancelar
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {isEditing ? <Edit3 size={18} /> : <Save size={18} />}
          {isEditing ? 'Guardar Cambios' : 'Guardar'}
        </button>
      </div>
    </div>
  );
};
