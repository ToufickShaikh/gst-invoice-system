#!/bin/bash
echo "🚀 Starting Enhanced GST Invoice System in Development Mode..."

# Start backend
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
cd ..
npm run dev &
FRONTEND_PID=$!

echo "✅ System started successfully!"
echo "📊 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:5000"
echo "📚 Admin Panel: http://localhost:5173/admin"
echo ""
echo "Press Ctrl+C to stop both services"

# Function to cleanup on exit
cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
