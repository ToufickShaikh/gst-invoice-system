#!/bin/bash

# Fixed VPS Setup Script for Shaikh Carpets And Mats
# Run this script as root to fix Node.js installation conflicts

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

echo "🚀 Fixed VPS Setup for Shaikh Carpets And Mats GST Invoice System"
echo "================================================"

# Update system
print_info "Updating system packages..."
apt update
print_status "System updated"

# Remove all Node.js related packages completely
print_info "Removing all existing Node.js installations..."
apt-get remove -y nodejs npm libnode-dev libnode72 2>/dev/null || true
apt-get purge -y nodejs npm libnode-dev libnode72 2>/dev/null || true
apt-get autoremove -y
apt-get autoclean

# Remove any remaining Node.js files
rm -rf /usr/local/{lib/node{,/.npm,_modules},bin,share/man}/npm*
rm -rf /usr/local/bin/node*
rm -rf /usr/local/include/node*
rm -rf /usr/local/lib/node*
rm -rf /usr/local/share/doc/node*
rm -rf /usr/local/share/man/*/node*
rm -rf /usr/local/share/systemtap/tapset/node*
rm -rf ~/.npm
rm -rf ~/.node-gyp

print_status "Old Node.js installation removed"

# Clean package database
print_info "Cleaning package database..."
apt-get update
dpkg --configure -a

# Install Node.js 18 LTS
print_info "Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
print_status "Node.js installed: $(node --version)"

# Install MongoDB if not already installed
if ! command -v mongod &> /dev/null; then
    print_info "Installing MongoDB..."
    wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
    echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    apt-get update
    apt-get install -y mongodb-org
    print_status "MongoDB installed"
else
    print_status "MongoDB already installed"
fi

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod
print_status "MongoDB started and enabled"

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    print_info "Installing Nginx..."
    apt install -y nginx
    print_status "Nginx installed"
else
    print_status "Nginx already installed"
fi

systemctl start nginx
systemctl enable nginx
print_status "Nginx started and enabled"

# Install PM2 globally
print_info "Installing PM2..."
npm install -g pm2
print_status "PM2 installed: $(pm2 --version)"

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

# Verify installations
print_info "Verifying installations..."
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "PM2 version: $(pm2 --version)"
echo "MongoDB status: $(systemctl is-active mongod)"
echo "Nginx status: $(systemctl is-active nginx)"

print_status "VPS setup completed successfully!"
echo ""
echo "================================================"
echo "📋 Next Steps:"
echo "1. Switch to hokage user: su - hokage"
echo "2. Navigate to project: cd /home/hokage/Shaikh_Carpets/gst-invoice-system/"
echo "3. Run deployment script: ./vps-deploy.sh"
echo "4. Configure Nginx with provided configuration"
echo ""
echo "🔧 Verification Commands:"
echo "   node --version    # Should show v18.x.x"
echo "   npm --version     # Should work without errors"
echo "   systemctl status mongod nginx"
echo ""
echo "================================================"
