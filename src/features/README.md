# Feature-Based Architecture

This directory contains decentralized features, each with their own components, hooks, and utilities.

## Structure
```
features/
├── invoices/
│   ├── components/     # Invoice-specific components
│   ├── hooks/         # Invoice-specific hooks
│   ├── services/      # Invoice API services
│   └── utils/         # Invoice utilities
├── pos/
│   ├── components/    # POS-specific components
│   ├── hooks/         # POS hooks
│   └── utils/         # POS utilities
├── billing/
├── customers/
├── items/
└── shared/           # Shared utilities across features
```

## Benefits
- **Isolation**: Each feature is self-contained
- **Team Collaboration**: Different teams can work on different features
- **Maintainability**: Easier to locate and modify feature-specific code
- **Reusability**: Components can be easily shared between features