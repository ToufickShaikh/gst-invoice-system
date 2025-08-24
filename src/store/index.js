import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Advanced Global State Management with Zustand
 * Better performance than Context API for complex states
 */

// App Settings Store
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Theme and UI preferences
      theme: 'light',
      sidebarCollapsed: false,
      compactMode: false,
      animations: true,
      
      // User preferences
      userPreferences: {
        itemsPerPage: 25,
        defaultCurrency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'indian',
        autoSave: true,
        keyboardShortcuts: true
      },

      // Performance settings
      performance: {
        enableVirtualization: true,
        cacheSize: 100,
        prefetchPages: 2,
        debounceDelay: 300
      },

      // Actions
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      updatePreferences: (prefs) => set({ 
        userPreferences: { ...get().userPreferences, ...prefs }
      }),
      updatePerformance: (perf) => set({
        performance: { ...get().performance, ...perf }
      })
    }),
    {
      name: 'app-settings',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        compactMode: state.compactMode,
        userPreferences: state.userPreferences,
        performance: state.performance
      })
    }
  )
);

// Data Cache Store for better performance
export const useDataStore = create((set, get) => ({
  // Cached data
  invoices: new Map(),
  customers: new Map(),
  items: new Map(),
  
  // Cache metadata
  cacheTimestamps: new Map(),
  cacheTTL: 5 * 60 * 1000, // 5 minutes

  // Cache operations
  setInvoices: (invoices) => {
    const invoiceMap = new Map();
    invoices.forEach(invoice => invoiceMap.set(invoice._id, invoice));
    set({ 
      invoices: invoiceMap,
      cacheTimestamps: get().cacheTimestamps.set('invoices', Date.now())
    });
  },

  setCustomers: (customers) => {
    const customerMap = new Map();
    customers.forEach(customer => customerMap.set(customer._id, customer));
    set({ 
      customers: customerMap,
      cacheTimestamps: get().cacheTimestamps.set('customers', Date.now())
    });
  },

  setItems: (items) => {
    const itemMap = new Map();
    items.forEach(item => itemMap.set(item._id, item));
    set({ 
      items: itemMap,
      cacheTimestamps: get().cacheTimestamps.set('items', Date.now())
    });
  },

  // Cache validation
  isCacheValid: (key) => {
    const timestamp = get().cacheTimestamps.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < get().cacheTTL;
  },

  // Clear cache
  clearCache: () => set({
    invoices: new Map(),
    customers: new Map(), 
    items: new Map(),
    cacheTimestamps: new Map()
  })
}));

// Loading and Error States
export const useLoadingStore = create((set) => ({
  loading: new Set(),
  errors: new Map(),

  setLoading: (key, isLoading) => set((state) => {
    const newLoading = new Set(state.loading);
    if (isLoading) {
      newLoading.add(key);
    } else {
      newLoading.delete(key);
    }
    return { loading: newLoading };
  }),

  setError: (key, error) => set((state) => ({
    errors: new Map(state.errors).set(key, error)
  })),

  clearError: (key) => set((state) => {
    const newErrors = new Map(state.errors);
    newErrors.delete(key);
    return { errors: newErrors };
  }),

  isLoading: (key) => get().loading.has(key),
  getError: (key) => get().errors.get(key)
}));
