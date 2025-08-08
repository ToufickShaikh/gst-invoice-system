#!/bin/bash

# Node.js Upgrade and Deployment Script for Shaikh Carpets And Mats
# Run this script on the VPS to upgrade Node.js and deploy the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

echo "🚀 Node.js Upgrade and Deployment for Shaikh Carpets And Mats"
echo "================================================"

# Check current Node.js version
current_node_version=$(node --version 2>/dev/null || echo "Not installed")
print_info "Current Node.js version: $current_node_version"

# Check if we need to upgrade Node.js
if [[ "$current_node_version" =~ ^v1[8-9]|^v[2-9][0-9] ]]; then
    print_status "Node.js version is compatible (18+)"
else
    print_warning "Node.js version is too old. Upgrading to Node.js 18 LTS..."
    
    # Remove old Node.js
    print_info "Removing old Node.js installation..."
    sudo apt-get remove -y nodejs npm 2>/dev/null || true
    
    # Install Node.js 18 LTS
    print_info "Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    print_status "Node.js upgraded to: $node_version"
    print_status "npm version: $npm_version"
fi

# Install global dependencies
print_info "Installing global dependencies..."
sudo npm install -g pm2

# Check if MongoDB is running
if systemctl is-active --quiet mongod; then
    print_status "MongoDB is running"
else
    print_warning "MongoDB is not running. Starting MongoDB..."
    sudo systemctl start mongod
    sudo systemctl enable mongod
    print_status "MongoDB started and enabled"
fi

# Navigate to project directory
cd /home/hokage/Shaikh_Carpets/gst-invoice-system || {
    print_error "Project directory not found at /home/hokage/Shaikh_Carpets/gst-invoice-system"
    echo "Please ensure the project is uploaded to the correct location."
    exit 1
}

print_status "Found project directory"

# Create logs directory
mkdir -p logs backend/logs
print_status "Created logs directory"

# Create .env file for backend with local MongoDB
print_info "Creating backend .env configuration..."
cat > backend/.env << 'EOF'
# Local MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/shaikh-carpets-gst

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Secret (Generate a strong secret)
JWT_SECRET=shaikh_carpets_jwt_secret_2024_secure_token_replace_in_production

# UPI ID for QR Code Generation
UPI_ID=9840844026@paytm

# Company Details (Already configured in pdfGenerator.js)
COMPANY_NAME=Shaikh Carpets And Mats
COMPANY_GSTIN=33BVRPS2849Q2ZG
COMPANY_PHONE=9840844026/8939487096
COMPANY_EMAIL=shaikhcarpetsandmats@gmail.com
COMPANY_ADDRESS=11 Trevelyan Basin Street,Sowcarpet,Chennai-600079

# Bank Details
BANK_NAME=INDIAN OVERSEAS BANK, B RDWAY
BANK_ACCOUNT=130702000003731
BANK_IFSC=IOBA0001307
BANK_HOLDER=Shaikh Carpets And Mats

# Security Settings
CORS_ORIGIN=*

# File Upload Limits
MAX_FILE_SIZE=10mb
EOF

print_status "Backend .env file created"

# Create .env file for frontend
print_info "Creating frontend .env configuration..."
cat > .env << 'EOF'
VITE_API_BASE_URL=http://185.52.53.253:3001/api
EOF

print_status "Frontend .env file created"

# Install backend dependencies
print_info "Installing backend dependencies..."
cd backend
npm cache clean --force
npm install --production

# Go back to root directory
cd ..

# Install frontend dependencies
print_info "Installing frontend dependencies..."
npm cache clean --force
npm install

# Build frontend
print_info "Building frontend..."
npm run build

# Create PM2 ecosystem file
print_info "Creating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'shaikh-carpets-backend',
      script: './backend/server.js',
      cwd: '/home/hokage/Shaikh_Carpets/gst-invoice-system',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

print_status "PM2 configuration created"

# Stop any existing PM2 processes
pm2 delete shaikh-carpets-backend 2>/dev/null || true

# Initialize MongoDB database
print_info "Initializing MongoDB database..."
mongosh --eval "
use('shaikh-carpets-gst');
db.createCollection('users');
db.createCollection('customers');
db.createCollection('items');
db.createCollection('invoices');
print('Database initialized successfully');
" 2>/dev/null || print_warning "MongoDB shell not available, database will be created automatically"

# Start the application with PM2
print_info "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
print_info "Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u hokage --hp /home/hokage

# Test backend health
print_info "Testing backend health..."
sleep 5
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_status "Backend is responding"
else
    print_warning "Backend health check failed, check logs with: pm2 logs"
fi

print_status "Deployment completed successfully!"
echo ""
echo "================================================"
echo "🎉 Shaikh Carpets And Mats GST Invoice System is now running!"
echo "================================================"
echo ""
echo "📋 System Information:"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo "   MongoDB: Local instance at localhost:27017"
echo "   Database: shaikh-carpets-gst"
echo ""
echo "📊 Check application status:"
echo "   pm2 status"
echo "   pm2 logs shaikh-carpets-backend"
echo "   pm2 monit"
echo ""
echo "🌐 Access your application:"
echo "   Backend API: http://185.52.53.253:3001/api/health"
echo "   Frontend: Serve dist/ folder with Nginx"
echo ""
echo "📖 Next Steps:"
echo "1. Set up Nginx reverse proxy to serve frontend and proxy API"
echo "2. Configure firewall (allow ports 80, 443, 3001)"
echo "3. Set up SSL certificate for HTTPS"
echo "4. Test the complete application"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs: pm2 logs"
echo "   Restart app: pm2 restart shaikh-carpets-backend"
echo "   Stop app: pm2 stop shaikh-carpets-backend"
echo "   MongoDB shell: mongosh shaikh-carpets-gst"
echo ""
echo "================================================"
