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
