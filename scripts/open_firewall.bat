@echo off
echo Adding firewall rule for Project Nexus (port 3000)...
netsh advfirewall firewall add rule name="Project Nexus Dev Server" dir=in action=allow protocol=TCP localport=3000 profile=any
echo.
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Firewall rule created. Phone can now reach the server.
) else (
    echo FAILED: Could not create rule. Make sure you right-clicked "Run as administrator".
)
echo.
pause
