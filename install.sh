#!/bin/bash

# 🚀 Enhanced GST Invoice System - Quick Installation Script
# This script will set up the entire system in minutes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Banner
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🏢 Enhanced GST Invoice System                  ║"
echo "║              Enterprise-Level Quick Setup                    ║"
echo "║              Zoho Books Alternative - Free Forever          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# System requirements check
print_status "Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    print_status "Install from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) ✓"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_success "npm $(npm -v) ✓"

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    print_warning "MongoDB doesn't seem to be running"
    print_status "Please ensure MongoDB is installed and running"
    print_status "Ubuntu/Debian: sudo systemctl start mongod"
    print_status "macOS: brew services start mongodb-community"
    print_status "Or install MongoDB from: https://www.mongodb.com/try/download/community"
    
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REVERT =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_success "MongoDB is running ✓"
fi

# Check available disk space (minimum 2GB)
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 2000000 ]; then
    print_warning "Less than 2GB disk space available"
fi

print_success "System requirements check completed!"

# Project setup
print_status "Setting up Enhanced GST Invoice System..."

# Get project directory
CURRENT_DIR=$(pwd)
PROJECT_NAME="gst-invoice-system"

# Check if we're already in the project directory
if [ -f "package.json" ] && grep -q "gst-invoice-system" package.json; then
    print_status "Already in project directory"
    PROJECT_DIR="$CURRENT_DIR"
else
    PROJECT_DIR="$CURRENT_DIR/$PROJECT_NAME"
    
    # Check if directory exists
    if [ -d "$PROJECT_DIR" ]; then
        print_warning "Directory $PROJECT_DIR already exists"
        read -p "Do you want to continue and overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Installation cancelled"
            exit 1
        fi
        rm -rf "$PROJECT_DIR"
    fi
    
    # Clone repository (update with actual repo URL)
    print_status "Cloning repository..."
    if git clone https://github.com/your-username/gst-invoice-system.git "$PROJECT_DIR" 2>/dev/null; then
        print_success "Repository cloned successfully"
    else
        print_warning "Git clone failed, using current directory"
        PROJECT_DIR="$CURRENT_DIR"
    fi
fi

cd "$PROJECT_DIR"

# Install frontend dependencies
print_status "Installing frontend dependencies..."
if npm install; then
    print_success "Frontend dependencies installed ✓"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
if npm install; then
    print_success "Backend dependencies installed ✓"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi

cd ..

# Environment configuration
print_status "Setting up environment configuration..."

# Create backend .env file
cat > backend/.env << EOF
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gst_invoice_system
JWT_SECRET=$(openssl rand -base64 64)
UPI_ID=your-upi-id@paytm
COMPANY_NAME=Your Company Name
COMPANY_ADDRESS=Your Company Address, City, State - PIN
COMPANY_PHONE=+91-XXXXXXXXXX
COMPANY_EMAIL=contact@yourcompany.com
COMPANY_GSTIN=22AAAAA0000A1Z5
WHATSAPP_NUMBER=+919876543210
EOF

print_success "Backend environment configured ✓"

# Create frontend .env file
cat > .env << EOF
VITE_API_BASE_URL=http://localhost:5000/api
VITE_COMPANY_NAME=Your Company Name
VITE_APP_VERSION=2.0.0
EOF

print_success "Frontend environment configured ✓"

# Database setup
print_status "Setting up database..."

# Create database initialization script
cat > setup-database.js << EOF
const { MongoClient } = require('mongodb');

async function setupDatabase() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('gst_invoice_system');
    
    // Create collections
    await db.createCollection('users');
    await db.createCollection('customers');
    await db.createCollection('items');
    await db.createCollection('invoices');
    await db.createCollection('purchases');
    await db.createCollection('suppliers');
    
    // Create indexes for better performance
    await db.collection('invoices').createIndex({ "invoiceNumber": 1 }, { unique: true });
    await db.collection('invoices').createIndex({ "customerId": 1, "createdAt": -1 });
    await db.collection('invoices').createIndex({ "status": 1, "dueDate": 1 });
    await db.collection('customers').createIndex({ "email": 1 }, { unique: true });
    await db.collection('customers').createIndex({ "phone": 1 });
    
    // Create default admin user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await db.collection('users').insertOne({
      name: 'Administrator',
      email: 'admin@company.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date()
    });
    
    console.log('Database setup completed successfully!');
    console.log('Default admin credentials:');
    console.log('Email: admin@company.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    await client.close();
  }
}

