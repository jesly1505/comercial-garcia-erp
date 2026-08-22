import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { Filter, AlertCircle, RefreshCw, Search, Calendar, User } from 'lucide-react';
import styles from './AuditLogPage.module.css';
interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  tableName: string;
  description: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    username: string;
  };
}

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-800',
  LOGOUT: 'bg-gray-100 text-gray-800',
  CREATE: 'bg-green-100 text-green-800',
  UPDATE: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
  DELETE_LOGIC: 'bg-orange-100 text-orange-800',
  STATUS_CHANGE: 'bg-purple-100 text-purple-800',
  PRICE_CHANGE: 'bg-orange-100 text-orange-800',
  STOCK_CHANGE: 'bg-indigo-100 text-indigo-800',
  SALE: 'bg-emerald-100 text-emerald-800',
  PURCHASE: 'bg-cyan-100 text-cyan-800',
  VOID: 'bg-rose-100 text-rose-800',
};

const actionLabels: Record<string, string> = {
  LOGIN: 'Iniciar Sesión',
  LOGOUT: 'Cerrar Sesión',
  CREATE: 'Crear',
  UPDATE: 'Editar',
  DELETE: 'Eliminar Físico',
  DELETE_LOGIC: 'Desactivar',
  STATUS_CHANGE: 'Cambio Estado',
  PRICE_CHANGE: 'Cambio Precio',
  STOCK_CHANGE: 'Cambio Stock',
  SALE: 'Venta',
  PURCHASE: 'Compra',
  VOID: 'Anulación',
};

const moduleNames: Record<string, string> = {
  auth: 'Autenticación',
  users: 'Usuarios',
  customers: 'Clientes',
  products: 'Productos',
  inventory_movements: 'Inventario',
  invoices: 'Facturación',
  sales_orders: 'Ventas',
  purchases: 'Compras',
};

export const AuditLogPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('http://localhost:3000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('erp_token');
      
      const queryParams = new URLSearchParams();
      if (moduleFilter) queryParams.append('module', moduleFilter);
      if (actionFilter) queryParams.append('action', actionFilter);
      if (userFilter) queryParams.append('userId', userFilter);
      if (dateFilter) {
        queryParams.append('startDate', dateFilter);
        queryParams.append('endDate', dateFilter);
      }
      if (searchTerm) queryParams.append('search', searchTerm);

      const response = await fetch(`http://localhost:3000/api/audit?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar la bitácora');
      }
      
      const data = await response.json();
      setLogs(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter, actionFilter, userFilter, dateFilter]);

  if (!hasPermission('settings:view')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para ver la bitácora del sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bitácora del Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de todas las actividades y cambios en el sistema</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en descripción..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              />
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="">Todos los usuarios</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
              >
                <option value="">Todos los módulos</option>
                {Object.entries(moduleNames).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">Todas las acciones</option>
                {Object.keys(actionColors).map(action => (
                  <option key={action} value={action}>{actionLabels[action] || action}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-3 font-medium">Fecha y Hora</th>
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Acción</th>
                <th className="px-6 py-3 font-medium">Módulo</th>
                <th className="px-6 py-3 font-medium">Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Cargando bitácora...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No hay registros en la bitácora
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                      <div>{format(new Date(log.createdAt), 'dd/MM/yyyy')}</div>
                      <div className="text-xs text-gray-400">{format(new Date(log.createdAt), 'HH:mm:ss')}</div>
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-gray-900">{log.user.firstName} {log.user.lastName}</p>
                          <p className="text-xs text-gray-500">@{log.user.username || 'n/a'}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Sistema</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {moduleNames[log.tableName] || log.tableName}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
