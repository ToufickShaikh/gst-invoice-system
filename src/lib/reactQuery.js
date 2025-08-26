import { QueryClient, QueryCache } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { getAppBasePath } from '../utils/appBase';

/**
 * Advanced React Query Configuration
 * Provides intelligent caching, background refetching, and error handling
 */

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Global error handling
  if (error?.response?.status === 401) {
  // Authentication removed: clear legacy keys
  localStorage.removeItem('auth-token');
    const base = getAppBasePath() || '/';
    window.location.href = `${base}/login`;
    return;
  }
      
      // Show error toast for user-facing errors
      const message = error?.response?.data?.message || error?.message || 'Something went wrong';
      toast.error(message);
      
      console.error('Query Error:', error, 'Query:', query);
    }
  }),
  
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for 5xx errors
        return failureCount < 2;
      },
      
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background refetching
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: false,
      
      // Suspense support
      suspense: false,
      
      // Error boundaries
      useErrorBoundary: (error) => error?.response?.status >= 500
    },
    
    mutations: {
      retry: 1,
      onError: (error) => {
        const message = error?.response?.data?.message || error?.message || 'Operation failed';
        toast.error(message);
      },
      onSuccess: (data, variables, context) => {
        // Show success message if provided
        if (context?.successMessage) {
          toast.success(context.successMessage);
        }
      }
    }
  }
});

// Query Keys Factory for better organization
export const queryKeys = {
  // Invoices
  invoices: {
    all: ['invoices'],
    lists: () => [...queryKeys.invoices.all, 'list'],
    list: (filters) => [...queryKeys.invoices.lists(), filters],
    details: () => [...queryKeys.invoices.all, 'detail'],
    detail: (id) => [...queryKeys.invoices.details(), id],
    stats: () => [...queryKeys.invoices.all, 'stats']
  },
  
  // Customers
  customers: {
    all: ['customers'],
    lists: () => [...queryKeys.customers.all, 'list'],
    list: (filters) => [...queryKeys.customers.lists(), filters],
    details: () => [...queryKeys.customers.all, 'detail'],
    detail: (id) => [...queryKeys.customers.details(), id]
  },
  
  // Items
  items: {
    all: ['items'],
    lists: () => [...queryKeys.items.all, 'list'],
    list: (filters) => [...queryKeys.items.lists(), filters],
    details: () => [...queryKeys.items.all, 'detail'],
    detail: (id) => [...queryKeys.items.details(), id]
  },
  
  // Dashboard
  dashboard: {
    all: ['dashboard'],
    stats: (dateRange) => [...queryKeys.dashboard.all, 'stats', dateRange],
    analytics: (filters) => [...queryKeys.dashboard.all, 'analytics', filters]
  }
};

// Prefetch helpers
export const prefetchHelpers = {
  // Prefetch related data when viewing an invoice
  prefetchInvoiceRelated: async (invoiceId) => {
    const invoice = queryClient.getQueryData(queryKeys.invoices.detail(invoiceId));
    if (!invoice) return;
    
    // Prefetch customer details
    if (invoice.customer) {
      queryClient.prefetchQuery({
        queryKey: queryKeys.customers.detail(invoice.customer._id || invoice.customer),
        staleTime: 10 * 60 * 1000 // 10 minutes
      });
    }
    
    // Prefetch item details
    if (invoice.items?.length > 0) {
      invoice.items.forEach(item => {
        if (item.item) {
          queryClient.prefetchQuery({
            queryKey: queryKeys.items.detail(item.item._id || item.item),
            staleTime: 10 * 60 * 1000
          });
        }
      });
    }
  },
  
  // Prefetch next page of results
  prefetchNextPage: (queryKey, currentPage, hasNextPage) => {
    if (hasNextPage && currentPage) {
      queryClient.prefetchQuery({
        queryKey: [...queryKey, { page: currentPage + 1 }],
        staleTime: 2 * 60 * 1000 // 2 minutes
      });
    }
  }
};

// Cache invalidation helpers
export const invalidateHelpers = {
  // Invalidate all invoice-related queries
  invalidateInvoices: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },
  
  // Invalidate all customer-related queries  
  invalidateCustomers: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },
  
  // Invalidate all item-related queries
  invalidateItems: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
  }
};
