#!/bin/bash
# Fix common development issues

echo "🔧 Fixing Common Development Issues"
echo "==================================="

# Fix 1: Clear npm cache
echo "1. Clearing npm cache..."
npm cache clean --force
cd backend && npm cache clean --force && cd ..

# Fix 2: Reinstall dependencies
echo "2. Reinstalling dependencies..."
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
npm install
cd backend && npm install && cd ..

# Fix 3: Fix permissions
echo "3. Fixing file permissions..."
chmod +x *.sh
find . -name "*.js" -exec chmod 644 {} \;
find . -name "*.jsx" -exec chmod 644 {} \;

# Fix 4: Create missing directories
echo "4. Creating missing directories..."
mkdir -p backend/invoices
mkdir -p backend/logs
mkdir -p public/uploads

# Fix 5: Check and fix MongoDB connection
echo "5. Testing MongoDB connection..."
if ! pgrep mongod > /dev/null; then
    echo "   Starting MongoDB..."
    sudo systemctl start mongod || echo "   Please start MongoDB manually"
fi

echo "✅ Common issues fixed!"
echo "Now run: ./start-local-dev.sh"
