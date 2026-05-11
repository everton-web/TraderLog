@echo off
chcp 65001 >nul
echo ================================================
echo   TraderLog Bridge — Iniciando...
echo ================================================
echo.

:: Verifica se ProfitDLL.dll existe
if not exist "ProfitDLL.dll" (
    if not exist "ProfitDLL64.dll" (
        echo [ERRO] ProfitDLL.dll nao encontrada nesta pasta.
        echo.
        echo Cole o arquivo ProfitDLL.dll aqui:
        echo %~dp0
        echo.
        pause
        exit /b 1
    )
)

:: Verifica configuração do token
findstr /C:"COLE_SEU_TOKEN_AQUI" profit_bridge.py >nul 2>&1
if %errorlevel% == 0 (
    echo [AVISO] TRADERLOG_TOKEN ainda nao configurado!
    echo.
    echo Abra profit_bridge.py e substitua:
    echo   TRADERLOG_TOKEN = "COLE_SEU_TOKEN_AQUI"
    echo pelo token gerado em /integracoes no TraderLog.
    echo.
    pause
    exit /b 1
)

echo [OK] Verificacoes concluidas.
echo [OK] Iniciando bridge — mantenha esta janela aberta enquanto opera.
echo.

python profit_bridge.py

echo.
echo [Bridge encerrado]
pause
