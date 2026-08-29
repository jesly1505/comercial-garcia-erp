import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Package, Layers, BarChart3, ArrowRightLeft, 
  Plus, Edit2, Trash2, ShieldCheck, 
  DollarSign, TrendingUp, Boxes, Search, RefreshCw, Edit
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export interface PresentationItem {
  id: string;
  name: string;
  factor: number; // Cantidad en unidades base
  priceOverride?: number;
}

interface ProductDetailModalProps {
  product: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenMovement?: (product: any) => void;
  onEditProduct?: (product: any) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onOpenMovement,
  onEditProduct
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'presentations' | 'stock' | 'movements'>('info');
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState<boolean>(false);
  const [movementSearch, setMovementSearch] = useState<string>('');
  
  // Presentaciones dinámicas guardadas o predeterminadas
  const [presentations, setPresentations] = useState<PresentationItem[]>([]);
  const [showAddPresForm, setShowAddPresForm] = useState(false);
  const [editingPresId, setEditingPresId] = useState<string | null>(null);
  const [presName, setPresName] = useState('');
  const [presFactor, setPresFactor] = useState<number>(1);
  const [presPrice, setPresPrice] = useState<number>(0);

  // Inicializar presentaciones al abrir o cambiar de producto
  useEffect(() => {
    if (!product) return;
    
    const storageKey = `erp_product_presentations_${product.id}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        setPresentations(JSON.parse(saved));
      } catch (e) {
        setPresentations(getDefaultPresentations(product));
      }
    } else {
      const defaults = getDefaultPresentations(product);
      setPresentations(defaults);
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }

    // Cargar historial de movimientos
    fetchMovements();
  }, [product]);

  const getDefaultPresentations = (prod: any): PresentationItem[] => {
    const baseUnit = prod.unit || 'UNIDAD';
    const salePrice = Number(prod.salePrice || 0);

    return [
      {
        id: 'base',
        name: baseUnit.charAt(0).toUpperCase() + baseUnit.slice(1).toLowerCase(),
        factor: 1,
        priceOverride: salePrice
      },
      {
        id: 'docena',
        name: 'Docena',
        factor: 12,
        priceOverride: salePrice * 12
      },
      {
        id: 'saco',
        name: 'Saco 1x50',
        factor: 50,
        priceOverride: salePrice * 50
      }
    ];
  };

  const savePresentations = (updated: PresentationItem[]) => {
    if (!product) return;
    setPresentations(updated);
    localStorage.setItem(`erp_product_presentations_${product.id}`, JSON.stringify(updated));
  };

  const fetchMovements = async () => {
    if (!product) return;
    setLoadingMovements(true);
    try {
      const res = await api.get('/inventory/movements');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const filtered = data.filter((m: any) => m.productId === product.id);
      setMovements(filtered);
    } catch (err) {
      console.error('Error cargando movimientos del producto:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleOpenAddPres = () => {
    setEditingPresId(null);
    setPresName('');
    setPresFactor(1);
    setPresPrice(Number(product?.salePrice || 0));
    setShowAddPresForm(true);
  };

  const handleEditPres = (p: PresentationItem) => {
    setEditingPresId(p.id);
    setPresName(p.name);
    setPresFactor(p.factor);
    setPresPrice(p.priceOverride ?? (Number(product?.salePrice || 0) * p.factor));
    setShowAddPresForm(true);
  };

  const handleDeletePres = (id: string) => {
    if (id === 'base') {
      toast.error('No se puede eliminar la presentación base principal.');
      return;
    }
    const updated = presentations.filter(p => p.id !== id);
    savePresentations(updated);
    toast.success('Presentación eliminada correctamente.');
  };

  const handleSavePres = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presName.trim() || presFactor <= 0) {
      toast.error('Por favor ingrese un nombre y factor válido mayor a 0.');
      return;
    }

    let updated: PresentationItem[];
    if (editingPresId) {
      updated = presentations.map(p => {
        if (p.id === editingPresId) {
          return {
            ...p,
            name: presName.trim(),
            factor: presFactor,
            priceOverride: presPrice > 0 ? presPrice : undefined
          };
        }
        return p;
      });
      toast.success('Presentación actualizada.');
    } else {
      const newItem: PresentationItem = {
        id: `pres_${Date.now()}`,
        name: presName.trim(),
        factor: presFactor,
        priceOverride: presPrice > 0 ? presPrice : undefined
      };
      updated = [...presentations, newItem];
      toast.success('Presentación agregada con éxito.');
    }

    savePresentations(updated);
    setShowAddPresForm(false);
  };

  if (!isOpen || !product) return null;

  const costPrice = Number(product.costPrice || 0);
  const salePrice = Number(product.salePrice || 0);
  const currentStock = Number(product.currentStock || 0);
  const minStock = Number(product.minStock || 0);
  const profit = salePrice - costPrice;
  const marginPercentage = costPrice > 0 ? ((profit / costPrice) * 100).toFixed(1) : '100';
  const inventoryCostValue = currentStock * costPrice;
  const inventorySaleValue = currentStock * salePrice;
  const isStockLow = currentStock <= minStock;

  const filteredMovements = movements.filter(m => {
    if (!movementSearch) return true;
    const term = movementSearch.toLowerCase();
    return (
      (m.referenceNumber && m.referenceNumber.toLowerCase().includes(term)) ||
      (m.movementType && m.movementType.toLowerCase().includes(term)) ||
      (m.reason && m.reason.toLowerCase().includes(term)) ||
      (m.user?.firstName && m.user.firstName.toLowerCase().includes(term)) ||
      (m.user?.lastName && m.user.lastName.toLowerCase().includes(term))
    );
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'ENTRADA':
      case 'COMPRA':
        return { label: type === 'COMPRA' ? '🛒 Compra' : '📦 Entrada', bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981' };
      case 'DEVOLUCION':
        return { label: '↩️ Devolución', bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' };
      case 'SALIDA':
      case 'VENTA':
        return { label: type === 'VENTA' ? '💰 Venta' : '📤 Salida', bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' };
      case 'AJUSTE':
        return { label: '⚖️ Ajuste', bg: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' };
      default:
        return { label: type, bg: 'rgba(100, 116, 139, 0.12)', color: '#64748b' };
    }
  };

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      paddingTop: '80px',
      paddingBottom: '1.25rem',
      boxSizing: 'border-box',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-base, #ffffff)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: 'calc(100vh - 100px)',
        height: 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid var(--border-color, #e2e8f0)',
        position: 'relative',
        boxSizing: 'border-box',
        margin: 'auto 0'
      }}>
        
        {/* ========================================================
            ENCABEZADO / HERO BANNER FIJO
           ======================================================== */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.07) 0%, rgba(30, 41, 59, 0.03) 100%)',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              
              {/* Imagen del Producto */}
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={24} />
                  </div>
                )}
              </div>

              {/* Títulos y Metadatos */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(37, 99, 235, 0.12)',
                    color: '#2563eb',
                    fontFamily: 'monospace'
                  }}>
                    {product.sku}
                  </span>
                  
                  {product.category?.name && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(100, 116, 139, 0.12)',
                      color: 'var(--text-secondary, #64748b)'
                    }}>
                      📁 {product.category.name}
                    </span>
                  )}

                  {product.brand?.name && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: 'rgba(100, 116, 139, 0.12)',
                      color: 'var(--text-secondary, #64748b)'
                    }}>
                      🏷️ {product.brand.name}
                    </span>
                  )}

                  {/* Estado Activo / Inactivo */}
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: product.isActive !== false ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: product.isActive !== false ? '#10b981' : '#ef4444'
                  }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: product.isActive !== false ? '#10b981' : '#ef4444'
                    }} />
                    {product.isActive !== false ? 'Activo' : 'Inactivo'}
                  </span>

                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1'
                  }}>
                    Unidad: {product.unit || 'UNIDAD'}
                  </span>
                </div>

                <h1 style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--text-primary, #1e293b)',
                  lineHeight: 1.2
                }}>
                  {product.name}
                </h1>
              </div>
            </div>

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              style={{
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary, #64748b)',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              title="Cerrar modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* ========================================================
              PESTAÑAS DE NAVEGACIÓN (TABS)
             ======================================================== */}
          <div style={{
            display: 'flex',
            gap: '0.35rem',
            marginTop: '0.75rem',
            borderBottom: '1px solid transparent',
            overflowX: 'auto'
          }}>
            {[
              { id: 'info', label: 'Información', icon: Package },
              { id: 'presentations', label: 'Presentaciones', icon: Layers },
              { id: 'stock', label: 'Stock Detallado', icon: BarChart3 },
              { id: 'movements', label: 'Movimientos', icon: ArrowRightLeft }
            ].map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    backgroundColor: isSelected ? '#2563eb' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary, #64748b)',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={14} />
                  {tab.label}
                  {tab.id === 'movements' && movements.length > 0 && (
                    <span style={{
                      marginLeft: '2px',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      fontSize: '0.65rem',
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(100, 116, 139, 0.15)',
                      color: isSelected ? '#ffffff' : 'inherit'
                    }}>
                      {movements.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            CUERPO DEL MODAL CON SCROLL VERTICAL SUAVE
           ======================================================== */}
        <div style={{
          padding: '1rem 1.25rem',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
          boxSizing: 'border-box'
        }}>
          
          {/* ==================== 1. TAB: INFORMACIÓN ==================== */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Tarjetas Métricas Principales */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.85rem'
              }}>
                <div style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-surface, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DollarSign size={14} color="#64748b" /> Costo Unitario
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)', marginTop: '4px' }}>
                    {formatCurrency(costPrice)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                    Por {product.unit || 'unidad'}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-surface, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={14} color="#10b981" /> Precio de Venta
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                    {formatCurrency(salePrice)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '2px', fontWeight: 600 }}>
                    Margen: +{formatCurrency(profit)} ({marginPercentage}%)
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: isStockLow ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-surface, #f8fafc)',
                  border: `1px solid ${isStockLow ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color, #e2e8f0)'}`
                }}>
                  <div style={{ fontSize: '0.75rem', color: isStockLow ? '#ef4444' : 'var(--text-secondary, #64748b)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Boxes size={14} color={isStockLow ? '#ef4444' : '#64748b'} /> Stock Actual
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isStockLow ? '#ef4444' : 'var(--text-primary, #1e293b)', marginTop: '4px' }}>
                    {currentStock} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{product.unit}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: isStockLow ? '#ef4444' : 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                    Mínimo requerido: {minStock} {product.unit}
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'var(--bg-surface, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} color="#3b82f6" /> Valor en Inventario
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>
                    {formatCurrency(inventoryCostValue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                    Venta Estimada: {formatCurrency(inventorySaleValue)}
                  </div>
                </div>
              </div>

              {/* Detalle Técnico del Catálogo */}
              <div style={{
                background: 'var(--bg-surface, #f8fafc)',
                borderRadius: '14px',
                border: '1px solid var(--border-color, #e2e8f0)',
                padding: '1.25rem'
              }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-primary, #1e293b)' }}>
                  Detalles del Catálogo
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>Código SKU / Barra</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)', fontFamily: 'monospace' }}>
                      {product.sku}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>Categoría</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                      {product.category?.name || 'Sin Categoría asignada'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>Marca Fabricante</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                      {product.brand?.name || 'Genérica / Sin Marca'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', display: 'block' }}>Unidad de Medida Oficial</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                      {product.unit || 'UNIDAD'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. TAB: PRESENTACIONES ==================== */}
          {activeTab === 'presentations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                    Presentaciones del Producto
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', margin: '2px 0 0 0' }}>
                    Configuración de equivalencias y precios por empaque o volumen
                  </p>
                </div>

                <button
                  onClick={handleOpenAddPres}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Plus size={16} /> Agregar Presentación
                </button>
              </div>

              {/* Formulario de Agregar / Editar Presentación */}
              {showAddPresForm && (
                <form 
                  onSubmit={handleSavePres}
                  style={{
                    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(248, 250, 252, 1) 100%)',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    borderRadius: '12px',
                    padding: '1.1rem'
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: '#2563eb' }}>
                    {editingPresId ? '✏️ Editar Presentación' : '✨ Nueva Presentación'}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.85rem',
                    marginBottom: '1rem'
                  }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary, #1e293b)' }}>
                        Nombre Presentación *
                      </label>
                      <input 
                        type="text" 
                        placeholder="Ej. Docena, Caja x24, Saco 50lb..." 
                        value={presName}
                        onChange={e => setPresName(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          backgroundColor: '#ffffff',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary, #1e293b)' }}>
                        Equivalencia ({product.unit}) *
                      </label>
                      <input 
                        type="number" 
                        step="any"
                        min="0.01"
                        placeholder="1" 
                        value={presFactor}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setPresFactor(val);
                          setPresPrice(Number((salePrice * val).toFixed(2)));
                        }}
                        required
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          backgroundColor: '#ffffff',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-primary, #1e293b)' }}>
                        Precio de Venta (C$)
                      </label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="0.00" 
                        value={presPrice}
                        onChange={e => setPresPrice(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          backgroundColor: '#ffffff',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowAddPresForm(false)}
                      style={{
                        padding: '0.45rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        background: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '0.45rem 1.25rem',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Guardar Presentación
                    </button>
                  </div>
                </form>
              )}

              {/* Tabla de Presentaciones */}
              <div style={{
                background: 'var(--bg-surface, #f8fafc)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)',
                overflowX: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-secondary, #64748b)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Presentación</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Equivalencia</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Precio de Venta</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentations.map((p) => {
                      const calculatedPrice = p.priceOverride ?? (salePrice * p.factor);
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
                            {p.name}
                            {p.id === 'base' && (
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: 'rgba(37, 99, 235, 0.1)',
                                color: '#2563eb'
                              }}>
                                Base
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary, #64748b)' }}>
                            {p.factor} {product.unit || 'Unidades'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                            {formatCurrency(calculatedPrice)}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => handleEditPres(p)}
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color, #cbd5e1)',
                                background: '#ffffff',
                                color: 'var(--text-primary, #1e293b)',
                                cursor: 'pointer',
                                marginRight: '0.35rem'
                              }}
                              title="Editar presentación"
                            >
                              <Edit2 size={13} />
                            </button>
                            {p.id !== 'base' && (
                              <button
                                onClick={() => handleDeletePres(p.id)}
                                style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.05)',
                                color: '#ef4444',
                                cursor: 'pointer'
                              }}
                                title="Eliminar presentación"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 3. TAB: STOCK DETALLADO ==================== */}
          {activeTab === 'stock' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                  Stock Detallado por Presentación
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', margin: '2px 0 0 0' }}>
                  Conversión automática en tiempo real del inventario físico real ({currentStock} {product.unit})
                </p>
              </div>

              {/* Tabla de Stock Detallado */}
              <div style={{
                background: 'var(--bg-surface, #f8fafc)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)',
                overflowX: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-secondary, #64748b)' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Presentación</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Stock Actual</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Stock Mínimo</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Stock Disponible</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presentations.map((p) => {
                      const stockInPres = p.factor > 0 ? (currentStock / p.factor) : 0;
                      const minInPres = p.factor > 0 ? (minStock / p.factor) : 0;
                      const isLow = stockInPres <= minInPres;
                      const isZero = stockInPres <= 0;

                      // Formatear decimales limpiamente (ej. 2.75 o 33)
                      const formatStockVal = (num: number) => {
                        return num % 1 === 0 ? num.toString() : num.toFixed(2);
                      };

                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
                              1 {p.name} = {p.factor} {product.unit}
                            </div>
                          </td>

                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: isZero ? '#ef4444' : (isLow ? '#f59e0b' : 'var(--text-primary, #1e293b)')
                            }}>
                              {formatStockVal(stockInPres)}
                            </span>
                          </td>

                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
                            {formatStockVal(minInPres)}
                          </td>

                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: isZero ? '#ef4444' : '#10b981'
                            }}>
                              {formatStockVal(stockInPres)}
                            </span>
                          </td>

                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: isZero ? 'rgba(239, 68, 68, 0.12)' : (isLow ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                              color: isZero ? '#ef4444' : (isLow ? '#f59e0b' : '#10b981')
                            }}>
                              {isZero ? 'Agotado' : (isLow ? 'Alerta Mínimo' : 'Disponible')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== 4. TAB: MOVIMIENTOS ==================== */}
          {activeTab === 'movements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                    Historial de Movimientos (Kardex)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', margin: '2px 0 0 0' }}>
                    Registro histórico y trazabilidad de entradas, salidas y ajustes
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="text" 
                      placeholder="Buscar movimiento..."
                      value={movementSearch}
                      onChange={e => setMovementSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.5rem 0.4rem 1.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <button
                    onClick={fetchMovements}
                    disabled={loadingMovements}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                    title="Recargar movimientos"
                  >
                    <RefreshCw size={14} className={loadingMovements ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Tabla de Movimientos */}
              <div style={{
                background: 'var(--bg-surface, #f8fafc)',
                borderRadius: '12px',
                border: '1px solid var(--border-color, #e2e8f0)',
                overflowX: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-secondary, #64748b)' }}>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Tipo</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, textAlign: 'center' }}>Cantidad</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Presentación</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, textAlign: 'center' }}>Stock Ant.</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, textAlign: 'center' }}>Stock Post.</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Motivo / Referencia</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600 }}>Usuario</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, textAlign: 'right' }}>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMovements ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
                          Cargando movimientos...
                        </td>
                      </tr>
                    ) : filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted, #94a3b8)' }}>
                          No hay movimientos registrados para este producto.
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map((m) => {
                        const badge = getMovementBadge(m.movementType);
                        const isPositive = m.movementType === 'ENTRADA' || m.movementType === 'COMPRA' || m.movementType === 'DEVOLUCION';
                        const isNegative = m.movementType === 'SALIDA' || m.movementType === 'VENTA';

                        return (
                          <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: badge.bg,
                                color: badge.color,
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                {badge.label}
                              </span>
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                              <span style={{
                                fontWeight: 800,
                                color: isPositive ? '#10b981' : (isNegative ? '#ef4444' : '#3b82f6')
                              }}>
                                {isPositive ? `+${m.quantity}` : (isNegative ? `-${m.quantity}` : m.quantity)}
                              </span>
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary, #64748b)' }}>
                              {product.unit || 'Unidad'}
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary, #64748b)' }}>
                              {m.stockBefore}
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
                              {m.stockAfter}
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                                {m.reason || 'Sin motivo'}
                              </div>
                              {m.referenceNumber && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94a3b8)', fontFamily: 'monospace' }}>
                                  Ref: {m.referenceNumber}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary, #64748b)' }}>
                              {m.user ? `${m.user.firstName} ${m.user.lastName || ''}`.trim() : 'Sistema'}
                            </td>

                            <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: 'var(--text-secondary, #64748b)', whiteSpace: 'nowrap' }}>
                              {new Date(m.createdAt).toLocaleString('es-NI', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ========================================================
            PIE DE PÁGINA FIJO (ACTIONS & CLOSE)
           ======================================================== */}
        <div style={{
          padding: '0.65rem 1.25rem',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface, #ffffff)',
          flexShrink: 0,
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onOpenMovement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMovement(product);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--bg-surface, #f8fafc)',
                  color: 'var(--text-primary, #1e293b)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ArrowRightLeft size={15} /> Registrar Movimiento
              </button>
            )}
            {onEditProduct && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProduct(product);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--bg-surface, #f8fafc)',
                  color: 'var(--text-primary, #1e293b)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Edit size={15} /> Editar Producto
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
