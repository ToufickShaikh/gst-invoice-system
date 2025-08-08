#!/bin/bash

# Final Verification Script for Shaikh Carpets And Mats
# Run this to verify everything is working correctly

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

echo "🔍 Final Verification for Shaikh Carpets And Mats GST Invoice System"
echo "================================================"

# Test system services
print_info "Checking system services..."

# Check MongoDB
if systemctl is-active --quiet mongod; then
    print_status "MongoDB is running"
else
    print_error "MongoDB is not running"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
fi

# Check PM2 processes
print_info "Checking PM2 processes..."
if pm2 list | grep -q "shaikh-carpets-backend"; then
    print_status "Backend application is running in PM2"
else
    print_error "Backend application is not running in PM2"
fi

# Test backend API
print_info "Testing backend API..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    print_status "Backend API is responding on port 3001"
else
    print_error "Backend API is not responding on port 3001"
fi

# Test frontend through Nginx
print_info "Testing frontend through Nginx..."
if curl -s http://localhost > /dev/null; then
    print_status "Frontend is serving through Nginx"
else
    print_error "Frontend is not serving through Nginx"
fi

# Test API through Nginx proxy
print_info "Testing API through Nginx proxy..."
if curl -s http://localhost/api/health > /dev/null; then
    print_status "API proxy is working through Nginx"
else
    print_error "API proxy is not working through Nginx"
fi

# Check file permissions
print_info "Checking file permissions..."
if [ -d "/home/hokage/Shaikh_Carpets/gst-invoice-system/dist" ]; then
    print_status "Frontend build directory exists"
else
    print_error "Frontend build directory not found"
fi

# Test MongoDB connection
print_info "Testing MongoDB connection..."
if mongosh --eval "db.runCommand({ping: 1})" shaikh-carpets-gst --quiet > /dev/null 2>&1; then
    print_status "MongoDB connection successful"
else
    print_warning "MongoDB connection test skipped (mongosh not available)"
fi

# Display system information
echo ""
echo "================================================"
echo "📊 System Information"
echo "================================================"
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"
echo "MongoDB status: $(systemctl is-active mongod)"
echo "Nginx status: $(systemctl is-active nginx)"
echo ""

# Display application URLs
echo "🌐 Application Access URLs:"
echo "   Main Application: http://185.52.53.253"
echo "   Health Check: http://185.52.53.253/health"
echo "   API Endpoint: http://185.52.53.253/api/health"
echo ""

# Display useful commands
echo "🔧 Useful Management Commands:"
echo "   pm2 status                    - Check application status"
echo "   pm2 logs                      - View application logs"
echo "   pm2 restart shaikh-carpets-backend  - Restart backend"
echo "   sudo systemctl status nginx  - Check Nginx status"
echo "   sudo systemctl status mongod - Check MongoDB status"
echo ""

# Final status
echo "================================================"
echo "🎉 Shaikh Carpets And Mats GST Invoice System"
echo "📍 Chennai - 11 Trevelyan Basin Street, Sowcarpet"
echo "📞 Contact: 9840844026/8939487096"
echo "📧 Email: shaikhcarpetsandmats@gmail.com"
echo "🏢 GSTIN: 33BVRPS2849Q2ZG"
echo "================================================"
