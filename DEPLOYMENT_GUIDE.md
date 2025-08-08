# VPS Deployment Guide - Shaikh Carpets And Mats GST Invoice System

## Server Details
- **VPS IP**: 185.52.53.253
- **Username**: hokage
- **Company**: Shaikh Carpets And Mats

## Prerequisites on VPS

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (v18+)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PM2 for Process Management
```bash
sudo npm install -g pm2
```

### 4. Install Nginx (for reverse proxy)
```bash
sudo apt install nginx -y
```

### 5. Install SSL Certificate Tool
```bash
sudo apt install certbot python3-certbot-nginx -y
```

## Project Transfer

### 1. Upload Project to VPS
```bash
# From your local machine, upload the project
scp -r /home/hokage/Documents/gst-invoice-system hokage@185.52.53.253:/home/hokage/
```

### 2. Connect to VPS and Setup
```bash
ssh hokage@185.52.53.253
cd /home/hokage/gst-invoice-system
```

## Environment Configuration

### 1. Backend Environment (.env)
Create `/home/hokage/gst-invoice-system/backend/.env`:
```bash
# MongoDB Connection (Update with your MongoDB URI)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shaikh-carpets-gst?retryWrites=true&w=majority

# Server Configuration
PORT=3001
NODE_ENV=production

# JWT Secret (Generate a strong secret)
JWT_SECRET=your_super_secure_jwt_secret_here_replace_with_strong_random_string

# UPI ID for QR Code Generation
UPI_ID=9840844026@paytm

# Company Details (Already configured in code)
COMPANY_NAME=Shaikh Carpets And Mats
COMPANY_GSTIN=33BVRPS2849Q2ZG
COMPANY_PHONE=9840844026/8939487096
COMPANY_EMAIL=shaikhcarpetsandmats@gmail.com
```

### 2. Frontend Environment (.env)
Create `/home/hokage/gst-invoice-system/.env`:
```bash
VITE_API_BASE_URL=https://your-domain.com/api
# OR if using IP directly:
# VITE_API_BASE_URL=http://185.52.53.253:3001/api
```

## Installation Steps

### 1. Install Backend Dependencies
```bash
cd /home/hokage/gst-invoice-system/backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd /home/hokage/gst-invoice-system
npm install
```

### 3. Build Frontend
```bash
npm run build
```

## PM2 Configuration

### 1. Create PM2 Ecosystem File
Create `/home/hokage/gst-invoice-system/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'shaikh-carpets-backend',
      script: './backend/server.js',
      cwd: '/home/hokage/gst-invoice-system',
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
      time: true
    }
  ]
};
```

### 2. Create Logs Directory
```bash
mkdir -p /home/hokage/gst-invoice-system/logs
```

### 3. Start Backend with PM2
```bash
cd /home/hokage/gst-invoice-system
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx Configuration

### 1. Create Nginx Config
Create `/etc/nginx/sites-available/shaikh-carpets`:
```nginx
server {
    listen 80;
    server_name 185.52.53.253 your-domain.com;  # Replace with your domain
    
    # Frontend (React build)
    location / {
        root /home/hokage/gst-invoice-system/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # Handle invoice PDF downloads
    location /invoices {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/shaikh-carpets /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Firewall Configuration
```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
```

## SSL Certificate (Optional but Recommended)
```bash
# If you have a domain name
sudo certbot --nginx -d your-domain.com
```

## MongoDB Setup

### Option 1: MongoDB Atlas (Recommended)
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get connection string
4. Update MONGODB_URI in backend/.env

### Option 2: Local MongoDB Installation
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Update connection string in .env
MONGODB_URI=mongodb://localhost:27017/shaikh-carpets-gst
```

## Testing Deployment

### 1. Check Backend
```bash
curl http://localhost:3001/api/health
```

### 2. Check Frontend
```bash
curl http://185.52.53.253
```

### 3. Check PM2 Status
```bash
pm2 status
pm2 logs shaikh-carpets-backend
```

## Customization Summary

The following customizations have been applied for **Shaikh Carpets And Mats**:

- **Company Name**: Shaikh Carpets And Mats
- **Address**: 11 Trevelyan Basin Street, Sowcarpet, Chennai-600079
- **GSTIN**: 33BVRPS2849Q2ZG
- **Phone**: 9840844026/8939487096
- **Email**: shaikhcarpetsandmats@gmail.com
- **Bank Account**: 130702000003731
- **IFSC**: IOBA0001307
- **Bank Name**: INDIAN OVERSEAS BANK, B RDWAY
- **Business Type**: Carpets & Mats Manufacturing

## Maintenance Commands

### Start/Stop Services
```bash
# PM2 commands
pm2 start shaikh-carpets-backend
pm2 stop shaikh-carpets-backend
pm2 restart shaikh-carpets-backend
pm2 reload shaikh-carpets-backend

# Nginx commands
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx
```

### View Logs
```bash
# PM2 logs
pm2 logs shaikh-carpets-backend
pm2 logs --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Update Application
```bash
cd /home/hokage/gst-invoice-system
git pull origin main  # If using git
npm install           # Install new dependencies
npm run build         # Rebuild frontend
pm2 restart shaikh-carpets-backend
```

## Backup Strategy

### 1. Database Backup (if using local MongoDB)
```bash
# Create backup script
cat > /home/hokage/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db shaikh-carpets-gst --out /home/hokage/backups/db_$DATE
tar -czf /home/hokage/backups/db_$DATE.tar.gz /home/hokage/backups/db_$DATE
rm -rf /home/hokage/backups/db_$DATE
find /home/hokage/backups -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/hokage/backup-db.sh
```

### 2. Setup Cron for Automated Backups
```bash
crontab -e
# Add this line for daily backup at 2 AM
0 2 * * * /home/hokage/backup-db.sh
```

## Troubleshooting

### Common Issues:

1. **Backend not starting**: Check logs with `pm2 logs`
2. **Database connection issues**: Verify MongoDB URI in .env
3. **Permission issues**: Ensure hokage user owns all files
4. **Port conflicts**: Make sure ports 3001 and 80/443 are available
5. **PDF generation issues**: Check if Puppeteer dependencies are installed

### Fix Permissions:
```bash
sudo chown -R hokage:hokage /home/hokage/gst-invoice-system
chmod +x /home/hokage/gst-invoice-system/backend/server.js
```

## Support Contacts

- **Developer**: @Digital_hokage (Instagram)
- **Company**: Shaikh Carpets And Mats
- **Phone**: 9840844026/8939487096
- **Email**: shaikhcarpetsandmats@gmail.com

---

**Note**: Remember to update DNS records if using a custom domain to point to 185.52.53.253
