@echo off
setlocal enabledelayedexpansion
echo ===================================================
echo CareFlow Android APK Self-Contained Build Pipeline
echo ===================================================

set PROJECT_DIR=%~dp0
set PLATFORMS_DIR=%PROJECT_DIR%
set JDK_ZIP=%PLATFORMS_DIR%jdk.zip
set JDK_DIR=%PLATFORMS_DIR%jdk-17

:: 1. Check/Download Portable JDK 17
if not exist "%JDK_DIR%" (
    echo [INFO] Portable JDK 17 not found. Downloading Eclipse Temurin OpenJDK 17...
    curl.exe -L -o "%JDK_ZIP%" "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to download JDK. Please verify internet connection.
        exit /b 1
    )
    
    echo [INFO] Unpacking JDK archive to %JDK_DIR%...
    powershell.exe -Command "Expand-Archive -Path '%JDK_ZIP%' -DestinationPath '%JDK_DIR%'"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to unzip JDK.
        exit /b 1
    )
    
    del "%JDK_ZIP%"
    echo [SUCCESS] Portable JDK 17 ready!
)

:: 2. Resolve JDK Home Folder (Temurin extract wraps inside a subfolder)
for /d %%i in ("%JDK_DIR%\*") do (
    set JAVA_HOME=%%i
)

echo [INFO] JAVA_HOME is mapped to: %JAVA_HOME%
set PATH=%JAVA_HOME%\bin;%PATH%

:: 3. Run Android Build using Gradle
echo [INFO] Starting Gradle compilation build...
cd "%PLATFORMS_DIR%android"
call gradlew.bat assembleDebug
if !errorlevel! neq 0 (
    echo [ERROR] Gradle compilation failed.
    exit /b 1
)

echo ===================================================
echo [SUCCESS] CareFlow Android APK compiled successfully!
echo ===================================================
for /r "%PLATFORMS_DIR%android" %%f in (*.apk) do (
    echo   Compiled APK: %%f
    copy "%%f" "%PLATFORMS_DIR%careflow-debug.apk" >nul
    echo   Copied to: %PLATFORMS_DIR%careflow-debug.apk
)
exit /b 0
