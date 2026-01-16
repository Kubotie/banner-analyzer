/**
 * Productストア（Zustand）
 */

import { create } from 'zustand';
import { Product } from '@/types/product';
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getActiveProduct, setActiveProduct } from '@/lib/product-db';

interface ProductStore {
  products: Product[];
  activeProduct: Product | null;
  
  // Actions
  loadProducts: () => void;
  loadActiveProduct: () => void;
  addProduct: (product: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (productId: string, updates: Partial<Omit<Product, 'productId' | 'createdAt'>>) => Product;
  removeProduct: (productId: string) => void;
  setActiveProduct: (productId: string | null) => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  activeProduct: null,

  loadProducts: () => {
    const products = getProducts();
    set({ products });
  },

  loadActiveProduct: () => {
    const activeProduct = getActiveProduct();
    set({ activeProduct });
  },

  addProduct: (productData) => {
    const newProduct = createProduct(productData);
    const products = getProducts();
    set({ products });
    return newProduct;
  },

  updateProduct: (productId, updates) => {
    const updated = updateProduct(productId, updates);
    const products = getProducts();
    set({ products });
    // activeProductも更新されている可能性があるので再読み込み
    if (get().activeProduct?.productId === productId) {
      const activeProduct = getActiveProduct();
      set({ activeProduct });
    }
    return updated;
  },

  removeProduct: (productId) => {
    deleteProduct(productId);
    const products = getProducts();
    // activeProductが削除された場合はクリア
    if (get().activeProduct?.productId === productId) {
      setActiveProduct(null);
      set({ activeProduct: null });
    }
    set({ products });
  },

  setActiveProduct: (productId) => {
    setActiveProduct(productId);
    const activeProduct = productId ? getProduct(productId) : null;
    set({ activeProduct });
  },
}));

// 初期化時にデータを読み込む
if (typeof window !== 'undefined') {
  useProductStore.getState().loadProducts();
  useProductStore.getState().loadActiveProduct();
}
