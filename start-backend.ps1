# Start Backend Server
Set-Location "backend"
Write-Host "Starting GST Invoice System Backend..." -ForegroundColor Green
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host "Starting server on port 5000..." -ForegroundColor Cyan
npm start
