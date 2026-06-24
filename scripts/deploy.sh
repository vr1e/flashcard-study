#!/bin/bash
# PythonAnywhere deployment script (free tier).
#
# Run it from a Bash console whenever you want to ship:
#
#     cd ~/flashcard-study && ./scripts/deploy.sh
#
# Self-contained: pulls code, rebuilds the frontend, applies DB + static
# changes, and reloads the web app. No GitHub Actions or API token required.
#
# Override the defaults by exporting PA_USERNAME / PROJECT_DIR if your layout
# differs from the standard PythonAnywhere setup.

set -euo pipefail

# On PythonAnywhere `whoami` is your account username.
USERNAME="${PA_USERNAME:-$(whoami)}"
PROJECT_DIR="${PROJECT_DIR:-$HOME/flashcard-study}"
WSGI_FILE="/var/www/${USERNAME}_pythonanywhere_com_wsgi.py"

# Node is installed under ~/nodejs per docs/DEPLOYMENT.md; ensure it's on PATH
# (a non-interactive shell won't have sourced ~/.bashrc).
export PATH="$HOME/nodejs/bin:$PATH"

echo "→ Deploying $PROJECT_DIR (user: $USERNAME)"
cd "$PROJECT_DIR"

echo "→ Pulling latest code"
git pull origin main

echo "→ Activating virtualenv"
# shellcheck disable=SC1091
source .venv/bin/activate

echo "→ Installing Python dependencies"
pip install -r requirements.txt --quiet

echo "→ Building TypeScript → static/js/"
npm ci --no-audit --no-fund
npm run build

echo "→ Applying database migrations"
python manage.py migrate --noinput

echo "→ Collecting static files (--clear drops stale hashed files first)"
python manage.py collectstatic --noinput --clear

echo "→ Reloading web app"
if [ -f "$WSGI_FILE" ]; then
    touch "$WSGI_FILE"
    echo "  reloaded by touching $WSGI_FILE"
else
    echo "  WARNING: $WSGI_FILE not found."
    echo "  Reload manually from the Web tab, or set PA_USERNAME to match your domain."
fi

echo "$(date): Deployment successful" >> deployment.log
echo "✅ Done — live at https://${USERNAME}.pythonanywhere.com"
