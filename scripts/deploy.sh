#!/bin/bash
# PythonAnywhere deployment script
# Place this at ~/deploy.sh on your PythonAnywhere account
# Usage: chmod +x ~/deploy.sh && ~/deploy.sh

set -e

USERNAME="yourusername"  # CHANGE THIS
PROJECT_DIR="/home/$USERNAME/flashcard-study"

cd "$PROJECT_DIR"
git pull origin main
source .venv/bin/activate
pip install -r requirements.txt --quiet
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
echo "$(date): Deployment successful" >> deployment.log
