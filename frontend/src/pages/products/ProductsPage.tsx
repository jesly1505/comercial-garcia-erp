import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Search, Edit2, Trash2, Package, DollarSign } from 'lucide-react';
import styles from './ProductsPage.module.css';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  costPrice: number;
  salePrice: number;
  isActive: boolean;
  category?: Category;
  brand?: Brand;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ sku: '', name: '', costPrice: 0, salePrice: 0 });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching products', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        sku: product.sku,
        name: product.name,
        costPrice: product.costPrice,
        salePrice: product.salePrice
      });
    } else {
      setEditingId(null);
      setFormData({ sku: '', name: '', costPrice: 0, salePrice: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Forcing prices to be numbers
      const payload = {
        ...formData,
        costPrice: Number(formData.costPrice),
        salePrice: Number(formData.salePrice)
      };

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product', error);
      alert('Error al guardar producto. Revisa si el SKU ya existe.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/products/${id}`);
      setConfirmDeleteId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product', error);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.includes(search)
  );

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 className={styles.title}>Inventario y Productos</h1>
        <button className="btn-primary" onClick={() => openModal()}>
          <Plus size={20} /> Nuevo Producto
        </button>
      </div>

      <div className={`glass-panel ${styles.toolbar}`}>
        <div className={styles.searchBox}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o SKU..." 
            value={search}
            onChange={handleSearch}
          />
        </div>
      </div>

      <div className={`glass-panel ${styles.tableContainer}`}>
        {loading ? (
          <div className={styles.loading}>Cargando productos...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Precio Venta</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>{product.sku}</td>
                  <td className={styles.nameCell}>{product.name}</td>
                  <td>{product.category?.name || '-'}</td>
                  <td>C${product.salePrice.toFixed(2)}</td>
                  <td>
                    <span className={`${styles.badge} ${product.isActive ? styles.badgeActive : styles.badgeInactive}`}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => openModal(product)}>
                        <Edit2 size={18} />
                      </button>
                      <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setConfirmDeleteId(product.id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>No se encontraron productos</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Product Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Producto' : 'Nuevo Producto'}
        subtitle={editingId ? 'Modifica los datos del producto' : 'Completa los datos del nuevo producto'}
        size="md"
        footer={
          <>
            <button type="button" className={styles.btnCancel} onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" form="product-form" className={styles.btnPrimary}>Guardar Producto</button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.modalSection}>
            <div className={styles.sectionHead}><Package size={15}/><span>Identificación</span></div>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>SKU / Código <span className={styles.req}>*</span></label>
                <input required className={styles.fieldInput} value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
              </div>
              <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                <label className={styles.fieldLabel}>Nombre del Producto <span className={styles.req}>*</span></label>
                <input required className={styles.fieldInput} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>
          </div>
          <div className={styles.modalSection}>
            <div className={styles.sectionHead}><DollarSign size={15}/><span>Precios</span></div>
            <div className={styles.formGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Precio de Costo <span className={styles.req}>*</span></label>
                <input type="number" step="0.01" required className={styles.fieldInput} value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value)})} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Precio de Venta <span className={styles.req}>*</span></label>
                <input type="number" step="0.01" required className={styles.fieldInput} value={formData.salePrice} onChange={e => setFormData({...formData, salePrice: parseFloat(e.target.value)})} />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        type="warning"
        title="¿Desactivar producto?"
        message="El producto se marcará como inactivo y no aparecerá en nuevas ventas."
        confirmText="Sí, desactivar"
        cancelText="Cancelar"
        onConfirm={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};

export default ProductsPage;
