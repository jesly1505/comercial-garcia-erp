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
      setTheme(data.theme); // Update context theme instantly
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
      
      // Handle file download
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Parametrización general del ERP</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('company')}
            className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'company'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Empresa
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'system'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Sistema
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Database className="w-4 h-4 mr-2" />
            Respaldo y Datos
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Logotipo (Texto en Base64 - Opcional)
                    </label>
                    <textarea
                      name="logoBase64"
                      rows={3}
                      value={formData.logoBase64 || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, logoBase64: e.target.value }))}
                      disabled={user?.role !== 'ADMIN'}
                      placeholder="data:image/png;base64,iVBORw0KGgo..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sistema Tab */}
            {activeTab === 'system' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Localización</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Moneda Principal</label>
                      <input
                        type="text"
                        name="currency"
                        required
                        value={formData.currency}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zona Horaria</label>
                      <select
                        name="timezone"
                        value={formData.timezone}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="America/Managua">America/Managua</option>
                        <option value="America/Mexico_City">America/Mexico_City</option>
                        <option value="America/Bogota">America/Bogota</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Formato Fecha</label>
                      <select
                        name="dateFormat"
                        value={formData.dateFormat}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Automatización y Valores por Defecto</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="invoiceAutoNumber"
                        checked={formData.invoiceAutoNumber}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">Numeración automática de Facturas</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="orderAutoNumber"
                        checked={formData.orderAutoNumber}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">Numeración automática de Pedidos</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="movementAutoNumber"
                        checked={formData.movementAutoNumber}
                        onChange={handleChange}
                        disabled={user?.role !== 'ADMIN'}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">Numeración automática de Movimientos</span>
                    </label>
                    
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Apariencia</h3>
                  <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tema del Sistema</label>
                    <select
                      name="theme"
                      value={formData.theme}
                      onChange={handleChange}
                      disabled={user?.role !== 'ADMIN'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Copias de Seguridad (Base de Datos)</h3>
                  <p className="text-gray-600 mb-4">
                    Descarga un respaldo completo de la base de datos (SQLite). Este archivo contiene todos los clientes, productos, facturas, bitácora y usuarios.
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleBackup}
                    disabled={user?.role !== 'ADMIN'}
                    className="flex items-center px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
