module.exports = {
  apps: [{
    name: 'shaikh-backend',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Whitelist internal/trusted IPs for rate limiter bypass (comma-separated)
      RATE_LIMIT_WHITELIST: '127.0.0.1,::1,185.52.53.253'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
