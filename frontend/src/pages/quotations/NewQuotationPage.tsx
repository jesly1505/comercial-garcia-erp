import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Trash2, Search, ArrowLeft, Save, 
  FileText, Calendar, User, Package, Download 
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { downloadQuotationPDF } from '../../utils/quotationPrinter';

interface CartItem {
  productId: number;
  sku: string;
  name: string;
  unitPrice: number;
  currentStock: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

const NewQuotationPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // Form State
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [validDays, setValidDays] = useState<number>(15);
  const [validUntil, setValidUntil] = useState<string>('');
  const [notes, setNotes] = useState<string>('Precios válidos durante el período de vigencia de la cotización.');
  const [applyTax, setApplyTax] = useState<boolean>(false);
  const [generalDiscount, setGeneralDiscount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Search & Filter state
  const [productSearch, setProductSearch] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Quick Customer Creation Modal
  const [showNewCustomerModal, setShowNewCustomerModal] = useState<boolean>(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    company: '',
    documentNumber: '',
    phone: '',
    email: '',
  });

  // Calculate default validUntil date
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + validDays);
    setValidUntil(d.toISOString().split('T')[0]);
  }, [validDays]);

  // Load Customers & Products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers'),
          api.get('/products?all=true'),
        ]);
        const custData = Array.isArray(custRes.data) ? custRes.data : (custRes.data?.data || []);
        const prodData = Array.isArray(prodRes.data) ? prodRes.data : (prodRes.data?.data || []);
        setCustomers(custData);
        setProducts(prodData.filter((p: any) => p.isActive));
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Error al cargar datos');
      }
    };
    fetchData();
  }, []);

  // If editing, load quotation details
  useEffect(() => {
    if (isEditing && id) {
      const loadQuotation = async () => {
        try {
          const res = await api.get(`/quotations/${id}`);
          const q = res.data;
          setSelectedCustomerId(q.customerId);
          setNotes(q.notes || '');
          setApplyTax(q.tax > 0);
          setGeneralDiscount(q.discount || 0);
          if (q.validUntil) {
            setValidUntil(new Date(q.validUntil).toISOString().split('T')[0]);
          }
          const items: CartItem[] = q.details.map((d: any) => ({
            productId: d.productId,
            sku: d.product?.sku || '',
            name: d.product?.name || 'Producto',
            unitPrice: Number(d.unitPrice || 0),
            currentStock: d.product?.currentStock || 0,
            quantity: Number(d.quantity || 1),
            discount: Number(d.discount || 0),
            subtotal: Number(d.subtotal || 0),
          }));
          setCart(items);
        } catch (err) {
          console.error(err);
          toast.error('No se pudo cargar la cotización');
          navigate('/cotizaciones');
        }
      };
      loadQuotation();
    }
  }, [isEditing, id, navigate]);

  // Add Product to Cart
  const handleAddToCart = (product: any) => {
    const price = Number(product.salePrice || 0);
    const existingIndex = cart.findIndex((i) => i.productId === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal =
        updated[existingIndex].quantity * Number(updated[existingIndex].unitPrice || 0) - Number(updated[existingIndex].discount || 0);
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: price,
          currentStock: product.currentStock,
          quantity: 1,
          discount: 0,
          subtotal: price,
        },
      ]);
    }
    toast.success(`${product.name} agregado`);
  };

  // Update item in cart
  const updateCartItem = (index: number, field: keyof CartItem, value: number) => {
    const updated = [...cart];
    const item = { ...updated[index], [field]: value };
    const qty = field === 'quantity' ? Math.max(1, value) : item.quantity;
    const price = field === 'unitPrice' ? Math.max(0, value) : item.unitPrice;
    const disc = field === 'discount' ? Math.max(0, value) : item.discount;

    item.quantity = qty;
    item.unitPrice = price;
    item.discount = disc;
    item.subtotal = Math.max(0, qty * price - disc);

    updated[index] = item;
    setCart(updated);
  };

  const removeCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Quick customer creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.firstName || !newCustomer.documentNumber) {
      toast.error('Nombre y Cédula/RUC son obligatorios');
      return;
    }
    try {
      const res = await api.post('/customers', newCustomer);
      toast.success('Cliente creado');
      setCustomers([...customers, res.data]);
      setSelectedCustomerId(res.data.id);
      setShowNewCustomerModal(false);
      setNewCustomer({ firstName: '', lastName: '', company: '', documentNumber: '', phone: '', email: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al crear cliente');
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const tax = applyTax ? subtotal * 0.15 : 0;
  const totalAmount = Math.max(0, subtotal + tax - generalDiscount);

  // Save Quotation
  const handleSubmit = async (andDownloadPDF: boolean = false) => {
    if (!selectedCustomerId) {
      toast.error('Por favor selecciona un cliente');
      return;
    }
    if (cart.length === 0) {
      toast.error('La cotización debe tener al menos un producto');
      return;
    }

    setLoading(true);
    const payload = {
      customerId: Number(selectedCustomerId),
      validUntil: validUntil || null,
      notes,
      tax,
      discount: generalDiscount,
      details: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
    };

    try {
      let savedQuotation;
      if (isEditing && id) {
        const res = await api.put(`/quotations/${id}`, payload);
        savedQuotation = res.data;
        toast.success('Cotización actualizada exitosamente');
      } else {
        const res = await api.post('/quotations', payload);
        savedQuotation = res.data;
        toast.success(`Cotización ${savedQuotation.quotationNumber} creada exitosamente`);
      }

      if (andDownloadPDF && savedQuotation) {
        downloadQuotationPDF(savedQuotation);
      }

      navigate('/cotizaciones');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar la cotización');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const s = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
  });

  const filteredCustomers = customers.filter((c) => {
    const s = customerSearch.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(s) ||
      c.lastName.toLowerCase().includes(s) ||
      (c.company && c.company.toLowerCase().includes(s)) ||
      c.documentNumber.toLowerCase().includes(s)
    );
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/cotizaciones')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
              {isEditing ? `Editar Cotización #${id}` : 'Nueva Cotización'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
              Genera una propuesta comercial formal para tu cliente
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleSubmit(true)}
            disabled={loading || cart.length === 0}
            title="Guardar y Descargar PDF"
          >
            <Download size={18} style={{ marginRight: '0.4rem' }} /> Guardar y PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSubmit(false)}
            disabled={loading || cart.length === 0}
          >
            <Save size={18} style={{ marginRight: '0.4rem' }} />
            {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Emitir Cotización'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* LEFT COLUMN: Customer, Products & Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Customer Selection Card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={18} color="#c59b6d" /> 1. Datos del Cliente
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => setShowNewCustomerModal(true)}
              >
                <Plus size={14} style={{ marginRight: '0.3rem' }} /> Nuevo Cliente
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filtrar clientes por nombre o cédula..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-glass)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                }}
              >
                <option value="">-- Seleccionar Cliente --</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} {c.company ? `(${c.company})` : ''} - Céd: {c.documentNumber}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomerId && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(197, 155, 109, 0.08)',
                  border: '1px solid rgba(197, 155, 109, 0.25)',
                  fontSize: '0.85rem',
                }}
              >
                {(() => {
                  const cust = customers.find((c) => c.id === selectedCustomerId);
                  if (!cust) return null;
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div><strong>Teléfono:</strong> {cust.phone || 'N/A'}</div>
                      <div><strong>Correo:</strong> {cust.email || 'N/A'}</div>
                      <div><strong>Dirección:</strong> {cust.address || 'N/A'}</div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Product Catalog Picker Card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={18} color="#c59b6d" /> 2. Catálogo de Productos
            </h3>

            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-glass)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron productos
                </div>
              ) : (
                filteredProducts.slice(0, 15).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        SKU: {p.sku} | Stock: <span style={{ color: p.currentStock > 0 ? '#10b981' : '#ef4444' }}>{p.currentStock}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--primary-color)' }}>
                        C${Number(p.salePrice || 0).toFixed(2)}
                      </strong>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                        onClick={() => handleAddToCart(p)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quotation Details & Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Validity & Options Card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#c59b6d" /> 3. Vigencia y Condiciones
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Días de Validez:
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[7, 15, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValidDays(d)}
                      style={{
                        flex: 1,
                        padding: '0.4rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: validDays === d ? 'bold' : 'normal',
                        border: '1px solid var(--border-color)',
                        background: validDays === d ? 'var(--primary-color)' : 'var(--bg-glass)',
                        color: validDays === d ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                      }}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Fecha Límite:
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.5rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                Observaciones / Términos:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Observaciones, tiempo de entrega o condiciones..."
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-glass)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>
          </div>

          {/* Cart Table Card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="#c59b6d" /> 4. Ítems de la Cotización ({cart.length})
            </h3>

            {cart.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                Selecciona productos del catálogo a la izquierda para armar la cotización.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>Producto</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '70px' }}>Cant.</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '90px' }}>Precio (C$)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '80px' }}>Desc. (C$)</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', width: '90px' }}>Subtotal</th>
                      <th style={{ padding: '0.5rem', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.sku}</div>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateCartItem(idx, 'quantity', Number(e.target.value))}
                            style={{ width: '60px', padding: '0.25rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateCartItem(idx, 'unitPrice', Number(e.target.value))}
                            style={{ width: '80px', padding: '0.25rem', textAlign: 'right', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.discount}
                            onChange={(e) => updateCartItem(idx, 'discount', Number(e.target.value))}
                            style={{ width: '70px', padding: '0.25rem', textAlign: 'right', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                          />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                          C${Number(item.subtotal || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeCartItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals Summary */}
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>C${Number(subtotal || 0).toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                  />
                  Aplicar IVA (15%):
                </label>
                <span>C${Number(tax || 0).toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Descuento General (C$):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={generalDiscount}
                  onChange={(e) => setGeneralDiscount(Number(e.target.value))}
                  style={{ width: '90px', padding: '0.25rem 0.5rem', textAlign: 'right', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)', color: 'var(--text-primary)' }}
                />
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.6rem',
                  marginTop: '0.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                }}
              >
                <span>TOTAL:</span>
                <span style={{ color: 'var(--primary-color)' }}>C${Number(totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '1.5rem',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0' }}>Registrar Nuevo Cliente</h3>
            <form onSubmit={handleCreateCustomer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Nombres *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.firstName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Apellidos</label>
                  <input
                    type="text"
                    value={newCustomer.lastName}
                    onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Empresa / Razón Social</label>
                <input
                  type="text"
                  value={newCustomer.company}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Cédula / RUC *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.documentNumber}
                    onChange={(e) => setNewCustomer({ ...newCustomer, documentNumber: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem' }}>Teléfono / Celular</label>
                  <input
                    type="text"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-glass)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewCustomerModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewQuotationPage;
