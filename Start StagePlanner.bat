@echo off
rem Starts StagePlanner on this computer, with Google sign-in, at http://localhost:8000
title StagePlanner
cd /d "%~dp0"
start "" http://localhost:8000
node serve.js
pause
