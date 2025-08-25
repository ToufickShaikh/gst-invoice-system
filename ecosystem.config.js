// Load production .env for PM2 so environment variables like JWT_SECRET are available
require('path');
try { require('dotenv').config({ path: require('path').resolve(__dirname, '.env.production') }); } catch (e) { /* ignore if dotenv not present */ }

module.exports = {
  apps: [
    {
      name: 'shaikh-backend',
      // Run the backend entry from the backend folder
      script: 'server.js',
      cwd: '/home/hokage/Shaikh_Carpets/gst-invoice-system/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Logs (absolute paths so PM2 writes where expected)
      error_file: '/home/hokage/Shaikh_Carpets/gst-invoice-system/backend/logs/backend-error.log',
      out_file: '/home/hokage/Shaikh_Carpets/gst-invoice-system/backend/logs/backend-out.log',
      log_file: '/home/hokage/Shaikh_Carpets/gst-invoice-system/backend/logs/backend-combined.log',
      time: true,
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Use values loaded from .env.production when available
        JWT_SECRET: process.env.JWT_SECRET || 'replace_me_with_secure_jwt_secret',
        PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'https://185.52.53.253/shaikhcarpets',
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/gst_invoice_system'
      },
    },
  ],
};
