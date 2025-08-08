#!/bin/bash

# VPS Deployment Script for GST Invoice System
# Usage: ./deploy-to-vps.sh

echo "🚀 Starting VPS deployment for Shaikh Carpets And Mats GST Invoice System..."
echo "🏠 VPS: 185.52.53.253"
echo ""

# Check if we're running as root or with sudo
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root. Some commands will be adjusted."
    SUDO=""
else
    echo "🔐 Running with user privileges. Will use sudo where needed."
    SUDO="sudo"
fi

echo "📦 Installing system dependencies..."
# Update system packages
$SUDO apt update && $SUDO apt upgrade -y

# Install Node.js 18+, npm, and PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | $SUDO -E bash -
$SUDO apt-get install -y nodejs

# Install PM2 globally
$SUDO npm install -g pm2

# Install Nginx
$SUDO apt install -y nginx

echo "📁 Setting up project directory..."
# Create application directory
PROJECT_DIR="/home/hokage/gst-invoice-system"
$SUDO mkdir -p $PROJECT_DIR
$SUDO chown hokage:hokage $PROJECT_DIR

echo "📂 Current directory: $(pwd)"
echo "📋 Copying files to VPS directory..."

# Copy all files to VPS directory (assuming we're already on the VPS)
if [ "$(pwd)" != "$PROJECT_DIR" ]; then
    cp -r . $PROJECT_DIR/
    cd $PROJECT_DIR
fi

echo "🗄️ Setting up environment variables..."
# Copy VPS-specific environment files
cp backend/.env.vps backend/.env
cp .env.vps .env

echo "✅ Environment configured for local MongoDB"
echo "📍 MongoDB will connect to: mongodb://localhost:27017/gst-invoice"
echo ""
echo "⚠️  IMPORTANT: Update the following in backend/.env if needed:"
echo "   - JWT_SECRET (change to a secure random string)"
echo "   - UPI_ID (update with your UPI ID for payments)"

echo "📦 Installing backend dependencies..."
cd backend
npm install --production
cd ..

echo "📦 Installing frontend dependencies..."
npm install

echo "🏗️ Building frontend for production..."
npm run build

echo "🌐 Setting up Nginx configuration..."
# Copy Nginx configuration
$SUDO cp nginx.conf /etc/nginx/sites-available/gst-invoice
$SUDO ln -sf /etc/nginx/sites-available/gst-invoice /etc/nginx/sites-enabled/
$SUDO rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
$SUDO nginx -t

echo "🚀 Starting services with PM2..."
# Start backend with PM2
pm2 start ecosystem.config.js

# Start PM2 on boot
pm2 startup
pm2 save

echo "🔄 Restarting Nginx..."
$SUDO systemctl restart nginx
$SUDO systemctl enable nginx

echo "🔥 Creating firewall rules..."
$SUDO ufw allow 22/tcp
$SUDO ufw allow 80/tcp
$SUDO ufw allow 443/tcp
$SUDO ufw allow 3000/tcp
$SUDO ufw allow 5173/tcp
$SUDO ufw --force enable

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Visit http://185.52.53.253 to access your application"
echo "2. Backend API is running on http://185.52.53.253:3000"
echo "3. Frontend is served by Nginx on port 80"
echo ""
echo "📊 Check application status:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo "🔧 Useful commands:"
echo "   pm2 restart all        # Restart all services"
echo "   pm2 stop all          # Stop all services"
echo "   pm2 logs --lines 50   # View recent logs"
echo "   sudo systemctl status nginx  # Check Nginx status"
echo ""
echo "🏢 Customized for: Shaikh Carpets And Mats"
echo "📍 Address: 11 Trevelyan Basin Street,Sowcarpet,Chennai-600079"
echo "📞 Phone: 9840844026/8939487096"
echo "🏦 Account: 130702000003731 (IOBA0001307)"
