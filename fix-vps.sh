#!/bin/bash
# Fix VPS configuration to make it work like before

echo "🔧 Fixing VPS configuration..."

# Check if we're on the VPS
if [[ $(hostname) == *"server25887"* ]]; then
    echo "✅ Running on VPS"
    
    # Stop any existing backend processes
    pm2 stop all
    pm2 delete all
    
    # Go to the backend directory
    cd /home/hokage/Shaikh_Carpets/gst-invoice-system/backend
    
    # Start the backend on port 3000 (like before)
    export PORT=3000
    pm2 start server.js --name "shaikh-backend" --env production
    
    # Create simple Nginx config that works like before
    sudo tee /etc/nginx/sites-available/default > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html;
    index index.html index.htm;

    # Frontend
    location /shaikh_carpets {
        alias /var/www/html/shaikh_carpets;
        try_files $uri $uri/ /shaikh_carpets/index.html;
    }

    # API proxy
    location /shaikh_carpets/api {
        rewrite ^/shaikh_carpets/api/(.*) /api/$1 break;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static files (PDFs)
    location /shaikh_carpets/invoices {
        rewrite ^/shaikh_carpets/invoices/(.*) /invoices/$1 break;
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

    # Test and reload nginx
    sudo nginx -t && sudo systemctl reload nginx
    
    # Test the setup
    echo "🧪 Testing setup..."
    sleep 2
    curl -I http://localhost/shaikh_carpets/api/health
    
    echo "✅ Configuration restored"
    
else
    echo "❌ Not on VPS, copying this script and running it there..."
    scp "$0" hokage@185.52.53.253:/tmp/fix-vps.sh
    ssh hokage@185.52.53.253 "chmod +x /tmp/fix-vps.sh && /tmp/fix-vps.sh"
fi
