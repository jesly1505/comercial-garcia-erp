@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
cd /d "%~dp0"

set "SETUP_MARKER=%~dp0.setup_done"

echo ========================================================
echo  COMERCIAL GARCIA ERP - ASISTENTE DE INICIO
echo ========================================================
echo.

REM ---------- 1. Verificar Node.js y npm ----------
echo [1/5] Verificando prerequisitos...
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado o no esta en el PATH.
  echo Instalalo desde https://nodejs.org y vuelve a ejecutar.
  pause
  exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo        Node %NODE_VER% detectado, npm %NPM_VER%.
echo.

REM ---------- 2. Verificar/Crear archivos .env ----------
echo [2/5] Verificando archivos de entorno...
if not exist "backend\.env" (
  if exist "backend\.env.example" (
    copy "backend\.env.example" "backend\.env" >nul
    echo        backend\.env creado desde .env.example
  ) else (
    echo [ERROR] No existe backend\.env ni backend\.env.example
    pause
    exit /b 1
  )
)
if not exist "frontend\.env" (
  if exist "frontend\.env.example" (
    copy "frontend\.env.example" "frontend\.env" >nul
    echo        frontend\.env creado desde .env.example
  )
)
echo        Variables de entorno listas.
echo.

REM ---------- 3. Instalar dependencias (solo si falta node_modules) ----------
echo [3/5] Verificando dependencias...
if not exist "backend\node_modules" (
  echo        Instalando backend...
  call npm install --prefix backend
  if errorlevel 1 (
    echo [ERROR] Fallo la instalacion del backend.
    pause
    exit /b 1
  )
)
if not exist "frontend\node_modules" (
  echo        Instalando frontend...
  call npm install --prefix frontend
  if errorlevel 1 (
    echo [ERROR] Fallo la instalacion del frontend.
    pause
    exit /b 1
  )
)
echo        Dependencias listas.
echo.

REM ---------- 4. Detener servidores previos (si estan corriendo) ----------
echo [4/6] Deteniendo servidores anteriores si estan activos...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 :5173" ^| findstr "LISTENING"') do (
  taskkill /f /pid %%a >nul 2>&1
)
echo        Puertos 3000 y 5173 liberados (si estaban en uso).
echo.

REM ---------- 5. Preparar Prisma y seed (solo si es necesario) ----------
echo [5/6] Verificando estado de la base de datos...

set "NEED_SETUP=1"
if exist "%SETUP_MARKER%" (
  for /f "delims=" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check_setup.ps1"') do set "NEED_SETUP=%%a"
)
if /i "%~1"=="--reparar" set "NEED_SETUP=1"

if "%NEED_SETUP%"=="0" (
  echo        Esquema y datos al dia, omitiendo generacion/migracion/seed.
  echo        (Para forzar: iniciar_sistema.bat --reparar)
) else (
  if exist "%SETUP_MARKER%" del "%SETUP_MARKER%"
  pushd backend
  call npx prisma generate
  if errorlevel 1 (
    echo [ERROR] Fallo prisma generate.
    popd
    pause
    exit /b 1
  )
  call npx prisma migrate deploy
  if errorlevel 1 (
    echo [ERROR] Fallo prisma migrate deploy. Revisa DATABASE_URL en backend\.env
    popd
    pause
    exit /b 1
  )
  call npm run seed
  if errorlevel 1 (
    echo [ERROR] Fallo el seed de la base de datos.
    popd
    pause
    exit /b 1
  )
  popd
  echo done> "%SETUP_MARKER%"
  echo        Base de datos preparada (schema + seed).
)
echo.

REM ---------- 6. Iniciar servidores ----------
echo [6/6] Iniciando servidores...
start "Backend Comercial Garcia ERP" cmd /k "cd /d "%~dp0backend" && npm.cmd run dev"
start "Frontend Comercial Garcia ERP" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"

echo.
echo ========================================================
echo  Los servidores se estan abriendo en ventanas nuevas.
echo.
echo  Frontend: http://localhost:5173
echo  Backend : http://localhost:3000
echo.
echo ========================================================
timeout /t 4 >nul
start "" "http://localhost:5173"
pause
endlocal