import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PaginationOptions {
  table: string;
  searchFields?: string[];
  limit?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, any>;
}

export function useSupabasePagination<T = any>(options: PaginationOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const limit = options.limit || 20;
  
  // Create stable stringified versions of options to avoid unnecessary re-renders
  const searchFieldsStr = JSON.stringify(options.searchFields || []);
  const orderByStr = JSON.stringify(options.orderBy || {});
  const filtersStr = JSON.stringify(options.filters || {});

  const fetchData = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let query = supabase.from(options.table).select('*', { count: 'exact' });

      // Apply search query
      const parsedSearchFields = JSON.parse(searchFieldsStr);
      if (searchQuery && parsedSearchFields.length > 0) {
        const searchConditions = parsedSearchFields
          .map((field: string) => `${field}.ilike.%${searchQuery}%`)
          .join(',');
        query = query.or(searchConditions);
      }

      // Apply custom filters
      const parsedFilters = JSON.parse(filtersStr);
      if (parsedFilters) {
        Object.entries(parsedFilters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      const parsedOrderBy = JSON.parse(orderByStr);
      if (parsedOrderBy && parsedOrderBy.column) {
        query = query.order(parsedOrderBy.column, { ascending: parsedOrderBy.ascending || false });
      } else {
        query = query.order('created_at', { ascending: false }); // Default fallback
      }

      // Apply pagination
      const currentPage = isLoadMore ? page : 0;
      const from = currentPage * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data: resultData, count, error } = await query;

      if (error) throw error;

      if (isLoadMore) {
        setData(prev => {
          // Prevent duplicates by checking IDs if they exist
          const existingIds = new Set(prev.map((item: any) => item.id));
          const newItems = (resultData as T[] || []).filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      } else {
        setData((resultData as T[]) || []);
      }
      
      setTotalCount(count || 0);
      setHasMore((count || 0) > from + limit);
      
      if (!isLoadMore) {
        setPage(0);
      }
    } catch (error) {
      console.error(`Error fetching paginated data for ${options.table}:`, error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [options.table, searchFieldsStr, orderByStr, filtersStr, limit, searchQuery, page]);

  // Reset and fetch when search query changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(0);
      fetchData(false);
    }, 300); // 300ms debounce for typing

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, searchFieldsStr, filtersStr]); // Depend on filters in case they change

  // Function to manually fetch next page
  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  // Effect to load more when page state changes
  useEffect(() => {
    if (page > 0) {
      fetchData(true);
    }
  }, [page]);

  return {
    data,
    loading,
    loadingMore,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    totalCount,
    refetch: () => fetchData(false) // Function to manually refresh data (e.g. after add/edit/delete)
  };
}
