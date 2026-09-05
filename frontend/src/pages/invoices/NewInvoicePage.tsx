import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, User, Plus, Trash2, CheckCircle, Package, X, DollarSign, Printer, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { downloadInvoicePDF, printInvoiceTicket } from '../../utils/invoicePrinter';

const NewInvoicePage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
  
  // Para el autocompletado
  const [productSearch, setProductSearch] = useState('');

  // Modal nuevo cliente
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', documentNumber: '', phone: '' });

  // Cobro y Descuento
  const [discount, setDiscount] = useState(0);
  const [applyTax, setApplyTax] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO'); // EFECTIVO, TARJETA, TRANSFERENCIA, CREDITO
  const [creditDays, setCreditDays] = useState<number>(30); // 8, 15, 30
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  
  // Recibo
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setCustomers(data.filter((c: any) => c.isActive));
    } catch {
      toast.error('Error al cargar clientes');
    }
  };

  const handleSelectEventualCustomer = async () => {
    // 1. Buscar si ya existe un cliente eventual registrado
    const eventual = customers.find(c => 
      c.documentNumber === '000-000000-0000X' || 
      c.documentNumber === 'EVENTUAL' || 
      (c.firstName?.toLowerCase().includes('cliente') && c.lastName?.toLowerCase().includes('eventual'))
    );

    if (eventual) {
      setSelectedCustomer(eventual.id);
      toast.success('Cliente Eventual seleccionado');
      return;
    }

    // 2. Crear y seleccionar automáticamente si no existe
    try {
      const res = await api.post('/customers', {
        firstName: 'Cliente',
        lastName: 'Eventual',
        documentNumber: '000-000000-0000X',
        phone: '0000-0000',
        isActive: true,
        creditLimit: 0
      });
      await fetchCustomers();
      setSelectedCustomer(res.data.id);
      toast.success('Cliente Eventual creado y seleccionado');
    } catch (err: any) {
      await fetchCustomers();
      const existing = customers.find(c => 
        c.documentNumber === '000-000000-0000X' || 
        (c.firstName?.toLowerCase().includes('cliente') && c.lastName?.toLowerCase().includes('eventual'))
      );
      if (existing) {
        setSelectedCustomer(existing.id);
        toast.success('Cliente Eventual seleccionado');
      } else {
        toast.error('No se pudo seleccionar el cliente eventual');
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?all=true');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(data.filter((p: any) => p.isActive && p.currentStock > 0));
    } catch {
      toast.error('Error al cargar productos');
    }
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.currentStock) {
        toast.error('No hay suficiente stock disponible');
        return;
      }
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      setCart([...cart, { 
        productId: product.id, 
        name: product.name, 
        price: Number(product.salePrice || 0), 
        quantity: 1,
        maxStock: product.currentStock
      }]);
      toast.success(`${product.name} agregado al carrito`, { duration: 1500 });
    }
  };

  const updateQuantity = (productId: number, qty: number) => {
    const item = cart.find(c => c.productId === productId);
    if (!item) return;
    if (qty > item.maxStock) {
      toast.error(`Solo hay ${item.maxStock} unidades en stock.`);
      return;
    }
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(c => c.productId === productId ? { ...c, quantity: qty } : c));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxAmount = applyTax ? subtotal * 0.15 : 0;
  const total = subtotal + taxAmount - discount;

  const handleCheckout = () => {
    if (!selectedCustomer) return toast.error('Seleccione un cliente para continuar');
    if (cart.length === 0) return toast.error('El carrito está vacío');
    setShowCheckoutModal(true);
    setPaymentMethod('EFECTIVO');
    setAmountPaid(total);
  };

  const confirmCheckout = async () => {
    if (paymentMethod === 'EFECTIVO') {
      const paid = Number(amountPaid) || 0;
      if (paid < total) {
        return toast.error('El monto recibido es menor al total a pagar.');
      }
    }

    try {
      const payload = {
        customerId: Number(selectedCustomer),
        discount: discount,
        tax: taxAmount,
        paymentMethod: paymentMethod,
        creditDays: paymentMethod === 'CREDITO' ? creditDays : undefined,
        amountPaid: Number(amountPaid) || total,
        details: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity
        }))
      };

      const res = await api.post('/invoices', payload);
      setCreatedInvoice(res.data);
      setShowCheckoutModal(false);
      setShowReceiptModal(true);
      
      setCart([]);
      setSelectedCustomer('');
      setDiscount(0);
      setApplyTax(false);
      setAmountPaid('');
      fetchProducts(); // Refrescar stock
      toast.success('¡Venta facturada exitosamente!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar la venta');
    }
  };

  const handleQuickCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.documentNumber) {
      toast.error('Nombre, Apellido y Cédula son obligatorios');
      return;
    }
    try {
      const res = await api.post('/customers', { ...newCustomer, isActive: true, creditLimit: 0 });
      await fetchCustomers();
      setSelectedCustomer(res.data.id);
      setShowNewCustomerModal(false);
      setNewCustomer({ firstName: '', lastName: '', documentNumber: '', phone: '' });
      toast.success('Cliente creado exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear cliente');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <>
      <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      {/* Panel Izquierdo: Catálogo */}
      <div>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem' }}>Punto de Venta</h1>
        
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Package size={20} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Buscar producto por nombre o SKU..." 
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.05)' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {filteredProducts.map(p => (
            <div key={p.id} className="glass-panel" style={{ padding: '1rem', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => addToCart(p)}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>{p.name}</h4>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>SKU: {p.sku}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>C${p.salePrice}</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(37,99,235,0.1)', color: 'var(--brand-primary)', borderRadius: '4px' }}>
                  Stock: {p.currentStock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel Derecho: Carrito */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', position: 'sticky', top: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1.5rem' }}>
          <ShoppingCart size={20} /> Carrito Actual
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Cliente</label>
            <button
              type="button"
              onClick={handleSelectEventualCustomer}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(234, 179, 8, 0.4)',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                color: '#d97706',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Seleccionar o crear rápidamente un Cliente Eventual"
            >
              Cliente Eventual
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              value={selectedCustomer} 
              onChange={e => setSelectedCustomer(Number(e.target.value) || '')}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}
            >
              <option value="">Seleccione un cliente...</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.documentNumber})
                </option>
              ))}
            </select>
            <button 
              className="btn-secondary" 
              style={{ padding: '0 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowNewCustomerModal(true)}
              title="Registrar Nuevo Cliente"
            >
              <User size={18} /> <Plus size={14} style={{ marginLeft: '-4px' }} />
            </button>
          </div>
          
          {/* Advertencia o Info de Cliente */}
          {selectedCustomer && customers.find(c => c.id === selectedCustomer) && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              {(() => {
                const customer = customers.find(c => c.id === selectedCustomer);
                const isEventual = customer?.documentNumber === '000-000000-0000X' || customer?.lastName === 'Eventual';
                if (isEventual) {
                  return (
                    <span style={{ 
                      display: 'inline-block',
                      color: '#d97706', 
                      background: 'rgba(234, 179, 8, 0.12)', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontWeight: 600,
                      fontSize: '0.75rem' 
                    }}>
                      Venta a Consumidor Final / Eventual
                    </span>
                  );
                }
                const limit = Number(customer?.creditLimit || 0);
                return limit > 0 ? (
                  <span style={{ color: 'var(--text-secondary)' }}>Límite de crédito: C${limit.toFixed(2)}</span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>Sin límite de crédito establecido</span>
                );
              })()}
            </div>
          )}
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
              No hay productos agregados
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>C${item.price} x {item.quantity} = C${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} style={{ padding: '2px 8px', borderRadius: '4px', border: 'none', background: 'rgba(0,0,0,0.1)', cursor: 'pointer' }}>-</button>
                  <span style={{ fontSize: '0.875rem', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} style={{ padding: '2px 8px', borderRadius: '4px', border: 'none', background: 'rgba(0,0,0,0.1)', cursor: 'pointer' }}>+</button>
                  <button onClick={() => removeFromCart(item.productId)} style={{ padding: '4px', borderRadius: '4px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer', marginLeft: '0.5rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '2px dashed var(--border-glass)', paddingTop: '1.5rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Subtotal</span>
            <span>C${subtotal.toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Descuento (C$)</span>
            <input 
              type="number" 
              min="0" 
              max={subtotal}
              value={discount} 
              onChange={e => setDiscount(Number(e.target.value))}
              style={{ width: '100px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', textAlign: 'right' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              Aplicar IVA (15%)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {applyTax && <span style={{ color: 'var(--text-secondary)' }}>+ C${taxAmount.toFixed(2)}</span>}
              <input 
                type="checkbox" 
                checked={applyTax} 
                onChange={e => setApplyTax(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            <span>Total a Pagar</span>
            <span style={{ color: '#10b981' }}>C${total.toFixed(2)}</span>
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}
            onClick={handleCheckout}
            disabled={cart.length === 0 || !selectedCustomer}
          >
            <DollarSign size={20} /> Cobrar
          </button>
        </div>
      </div>
    </div>

      {/* Modal Quick Create Customer */}
      {showNewCustomerModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 'min(95vw, 440px)', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(1rem, 3vw, 2rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>Nuevo Cliente</h3>
              <button onClick={() => setShowNewCustomerModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            
            <div style={{ marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setNewCustomer({ firstName: 'Cliente', lastName: 'Eventual', documentNumber: '000-000000-0000X', phone: '0000-0000' })}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px dashed #d97706',
                  backgroundColor: 'rgba(234, 179, 8, 0.1)',
                  color: '#d97706',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                Autocompletar como Cliente Eventual
              </button>
            </div>
            <form onSubmit={handleQuickCustomer}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nombre <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" value={newCustomer.firstName} onChange={e => setNewCustomer({...newCustomer, firstName: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Apellido <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" value={newCustomer.lastName} onChange={e => setNewCustomer({...newCustomer, lastName: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cédula / RUC <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" value={newCustomer.documentNumber} onChange={e => setNewCustomer({...newCustomer, documentNumber: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Teléfono</label>
                <input type="tel" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
                Registrar y Seleccionar
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && createPortal(
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: 'min(95vw, 520px)', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(1rem, 3vw, 2rem)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={24} color="#10b981" /> Completar Venta
              </h3>
              <button onClick={() => setShowCheckoutModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total a Cobrar</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>C${total.toFixed(2)}</div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Método de Pago</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO'].map(method => (
                  <button
                    key={method}
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== 'EFECTIVO') setAmountPaid(total);
                    }}
                    style={{
                      padding: '0.75rem', borderRadius: '8px',
                      border: `1px solid ${paymentMethod === method ? '#10b981' : 'var(--border-glass)'}`,
                      background: paymentMethod === method ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-glass)',
                      color: paymentMethod === method ? '#10b981' : 'var(--text-primary)',
                      cursor: 'pointer', fontWeight: paymentMethod === method ? 600 : 400
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'CREDITO' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Plazo de Crédito</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={creditDays}
                  onChange={(e) => setCreditDays(Number(e.target.value))}
                >
                  <option value={8}>8 días</option>
                  <option value={15}>15 días</option>
                  <option value={30}>30 días</option>
                </select>
              </div>
            )}

            {paymentMethod === 'EFECTIVO' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Monto Recibido (C$)</label>
                <input 
                  type="number" 
                  min={total}
                  value={amountPaid} 
                  onChange={e => setAmountPaid(Number(e.target.value))}
                  style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '2px solid var(--border-color)', background: 'var(--bg-input)', fontSize: '1.25rem' }}
                />
                
                {Number(amountPaid) >= total && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-glass)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Su Vuelto (Cambio):</span>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>C${(Number(amountPaid) - total).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', marginTop: '1rem' }}
              onClick={confirmCheckout}
              disabled={paymentMethod === 'EFECTIVO' && (Number(amountPaid) < total || amountPaid === '')}
            >
              Confirmar y Cobrar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Receipt Modal */}
      {showReceiptModal && createdInvoice && createPortal(
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: '#10b981', marginBottom: '1.5rem' }}>
              <CheckCircle size={48} />
            </div>
            <h2 style={{ margin: '0 0 0.5rem 0' }}>¡Venta Exitosa!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>La factura <strong>{createdInvoice.invoiceNumber}</strong> se generó correctamente.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                className="btn-secondary" 
                style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => printInvoiceTicket(createdInvoice)}
              >
                <Printer size={20} /> Imprimir Ticket (80mm)
              </button>
              <button 
                className="btn-primary" 
                style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={() => downloadInvoicePDF(createdInvoice)}
              >
                <Download size={20} /> Descargar PDF (A4)
              </button>
              <button 
                onClick={() => { setShowReceiptModal(false); setCreatedInvoice(null); }}
                style={{ padding: '1rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '1rem' }}
              >
                Cerrar y volver al POS
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default NewInvoicePage;
