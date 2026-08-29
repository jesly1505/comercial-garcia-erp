# ==============================================================================
# Script de Inicio Rápido - Comercial García ERP
# ==============================================================================

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "       COMERCIAL GARCIA ERP - ENTORNO LOCAL         " -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan

# Comprobar Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js no esta instalado o no se encuentra en el PATH." -ForegroundColor Red
    Exit 1
}

Write-Host "`n[1/3] Iniciando Servidor Backend (Puerto 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

Start-Sleep -Seconds 2

Write-Host "[2/3] Iniciando Frontend Web (Vite)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n[3/3] Servicios en ejecucion:" -ForegroundColor Yellow
Write-Host " -> Backend API : http://localhost:3000/api" -ForegroundColor White
Write-Host " -> Frontend Web: http://localhost:5173" -ForegroundColor White
Write-Host " -> Health Check: http://localhost:3000/api/health" -ForegroundColor White

Write-Host "`nPara detener los servicios, simplemente cierra las ventanas de terminal abiertas." -ForegroundColor Gray
Write-Host "=====================================================" -ForegroundColor Cyan
