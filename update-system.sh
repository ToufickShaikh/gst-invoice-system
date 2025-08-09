#!/bin/bash
echo "🔄 Updating Enhanced GST Invoice System..."

# Pull latest changes
git pull origin main

# Update dependencies
npm install
cd backend && npm install && cd ..

# Rebuild frontend
npm run build

echo "✅ System updated successfully!"
echo "🔄 Restart the system to apply changes"