setupDatabase();
EOF

# Run database setup
cd backend
if node ../setup-database.js; then
    print_success "Database setup completed ✓"
else
    print_warning "Database setup failed, but continuing..."
fi

cd ..

# Clean up setup script
rm -f setup-database.js

# Build frontend
print_status "Building frontend for production..."
if npm run build; then
    print_success "Frontend build completed ✓"
else
    print_error "Frontend build failed"
    exit 1
fi

# Create startup scripts
print_status "Creating startup scripts..."

# Development startup script
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Enhanced GST Invoice System in Development Mode..."

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
cd ..
npm run dev &
FRONTEND_PID=$!

echo "✅ System started successfully!"
echo "📊 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:5000"
echo "📚 Admin Panel: http://localhost:5173/admin"
echo ""
echo "Default admin credentials:"
echo "Email: admin@company.com"
echo "Password: admin123"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user to stop
wait
EOF

# Production startup script
cat > start-prod.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Enhanced GST Invoice System in Production Mode..."

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start backend with PM2
cd backend
pm2 start ecosystem.config.js

echo "✅ System started successfully!"
echo "🌐 Application: http://localhost:5000"
echo "📊 PM2 Status: pm2 status"
echo "📝 Logs: pm2 logs"
echo ""
echo "Default admin credentials:"
echo "Email: admin@company.com"
echo "Password: admin123"
EOF

# Create PM2 ecosystem config
cat > backend/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'gst-invoice-enhanced',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p backend/logs

# Make scripts executable
chmod +x start-dev.sh start-prod.sh

print_success "Startup scripts created ✓"

# Create update script
cat > update-system.sh << 'EOF'
#!/bin/bash
echo "🔄 Updating Enhanced GST Invoice System..."

# Pull latest changes
git pull origin main

# Update dependencies
npm install
cd backend && npm install && cd ..

# Rebuild frontend
npm run build

echo "✅ System updated successfully!"
echo "🔄 Restart the system to apply changes"
EOF

chmod +x update-system.sh

# Final verification
print_status "Running final verification..."

# Check if all required files exist
REQUIRED_FILES=(
    "package.json"
    "backend/package.json"
    "backend/.env"
    ".env"
    "start-dev.sh"
    "start-prod.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file ✓"
    else
        print_error "$file missing ✗"
        exit 1
    fi
done

# Installation completed
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                   🎉 INSTALLATION COMPLETED! 🎉             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo -e "${GREEN}1. Configure your settings:${NC}"
echo "   Edit backend/.env with your company details"
echo "   Edit .env with your configuration"
echo ""
echo -e "${GREEN}2. Start the system:${NC}"
echo -e "   ${YELLOW}Development:${NC} ./start-dev.sh"
echo -e "   ${YELLOW}Production:${NC}  ./start-prod.sh"
echo ""
echo -e "${GREEN}3. Access the application:${NC}"
echo -e "   ${YELLOW}Frontend:${NC}    http://localhost:5173 (dev) or http://localhost:5000 (prod)"
echo -e "   ${YELLOW}Backend API:${NC} http://localhost:5000/api"
echo ""
echo -e "${GREEN}4. Default admin credentials:${NC}"
echo -e "   ${YELLOW}Email:${NC}    admin@company.com"
echo -e "   ${YELLOW}Password:${NC} admin123"
echo -e "   ${RED}⚠️  Change these immediately!${NC}"
echo ""
echo -e "${GREEN}5. Documentation:${NC}"
echo "   📖 README-ADVANCED.md    - Complete feature guide"
echo "   🚀 PRODUCTION_DEPLOYMENT.md - Production setup"
echo "   📊 FEATURE_COMPARISON.md - Feature comparison"
echo ""
echo -e "${GREEN}6. Support:${NC}"
echo "   📧 Create GitHub issues for support"
echo "   📚 Check documentation for detailed guides"
echo ""
echo -e "${BLUE}🎯 Your Enhanced GST Invoice System is ready!${NC}"
echo -e "${BLUE}   Rivaling Zoho Books with enterprise features${NC}"
echo -e "${BLUE}   All for free! 🎉${NC}"
echo ""

# Optional: Start development server automatically
read -p "Do you want to start the development server now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Starting development server..."
    ./start-dev.sh
fi
