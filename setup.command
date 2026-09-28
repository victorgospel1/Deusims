#!/bin/sh
# One-time shop setup (Mac/Linux). Double-click or run ./setup.command
cd "$(dirname "$0")" || exit 1
set -e
echo "\n===== Shop setup (one time) =====\n"
npm install
echo "\nSTEP 1: Create your Convex database (a browser may open to log in / sign up, free)."
npx convex dev --once
node tools/configure.mjs
printf "STEP 2: Choose a password for the admin page: "; read -r ADMINPW
npx convex env set ADMIN_PASSWORD "$ADMINPW"
printf "STEP 3: Paste your Paystack SECRET key (sk_test_/sk_live_), or press Enter to skip: "; read -r PSKEY
[ -n "$PSKEY" ] && npx convex env set PAYSTACK_SECRET_KEY "$PSKEY"
printf "Your website address (Enter for http://localhost:3000): "; read -r SITEURL
npx convex env set SITE_URL "${SITEURL:-http://localhost:3000}"
printf "Optional - Anthropic API key for the AI assistant (Enter to skip): "; read -r AIKEY
[ -n "$AIKEY" ] && npx convex env set ANTHROPIC_API_KEY "$AIKEY"
npm run css
echo "\n===== All done! Run start.command, open http://localhost:3000/admin/ and add your bales. =====\n"
