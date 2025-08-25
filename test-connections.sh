#!/bin/bash

echo "🔧 Testing Frontend-Backend Connections..."
echo "=========================================="

# Check if backend is running on port 3000
echo "1. Testing backend health endpoint..."
curl -s http://localhost:3000/api/health | head -10
if [ $? -eq 0 ]; then
    echo "✅ Backend is responding on port 3000"
else
    echo "❌ Backend is not responding on port 3000"
fi
echo ""

# Test auth endpoint (should be public)
echo "2. Testing auth endpoint (public)..."
curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"test","password":"test"}' | head -10
if [ $? -eq 0 ]; then
    echo "✅ Auth endpoint is accessible"
else
    echo "❌ Auth endpoint is not accessible"
fi
echo ""

# Check if frontend dev server proxy is working (when running)
echo "3. Testing frontend proxy (if dev server is running)..."
curl -s http://localhost:5173/api/health | head -10
if [ $? -eq 0 ]; then
    echo "✅ Frontend proxy is working"
else
    echo "❌ Frontend proxy is not working (dev server may not be running)"
fi
echo ""

echo "4. Configuration Summary:"
echo "   - Backend runs on: localhost:3000"
echo "   - Frontend dev server: localhost:5173 (with proxy to :3000)"
echo "   - Production nginx proxy: /shaikhcarpets/api -> localhost:3000"
echo "   - Frontend API base URL: http://localhost:3000/api"
echo ""
echo "🔧 Connection test complete!"
