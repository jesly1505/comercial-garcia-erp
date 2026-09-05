import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  TouchableOpacity, TextInput, RefreshControl, Alert 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CACHE_KEY = 'cached_products_list';

export const CatalogScreen = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { logout, user } = useAuth();

  // Cargar productos de la caché local para disponibilidad offline (TICKET-056)
  const loadCachedProducts = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        setProducts(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('Error reading product cache:', e);
    }
  };

  const fetchProducts = async (isPullToRefresh = false) => {
    if (!isPullToRefresh && products.length === 0) {
      setLoading(true);
    }
    setErrorMsg(null);

    try {
      const res = await api.get('/products');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const activeProducts = data.filter((p: any) => p.isActive);
      
      setProducts(activeProducts);
      // Guardar en caché local (TICKET-056)
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(activeProducts));
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const msg = error.response?.data?.error || error.message || 'No se pudo conectar con el servidor';
      setErrorMsg(msg);
      // Notificar al usuario (TICKET-054)
      if (isPullToRefresh) {
        Alert.alert('Error de conexión', 'No se pudieron actualizar los productos. Mostrando datos locales.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCachedProducts().then(() => {
      fetchProducts();
    });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts(true);
  }, []);

  const filteredProducts = products.filter(p => 
    (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productSku}>SKU: {item.sku}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.price}>C$ {Number(item.salePrice || 0).toFixed(2)}</Text>
        <View style={[styles.stockBadge, item.currentStock <= (item.minStock || 0) && styles.lowStockBadge]}>
          <Text style={[styles.stockText, item.currentStock <= (item.minStock || 0) && styles.lowStockText]}>
            Stock: {item.currentStock} {item.unit || ''}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.firstName || 'Usuario'}</Text>
          <Text style={styles.headerTitle}>Catálogo Móvil</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de error / Offline (TICKET-054 & TICKET-057) */}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
          <TouchableOpacity onPress={() => fetchProducts()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Buscar producto por nombre o SKU..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0b1930" />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : (
        <FlatList 
          data={filteredProducts}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0b1930', '#c59b6d']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron productos disponibles</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#0b1930',
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#c59b6d',
  },
  greeting: {
    color: '#c59b6d',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'rgba(197, 155, 109, 0.2)',
    borderWidth: 1,
    borderColor: '#c59b6d',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  retryBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 15,
    color: '#1e293b',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#10b981',
  },
  stockBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lowStockBadge: {
    backgroundColor: '#fef2f2',
  },
  stockText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  lowStockText: {
    color: '#ef4444',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 15,
  },
});

export default CatalogScreen;
