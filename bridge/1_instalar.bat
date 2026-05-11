@echo off
chcp 65001 >nul
echo ================================================
echo   TraderLog Bridge — Instalacao
echo ================================================
echo.

:: Verifica se Python 32-bit já está instalado
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python já instalado.
    goto install_deps
)

echo [1/2] Instalando Python 3.11 32-bit via winget...
winget install --id Python.Python.3.11 --architecture x86 --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha no winget. Baixe manualmente:
    echo   https://www.python.org/ftp/python/3.11.9/python-3.11.9.exe
    echo   Marque "Add Python to PATH" durante a instalacao.
    pause
    exit /b 1
)

:: Atualiza o PATH da sessão atual
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Python\Python311-32;%LOCALAPPDATA%\Programs\Python\Python311-32\Scripts"

:install_deps
echo.
echo [2/2] Instalando dependencias Python...
python -m pip install --upgrade pip --quiet
python -m pip install requests --quiet

if %errorlevel% == 0 (
    echo.
    echo ================================================
    echo   Instalacao concluida!
    echo.
    echo   Proximos passos:
    echo   1. Cole o ProfitDLL.dll nesta pasta
    echo   2. Abra profit_bridge.py e configure:
    echo      - TRADERLOG_TOKEN  (gerado em /integracoes)
    echo      - PROFIT_KEY       (chave Data Solution Nelogica)
    echo      - PROFIT_USER      (seu email Nelogica)
    echo      - PROFIT_PASS      (sua senha Nelogica)
    echo   3. Rode 2_iniciar.bat antes de operar
    echo ================================================
) else (
    echo [ERRO] Falha ao instalar dependencias.
)

echo.
pause
