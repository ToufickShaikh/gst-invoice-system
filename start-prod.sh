#!/bin/bash
echo "🚀 Starting Enhanced GST Invoice System in Production Mode..."

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Start backend with PM2
cd backend
pm2 start ecosystem.config.js

echo "✅ System started successfully!"
echo "🌐 Application: http://localhost:5000"
echo "📊 PM2 Status: pm2 status"
echo "📝 Logs: pm2 logs"
echo ""
echo "To stop: pm2 stop gst-invoice-enhanced"
