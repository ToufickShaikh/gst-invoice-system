# 🏢 Advanced GST Invoice Management System

> **Enterprise-Level Invoice Management - Zoho Books Alternative**

A comprehensive, feature-rich GST-compliant invoice management system with advanced business analytics, built with React and Node.js. This system rivals commercial solutions like Zoho Books and QuickBooks with its extensive enterprise features.

## ✨ **Advanced Features**

### � **Invoice Management**
- **Smart Filtering & Search**: Advanced filters by status, date range, amount, customer type
- **Bulk Operations**: Mass actions for delete, reprint, send reminders
- **Multi-View Support**: Table, Grid, and List view modes
- **Real-time Analytics**: Revenue, collection rates, overdue tracking
- **Automated Calculations**: Tax calculations, totals, balances
- **Payment Tracking**: Partial payments, overdue alerts, collection rates

### 📊 **Business Analytics & Insights**
- **Revenue Analytics**: Period-wise revenue analysis with trends
- **Customer Insights**: Top customers, geographic distribution, type breakdown
- **Payment Analytics**: Collection rates, overdue amounts, payment methods
- **Interactive Dashboard**: Real-time KPIs and business metrics
- **Visual Reports**: Charts and graphs for better insights
- **Export Capabilities**: Excel, PDF, CSV exports with customizable data

### 👥 **Advanced Customer Management**
- **Customer Analytics**: Revenue per customer, payment patterns
- **Segmentation**: B2B/B2C classification with detailed insights
- **Geographic Tracking**: State-wise customer distribution
- **Activity Monitoring**: Last invoice date, average order value
- **Payment History**: Complete payment tracking per customer

### 🔧 **Professional Features**
- **Settings Management**: Comprehensive configuration options
- **Template Customization**: Multiple invoice templates
- **WhatsApp Integration**: Direct invoice sharing and payment reminders
- **UPI QR Codes**: Instant payment collection
- **Audit Trail**: Complete activity logging
- **Data Export**: Multiple format support with custom filters

### 📱 **Enhanced User Experience**
- **Responsive Design**: Perfect on all devices
- **Smart Search**: Intelligent search across all fields
- **Keyboard Shortcuts**: Power user features
- **Auto-refresh**: Real-time data updates
- **Toast Notifications**: Real-time feedback
- **Loading States**: Professional loading indicators

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and functional components
- **Vite** - Lightning-fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for rapid styling
- **React Router** - Client-side routing and navigation
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Beautiful toast notifications
- **React Context API** - Global state management for authentication

### Backend
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** - Fast, unopinionated web framework
- **MongoDB** - NoSQL database for flexible data storage
- **Mongoose** - MongoDB object modeling for Node.js
- **JWT** - JSON Web Tokens for secure authentication
- **bcrypt** - Password hashing for security
- **UUID** - Unique identifier generation
- **CORS** - Cross-origin resource sharing middleware

### PDF Generation
- **jsPDF** - Client-side PDF generation
- **html2canvas** - HTML to canvas conversion
- **Custom PDF Templates** - Professional invoice layouts

### WhatsApp Integration
- **WhatsApp URL Scheme** - Direct integration using wa.me links
- **Custom Message Templates** - Professional invoice summaries
- **Public PDF Endpoints** - Secure, authentication-free PDF access
- **Auto-deletion Security** - Temporary files with 1-minute expiry

### Development Tools
- **ESLint** - Code linting and quality enforcement
- **PostCSS** - CSS post-processing with autoprefixer
- **Nodemon** - Auto-restart development server
- **Concurrently** - Run multiple commands simultaneously



## 🏗️ Project Structure

```
gst-invoice-system/
├── backend/                 # Node.js/Express backend
│   ├── controllers/        # Business logic controllers
│   ├── models/            # MongoDB/Mongoose models
│   ├── routes/            # API route definitions
│   ├── utils/             # Utility functions (PDF, UPI, Tax)
│   ├── middleware/        # Authentication middleware
│   └── config/            # Database configuration
├── src/                    # React frontend
│   ├── components/        # Reusable UI components
│   ├── pages/             # Route components
│   ├── context/           # React Context providers
│   ├── api/               # API service functions
│   └── utils/             # Frontend utilities
├── public/                # Static assets
└── dist/                  # Production build output
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB database
- Modern web browser

