#!/bin/bash
# Local Development Setup Script for GST Invoice System
# This script sets up the local development environment on the fix/local-development-fixes branch

echo "🚀 Setting up Local Development Environment for GST Invoice System"
echo "📍 Current branch: $(git branch --show-current)"
echo "======================================================================"

# Check if we're on the correct branch
if [ "$(git branch --show-current)" != "fix/local-development-fixes" ]; then
    echo "❌ Please switch to the fix/local-development-fixes branch first"
    echo "Run: git checkout fix/local-development-fixes"
    exit 1
fi

# Function to print colored output
print_status() {
    case $1 in
        "success") echo -e "\033[32m✅ $2\033[0m" ;;
        "error") echo -e "\033[31m❌ $2\033[0m" ;;
        "warning") echo -e "\033[33m⚠️  $2\033[0m" ;;
        "info") echo -e "\033[34mℹ️  $2\033[0m" ;;
    esac
}

# Check prerequisites
print_status "info" "Checking prerequisites..."

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_status "success" "Node.js $(node --version) is installed"
    else
        print_status "error" "Node.js version 18+ required. Current: $(node --version)"
        exit 1
    fi
else
    print_status "error" "Node.js is not installed"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    print_status "success" "npm $(npm --version) is installed"
else
    print_status "error" "npm is not installed"
    exit 1
fi

# Check MongoDB
if command -v mongod >/dev/null 2>&1; then
    print_status "success" "MongoDB is installed"
    # Check if MongoDB is running
    if pgrep mongod > /dev/null; then
        print_status "success" "MongoDB is running"
    else
        print_status "warning" "MongoDB is installed but not running"
        print_status "info" "You'll need to start MongoDB manually: sudo systemctl start mongod"
    fi
else
    print_status "error" "MongoDB is not installed"
    print_status "info" "Please install MongoDB first"
    exit 1
fi

print_status "info" "Installing backend dependencies..."
cd backend
npm install
if [ $? -eq 0 ]; then
    print_status "success" "Backend dependencies installed"
else
    print_status "error" "Failed to install backend dependencies"
    exit 1
fi

print_status "info" "Installing frontend dependencies..."
cd ..
npm install
if [ $? -eq 0 ]; then
    print_status "success" "Frontend dependencies installed"
else
    print_status "error" "Failed to install frontend dependencies"
    exit 1
fi

print_status "info" "Setting up environment files..."

# Create local environment files if they don't exist
if [ ! -f backend/.env ]; then
    print_status "info" "Creating backend .env file..."
    cat > backend/.env << 'EOF'
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/gst_invoice_system
PORT=5001
JWT_SECRET=local_dev_jwt_secret_key_12345
UPI_ID=dev@upi
COMPANY_NAME=Shaikh Carpets - DEV
COMPANY_ADDRESS=Development Environment
COMPANY_PHONE=+91-DEV-MODE
COMPANY_EMAIL=dev@shaikhcarpets.com
COMPANY_GSTIN=DEV-GSTIN
WHATSAPP_NUMBER=+91-DEV-MODE
DEBUG=true
EOF
    print_status "success" "Backend .env file created"
else
    print_status "info" "Backend .env file already exists"
fi

# Determine backend port from backend/.env (default 5001)
PORT=$(grep -m1 '^PORT=' backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '[:space:]')
if [ -z "$PORT" ]; then
    PORT=5001
fi

if [ ! -f .env ]; then
    print_status "info" "Creating frontend .env file..."
    cat > .env << EOF
VITE_API_BASE_URL=http://localhost:${PORT}/api
MONGODB_URI=mongodb://localhost:27017/gst_invoice_system
JWT_SECRET=local_dev_jwt_secret_key_12345
EOF
    print_status "success" "Frontend .env file created"
