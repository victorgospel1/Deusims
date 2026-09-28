@echo off
cd /d "%~dp0"
title Okrika Bales - setup
echo.
echo  ===== Shop setup (one time) =====
echo.
echo  Installing tools...
call npm install || goto fail
echo.
echo  STEP 1: Create your Convex database.
echo  A browser window may open so you can log in or sign up (free).
echo  If it asks questions, choose: create a new project.
call npx convex dev --once || goto fail
call node tools\configure.mjs || goto fail
echo.
echo  STEP 2: Admin password
set /p ADMINPW=  Choose a password for the admin page: 
call npx convex env set ADMIN_PASSWORD "%ADMINPW%" || goto fail
echo.
echo  STEP 3: Paystack (for bank transfer and card payments)
echo  Find it at dashboard.paystack.com - Settings - API Keys and Webhooks.
set /p PSKEY=  Paste your Paystack SECRET key (sk_test_... or sk_live_...), or press Enter to do it later: 
if not "%PSKEY%"=="" call npx convex env set PAYSTACK_SECRET_KEY "%PSKEY%"
echo.
set /p SITEURL=  Your website address (press Enter for http://localhost:3000): 
if "%SITEURL%"=="" set SITEURL=http://localhost:3000
call npx convex env set SITE_URL "%SITEURL%"
echo.
set /p AIKEY=  Optional - Anthropic API key for the AI assistant (Enter to skip): 
if not "%AIKEY%"=="" call npx convex env set ANTHROPIC_API_KEY "%AIKEY%"
echo.
call npm run css
echo.
echo  ===== All done! =====
echo  Now double-click start.bat, open http://localhost:3000/admin/ and sign in
echo  with the password you chose. Add your bales and your shop is live.
echo.
pause
exit /b 0
:fail
echo.
echo  Something went wrong above. Read the red message, fix it, and run setup.bat again.
pause
exit /b 1
