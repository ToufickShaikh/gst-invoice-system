# GST Invoice System 🧾

A modern, full-stack GST-compliant invoice management system with WhatsApp integration for seamless customer communication and PDF sharing.

## ✨ Key Features

- **🏢 Complete Invoice Management** - Create, edit, and manage GST-compliant invoices
- **👥 Customer Management** - B2B and B2C customer profiles with detailed records
- **📦 Item Inventory** - Product/service catalog with tax configurations
- **💰 Payment Tracking** - Multiple payment methods with balance tracking
- **📱 WhatsApp Integration** - Send invoices directly via WhatsApp with PDF download
- **🔍 Advanced Search & Filtering** - Smart invoice and customer search
- **📊 Dashboard Analytics** - Real-time business insights and statistics
- **🎯 UPI QR Code Generation** - Instant payment collection
- **📱 Responsive Design** - Works perfectly on all devices
- **🔒 Secure PDF Generation** - On-demand PDF creation with auto-deletion

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

