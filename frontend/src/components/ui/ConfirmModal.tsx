import React from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';
import { Modal } from './Modal';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'danger',
}) => {
  const iconMap = {
    danger:  { Icon: Trash2,        css: styles.iconDanger  },
    warning: { Icon: AlertTriangle, css: styles.iconWarning },
    info:    { Icon: Info,          css: styles.iconInfo    },
    success: { Icon: CheckCircle,   css: styles.iconSuccess },
  };

  const btnMap = {
    danger:  styles.btnDanger,
    warning: styles.btnWarning,
    info:    styles.btnInfo,
    success: styles.btnSuccess,
  };

  const { Icon, css: iconCss } = iconMap[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title=""
      size="sm"
      footer={
        <>
          <button className={styles.btnCancel} onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`${styles.btnConfirm} ${btnMap[type]}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </>
      }
    >
      <div className={styles.content}>
        <div className={`${styles.iconWrap} ${iconCss}`}>
          <Icon size={28} strokeWidth={1.8} />
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
      </div>
    </Modal>
  );
};
