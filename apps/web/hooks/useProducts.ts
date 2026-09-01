'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Product, Category, Paginated } from '@simplepos/shared';
import { apiClient } from '@/lib/api-client';

interface UseProductsState {
  products: Product[];
  categories: Category[];
  total: number;
  loading: boolean;
  error: string | null;
}

interface UseProductsOptions {
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch products (and categories once) from the backend, reacting to filter
 * changes. Returns a `refetch` for mutations elsewhere.
 */
export function useProducts(opts: UseProductsOptions = {}) {
  const { categoryId, search, page = 1, limit = 50 } = opts;
  const [state, setState] = useState<UseProductsState>({
    products: [],
    categories: [],
    total: 0,
    loading: true,
    error: null,
  });

  const fetchProducts = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiClient<Paginated<Product>>('/api/products', {
        query: { category_id: categoryId, search, page, limit },
      });
      setState((s) => ({ ...s, products: data.data, total: data.total, loading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load products',
      }));
    }
  }, [categoryId, search, page, limit]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiClient<{ data: Category[] }>('/api/categories');
      setState((s) => ({ ...s, categories: data.data }));
    } catch {
      /* categories are optional for the grid */
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  return { ...state, refetch: fetchProducts, refetchCategories: fetchCategories };
}
