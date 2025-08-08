#!/bin/bash

# Complete Deployment Script for Shaikh Carpets And Mats
# Run this as hokage user after Node.js 18 is installed

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✓${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }

echo "🚀 Complete Deployment for Shaikh Carpets And Mats GST Invoice System"
echo "================================================"

# Check if running as hokage
if [ "$USER" != "hokage" ]; then
    print_error "Please run this script as hokage user!"
    echo "Run: su - hokage"
    exit 1
fi

# Navigate to project directory
cd /home/hokage/Shaikh_Carpets/gst-invoice-system || {
    print_error "Project directory not found!"
    echo "Please ensure project is at: /home/hokage/Shaikh_Carpets/gst-invoice-system/"
    exit 1
}

print_status "Found project directory"

# Create necessary directories
mkdir -p logs backend/logs backend/invoices
print_status "Created directories"

# Install PM2 globally (if not already installed)
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2..."
    sudo npm install -g pm2
    print_status "PM2 installed"
else
    print_status "PM2 already available"
fi

# Create backend .env file
print_info "Creating backend environment configuration..."
cat > backend/.env << 'EOF'
# MongoDB Configuration (Local)
MONGODB_URI=mongodb://localhost:27017/shaikh-carpets-gst

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Secret
JWT_SECRET=shaikh_carpets_jwt_secret_2024_secure_production_token

# UPI Configuration
UPI_ID=9840844026@paytm

# Company Details
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

# Security
CORS_ORIGIN=*
MAX_FILE_SIZE=10mb
EOF

print_status "Backend .env created"

# Create frontend .env file
print_info "Creating frontend environment configuration..."
cat > .env << 'EOF'
VITE_API_BASE_URL=http://185.52.53.253/api
EOF

print_status "Frontend .env created"

# Install backend dependencies
print_info "Installing backend dependencies..."
cd backend
npm cache clean --force
npm install --production --no-optional

if [ $? -eq 0 ]; then
    print_status "Backend dependencies installed successfully"
else
    print_error "Backend dependencies installation failed"
    exit 1
fi

cd ..

# Install frontend dependencies
print_info "Installing frontend dependencies..."
npm cache clean --force
npm install --no-optional

if [ $? -eq 0 ]; then
    print_status "Frontend dependencies installed successfully"
else
    print_error "Frontend dependencies installation failed"
    exit 1
fi

# Build frontend
print_info "Building frontend for production..."
npm run build

if [ $? -eq 0 ]; then
    print_status "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

# Create PM2 ecosystem configuration
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
pm2 kill 2>/dev/null || true

# Start the application
print_info "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
print_info "Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u hokage --hp /home/hokage

# Wait for application to start
print_info "Waiting for application to start..."
sleep 10

# Test the backend
print_info "Testing backend API..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_status "Backend API is responding"
else
    print_warning "Backend API test failed - checking logs..."
    pm2 logs shaikh-carpets-backend --lines 20
fi

print_status "Application deployment completed!"

echo ""
echo "================================================"
echo "🎉 Shaikh Carpets And Mats GST Invoice System Deployed!"
echo "================================================"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Access Information:"
echo "   Backend API: http://185.52.53.253:3001/api/health"
echo "   Frontend files: /home/hokage/Shaikh_Carpets/gst-invoice-system/dist/"
echo ""
echo "📋 Next Steps:"
echo "1. Configure Nginx to serve frontend and proxy backend"
echo "2. Test the complete application"
echo "3. Set up SSL certificate (optional)"
echo ""
echo "🔧 Useful Commands:"
echo "   pm2 status              - Check application status"
echo "   pm2 logs                - View application logs"
echo "   pm2 restart all         - Restart application"
echo "   pm2 monit               - Real-time monitoring"
echo ""
echo "================================================"