else
    # Update existing .env to use local backend with detected port
    if grep -q "VITE_API_BASE_URL=" .env; then
        sed -i "s|^VITE_API_BASE_URL=.*$|VITE_API_BASE_URL=http://localhost:${PORT}/api|g" .env
        print_status "info" "Frontend .env updated to use local backend on port ${PORT}"
    else
        echo "VITE_API_BASE_URL=http://localhost:${PORT}/api" >> .env
        print_status "info" "Frontend .env updated with API base URL"
    fi
    print_status "info" "Frontend .env already configured for local development"
fi

# Create development scripts
print_status "info" "Creating development scripts..."

cat > start-local-dev.sh << 'EOF'
#!/bin/bash
# Start local development environment

echo "🚀 Starting GST Invoice System - Local Development"
echo "=================================================="

# Check if MongoDB is running
if ! pgrep mongod > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB..."
    sudo systemctl start mongod
    sleep 2
fi

# Start backend in background
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend development server..."
npm run dev

# Cleanup function
cleanup() {
    echo "🛑 Shutting down development servers..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM
EOF

chmod +x start-local-dev.sh

cat > check-local-setup.sh << 'EOF'
#!/bin/bash
# Check local development setup

echo "🔍 Checking Local Development Setup"
echo "==================================="

# Check if backend dependencies are installed
if [ -d "backend/node_modules" ]; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies not installed"
    echo "   Run: cd backend && npm install"
fi

# Check if frontend dependencies are installed
if [ -d "node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies not installed"
    echo "   Run: npm install"
fi

# Check environment files
if [ -f "backend/.env" ]; then
    echo "✅ Backend .env file exists"
else
    echo "❌ Backend .env file missing"
fi

if [ -f ".env" ]; then
    echo "✅ Frontend .env file exists"
else
    echo "❌ Frontend .env file missing"
fi

# Determine backend port
PORT=$(grep -m1 '^PORT=' backend/.env 2>/dev/null | cut -d'=' -f2 | tr -d '[:space:]')
if [ -z "$PORT" ]; then
    PORT=5001
fi

# Check MongoDB
if pgrep mongod > /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB is not running"
    echo "   Start with: sudo systemctl start mongod"
fi

# Test backend connection
echo "🔧 Testing backend connection on port $PORT..."
cd backend
if npm run dev --silent &>/dev/null & then
    DEV_PID=$!
    # wait up to ~15s for server
    for i in {1..15}; do
        if curl -s "http://localhost:$PORT/api/health" > /dev/null; then
            echo "✅ Backend connection test passed"
            READY=1
            break
        fi
        sleep 1
    done
    if [ -z "$READY" ]; then
        echo "❌ Backend connection test failed"
        echo "   Tried: http://localhost:$PORT/api/health"
    fi
    kill $DEV_PID 2>/dev/null
else
    echo "❌ Backend failed to start"
fi
cd ..

echo "🎯 Setup check complete!"
EOF

chmod +x check-local-setup.sh

cat > fix-common-issues.sh << 'EOF'
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
EOF

chmod +x fix-common-issues.sh

print_status "success" "Development scripts created:"
print_status "info" "  • start-local-dev.sh - Start the development environment"
print_status "info" "  • check-local-setup.sh - Check if everything is set up correctly"
print_status "info" "  • fix-common-issues.sh - Fix common development issues"

# Run a basic setup check
print_status "info" "Running basic setup check..."
./check-local-setup.sh

print_status "success" "Local development environment setup complete!"
echo ""
echo "======================================================================"
echo "🎯 Next Steps:"
echo "1. Start MongoDB if not running: sudo systemctl start mongod"
echo "2. Run the development environment: ./start-local-dev.sh"
echo "3. Access the application:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend API: http://localhost:${PORT}/api"
echo "   • Health Check: http://localhost:${PORT}/api/health"
echo ""
echo "📝 Useful Commands:"
echo "   • Check setup: ./check-local-setup.sh"
echo "   • Fix issues: ./fix-common-issues.sh"
echo "   • View logs: tail -f backend/logs/*.log"
echo ""
echo "🔧 For production deployment, switch back to main branch:"
echo "   git checkout main"
echo "======================================================================"
