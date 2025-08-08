#!/bin/bash

# Complete Setup Script for Shaikh Carpets And Mats on VPS
# Run this script as root or with sudo privileges on your VPS

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

echo "🚀 Complete VPS Setup for Shaikh Carpets And Mats GST Invoice System"
echo "================================================"

# Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_status "System updated"

# Install Node.js 18
print_info "Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
print_status "Node.js installed: $(node --version)"

# Install MongoDB
print_info "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod
print_status "MongoDB installed and started"

# Install Nginx
print_info "Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
print_status "Nginx installed and started"

# Install PM2 globally
print_info "Installing PM2..."
npm install -g pm2
print_status "PM2 installed"

# Create hokage user if not exists
if ! id "hokage" &>/dev/null; then
    print_info "Creating hokage user..."
    useradd -m -s /bin/bash hokage
    usermod -aG sudo hokage
    print_status "User hokage created"
else
    print_status "User hokage already exists"
fi

# Set up firewall
print_info "Configuring firewall..."
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw allow 3001    # Backend (temporary)
ufw --force enable
print_status "Firewall configured"

# Install additional dependencies for Puppeteer
print_info "Installing Puppeteer dependencies..."
apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

print_status "Puppeteer dependencies installed"

print_status "VPS setup completed!"
echo ""
echo "================================================"
echo "📋 Next Steps:"
echo "1. Upload your project to /home/hokage/Shaikh_Carpets/gst-invoice-system/"
echo "2. Run the deployment script as hokage user"
echo "3. Configure Nginx with the provided configuration"
echo "4. Test the application"
echo ""
echo "🔧 Quick Commands:"
echo "   Switch to hokage user: su - hokage"
echo "   Check MongoDB: systemctl status mongod"
echo "   Check Nginx: systemctl status nginx"
echo ""
echo "================================================"
