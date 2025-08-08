#!/bin/bash

# Nginx Setup Script for Shaikh Carpets And Mats
# Run this as root after the application is deployed

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

echo "🌐 Nginx Setup for Shaikh Carpets And Mats GST Invoice System"
echo "================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root!"
    exit 1
fi

# Create Nginx configuration
print_info "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/shaikh-carpets << 'EOF'
server {
    listen 80;
    server_name 185.52.53.253;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # Serve frontend from dist directory
    location / {
        root /home/hokage/Shaikh_Carpets/gst-invoice-system/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 60;
        
        # Handle large uploads
        client_max_body_size 10M;
    }
    
    # Handle invoice PDF downloads
    location /invoices {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache PDF files briefly
        expires 1h;
        add_header Cache-Control "private, must-revalidate";
    }
    
    # Health check
    location = /health {
        proxy_pass http://127.0.0.1:3001/api/health;
        access_log off;
    }
    
    # Block access to sensitive files
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
    
    # Simple robots.txt
    location = /robots.txt {
        return 200 "User-agent: *\nDisallow: /api/\n";
        add_header Content-Type text/plain;
    }
}
EOF

print_status "Nginx configuration created"

# Enable the site
print_info "Enabling Shaikh Carpets site..."
ln -sf /etc/nginx/sites-available/shaikh-carpets /etc/nginx/sites-enabled/

# Remove default site
print_info "Removing default Nginx site..."
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_info "Testing Nginx configuration..."
if nginx -t; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors!"
    exit 1
fi

# Reload Nginx
print_info "Reloading Nginx..."
systemctl reload nginx

# Check Nginx status
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
    systemctl status nginx
    exit 1
fi

print_status "Nginx setup completed!"

echo ""
echo "================================================"
echo "🌐 Nginx Configuration Complete!"
echo "================================================"
echo ""
echo "🔗 Your application is now accessible at:"
echo "   http://185.52.53.253"
echo ""
echo "🧪 Test URLs:"
echo "   Frontend: http://185.52.53.253"
echo "   Backend Health: http://185.52.53.253/health"
echo "   API Endpoint: http://185.52.53.253/api/health"
echo ""
echo "🔧 Nginx Commands:"
echo "   sudo nginx -t                    - Test configuration"
echo "   sudo systemctl reload nginx     - Reload configuration"
echo "   sudo systemctl status nginx     - Check status"
echo "   sudo tail -f /var/log/nginx/access.log  - View access logs"
echo "   sudo tail -f /var/log/nginx/error.log   - View error logs"
echo ""
echo "================================================"
