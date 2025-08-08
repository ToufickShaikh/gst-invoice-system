#!/bin/bash

# Transfer script for Shaikh Carpets And Mats GST Invoice System
# Run this script on your LOCAL machine to transfer files to VPS

set -e

# VPS Configuration
VPS_IP="185.52.53.253"
VPS_USER="hokage"
PROJECT_DIR="/home/hokage/Documents/gst-invoice-system"
REMOTE_DIR="/home/hokage/"

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

echo "🚀 Transferring Shaikh Carpets And Mats GST Invoice System to VPS"
echo "================================================"
echo "VPS IP: $VPS_IP"
echo "User: $VPS_USER"
echo "Local Project: $PROJECT_DIR"
echo "================================================"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Check if SSH key exists or ask for password
print_info "Testing SSH connection to VPS..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$VPS_USER@$VPS_IP" exit 2>/dev/null; then
    print_status "SSH key authentication successful"
else
    print_warning "SSH key authentication failed. You'll be prompted for password."
fi

# Create a temporary directory for transfer (excluding node_modules and other large files)
print_info "Preparing files for transfer..."
cd "$(dirname "$PROJECT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_DIR")"

# Create temporary directory
TEMP_DIR="/tmp/gst-transfer-$$"
mkdir -p "$TEMP_DIR"

# Copy files excluding unnecessary directories
rsync -av \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'build' \
    --exclude 'logs' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude '.env.development' \
    --exclude 'coverage' \
    --exclude '.nyc_output' \
    --exclude 'backend/invoices/*.pdf' \
    --exclude 'backend/invoices/*.html' \
    "$PROJECT_DIR/" "$TEMP_DIR/gst-invoice-system/"

print_status "Files prepared for transfer"

# Transfer files to VPS
print_info "Transferring files to VPS..."
rsync -avz --progress "$TEMP_DIR/gst-invoice-system/" "$VPS_USER@$VPS_IP:$REMOTE_DIR/gst-invoice-system/"

print_status "Files transferred successfully"

# Cleanup temporary directory
rm -rf "$TEMP_DIR"

# Run deployment script on VPS
print_info "Running deployment script on VPS..."
ssh "$VPS_USER@$VPS_IP" << 'EOF'
cd /home/hokage/gst-invoice-system
chmod +x deploy.sh
./deploy.sh
EOF

print_status "Deployment completed!"

echo ""
echo "================================================"
echo "🎉 Transfer and Deployment Completed!"
echo "================================================"
echo ""
echo "📋 Next Steps:"
echo "1. SSH into your VPS: ssh $VPS_USER@$VPS_IP"
echo "2. Configure backend/.env with your MongoDB URI"
echo "3. Set up Nginx reverse proxy"
echo "4. Configure SSL certificate (optional)"
echo "5. Test your application"
echo ""
echo "🔧 Quick Commands:"
echo "   SSH to VPS: ssh $VPS_USER@$VPS_IP"
echo "   Check status: ssh $VPS_USER@$VPS_IP 'pm2 status'"
echo "   View logs: ssh $VPS_USER@$VPS_IP 'pm2 logs'"
echo ""
echo "🌐 Access URLs (after setup):"
echo "   Backend API: http://$VPS_IP:3001/api/health"
echo "   Frontend: http://$VPS_IP (after Nginx setup)"
echo ""
echo "📖 For detailed configuration, see DEPLOYMENT_GUIDE.md"
echo "================================================"
