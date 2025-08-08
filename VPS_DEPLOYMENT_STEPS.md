# VPS Deployment Guide - Shaikh Carpets And Mats

## Quick Deployment Steps

### Step 1: Initial VPS Setup (Run as root)
```bash
# Upload vps-complete-setup.sh to your VPS and run:
chmod +x vps-complete-setup.sh
./vps-complete-setup.sh
```

### Step 2: Upload Project Files
```bash
# Create the directory
mkdir -p /home/hokage/Shaikh_Carpets/

# Upload your project to: /home/hokage/Shaikh_Carpets/gst-invoice-system/
# You can use SCP, SFTP, or any file transfer method

# Set proper ownership
chown -R hokage:hokage /home/hokage/Shaikh_Carpets/
```

### Step 3: Deploy Application (Run as hokage user)
```bash
# Switch to hokage user
su - hokage

# Navigate to project directory
cd /home/hokage/Shaikh_Carpets/gst-invoice-system/

# Make deployment script executable
chmod +x vps-deploy.sh

# Run deployment
./vps-deploy.sh
```

### Step 4: Configure Nginx
```bash
# As root, copy nginx configuration
sudo cp nginx-shaikh-carpets.conf /etc/nginx/sites-available/shaikh-carpets

# Enable the site
sudo ln -s /etc/nginx/sites-available/shaikh-carpets /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 5: Test Your Application
```bash
# Test backend API
curl http://185.52.53.253:3001/api/health

# Test frontend (after Nginx setup)
curl http://185.52.53.253

# Check PM2 status
pm2 status

# View logs
pm2 logs shaikh-carpets-backend
```

## Troubleshooting Node.js Version Issue

If you're getting Node.js version errors, run these commands on your VPS:

```bash
# Remove old Node.js
sudo apt-get remove -y nodejs npm

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x or higher
npm --version

# Clear npm cache
npm cache clean --force

# Now proceed with npm install
```

## Database Configuration

Your application is configured to use local MongoDB:
- **Connection**: `mongodb://localhost:27017/shaikh-carpets-gst`
- **Database**: `shaikh-carpets-gst`

### MongoDB Useful Commands:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Connect to MongoDB shell
mongosh

# In MongoDB shell, switch to your database:
use shaikh-carpets-gst

# Show collections
show collections

# View users
db.users.find()
```

## Environment Configuration

### Backend (.env)
```bash
MONGODB_URI=mongodb://localhost:27017/shaikh-carpets-gst
PORT=3001
NODE_ENV=production
JWT_SECRET=your_secure_jwt_secret
UPI_ID=9840844026@paytm
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://185.52.53.253:3001/api
```

## PM2 Management

```bash
# View all processes
pm2 status

# View logs
pm2 logs shaikh-carpets-backend

# Restart application
pm2 restart shaikh-carpets-backend

# Stop application
pm2 stop shaikh-carpets-backend

# Monitor in real-time
pm2 monit

# Save PM2 configuration
pm2 save

# Startup script (run once)
pm2 startup
```

## File Permissions

Make sure all files have correct ownership:
```bash
# As root
chown -R hokage:hokage /home/hokage/Shaikh_Carpets/
chmod +x /home/hokage/Shaikh_Carpets/gst-invoice-system/vps-deploy.sh
```

## Testing Checklist

- [ ] Node.js version 18+ installed
- [ ] MongoDB running on localhost:27017
- [ ] Backend API responds at http://185.52.53.253:3001/api/health
- [ ] PM2 shows application running
- [ ] Nginx serves frontend at http://185.52.53.253
- [ ] Can create invoices and generate PDFs
- [ ] All company details show "Shaikh Carpets And Mats"

## Security Considerations

1. **Firewall**: Only allow necessary ports (22, 80, 443, 3001)
2. **MongoDB**: Secure with authentication if exposing to internet
3. **Nginx**: Add rate limiting for production
4. **SSL**: Install SSL certificate for HTTPS
5. **Updates**: Keep system and packages updated

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`
4. Verify all services are running: `systemctl status mongod nginx`

---

**Your application will be available at**: http://185.52.53.253
**Backend API**: http://185.52.53.253:3001/api
**Company**: Shaikh Carpets And Mats
**Location**: 11 Trevelyan Basin Street, Sowcarpet, Chennai-600079
