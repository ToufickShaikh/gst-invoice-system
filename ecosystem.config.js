module.exports = {
  apps: [
    {
      name: 'shaikh-carpets-backend',
      script: './backend/server.js',
      cwd: '/home/hokage/gst-invoice-system',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
