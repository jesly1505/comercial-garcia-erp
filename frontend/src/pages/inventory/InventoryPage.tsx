import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormActions } from '../../components/ui/FormActions';
import formStyles from '../../styles/forms.module.css';
import api from '../../services/api';
import { Edit, Search, Download, Upload, FileText, Image as ImageIcon, ArrowRightLeft, History, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// ==========================
// SCHEMAS
// ==========================
const productSchema = z.object({
  sku: z.string().min(2, 'El código/SKU es requerido'),
  name: z.string().min(2, 'El nombre es requerido'),
  costPrice: z.coerce.number().min(0, 'No puede ser negativo'),
  salePrice: z.coerce.number().min(0, 'No puede ser negativo'),
  currentStock: z.coerce.number().min(0, 'No puede ser negativo'),
  minStock: z.coerce.number().min(0, 'No puede ser negativo'),
  unit: z.string().min(1, 'La unidad es requerida'),
  imageUrl: z.string().url('Debe ser un enlace válido').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

const movementSchema = z.object({
  movementType: z.string().min(1, 'Tipo de movimiento requerido'),
  reason: z.string().optional(),
  quantity: z.coerce.number().min(1, 'La cantidad debe ser mayor a 0'),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;
type MovementFormValues = z.infer<typeof movementSchema>;

const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const { user } = useAuth();
  
  const categories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean)));
  
  // Estados para el CRUD de Producto
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Estados para Movimientos (Kardex)
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [movementsHistory, setMovementsHistory] = useState<any[]>([]);

  // Formularios
  const { 
    register: registerProduct, 
    handleSubmit: handleSubmitProduct, 
    reset: resetProduct, 
    setValue: setProductValue,
    formState: { errors: productErrors, isSubmitting: isSubmittingProduct } 
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: { minStock: 5, unit: 'UNIDAD', isActive: true }
  });

  const { 
    register: registerMovement, 
    handleSubmit: handleSubmitMovement, 
    reset: resetMovement,
    formState: { errors: movementErrors, isSubmitting: isSubmittingMovement } 
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: { movementType: 'ENTRADA', quantity: 1 }
  });

  // ==========================
  // FETCH
  // ==========================
  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (err) {
      console.error('Error fetching products', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    let result = products;
    if (selectedCategory) {
      result = result.filter(p => p.category?.name === selectedCategory);
    }
    if (searchTerm !== '') {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.sku.toLowerCase().includes(lower)
      );
    }
    setFilteredProducts(result);
  }, [searchTerm, selectedCategory, products]);

  // ==========================
  // CRUD PRODUCTOS
  // ==========================
  const onSubmitProduct = async (data: ProductFormValues) => {
    try {
      if (isEditing && editingId) {
        await api.put(`/products/${editingId}`, data);
        toast.success('Producto actualizado exitosamente');
      } else {
        await api.post('/products', data);
        toast.success('Producto creado exitosamente');
      }
      fetchProducts();
      handleCancelProduct();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al guardar el producto');
    }
  };

  const handleEditProduct = (product: any) => {
    setIsEditing(true);
    setEditingId(product.id);
    setShowForm(true);
    Object.keys(product).forEach((key) => {
      setProductValue(key as keyof ProductFormValues, product[key]);
    });
  };

  const handleDeleteProduct = async () => {
    if (!editingId) return;
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      try {
        await api.delete(`/products/${editingId}`);
        toast.success('Producto eliminado');
        fetchProducts();
        setShowForm(false);
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al eliminar producto');
      }
    }
  };

  const handleDeleteById = async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      try {
        await api.delete(`/products/${id}`);
        toast.success('Producto eliminado');
        fetchProducts();
      } catch (err: any) {
        toast.error(err.response?.data?.error || 'Error al eliminar producto');
      }
    }
  };

  const handleCancelProduct = () => {
    resetProduct({ minStock: 5, unit: 'UNIDAD', isActive: true });
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
  };

  // ==========================
  // MOVIMIENTOS E HISTORIAL
  // ==========================
  const openMovementModal = (product: any) => {
    setSelectedProduct(product);
    resetMovement();
    setShowMovementModal(true);
  };

  const openHistoryModal = async (product: any) => {
    setSelectedProduct(product);
    setShowHistoryModal(true);
    try {
      const res = await api.get('/inventory/movements');
      const filtered = res.data.filter((m: any) => m.productId === product.id);
      setMovementsHistory(filtered);
    } catch (error) {
      console.error('Error fetching history', error);
    }
  };

  const onSubmitMovement = async (data: MovementFormValues) => {
    try {
      await api.post('/inventory/movements', {
        productId: selectedProduct.id,
        ...data
      });
      setShowMovementModal(false);
      fetchProducts(); // Refrescar el stock en la tabla principal
      toast.success('Movimiento registrado correctamente');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al registrar el movimiento');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProductValue('imageUrl', res.data.imageUrl);
      toast.success('Imagen subida correctamente');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al subir la imagen');
    }
  };

  // ==========================
  // EXPORTAR A EXCEL / PDF
  // ==========================
  const exportToExcel = () => {
    const dataToExport = filteredProducts.map(p => ({
      Código: p.sku,
      Nombre: p.name,
      'Costo (C$)': p.costPrice,
      'Precio Venta (C$)': p.salePrice,
      'Stock Actual': p.currentStock,
      'Stock Mínimo': p.minStock,
      Unidad: p.unit,
      Estado: p.isActive ? 'Activo' : 'Inactivo'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    XLSX.writeFile(wb, "Inventario_Comercial_Garcia.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Catálogo de Inventario - Comercial García", 14, 15);
    
    const tableColumn = ["Código", "Nombre", "Precio Venta", "Stock", "Unidad", "Estado"];
    const tableRows: any[] = [];

    filteredProducts.forEach(p => {
      const productData = [
        p.sku, p.name, `C$${p.salePrice.toFixed(2)}`, p.currentStock.toString(), p.unit, p.isActive ? 'Activo' : 'Inactivo'
      ];
      tableRows.push(productData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 25, 48] }
    });

    doc.save("Inventario_Comercial_Garcia.pdf");
  };

  // ==========================
  // IMPORTAR DE EXCEL
  // ==========================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[] = XLSX.utils.sheet_to_json(ws);
      
      let successCount = 0;
      for (const row of data) {
        try {
          await api.post('/products', {
            sku: row['Código'] || row['codigo'] || row['sku'],
            name: row['Nombre'] || row['nombre'],
            costPrice: parseFloat(row['Costo'] || row['costo'] || '0'),
            salePrice: parseFloat(row['Precio'] || row['precio'] || '0'),
            currentStock: parseInt(row['Stock'] || row['stock'] || '0'),
            minStock: parseInt(row['Stock Mínimo'] || '5'),
            unit: row['Unidad'] || row['unidad'] || 'UNIDAD',
            isActive: true
          });
          successCount++;
        } catch (error) {
          console.error('Error importando fila', row, error);
        }
      }
      toast.success(`Importación finalizada. ${successCount} artículos guardados.`);
      fetchProducts();
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Gestión de Inventario</h1>
        
        {!showForm && (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar por código o nombre..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', width: '250px' }}
              />
            </div>

            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
              <button className="btn btn-secondary" onClick={exportToExcel} title="Exportar a Excel" style={{ padding: '0.5rem' }}>
                <Download size={18} color="#10b981" />
              </button>
              <button className="btn btn-secondary" onClick={exportToPDF} title="Exportar a PDF" style={{ padding: '0.5rem' }}>
                <FileText size={18} color="#ef4444" />
              </button>
              
              <label className="btn btn-secondary" style={{ padding: '0.5rem', cursor: 'pointer', margin: 0 }} title="Importar desde Excel">
                <Upload size={18} color="#3b82f6" />
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <button className="btn btn-primary" onClick={() => { setIsEditing(false); setShowForm(true); resetProduct(); }}>
              + Nuevo Artículo
            </button>
          </div>
        )}
      </div>

      {showForm ? (
        <div className={formStyles.formContainer}>
          <div className={formStyles.sectionTitle}>
            {isEditing ? 'Editar Artículo' : 'Registrar Nuevo Artículo'}
          </div>

          <form onSubmit={handleSubmitProduct(onSubmitProduct)}>
            <div className={formStyles.formSection}>
              <h3 className={formStyles.sectionTitle} style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '1rem' }}>Información Básica</h3>
              <div className={formStyles.formGrid}>
                <div className={formStyles.fieldGroup}>
                  <label className={formStyles.label}>Código (SKU) <span className={formStyles.required}>*</span></label>
                  <input type="text" className={`${formStyles.input} ${productErrors.sku ? formStyles.error : ''}`} {...registerProduct('sku')} />
                  {productErrors.sku && <span className={formStyles.errorMessage}>{productErrors.sku.message}</span>}
                </div>

                <div className={`${formStyles.fieldGroup} ${formStyles.fullWidth}`}>
                  <label className={formStyles.label}>Nombre del Producto <span className={formStyles.required}>*</span></label>
                  <input type="text" className={`${formStyles.input} ${productErrors.name ? formStyles.error : ''}`} {...registerProduct('name')} />
                  {productErrors.name && <span className={formStyles.errorMessage}>{productErrors.name.message}</span>}
                </div>
              </div>
            </div>

            <div className={formStyles.formSection}>
              <h3 className={formStyles.sectionTitle} style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '1rem' }}>Finanzas</h3>
              <div className={formStyles.formGrid}>
                <div className={formStyles.fieldGroup}>
                  <label className={formStyles.label}>Costo de Compra (C$) <span className={formStyles.required}>*</span></label>
                  <input type="number" step="0.01" className={`${formStyles.input} ${productErrors.costPrice ? formStyles.error : ''}`} {...registerProduct('costPrice')} />
                  {productErrors.costPrice && <span className={formStyles.errorMessage}>{productErrors.costPrice.message}</span>}
                </div>

                <div className={formStyles.fieldGroup}>
                  <label className={formStyles.label}>Precio de Venta (C$) <span className={formStyles.required}>*</span></label>
                  <input type="number" step="0.01" className={`${formStyles.input} ${productErrors.salePrice ? formStyles.error : ''}`} {...registerProduct('salePrice')} />
                  {productErrors.salePrice && <span className={formStyles.errorMessage}>{productErrors.salePrice.message}</span>}
                </div>
              </div>
            </div>

            <div className={formStyles.formSection}>
              <h3 className={formStyles.sectionTitle} style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '1rem' }}>Inventario Inicial y Configuración</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Nota: El stock actual posterior se gestiona automáticamente a través de los Movimientos de Inventario.
              </p>
              <div className={formStyles.formGrid}>
                <div className={formStyles.fieldGroup}>
                  <label className={formStyles.label}>Stock Actual Inicial <span className={formStyles.required}>*</span></label>
                  <input type="number" className={`${formStyles.input} ${productErrors.currentStock ? formStyles.error : ''}`} {...registerProduct('currentStock')} />
                </div>

                <div className={formStyles.fieldGroup}>
                  <label className={formStyles.label}>Stock Mínimo (Alerta) <span className={formStyles.required}>*</span></label>
                  <input type="number" className={`${formStyles.input} ${productErrors.minStock ? formStyles.error : ''}`} {...registerProduct('minStock')} />
                </div>

                <div className={formStyles.fieldGroup}>
                  <label className={formStyles.label}>Unidad de Medida <span className={formStyles.required}>*</span></label>
                  <select className={formStyles.input} {...registerProduct('unit')}>
                    <option value="UNIDAD">Unidad (Pza)</option>
                    <option value="KG">Kilogramos (Kg)</option>
                    <option value="LIBRA">Libras (Lb)</option>
                    <option value="LITRO">Litros (L)</option>
                    <option value="CAJA">Caja</option>
                    <option value="METRO">Metros (M)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={formStyles.formSection}>
              <h3 className={formStyles.sectionTitle} style={{ fontSize: '1rem', borderBottom: 'none', marginBottom: '1rem' }}>Multimedia</h3>
              <div className={formStyles.formGrid}>
                <div className={`${formStyles.fieldGroup} ${formStyles.fullWidth}`}>
                  <label className={formStyles.label}>Imagen del Producto</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={16} /> Subir Imagen
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                    <input type="url" placeholder="O ingresa una URL web externa..." className={`${formStyles.input} ${productErrors.imageUrl ? formStyles.error : ''}`} {...registerProduct('imageUrl')} style={{ flex: 1 }} />
                  </div>
                </div>
              </div>
            </div>

            <FormActions 
              isEditing={isEditing}
              onCancel={handleCancelProduct}
              onDelete={user?.role === 'ADMIN' ? handleDeleteProduct : undefined}
              isLoading={isSubmittingProduct}
            />
          </form>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '1rem', width: '50px' }}>Img</th>
                <th style={{ padding: '1rem' }}>Código</th>
                <th style={{ padding: '1rem' }}>Producto</th>
                <th style={{ padding: '1rem' }}>Categoría</th>
                <th style={{ padding: '1rem' }}>Marca</th>
                <th style={{ padding: '1rem' }}>Stock Inicial</th>
                <th style={{ padding: '1rem' }}>Stock Mín.</th>
                <th style={{ padding: '1rem' }}>Costo Unit.</th>
                <th style={{ padding: '1rem' }}>Precio Venta</th>
                <th style={{ padding: '1rem' }}>Valor Inv.</th>
                <th style={{ padding: '1rem' }}>Ganancia/Venta</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay artículos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem' }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{p.sku}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.unit}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>{p.category?.name || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>{p.brand?.name || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: p.currentStock <= p.minStock ? '#ef4444' : 'inherit'
                      }}>
                        {p.currentStock}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>{p.minStock}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      C${p.costPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', color: '#10b981', fontWeight: 600 }}>
                      C${p.salePrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                      C${(p.currentStock * p.costPrice).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', color: '#3b82f6', fontWeight: 600 }}>
                      C${(p.salePrice - p.costPrice).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openMovementModal(p)} className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }} title="Registrar Movimiento">
                        <ArrowRightLeft size={16} />
                      </button>
                      <button onClick={() => openHistoryModal(p)} className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }} title="Ver Historial (Kardex)">
                        <History size={16} />
                      </button>
                      {user?.role === 'ADMIN' && (
                        <>
                          <button onClick={() => handleEditProduct(p)} className="btn btn-secondary" style={{ padding: '0.4rem', marginRight: '0.5rem' }} title="Editar Producto">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteById(p.id)} className="btn btn-secondary" style={{ padding: '0.4rem', color: '#ef4444', borderColor: '#ef4444' }} title="Eliminar Producto">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE MOVIMIENTOS */}
      {showMovementModal && selectedProduct && (
        <div className={formStyles.modalOverlay}>
          <div className={formStyles.modalContent}>
            <div className={formStyles.modalHeader}>
              <h2 className={formStyles.modalTitle}>Registrar Movimiento</h2>
              <button onClick={() => setShowMovementModal(false)} className={formStyles.closeButton}><X size={20} /></button>
            </div>
            <div className={formStyles.modalBody}>
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{selectedProduct.name}</p>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Stock Actual: <span style={{ fontWeight: 'bold' }}>{selectedProduct.currentStock} {selectedProduct.unit}</span></p>
              </div>

              <form onSubmit={handleSubmitMovement(onSubmitMovement)}>
                <div className={formStyles.formGrid}>
                  <div className={formStyles.fieldGroup}>
                    <label className={formStyles.label}>Tipo de Movimiento</label>
                    <select className={`${formStyles.input} ${movementErrors.movementType ? formStyles.error : ''}`} {...registerMovement('movementType')}>
                      <optgroup label="Ingresos (+)">
                        <option value="COMPRA">Entrada por Compra</option>
                        <option value="AJUSTE_POSITIVO">Ajuste Positivo</option>
                        <option value="DEVOLUCION">Devolución de Cliente</option>
                      </optgroup>
                      <optgroup label="Egresos (-)">
                        <option value="VENTA">Salida por Venta</option>
                        <option value="DANADO">Producto Dañado / Merma</option>
                        <option value="PERDIDO">Pérdida</option>
                        <option value="ROBADO">Robo</option>
                        <option value="VENCIDO">Producto Vencido</option>
                        <option value="AJUSTE_NEGATIVO">Ajuste Negativo</option>
                      </optgroup>
                      <optgroup label="Reemplazo Total">
                        <option value="CONTEO_FISICO">Conteo Físico (Sobrescribe Stock)</option>
                      </optgroup>
                    </select>
                    {movementErrors.movementType && <span className={formStyles.errorMessage}>{movementErrors.movementType.message}</span>}
                  </div>

                  <div className={formStyles.fieldGroup}>
                    <label className={formStyles.label}>Motivo Principal</label>
                    <input type="text" placeholder="Ej: Factura 001, Robo en tienda..." className={formStyles.input} {...registerMovement('reason')} />
                  </div>

                  <div className={formStyles.fieldGroup}>
                    <label className={formStyles.label}>Cantidad</label>
                    <input type="number" className={`${formStyles.input} ${movementErrors.quantity ? formStyles.error : ''}`} {...registerMovement('quantity')} />
                    {movementErrors.quantity && <span className={formStyles.errorMessage}>{movementErrors.quantity.message}</span>}
                  </div>

                  <div className={`${formStyles.fieldGroup} ${formStyles.fullWidth}`}>
                    <label className={formStyles.label}>Observaciones / Notas (Opcional)</label>
                    <input type="text" placeholder="Ej: Mercadería encontrada en bodega 2" className={formStyles.input} {...registerMovement('notes')} />
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowMovementModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmittingMovement}>
                    {isSubmittingMovement ? 'Guardando...' : 'Confirmar Movimiento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTORIAL (KARDEX) */}
      {showHistoryModal && selectedProduct && (
        <div className={formStyles.modalOverlay}>
          <div className={formStyles.modalContent} style={{ maxWidth: '800px' }}>
            <div className={formStyles.modalHeader}>
              <h2 className={formStyles.modalTitle}>Kardex / Historial - {selectedProduct.name}</h2>
              <button onClick={() => setShowHistoryModal(false)} className={formStyles.closeButton}><X size={20} /></button>
            </div>
            <div className={formStyles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {movementsHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No hay movimientos registrados para este producto.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '0.75rem' }}>Fecha</th>
                      <th style={{ padding: '0.75rem' }}>Tipo</th>
                      <th style={{ padding: '0.75rem' }}>Cant.</th>
                      <th style={{ padding: '0.75rem' }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsHistory.map(mov => (
                      <tr key={mov.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem' }}>{new Date(mov.createdAt).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                          <span style={{
                            color: ['ENTRADA', 'AJUSTE_POSITIVO', 'DEVOLUCION'].includes(mov.movementType) ? '#10b981' : 
                                   mov.movementType === 'CONTEO_FISICO' ? '#3b82f6' : '#ef4444'
                          }}>
                            {mov.movementType.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{mov.quantity}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{mov.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryPage;
