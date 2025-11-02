# Production Deployment Guide

## Overview

This guide covers deploying the Flashcard Study Tool to PythonAnywhere. The application requires Node.js for TypeScript compilation before running the Django application.

## Prerequisites

- PythonAnywhere account (free tier is sufficient)
- Code repository accessible via Git (GitHub, GitLab, etc.)
- All production fixes from RFC 0005 applied

## Version Requirements

### Python: 3.11 (Recommended)

- **Django 4.2 LTS**: Compatible with Python 3.8-3.12
- **Python 3.11**: Active support until October 2027
- **Alternatives**: Python 3.10 or 3.12 also supported
- **PythonAnywhere**: Requires "Innit" system image for Python 3.10+

**Why 3.11?** Excellent performance improvements, long support timeline, and fully compatible with Django 4.2 LTS.

### Node.js: v22.20.0 LTS (Recommended)

- **Current LTS**: Node.js 22.x ("Jod")
- **Support**: Until April 2027
- **Alternative**: Node.js 20.x (v20.19.5) supported until April 2026

**Why 22.x?** Latest LTS with longer support timeline and active maintenance.

## Deployment Steps

### 1. Clone Repository

SSH into your PythonAnywhere account and clone the repository:

```bash
cd ~
git clone <your-repo-url> flashcard-study
cd flashcard-study
```

### 2. Set Up Python Environment

Create and activate a Python virtual environment:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Install Node.js (for TypeScript Compilation)

PythonAnywhere doesn't have Node.js pre-installed. Install it manually:

```bash
# Download and install Node.js (LTS version)
cd ~
wget https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz
tar -xf node-v22.20.0-linux-x64.tar.xz
mv node-v22.20.0-linux-x64 nodejs

# Add to PATH
echo 'export PATH=$HOME/nodejs/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Verify installation
node --version
npm --version
```

### 4. Build TypeScript

Compile TypeScript to JavaScript:

```bash
cd ~/flashcard-study
npm install
npm run build
```

This will generate JavaScript files in `static/js/` directory.

**Important**: If you update TypeScript source files (`src/ts/`), you must rebuild:
```bash
npm run build
```

### 5. Configure Environment Variables

Create production `.env` file:

```bash
cd ~/flashcard-study
nano .env
```

Add the following (replace with your actual values):

```env
# Generate new key: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-production-secret-key-here

# Production settings
DEBUG=False

# Your PythonAnywhere domain
ALLOWED_HOSTS=yourusername.pythonanywhere.com
```

**Security**: Never commit the `.env` file to version control!

### 6. Set Up Database

Run migrations and create a superuser:

```bash
source .venv/bin/activate
python manage.py migrate
python manage.py createsuperuser
```

### 7. Collect Static Files

Gather all static files (CSS, JS, images) into one directory:

```bash
python manage.py collectstatic --noinput
```

This creates `static_collected/` directory with all static assets.

### 8. Configure WSGI Application

In PythonAnywhere Web tab, edit the WSGI configuration file:

```python
import os, sys

# Add project directory to path
path = '/home/yourusername/flashcard-study'
if path not in sys.path:
    sys.path.insert(0, path)

# Set Django settings module
os.environ['DJANGO_SETTINGS_MODULE'] = 'flashcard_project.settings'

# Get Django WSGI application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

**Note**: Replace `yourusername` with your actual PythonAnywhere username.

**Important**: The `.env` file is automatically loaded by `python-decouple` when Django starts, so no manual loading is needed in the WSGI file.

### 9. Configure Static Files Mapping

In PythonAnywhere Web tab → Static files section, add:

| URL           | Directory                                              |
|---------------|--------------------------------------------------------|
| `/static/`    | `/home/yourusername/flashcard-study/static_collected/` |

### 10. Set Python Version

In PythonAnywhere Web tab:
- Select **Python 3.11** or later
- **Note**: Requires PythonAnywhere "Innit" system image for Python 3.10+

### 11. Enable Force HTTPS

In PythonAnywhere Web tab → Security section:
- Set **Force HTTPS** to **Enabled**
- This ensures all traffic is encrypted (redirects http → https)
- Leave **Password protection** disabled (Django handles authentication)

### 12. Reload Application

Click the **Reload** button on the Web tab.

## Post-Deployment Verification

### Health Checks

1. **Homepage loads**: Visit `https://yourusername.pythonanywhere.com/`
   - CSS and JavaScript should load correctly
   - No console errors in browser DevTools

