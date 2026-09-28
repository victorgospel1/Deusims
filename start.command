#!/bin/sh
# Double-click (Mac) or run ./start.sh to start the site from the right folder.
cd "$(dirname "$0")"
(sleep 3; open http://localhost:3000/admin/ 2>/dev/null || xdg-open http://localhost:3000/admin/) &
npx serve .
