import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FormActions } from '../../components/ui/FormActions';
import formStyles from '../../styles/forms.module.css';
import api from '../../services/api';
import { 
  Search, Download, Upload, FileText, Image as ImageIcon, 
  ArrowRightLeft, X, Trash2, Eye,
  Sliders, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Package
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import TableSkeleton from '../../components/common/TableSkeleton';
import { formatCurrency } from '../../utils/formatters';
import { ProductDetailModal } from './ProductDetailModal';

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados para Movimientos (Kardex) y Detalle del Producto
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

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
    setValue: setMovementValue,
    watch: watchMovement,
    formState: { errors: movementErrors, isSubmitting: isSubmittingMovement } 
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: { movementType: 'ENTRADA', quantity: 1, reason: '', notes: '' }
  });

  const watchedMovementType = watchMovement('movementType') || 'ENTRADA';
  const watchedQuantity = Number(watchMovement('quantity') || 0);

  // Compute live projected stock
  const isAdditionType = ['ENTRADA', 'COMPRA', 'DEVOLUCION', 'AJUSTE_POSITIVO'].includes(watchedMovementType);
  const isSubtractionType = ['SALIDA', 'VENTA', 'DANADO', 'PERDIDO', 'ROBADO', 'VENCIDO', 'AJUSTE_NEGATIVO'].includes(watchedMovementType);
  
  let projectedStock = selectedProduct ? Number(selectedProduct.currentStock || 0) : 0;
  if (isAdditionType) {
    projectedStock += Math.abs(watchedQuantity);
  } else if (isSubtractionType) {
    projectedStock -= Math.abs(watchedQuantity);
  } else if (watchedMovementType === 'AJUSTE') {
    projectedStock += watchedQuantity;
  }

  const quickReasons = [
    'Compra a proveedor',
    'Ajuste físico de stock',
    'Devolución de cliente',
    'Merma por daño',
    'Venta en mostrador',
    'Inventario inicial'
  ];

  // ==========================
  // FETCH
  // ==========================
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error('Error fetching products', err);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
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

  const handleDeleteProduct = () => {
    if (!editingId) return;
    setDeleteConfirmId(editingId);
  };

  const handleDeleteById = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/products/${deleteConfirmId}`);
      toast.success('Producto eliminado correctamente');
      fetchProducts();
      setShowForm(false);
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al eliminar producto');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelProduct = () => {
    resetProduct({ minStock: 5, unit: 'UNIDAD', isActive: true });
    setIsEditing(false);
    setEditingId(null);
    setShowForm(false);
  };

  // ==========================
  // DETALLE Y MOVIMIENTOS
  // ==========================
  const openDetailModal = (product: any) => {
    setDetailProduct(product);
    setShowDetailModal(true);
  };

  const openMovementModal = (product: any) => {
    setSelectedProduct(product);
    resetMovement();
    setShowMovementModal(true);
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
        p.sku, p.name, `C$${Number(p.salePrice || 0).toFixed(2)}`, p.currentStock.toString(), p.unit, p.isActive ? 'Activo' : 'Inactivo'
      ];
      tableRows.push(productData);
    });

    autoTable(doc, {
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
        <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '0.65rem 0.75rem', width: '45px' }}>Img</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Código</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Producto</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Categoría</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Marca</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Stock</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Mín.</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Costo</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Precio</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Valor Inv.</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Ganancia</th>
                <th style={{ 
                  padding: '0.65rem 0.75rem', 
                  textAlign: 'right', 
                  position: 'sticky', 
                  right: 0, 
                  background: 'var(--bg-surface)', 
                  zIndex: 2, 
                  boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' 
                }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: '1rem' }}>
                    <TableSkeleton rows={5} columns={8} />
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No hay artículos en el inventario.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 'bold' }}>{p.sku}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.unit}</div>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{p.category?.name || 'N/A'}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{p.brand?.name || 'N/A'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: p.currentStock <= p.minStock ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: p.currentStock <= p.minStock ? '#ef4444' : '#10b981'
                      }}>
                        {p.currentStock}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{p.minStock}</td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {formatCurrency(p.costPrice)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                      {formatCurrency(p.salePrice)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(p.currentStock * p.costPrice)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#3b82f6', fontWeight: 600 }}>
                      {formatCurrency(p.salePrice - p.costPrice)}
                    </td>
                    <td style={{ 
                      padding: '0.5rem 0.75rem', 
                      textAlign: 'right', 
                      whiteSpace: 'nowrap',
                      position: 'sticky', 
                      right: 0, 
                      background: 'var(--bg-surface)', 
                      zIndex: 1, 
                      boxShadow: '-4px 0 8px rgba(0,0,0,0.06)' 
                    }}>
                      <button 
                        onClick={() => openDetailModal(p)} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.45rem', marginRight: '0.35rem', color: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.3)', backgroundColor: 'rgba(37, 99, 235, 0.05)' }} 
                        title="Ver Detalle del Producto"
                      >
                        <Eye size={15} />
                      </button>
                      <button 
                        onClick={() => openMovementModal(p)} 
                        className="btn btn-secondary" 
                        style={{ padding: '0.35rem 0.45rem', marginRight: '0.35rem' }} 
                        title="Registrar Movimiento"
                      >
                        <ArrowRightLeft size={15} />
                      </button>
                      {user?.role === 'ADMIN' && (
                        <button 
                          onClick={() => handleDeleteById(p.id)} 
                          className="btn btn-secondary" 
                          style={{ padding: '0.35rem 0.45rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }} 
                          title="Eliminar Producto"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DE MOVIMIENTOS MEJORADO */}
      {showMovementModal && selectedProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          paddingTop: '80px',
          paddingBottom: '1.25rem',
          boxSizing: 'border-box',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <form 
            onSubmit={handleSubmitMovement(onSubmitMovement)}
            style={{
              backgroundColor: 'var(--bg-base, #ffffff)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '540px',
              maxHeight: 'calc(100vh - 100px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color, #e2e8f0)',
              position: 'relative',
              boxSizing: 'border-box',
              margin: 'auto 0'
            }}
          >
            {/* Header Fijo */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}>
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #1e293b)' }}>
                    Registrar Movimiento
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                    Ajusta o registra entradas y salidas de inventario
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
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
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Cuerpo con Scroll Interno Suave */}
            <div style={{
              padding: '1.25rem',
              overflowY: 'auto',
              flex: 1,
              minHeight: 0
            }}>
              {/* Card de Información del Producto y Proyección de Stock */}
              <div style={{
                background: 'var(--bg-surface, rgba(248, 250, 252, 0.8))',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '12px',
                padding: '0.9rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {selectedProduct.imageUrl ? (
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name} 
                      style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }} 
                    />
                  ) : (
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: 'rgba(37, 99, 235, 0.1)',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Package size={20} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'rgba(37, 99, 235, 0.1)',
                        color: '#2563eb',
                        fontFamily: 'monospace'
                      }}>
                        {selectedProduct.sku}
                      </span>
                      {selectedProduct.category?.name && (
                        <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(100, 116, 139, 0.1)', color: 'var(--text-secondary, #64748b)' }}>
                          {selectedProduct.category.name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #1e293b)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedProduct.name}
                    </div>
                  </div>
                </div>

                {/* Simulador de Stock en Tiempo Real */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-base, #ffffff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem',
                  gap: '0.5rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Stock Actual</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary, #1e293b)' }}>
                      {selectedProduct.currentStock} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>{selectedProduct.unit}</span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 8px',
                    borderRadius: '16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    backgroundColor: isAdditionType ? 'rgba(16, 185, 129, 0.12)' : (isSubtractionType ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)'),
                    color: isAdditionType ? '#10b981' : (isSubtractionType ? '#ef4444' : '#3b82f6')
                  }}>
                    {isAdditionType && <><ArrowUpRight size={14} style={{ marginRight: '2px' }} /> +{Math.abs(watchedQuantity)}</>}
                    {isSubtractionType && <><ArrowDownRight size={14} style={{ marginRight: '2px' }} /> -{Math.abs(watchedQuantity)}</>}
                    {!isAdditionType && !isSubtractionType && <><Sliders size={14} style={{ marginRight: '3px' }} /> {watchedQuantity >= 0 ? `+${watchedQuantity}` : watchedQuantity}</>}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)', fontWeight: 500 }}>Proyección Final</div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: projectedStock < 0 ? '#ef4444' : (projectedStock <= (selectedProduct.minStock || 0) ? '#f59e0b' : '#10b981')
                    }}>
                      {projectedStock} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)' }}>{selectedProduct.unit}</span>
                    </div>
                  </div>
                </div>

                {projectedStock < 0 && (
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444', fontSize: '0.72rem', fontWeight: 600 }}>
                    <AlertCircle size={13} /> Advertencia: El stock proyectado no puede ser menor a 0.
                  </div>
                )}
              </div>

              {/* Campos del Formulario */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                
                {/* Tipo de Movimiento */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
                    Tipo de Movimiento <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: `1px solid ${movementErrors.movementType ? '#ef4444' : 'var(--border-color, #cbd5e1)'}`,
                      backgroundColor: 'var(--bg-base, #ffffff)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: 'var(--text-primary, #1e293b)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    {...registerMovement('movementType')}
                  >
                    <optgroup label="─── INGRESOS / ENTRADAS (+) ───">
                      <option value="ENTRADA">📦 Entrada General</option>
                      <option value="COMPRA">🛒 Entrada por Compra</option>
                      <option value="DEVOLUCION">↩️ Devolución de Cliente</option>
                    </optgroup>
                    <optgroup label="─── EGRESOS / SALIDAS (-) ───">
                      <option value="SALIDA">📤 Salida General / Merma</option>
                      <option value="VENTA">💰 Salida por Venta</option>
                    </optgroup>
                    <optgroup label="─── AJUSTE Y BALANCE (±) ───">
                      <option value="AJUSTE">⚖️ Ajuste de Inventario / Conteo</option>
                    </optgroup>
                  </select>
                  {movementErrors.movementType && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.2rem', display: 'block' }}>
                      {movementErrors.movementType.message}
                    </span>
                  )}
                </div>

                {/* Cantidad con Steppers rápidos */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                      Cantidad a Mover <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #64748b)' }}>
                      Unidad: {selectedProduct.unit}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input 
                        type="number"
                        step="any"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: `1px solid ${movementErrors.quantity ? '#ef4444' : 'var(--border-color, #cbd5e1)'}`,
                          backgroundColor: 'var(--bg-base, #ffffff)',
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: 'var(--text-primary, #1e293b)',
                          outline: 'none'
                        }}
                        placeholder="1"
                        {...registerMovement('quantity')}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {[1, 5, 10].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            const current = Number(watchMovement('quantity') || 0);
                            setMovementValue('quantity', current + val, { shouldValidate: true });
                          }}
                          style={{
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color, #cbd5e1)',
                            backgroundColor: 'var(--bg-surface, #f1f5f9)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: 'var(--text-primary, #334155)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>
                  {movementErrors.quantity && (
                    <span style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: '0.2rem', display: 'block' }}>
                      {movementErrors.quantity.message}
                    </span>
                  )}
                </div>

                {/* Motivo con Quick-Pills */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
                    Motivo Principal
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: Factura de compra, Ajuste mensual, Merma..." 
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'var(--bg-base, #ffffff)',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary, #1e293b)',
                      outline: 'none'
                    }}
                    {...registerMovement('reason')} 
                  />

                  {/* Sugerencias rápidas */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.4rem' }}>
                    {quickReasons.map(qr => (
                      <button
                        key={qr}
                        type="button"
                        onClick={() => setMovementValue('reason', qr, { shouldValidate: true })}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          backgroundColor: 'var(--bg-surface, rgba(241, 245, 249, 0.6))',
                          color: 'var(--text-secondary, #64748b)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observaciones / Notas */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary, #1e293b)' }}>
                    Observaciones / Notas <span style={{ fontWeight: 400, color: 'var(--text-secondary, #64748b)' }}>(Opcional)</span>
                  </label>
                  <textarea 
                    placeholder="Información adicional relevante del movimiento..." 
                    rows={2} 
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'var(--bg-base, #ffffff)',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary, #1e293b)',
                      outline: 'none',
                      resize: 'none'
                    }}
                    {...registerMovement('notes')} 
                  />
                </div>
              </div>
            </div>

            {/* Footer Fijo con Botones de Acción Pinned */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: 'var(--bg-surface, #ffffff)',
              flexShrink: 0
            }}>
              <button 
                type="button" 
                onClick={() => setShowMovementModal(false)}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary, #334155)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isSubmittingMovement || projectedStock < 0}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: (isSubmittingMovement || projectedStock < 0) ? 'not-allowed' : 'pointer',
                  opacity: (isSubmittingMovement || projectedStock < 0) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle2 size={16} />
                {isSubmittingMovement ? 'Guardando...' : 'Confirmar Movimiento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DETALLE DEL PRODUCTO */}
      <ProductDetailModal
        product={detailProduct}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onOpenMovement={(p) => openMovementModal(p)}
        onEditProduct={user?.role === 'ADMIN' ? (p) => handleEditProduct(p) : undefined}
      />

      {/* CONFIRM MODAL */}
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Eliminar Producto"
        message="¿Está seguro de que desea eliminar este producto? Si tiene facturas o movimientos asociados, se desactivará lógicamente."
        confirmText="Sí, Eliminar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};

export default InventoryPage;
