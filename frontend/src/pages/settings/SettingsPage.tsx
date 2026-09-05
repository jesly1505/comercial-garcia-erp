import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { Save, Building2, Settings2, Database, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface SettingsData {
  companyName: string;
  logoBase64: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string;
  dateFormat: string;
  invoiceAutoNumber: boolean;
  orderAutoNumber: boolean;
  movementAutoNumber: boolean;
  defaultMinStock: number;
  theme: string;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'company' | 'system' | 'backup'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<SettingsData>({
    companyName: '',
    logoBase64: null,
    address: '',
    phone: '',
    email: '',
    currency: 'C$',
    timezone: 'America/Managua',
    dateFormat: 'DD/MM/YYYY',
    invoiceAutoNumber: true,
    orderAutoNumber: true,
    movementAutoNumber: true,
    defaultMinStock: 5,
    theme: 'light'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setFormData(response.data);
    } catch (error) {
      toast.error('No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'ADMIN') {
      toast.error('Solo los administradores pueden guardar cambios');
      return;
    }

    try {
      setSaving(true);
      const response = await api.put('/settings', formData);
      const data = response.data;
      setFormData(data);
      setTheme(data.theme);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const response = await api.get('/settings/export', { responseType: 'blob' });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_erp_${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Respaldo descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar el respaldo');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value)
    }));
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ color: 'var(--text-primary)' }}>
            Configuración General
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ color: 'var(--text-secondary)' }}>
            Parametrización de empresa, sistema y base de datos
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-all shadow-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto" style={{ background: 'var(--bg-glass)', borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('company')}
            className={`flex items-center px-6 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'company'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            style={activeTab === 'company' ? { background: 'var(--bg-surface)', color: 'var(--brand-primary)', borderBottomColor: 'var(--brand-primary)' } : { color: 'var(--text-secondary)' }}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Empresa
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center px-6 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'system'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            style={activeTab === 'system' ? { background: 'var(--bg-surface)', color: 'var(--brand-primary)', borderBottomColor: 'var(--brand-primary)' } : { color: 'var(--text-secondary)' }}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Sistema
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center px-6 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600 bg-white font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            style={activeTab === 'backup' ? { background: 'var(--bg-surface)', color: 'var(--brand-primary)', borderBottomColor: 'var(--brand-primary)' } : { color: 'var(--text-secondary)' }}
          >
            <Database className="w-4 h-4 mr-2" />
            Respaldo y Datos
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6" style={{ background: 'var(--bg-surface)' }}>
          {user?.role !== 'ADMIN' && (
            <div className="mb-6 bg-yellow-50 text-yellow-800 p-4 rounded-lg flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
              <p className="text-sm">
                No tienes permisos de Administrador. Estás viendo la configuración en modo lectura.
              </p>
            </div>
          )}

          <form onSubmit={handleSave}>
            {/* Empresa Tab */}
            {activeTab === 'company' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>
                      Nombre de la Empresa *
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>
                      Logotipo (Texto en Base64 - Opcional)
                    </label>
                    <textarea
                      name="logoBase64"
                      rows={2}
                      value={formData.logoBase64 || ''}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                      style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      placeholder="data:image/png;base64,..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sistema Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                    Moneda y Formatos
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>Moneda</label>
                      <input
                        type="text"
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>Zona Horaria</label>
                      <select
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      >
                        <option value="America/Managua">América/Managua (GMT-6)</option>
                        <option value="America/Guatemala">América/Guatemala (GMT-6)</option>
                        <option value="America/Costa_Rica">América/Costa_Rica (GMT-6)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>Formato de Fecha</label>
                      <select
                        name="dateFormat"
                        value={formData.dateFormat}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                    Consecutivos e Inventario
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="invoiceAutoNumber"
                        id="invoiceAutoNumber"
                        checked={formData.invoiceAutoNumber}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="invoiceAutoNumber" className="ml-3 block text-sm font-medium text-gray-700" style={{ color: 'var(--text-primary)' }}>
                        Numeración automática de Facturas (FAC-00001)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="orderAutoNumber"
                        id="orderAutoNumber"
                        checked={formData.orderAutoNumber}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="orderAutoNumber" className="ml-3 block text-sm font-medium text-gray-700" style={{ color: 'var(--text-primary)' }}>
                        Numeración automática de Pedidos (PED-00001)
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="movementAutoNumber"
                        id="movementAutoNumber"
                        checked={formData.movementAutoNumber}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="movementAutoNumber" className="ml-3 block text-sm font-medium text-gray-700" style={{ color: 'var(--text-primary)' }}>
                        Numeración automática de Movimientos (MOV-00001)
                      </label>
                    </div>
                    <div className="pt-2 max-w-xs">
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>
                        Stock Mínimo Global por defecto
                      </label>
                      <input
                        type="number"
                        name="defaultMinStock"
                        min="0"
                        value={formData.defaultMinStock}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2" style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}>
                    Apariencia
                  </h3>
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1" style={{ color: 'var(--text-primary)' }}>
                      Tema del Sistema
                    </label>
                    <select
                      name="theme"
                      value={formData.theme}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      style={{ background: 'var(--bg-glass)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                    >
                      <option value="light">Claro (Light)</option>
                      <option value="dark">Oscuro (Dark)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2" style={{ color: 'var(--text-primary)' }}>
                    Copias de Seguridad (Base de Datos)
                  </h3>
                  <p className="text-gray-600 mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Descarga un respaldo completo de la base de datos. Este archivo contiene todos los clientes, productos, facturas, bitácora y usuarios.
                  </p>
                  <button
                    type="button"
                    onClick={handleBackup}
                    disabled={user?.role !== 'ADMIN'}
                    className="flex items-center px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Database className="w-5 h-5 mr-2" />
                    Descargar Copia de Seguridad (.db)
                  </button>
                  {user?.role !== 'ADMIN' && (
                    <p className="text-sm text-red-500 mt-2">Requieres privilegios de administrador para descargar respaldos.</p>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
