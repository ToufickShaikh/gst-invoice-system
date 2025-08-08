# Emergency Fix for Node.js Installation Issue

## Run these commands on your VPS as root:

```bash
# 1. Stop any running processes
pkill -f node || true
pkill -f npm || true

# 2. Fix the broken package installation
dpkg --configure -a

# 3. Remove ALL Node.js packages completely
apt-get remove --purge -y nodejs npm libnode-dev libnode72
apt-get autoremove -y
apt-get autoclean

# 4. Clean any remaining Node.js files
rm -rf /usr/local/{lib/node{,/.npm,_modules},bin,share/man}/npm*
rm -rf /usr/local/bin/node*
rm -rf /usr/local/include/node*
rm -rf /usr/local/lib/node*
rm -rf ~/.npm
rm -rf ~/.node-gyp

# 5. Update package database
apt-get update

# 6. Install Node.js 18 fresh
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 7. Verify installation
node --version
npm --version

# 8. Install PM2 globally
npm install -g pm2

# 9. Check MongoDB status
systemctl status mongod

# 10. If MongoDB is not running, start it
systemctl start mongod
systemctl enable mongod
```

## After Node.js is fixed, continue with deployment:

```bash
# 1. Switch to hokage user
su - hokage

# 2. Go to project directory
cd /home/hokage/Shaikh_Carpets/gst-invoice-system/

# 3. Run the deployment script
chmod +x vps-deploy.sh
./vps-deploy.sh
```

## Alternative: Manual Deployment Steps

If the deployment script still has issues, run these commands manually as hokage user:

```bash
# Create environment file
cat > backend/.env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/shaikh-carpets-gst
PORT=3001
NODE_ENV=production
JWT_SECRET=shaikh_carpets_jwt_secret_2024_secure_token
UPI_ID=9840844026@paytm
COMPANY_NAME=Shaikh Carpets And Mats
COMPANY_GSTIN=33BVRPS2849Q2ZG
COMPANY_PHONE=9840844026/8939487096
COMPANY_EMAIL=shaikhcarpetsandmats@gmail.com
EOF

# Create frontend environment
echo "VITE_API_BASE_URL=http://185.52.53.253:3001/api" > .env

# Install backend dependencies
cd backend
npm cache clean --force
npm install --production
cd ..

# Install frontend dependencies and build
npm cache clean --force
npm install
npm run build

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'shaikh-carpets-backend',
    script: './backend/server.js',
    cwd: '/home/hokage/Shaikh_Carpets/gst-invoice-system',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Test Everything:

```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check PM2 status
pm2 status

# View logs if there are issues
pm2 logs
```
