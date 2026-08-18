@echo off
echo Checking for processes using port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Found process %%a using port 3000
    taskkill /PID %%a /F
)
echo Done.
