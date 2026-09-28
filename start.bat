@echo off
REM Double-click this file to run the site. It always starts from the right folder.
cd /d "%~dp0"
echo Starting the site... keep this window open while you use it.
start "" http://localhost:3000
start "" http://localhost:3000/admin/
npx serve .
