@echo off
echo ========================================================
echo Iniciando el Sistema Comercial Garcia ERP...
echo ========================================================

echo Iniciando el Backend...
start cmd /k "cd backend && npm.cmd run dev"

echo Iniciando el Frontend...
start cmd /k "cd frontend && npm.cmd run dev"


echo Los servidores se estan abriendo en nuevas ventanas.
echo Una vez que carguen, abre tu navegador en: http://localhost:5173 & start "" "http://localhost:5173"
pause