2. **Authentication works**:
   - Register new account or login
   - Logout functionality

3. **Core workflow**:
   - Create a deck
   - Add flashcards to the deck
   - Start study session
   - View statistics

4. **Admin panel**: Visit `https://yourusername.pythonanywhere.com/admin/`
   - Login with superuser credentials
   - Verify models are accessible

5. **Debug mode is off**:
   - Trigger a 404 error (visit `/nonexistent-page/`)
   - Should see custom 404 page, NOT Django debug page

### Check Logs

If something goes wrong, check PythonAnywhere logs:
- **Error log**: Web tab → Log files → Error log
- **Server log**: Web tab → Log files → Server log

## Updating the Application

When you push code changes:

1. **Pull latest code**:
   ```bash
   cd ~/flashcard-study
   git pull origin main
   ```

2. **Rebuild TypeScript** (if frontend changed):
   ```bash
   npm run build
   ```

3. **Install new dependencies** (if requirements.txt changed):
   ```bash
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Run migrations** (if models changed):
   ```bash
   python manage.py migrate
   ```

5. **Collect static files** (if static files changed):
   ```bash
   python manage.py collectstatic --noinput
   ```

6. **Reload application**: Click Reload button on PythonAnywhere Web tab

## Troubleshooting

### Issue: Static files not loading

**Solution**:
- Verify static files mapping in Web tab
- Check `static_collected/` directory exists and has files
- Run `python manage.py collectstatic --noinput` again

### Issue: "ModuleNotFoundError" for dependencies

**Solution**:
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt`
- Check WSGI file activates the correct venv path

### Issue: Environment variables not loading

**Solution**:
- Verify `.env` file exists in project root
- Check WSGI file has `load_dotenv()` call
- Ensure `python-decouple` is installed: `pip list | grep decouple`

### Issue: JavaScript not working

**Solution**:
- Check browser console for errors
- Verify `npm run build` completed successfully
- Check `static/js/` directory has compiled `.js` files
- Run `python manage.py collectstatic --noinput` to re-collect

### Issue: Database errors

**Solution**:
- Run `python manage.py migrate` to apply migrations
- Check `db.sqlite3` file permissions
- For PythonAnywhere, database should be in `/home/yourusername/flashcard-study/`

## Backup Strategy

### Database Backup

```bash
# Create timestamped backup
cp db.sqlite3 db.sqlite3.backup.$(date +%Y%m%d_%H%M%S)
```

### Download Backup Locally

Use PythonAnywhere's Files tab to download `db.sqlite3` periodically.

## Security Checklist

- [ ] `DEBUG=False` in production `.env`
- [ ] Unique `SECRET_KEY` in production `.env`
- [ ] `ALLOWED_HOSTS` configured correctly
- [ ] `.env` file is NOT in version control
- [ ] Admin panel accessible only to superusers
- [ ] HTTPS enabled (automatic on PythonAnywhere)

## Performance Optimization

### Enable Compression

Whitenoise is already configured for gzip compression of static files. No additional setup needed.

### Monitor Resource Usage

- PythonAnywhere free tier has CPU and bandwidth limits
- Monitor usage in Account tab
- Consider upgrading if limits are reached

## Support

- **PythonAnywhere Help**: https://help.pythonanywhere.com/
- **Django Deployment Docs**: https://docs.djangoproject.com/en/4.2/howto/deployment/
- **Project Issues**: Check project README for issue tracker

---

**Last Updated**: 2025-11-02 (Version requirements and WSGI configuration updated)
