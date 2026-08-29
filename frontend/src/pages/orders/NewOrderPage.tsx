import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Package, Trash2, ArrowLeft, Send } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const NewOrderPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
  
  const [productSearch, setProductSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setCustomers(data.filter((c: any) => c.isActive));
    } catch (error) {
      toast.error('Error al cargar clientes');
    }
  };

  const handleSelectEventualCustomer = async () => {
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
      setProducts(data.filter((p: any) => p.isActive)); // All active products
    } catch (error) {
      toast.error('Error al cargar productos');
    }
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      // Allow adding to order even if stock might not be enough currently, 
      // but warn if exceeding current stock? For now just allow it for orders.
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
        currentStock: product.currentStock
      }]);
    }
  };

  const updateQuantity = (productId: number, qty: number) => {
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

  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      toast.error('Debe seleccionar un cliente');
      return;
    }
    if (cart.length === 0) {
      toast.error('El pedido debe tener al menos un producto');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: Number(selectedCustomer),
        details: cart.map(c => ({
          productId: c.productId,
          quantity: c.quantity,
          unitPrice: c.price
        }))
      };

      await api.post('/sales-orders', payload);
      toast.success('Pedido creado exitosamente');
      navigate('/pedidos'); // Volver a la lista de pedidos
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al procesar el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      
      {/* Panel Izquierdo: Catálogo para el Pedido */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => navigate('/pedidos')} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Crear Nuevo Pedido</h1>
        </div>
        
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
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: p.currentStock > 0 ? 'rgba(37,99,235,0.1)' : 'rgba(239, 68, 68, 0.1)', color: p.currentStock > 0 ? 'var(--brand-primary)' : '#ef4444', borderRadius: '4px' }}>
                  Stock: {p.currentStock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel Derecho: Carrito del Pedido */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', position: 'sticky', top: '2rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1.5rem' }}>
          <ShoppingCart size={20} /> Detalle del Pedido
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
            <User size={20} color="var(--text-secondary)" style={{ alignSelf: 'center' }} />
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
          </div>
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
                      Pedido para Cliente Eventual
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </div>

        <div style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>
              No hay productos en el pedido
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>C${item.price} x {item.quantity} = C${(item.price * item.quantity).toFixed(2)}</div>
                  {item.quantity > item.currentStock && (
                    <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>
                      Supera stock actual ({item.currentStock})
                    </div>
                  )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            <span>Total del Pedido</span>
            <span style={{ color: '#10b981' }}>C${subtotal.toFixed(2)}</span>
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}
            onClick={handleSubmitOrder}
            disabled={cart.length === 0 || !selectedCustomer || isSubmitting}
          >
            <Send size={20} /> {isSubmitting ? 'Enviando...' : 'Enviar Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewOrderPage;
