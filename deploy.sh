#!/bin/bash

# Shaikh Carpets And Mats - VPS Deployment Script
# Run this script on the VPS after uploading the project

set -e  # Exit on any error

echo "🚀 Starting deployment for Shaikh Carpets And Mats GST Invoice System"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as hokage user
if [ "$USER" != "hokage" ]; then
    print_error "This script should be run as the hokage user"
    exit 1
fi

# Navigate to project directory
cd /home/hokage/gst-invoice-system || {
    print_error "Project directory not found. Please upload the project first."
    exit 1
}

print_status "Found project directory"

# Create logs directory
mkdir -p logs
print_status "Created logs directory"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

print_status "Node.js is installed: $(node --version)"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 not found. Installing PM2..."
    sudo npm install -g pm2
    print_status "PM2 installed"
else
    print_status "PM2 is already installed"
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install --production
cd ..

# Install frontend dependencies and build
print_status "Installing frontend dependencies..."
npm install
print_status "Building frontend..."
npm run build

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file not found. Copying template..."
    cp backend/.env.production backend/.env
    print_warning "Please edit backend/.env with your actual configuration"
fi

if [ ! -f ".env" ]; then
    print_warning "Frontend .env file not found. Creating default..."
    echo "VITE_API_BASE_URL=http://185.52.53.253:3001/api" > .env
    print_warning "Please update .env with your actual domain if you have one"
fi

# Stop any existing PM2 processes
pm2 delete shaikh-carpets-backend 2>/dev/null || true

# Start the application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u hokage --hp /home/hokage

print_status "Deployment completed successfully!"
echo ""
echo "================================================"
echo "🎉 Shaikh Carpets And Mats GST Invoice System is now running!"
echo ""
echo "📋 Next Steps:"
echo "1. Configure MongoDB connection in backend/.env"
echo "2. Set up Nginx reverse proxy (see DEPLOYMENT_GUIDE.md)"
echo "3. Configure firewall and SSL certificate"
echo "4. Test the application"
echo ""
echo "📊 Check application status:"
echo "   pm2 status"
echo "   pm2 logs shaikh-carpets-backend"
echo ""
echo "🌐 Access your application:"
echo "   Backend API: http://185.52.53.253:3001/api/health"
echo "   Frontend: http://185.52.53.253 (after Nginx setup)"
echo ""
echo "📖 For detailed configuration, see DEPLOYMENT_GUIDE.md"
echo "================================================"
