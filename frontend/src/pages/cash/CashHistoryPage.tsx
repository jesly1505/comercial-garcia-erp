import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api from '../../services/api';

const CashHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/cash/history');
      setHistory(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(session => {
    const term = searchTerm.toLowerCase();
    const userName = `${session.user?.firstName} ${session.user?.lastName}`.toLowerCase();
    const registerName = session.cashRegister?.name.toLowerCase() || '';
    return userName.includes(term) || registerName.includes(term);
  });

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Historial de Caja</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Registro de aperturas y cierres (Corte Z)</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={20} />
          <input
            type="text"
            placeholder="Buscar por usuario o caja..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Apertura</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Cierre</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Caja</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Usuario</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Total Esperado</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Total Declarado</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>Cargando historial...</td></tr>
            ) : filteredHistory.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center' }}>No se encontraron registros de caja</td></tr>
            ) : (
              filteredHistory.map((session) => {
                const diff = (session.closingBalance || 0) - (session.expectedBalance || 0);
                const isClosed = session.status === 'CLOSED';
                return (
                  <tr key={session.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '1rem' }}>{new Date(session.openedAt).toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>{session.closedAt ? new Date(session.closedAt).toLocaleString() : <span style={{ color: '#10b981', fontWeight: 'bold' }}>Abierta</span>}</td>
                    <td style={{ padding: '1rem' }}>{session.cashRegister?.name}</td>
                    <td style={{ padding: '1rem' }}>{session.user?.firstName} {session.user?.lastName}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {isClosed ? `C$${session.expectedBalance?.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {isClosed ? `C$${session.closingBalance?.toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: diff < 0 ? '#ef4444' : (diff > 0 ? '#3b82f6' : 'inherit') }}>
                      {isClosed ? `C$${diff.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashHistoryPage;
