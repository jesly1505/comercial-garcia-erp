import React, { useState, useEffect } from 'react';
import { Wallet, Download, Plus, Minus, Lock, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const CashDashboardPage: React.FC = () => {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  
  // Forms
  const [openBalance, setOpenBalance] = useState<number | ''>('');
  const [selectedRegister, setSelectedRegister] = useState<string>('');
  const [closeBalance, setCloseBalance] = useState<number | ''>('');
  
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [movementAmount, setMovementAmount] = useState<number | ''>('');
  const [movementDesc, setMovementDesc] = useState('');

  const fetchActiveSession = async () => {
    try {
      const res = await api.get('/cash/active');
      setSessionInfo(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisters = async () => {
    try {
      const res = await api.get('/cash/registers');
      setRegisters(res.data);
      if (res.data.length > 0) setSelectedRegister(res.data[0].id.toString());
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar cajas');
    }
  };

  useEffect(() => {
    fetchActiveSession();
    fetchRegisters();
  }, []);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegister || openBalance === '') return;
    try {
      await api.post('/cash/open', {
        cashRegisterId: Number(selectedRegister),
        openingBalance: Number(openBalance)
      });
      setShowOpenModal(false);
      setOpenBalance('');
      fetchActiveSession();
      toast.success('Caja abierta exitosamente');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al abrir caja');
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (closeBalance === '') return;
    try {
      const res = await api.post(`/cash/${sessionInfo.session.id}/close`, {
        closingBalance: Number(closeBalance)
      });
      
      toast.success('Caja cerrada correctamente');

      // Print closing ticket
      if (window.confirm('Caja cerrada. ¿Deseas imprimir el comprobante de arqueo?')) {
        printArqueoTicket({ ...sessionInfo, closingBalance: res.data.closingBalance });
      }

      setShowCloseModal(false);
      setCloseBalance('');
      setSessionInfo(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cerrar caja');
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movementAmount === '' || !movementDesc) return;
    try {
      await api.post(`/cash/${sessionInfo.session.id}/movement`, {
        type: movementType,
        amount: Number(movementAmount),
        description: movementDesc
      });
      setShowMovementModal(false);
      setMovementAmount('');
      setMovementDesc('');
      fetchActiveSession(); // Refresh totals
      toast.success(movementType === 'IN' ? 'Entrada de efectivo registrada' : 'Salida de efectivo registrada');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al registrar movimiento');
    }
  };

  const escapeHtml = (unsafe: any) => {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const printArqueoTicket = (info: any) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const diff = info.closingBalance !== undefined 
      ? info.closingBalance - info.expectedBalance 
      : 0;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Arqueo de Caja</title>
          <style>
            body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; width: 300px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .flex-between { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px;">COMERCIAL GARCÍA</div>
          <div class="center">ARQUEO DE CAJA</div>
          <div class="divider"></div>
          <div><span class="bold">Fecha:</span> ${escapeHtml(new Date().toLocaleString())}</div>
          <div><span class="bold">Cajero:</span> ${escapeHtml(info.session.user?.firstName || 'Cajero')}</div>
          <div><span class="bold">Caja:</span> ${escapeHtml(info.session.cashRegister?.name || 'Principal')}</div>
          <div class="divider"></div>
          <div class="flex-between">
            <span>Saldo Inicial:</span>
            <span>C$${Number(info.session.openingBalance || 0).toFixed(2)}</span>
          </div>
          <div class="flex-between">
            <span>Ventas Efectivo:</span>
            <span>+ C$${Number(info.totalSalesCash || 0).toFixed(2)}</span>
          </div>
          <div class="flex-between">
            <span>Ingresos (Manual):</span>
            <span>+ C$${Number(info.totalIn || 0).toFixed(2)}</span>
          </div>
          <div class="flex-between">
            <span>Egresos (Manual):</span>
            <span>- C$${Number(info.totalOut || 0).toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="flex-between bold" style="font-size: 14px;">
            <span>TOTAL ESPERADO:</span>
            <span>C$${Number(info.expectedBalance || 0).toFixed(2)}</span>
          </div>
          ${info.closingBalance !== undefined ? `
            <div class="flex-between" style="margin-top:10px;">
              <span>TOTAL DECLARADO:</span>
              <span>C$${Number(info.closingBalance || 0).toFixed(2)}</span>
            </div>
            <div class="flex-between bold" style="color: ${diff < 0 ? 'red' : 'black'};">
              <span>DIFERENCIA:</span>
              <span>C$${Number(diff).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
          <div class="center">Firma Cajero: __________________</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (loading) return <div style={{ padding: '2rem' }}>Cargando caja...</div>;

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>Estado de Caja</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gestión de efectivo, aperturas y cierres</p>
        </div>
      </div>

      {!sessionInfo ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <Lock size={48} style={{ margin: '0 auto 1rem auto', color: 'var(--text-secondary)' }} />
          <h2 style={{ marginBottom: '1rem' }}>La caja está cerrada</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Debes aperturar la caja para poder realizar ventas en efectivo y registrar movimientos.</p>
          <button className="btn-primary" onClick={() => setShowOpenModal(true)} style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
            <Unlock size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Abrir Caja
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Resumen */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Resumen del Día</h3>
                <span style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '1rem', fontWeight: 600 }}>CAJA ABIERTA</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Saldo Inicial</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>C${Number(sessionInfo.session.openingBalance || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Ventas en Efectivo</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>+ C${Number(sessionInfo.totalSalesCash || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Ingresos (Manuales)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>+ C${Number(sessionInfo.totalIn || 0).toFixed(2)}</div>
                </div>
                <div style={{ padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Egresos (Manuales)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>- C${Number(sessionInfo.totalOut || 0).toFixed(2)}</div>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>TOTAL ESPERADO EN CAJA</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>C${Number(sessionInfo.expectedBalance || 0).toFixed(2)}</div>
                </div>
                <Wallet size={48} color="#3b82f6" opacity={0.8} />
              </div>
            </div>

            {/* Últimos Movimientos (Si quisiéramos mostrar tabla aquí) */}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              className="glass-panel" 
              onClick={() => { setMovementType('IN'); setShowMovementModal(true); }}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <Plus size={24} />
              </div>
              <span style={{ fontWeight: 600 }}>Registrar Ingreso</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Fondo adicional</span>
            </button>

            <button 
              className="glass-panel" 
              onClick={() => { setMovementType('OUT'); setShowMovementModal(true); }}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <Minus size={24} />
              </div>
              <span style={{ fontWeight: 600 }}>Registrar Egreso</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pagos menores, vales</span>
            </button>

            <button 
              className="glass-panel" 
              onClick={() => printArqueoTicket(sessionInfo)}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Download size={24} />
              </div>
              <span style={{ fontWeight: 600 }}>Imprimir Arqueo</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Corte X parcial</span>
            </button>

            <button 
              onClick={() => setShowCloseModal(true)}
              style={{ padding: '1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', marginTop: 'auto' }}
            >
              Cerrar Caja (Corte Z)
            </button>
          </div>

        </div>
      )}

      {/* Modal Abrir Caja */}
      {showOpenModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Abrir Caja</h2>
            <form onSubmit={handleOpenSession}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Caja</label>
                <select 
                  value={selectedRegister} 
                  onChange={e => setSelectedRegister(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  required
                >
                  <option value="">Seleccione...</option>
                  {registers.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Monto Inicial Efectivo (C$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={openBalance}
                  onChange={e => setOpenBalance(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowOpenModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Abrir</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cerrar Caja */}
      {showCloseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Cerrar Caja</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Ingresa el monto de efectivo físico que hay actualmente en caja. El sistema lo comparará con el esperado.</p>
            <form onSubmit={handleCloseSession}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Efectivo Declarado (C$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  value={closeBalance}
                  onChange={e => setCloseBalance(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowCloseModal(false)}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Confirmar Cierre</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ingreso/Egreso */}
      {showMovementModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>Registrar {movementType === 'IN' ? 'Ingreso' : 'Egreso'}</h2>
            <form onSubmit={handleMovement}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Monto (C$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0.01"
                  value={movementAmount}
                  onChange={e => setMovementAmount(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Motivo / Descripción</label>
                <input 
                  type="text" 
                  value={movementDesc}
                  onChange={e => setMovementDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                  placeholder={movementType === 'IN' ? 'Ej. Sencillo adicional' : 'Ej. Pago de agua'}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowMovementModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: movementType === 'IN' ? '#10b981' : '#ef4444', borderColor: movementType === 'IN' ? '#10b981' : '#ef4444' }}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CashDashboardPage;
