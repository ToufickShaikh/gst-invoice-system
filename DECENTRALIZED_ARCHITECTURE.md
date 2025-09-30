# Decentralized Architecture Guide

## Overview
The codebase has been restructured into a feature-based architecture to enable better team collaboration and maintainability.

## Directory Structure

```
src/
├── features/                    # Feature-based modules
│   ├── invoices/               # Invoice management feature
│   │   ├── components/         # Invoice-specific components
│   │   │   ├── InvoiceSummaryCards.jsx
│   │   │   ├── InvoiceFilters.jsx
│   │   │   └── InvoiceTable.jsx
│   │   ├── hooks/              # Invoice-specific hooks
│   │   │   └── useInvoices.js
│   │   └── index.js            # Feature exports
│   ├── pos/                    # POS feature
│   │   ├── components/
│   │   │   ├── POSItemList.jsx
│   │   │   └── POSBillingSummary.jsx
│   │   ├── hooks/
│   │   │   └── usePOSCalculations.js
│   │   └── index.js
│   └── shared/                 # Shared components
│       ├── components/
│       │   ├── LoadingSpinner.jsx
│       │   ├── EmptyState.jsx
│       │   └── ErrorState.jsx
│       └── index.js
├── components/                 # Legacy components (being migrated)
├── pages/                      # Page components
└── api/                        # API services
```

## Benefits

### 1. **Team Isolation**
- Different teams can work on different features without conflicts
- Clear ownership boundaries
- Reduced merge conflicts

### 2. **Maintainability**
- Easy to locate feature-specific code
- Clear separation of concerns
- Easier debugging and testing

### 3. **Reusability**
- Components can be easily shared between features
- Consistent patterns across features
- Shared utilities in the `shared` folder

### 4. **Scalability**
- Easy to add new features
- Simple to remove unused features
- Clear dependency management

## Working with Features

### Adding a New Feature
1. Create a new directory under `src/features/`
2. Add `components/`, `hooks/`, `utils/` subdirectories as needed
3. Create an `index.js` file to export the feature's public API
4. Import and use in your pages/components

### Example: Adding a Customer Feature
```bash
mkdir -p src/features/customers/{components,hooks,utils}
```

```javascript
// src/features/customers/components/CustomerList.jsx
import React from 'react';

const CustomerList = ({ customers }) => {
  return (
    <div>
      {/* Customer list implementation */}
    </div>
  );
};

export default CustomerList;
```

```javascript
// src/features/customers/index.js
export { default as CustomerList } from './components/CustomerList';
export { useCustomers } from './hooks/useCustomers';
```

### Using Features in Pages
```javascript
// src/pages/Customers.jsx
import { CustomerList, useCustomers } from '../features/customers';

const CustomersPage = () => {
  const { customers, loading } = useCustomers();
  
  return (
    <div>
      <CustomerList customers={customers} />
    </div>
  );
};
```

## Migration Strategy

### Phase 1: ✅ Completed
- Created feature directory structure
- Migrated Invoice Management components
- Migrated POS components
- Created shared components

### Phase 2: Next Steps
- Migrate remaining large components (Billing, Customers, Items)
- Create feature-specific hooks for data management
- Add feature-specific utilities

### Phase 3: Future
- Add feature-specific tests
- Implement feature flags
- Add feature-specific documentation

## Best Practices

### 1. **Component Naming**
- Use descriptive names that include the feature prefix
- Example: `InvoiceTable`, `POSItemList`, `CustomerForm`

### 2. **Hook Naming**
- Use the `use` prefix followed by the feature name
- Example: `useInvoices`, `useCustomers`, `usePOSCalculations`

### 3. **Import/Export**
- Always use the feature's index.js for imports
- Keep internal components private unless needed elsewhere

### 4. **Dependencies**
- Features should not directly depend on other features
- Use shared utilities for common functionality
- Pass data through props or context

### 5. **File Organization**
```
feature/
├── components/     # UI components
├── hooks/         # Custom hooks
├── utils/         # Feature-specific utilities
├── services/      # API calls (if feature-specific)
└── index.js       # Public API exports
```

## Team Workflow

### 1. **Feature Ownership**
- Assign teams to specific features
- Each team maintains their feature directory
- Cross-feature changes require coordination

### 2. **Shared Components**
- Changes to shared components require team approval
- Document breaking changes
- Use semantic versioning for major changes

### 3. **Code Reviews**
- Feature-specific changes reviewed by feature team
- Shared component changes reviewed by all teams
- Architecture changes require lead approval

## Migration Checklist

- [x] Invoice Management → `features/invoices/`
- [x] POS → `features/pos/`
- [x] Shared Components → `features/shared/`
- [ ] Billing → `features/billing/`
- [ ] Customer Management → `features/customers/`
- [ ] Item Management → `features/items/`
- [ ] Dashboard → `features/dashboard/`
- [ ] Reports → `features/reports/`

## Getting Started

1. **For New Features**: Start in the `features/` directory
2. **For Existing Code**: Gradually migrate components to features
3. **For Shared Code**: Use the `features/shared/` directory
4. **For Legacy Code**: Keep in existing locations until migrated

This architecture enables multiple developers to work simultaneously without stepping on each other's toes while maintaining code quality and consistency.