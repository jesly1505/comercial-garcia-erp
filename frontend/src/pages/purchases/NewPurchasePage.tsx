import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ShoppingCart, Plus, Trash2, Save, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '../../styles/forms.module.css';

const NewPurchasePage: React.FC = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  
  const [cart, setCart] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [supRes, prodRes] = await Promise.all([
          api.get('/suppliers'),
          api.get('/products?all=true')
        ]);
        const supData = Array.isArray(supRes.data) ? supRes.data : (supRes.data?.data || []);
        const prodData = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.data || []);
        setSuppliers(supData);
        setProducts(prodData);
      } catch (err) {
        toast.error('Error al cargar datos');
      }
    };
    fetchData();
  }, []);

  const handleAddProduct = () => {
    if (!selectedProductId) return toast.error('Selecciona un producto');
    if (quantity <= 0) return toast.error('Cantidad inválida');
    if (unitCost < 0) return toast.error('Costo inválido');

    const product = products.find(p => p.id === parseInt(selectedProductId));
    if (!product) return;

    const existingIndex = cart.findIndex(item => item.productId === product.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      newCart[existingIndex].unitCost = unitCost; // Actualiza el costo unitario a la última entrada
      newCart[existingIndex].subtotal = newCart[existingIndex].quantity * unitCost;
      setCart(newCart);
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        quantity,
        unitCost,
        subtotal: quantity * unitCost
      }]);
    }

    // Resetear formulario de producto
    setSelectedProductId('');
    setQuantity(1);
    setUnitCost(0);
  };

  const handleRemoveProduct = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedProductId(id);
    if (id) {
      const product = products.find(p => p.id === parseInt(id));
      if (product) {
        setUnitCost(product.costPrice || 0);
      }
    } else {
      setUnitCost(0);
    }
  };

  const submitPurchase = async (status: 'PENDING' | 'RECEIVED') => {
    if (!supplierId) return toast.error('Selecciona un proveedor');
    if (cart.length === 0) return toast.error('El carrito de compra está vacío');

    setIsSubmitting(true);
    try {
      await api.post('/purchases', {
        supplierId: parseInt(supplierId),
        invoiceNumber,
        status,
        details: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost
        }))
      });
      
      toast.success(status === 'RECEIVED' ? 'Compra registrada y recibida exitosamente' : 'Compra registrada como pendiente');
      navigate('/compras');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar la compra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/compras')} style={{ padding: '0.5rem' }}>
          <ArrowLeft size={20} />
        </button>
        <ShoppingCart size={28} color="var(--primary-color)" />
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Nueva Compra</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Lado Izquierdo: Formulario de Selección */}
        <div>
          <div className="glass-panel" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Datos del Proveedor
            </h2>
            <div className={formStyles.grid2}>
              <div className={formStyles.formGroup}>
                <label>Proveedor *</label>
                <select 
                  className={formStyles.input} 
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                >
                  <option value="">Selecciona un proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className={formStyles.formGroup}>
                <label>N° Factura Proveedor</label>
                <input 
                  type="text" 
                  className={formStyles.input} 
                  placeholder="Ej. FAC-00123" 
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="glass-panel">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Agregar Productos
            </h2>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className={formStyles.formGroup} style={{ flex: '2', minWidth: '200px' }}>
                <label>Producto</label>
                <select className={formStyles.input} value={selectedProductId} onChange={handleProductSelect}>
                  <option value="">Buscar producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                  ))}
                </select>
              </div>
              <div className={formStyles.formGroup} style={{ flex: '1', minWidth: '100px' }}>
                <label>Costo Unitario (C$)</label>
                <input 
                  type="number" 
                  className={formStyles.input} 
                  min="0" 
                  step="0.01" 
                  value={unitCost}
                  onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className={formStyles.formGroup} style={{ flex: '1', minWidth: '100px' }}>
                <label>Cantidad</label>
                <input 
                  type="number" 
                  className={formStyles.input} 
                  min="1" 
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <div style={{ paddingBottom: '0.2rem' }}>
                <button className="btn btn-primary" onClick={handleAddProduct} style={{ height: '42px' }}>
                  <Plus size={18} /> Agregar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Carrito de Compra */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Resumen de Compra
          </h2>
          
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px', marginBottom: '1rem' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No hay productos en la orden.
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {cart.map((item, index) => (
                  <li key={index} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.quantity} x C$ {Number(item.unitCost || 0).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                        C$ {Number(item.subtotal || 0).toFixed(2)}
                      </div>
                      <button onClick={() => handleRemoveProduct(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
              <span>Total:</span>
              <span>C$ {Number(totalAmount || 0).toFixed(2)}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => submitPurchase('PENDING')}
                disabled={isSubmitting || cart.length === 0}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Save size={18} /> Guardar como Pendiente
              </button>
              
              <button 
                className="btn btn-primary" 
                onClick={() => submitPurchase('RECEIVED')}
                disabled={isSubmitting || cart.length === 0}
                style={{ width: '100%', justifyContent: 'center', backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                <CheckCircle size={18} /> Recibir Compra (Ingresar Stock)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPurchasePage;
