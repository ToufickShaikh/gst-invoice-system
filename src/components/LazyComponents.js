import { lazy } from 'react';

/**
 * Lazy-loaded components for better code splitting and performance
 */

// Dashboard Components
export const Dashboard = lazy(() => import('../pages/Dashboard'));
export const AdvancedDashboard = lazy(() => import('../pages/AdvancedDashboard'));
export const Analytics = lazy(() => import('../pages/Analytics'));

// Invoice Management
export const InvoiceManagement = lazy(() => import('../components/InvoiceManagement'));
export const InvoiceDetails = lazy(() => import('../pages/InvoiceDetails'));
export const CreateInvoice = lazy(() => import('../pages/CreateInvoice'));
export const EditInvoice = lazy(() => import('../pages/EditInvoice'));

// Customer Management
export const Customers = lazy(() => import('../pages/Customers'));
export const CustomerDetails = lazy(() => import('../pages/CustomerDetails'));
export const CustomerAnalytics = lazy(() => import('../pages/CustomerAnalytics'));

// Item Management
export const Items = lazy(() => import('../pages/Items'));
export const ItemDetails = lazy(() => import('../pages/ItemDetails'));
export const Inventory = lazy(() => import('../pages/Inventory'));

// Billing
export const Billing = lazy(() => import('../pages/Billing'));
export const PosQuickBilling = lazy(() => import('../pages/PosQuickBilling'));

// Reports
export const Reports = lazy(() => import('../pages/Reports'));
export const GSTReports = lazy(() => import('../pages/GSTReports'));
export const SalesReports = lazy(() => import('../pages/SalesReports'));

// Settings
export const Settings = lazy(() => import('../pages/Settings'));
export const CompanySettings = lazy(() => import('../pages/CompanySettings'));
export const UserManagement = lazy(() => import('../pages/UserManagement'));

// Purchases
export const Purchases = lazy(() => import('../pages/Purchases'));
export const Suppliers = lazy(() => import('../pages/Suppliers'));

// Quotes and Sales Orders
export const Quotes = lazy(() => import('../pages/Quotes'));
export const SalesOrders = lazy(() => import('../pages/SalesOrders'));

// Portal
export const PortalInvoice = lazy(() => import('../pages/PortalInvoice'));
export const PortalCustomer = lazy(() => import('../pages/PortalCustomer'));

/**
 * Component loading wrapper with error boundary
 */
export const LazyWrapper = ({ children, fallback }) => (
  <Suspense fallback={fallback || <LoadingSpinner />}>
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  </Suspense>
);

// Loading components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Error boundary for lazy loaded components
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6">
          <div className="text-red-500 mb-2">⚠️ Failed to load component</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
