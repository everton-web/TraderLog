@echo off
chcp 65001 >nul
echo ================================================
echo   TraderLog Bridge — Compilar .exe
echo ================================================
echo.
echo [1/3] Instalando PyInstaller...
pip install pyinstaller requests --quiet

echo [2/3] Compilando...
pyinstaller --onefile --windowed --name "TraderLogBridge" --icon=NONE profit_bridge.py

echo [3/3] Copiando DLL para dist/...
if exist "ProfitDLL.dll"   copy "ProfitDLL.dll"   "dist\ProfitDLL.dll"   >nul
if exist "ProfitDLL64.dll" copy "ProfitDLL64.dll" "dist\ProfitDLL64.dll" >nul

echo.
echo ================================================
echo   Pronto! Distribua a pasta dist/ para os alunos.
echo   Conteudo:
echo     TraderLogBridge.exe
echo     ProfitDLL.dll
echo ================================================
pause
