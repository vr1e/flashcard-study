# RFC 0005: Production Deployment Preparation

**Status**: Implemented
**Created**: 2025-11-01
**Implemented**: 2025-11-02
**Target**: PythonAnywhere Deployment

## Abstract

Flashcard Study Tool has complete functionality and excellent code quality, but requires 6 critical configuration fixes before production deployment. This RFC outlines fixes for security vulnerabilities (SECRET_KEY, DEBUG, ALLOWED_HOSTS), deployment requirements (STATIC_ROOT), code bugs (timezone issues), and build process (TypeScript compilation).

## Context

### Current Status
- ✅ **Features**: SM-2 algorithm, 16 API endpoints, TypeScript frontend, authentication
- ✅ **Quality**: Clean architecture, type-safe, comprehensive docs (RFCs 0001-0004)
- ✅ **Testing**: E2E tested with Playwright (Nov 1, 2025)
- ⚠️ **Production**: 6 critical blockers prevent deployment

### Critical Blockers

| # | Issue | File:Line | Risk | Impact |
|---|-------|-----------|------|--------|
| 1 | SECRET_KEY exposed | `settings.py:12` | HIGH | Session hijacking, CSRF bypass |
| 2 | DEBUG = True | `settings.py:15` | HIGH | Exposes stack traces, source code |
| 3 | ALLOWED_HOSTS = [] | `settings.py:17` | HIGH | Django rejects all requests |
| 4 | Missing STATIC_ROOT | `settings.py` | HIGH | CSS/JS won't serve |
| 5 | Timezone-naive datetime | `utils.py`, `models.py` | MEDIUM | Scheduling bugs across timezones |
| 6 | TypeScript compilation | `.gitignore` | MEDIUM | No compiled JS in production |

**Estimate to fix**: 2-4 hours

## Proposal

Two-phase approach:
1. **Phase 1**: Fix 6 blockers + security hardening (2-4 hours)
2. **Phase 2**: Deploy to PythonAnywhere (1-2 hours)

## Implementation

### Fix #1: SECRET_KEY Security

**Problem**: Hardcoded in source code → session hijacking risk

**Solution**: Environment variables with python-decouple

```bash
# Install dependency
pip install python-decouple==3.8
echo "python-decouple==3.8" >> requirements.txt

# Generate secure key
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Create .env (don't commit!)
cat > .env << EOF
SECRET_KEY=<paste-50-char-key>
DEBUG=False
ALLOWED_HOSTS=yourusername.pythonanywhere.com
EOF

# Add to .gitignore
echo ".env" >> .gitignore
```

**Update `settings.py`**:
```python
from decouple import config, Csv

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='', cast=Csv())
```

---

### Fix #2: DEBUG Flag + Security Headers

**Problem**: DEBUG=True exposes internals in production

**Solution**: Environment-based config (covered in Fix #1) + security headers

**Add to `settings.py`**:
```python
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_CONTENT_TYPE_NOSNIFF = True
```

---

### Fix #3: ALLOWED_HOSTS

**Solution**: Covered in Fix #1 (environment variable)

**Local `.env`**: `ALLOWED_HOSTS=localhost,127.0.0.1`
**Production `.env`**: `ALLOWED_HOSTS=yourusername.pythonanywhere.com`

---

### Fix #4: STATIC_ROOT + Whitenoise

**Problem**: No static file collection configured

**Solution**: Add STATIC_ROOT + whitenoise for efficient serving

```bash
pip install whitenoise==6.6.0
echo "whitenoise==6.6.0" >> requirements.txt
```

**Update `settings.py`**:
```python
# After STATIC_URL
STATIC_ROOT = BASE_DIR / 'static_collected'

# Storage configuration
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Update MIDDLEWARE (add after SecurityMiddleware)
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # ADD THIS
    # ... rest of middleware
]
```

**Add to `.gitignore`**: `static_collected/`

---

### Fix #5: Timezone Issues (11 instances)

**Problem**: Using `datetime.now()` instead of `timezone.now()` → incorrect scheduling

**Files to fix**:
- `flashcards/utils.py`: Lines 63, 78, 121, 124, 131 (5 instances)
- `flashcards/models.py`: Lines 31, 52, 59 (3 instances for model defaults)

**Changes**:

**In `utils.py`**:
```python
# Change import:
from datetime import timedelta  # Remove datetime
from django.utils import timezone  # Add this

# Replace all 5 instances of datetime.now() with timezone.now()
```

**In `models.py`**:
```python
# Change import:
from django.utils import timezone  # Add this (remove datetime import)

# Update model field defaults:
next_review = models.DateTimeField(default=timezone.now)
started_at = models.DateTimeField(default=timezone.now)
reviewed_at = models.DateTimeField(default=timezone.now)
```

**Verify**:
```bash
grep -r "datetime\.now()" flashcards/ --include="*.py"
# Should return no results
```

---

### Fix #6: TypeScript Compilation

**Problem**: `static/js/` gitignored, unclear production strategy

**Solution**: Commit compiled JavaScript (simplest for PythonAnywhere)

```bash
# Update .gitignore (remove static/js/ line, keep node_modules/)
# Compile TypeScript
npm run build

# Commit compiled files
git add static/js/*.js
git commit -m "Add compiled JS for production"
```

**Alternative**: Build on PythonAnywhere (requires Node.js setup)

---

### Additional Quick Fixes

**Remove misleading TODO** (`flashcards/utils.py:38`):
```python
# DELETE THIS (algorithm is actually implemented below):
# TODO: Implement SM-2 algorithm
```

**Add basic logging** (`settings.py`):
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
        },
    },
    'root': {'handlers': ['file'], 'level': 'INFO'},
}

# Create logs directory
import os
os.makedirs(BASE_DIR / 'logs', exist_ok=True)
```

Add to `.gitignore`: `logs/`

---

## PythonAnywhere Deployment

### Prerequisites
1. PythonAnywhere account (free tier OK)
2. All 6 fixes applied and tested locally
3. Code pushed to GitHub/GitLab

### Deployment Steps

**1. Setup Environment**
```bash
# SSH into PythonAnywhere
cd ~
git clone <your-repo-url> flashcard-study
cd flashcard-study

python3.9 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**2. Create Production `.env`**
```bash
nano .env
# Add: SECRET_KEY, DEBUG=False, ALLOWED_HOSTS
```

**3. Database & Static Files**
```bash
source .venv/bin/activate
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

**4. Configure WSGI** (PythonAnywhere Web tab → WSGI file):
```python
import os, sys
path = '/home/yourusername/flashcard-study'
sys.path.insert(0, path)
os.environ['DJANGO_SETTINGS_MODULE'] = 'flashcard_project.settings'

from dotenv import load_dotenv
load_dotenv(os.path.join(path, '.env'))

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

**5. Configure Static Files** (Web tab → Static files):
- URL: `/static/`
- Directory: `/home/yourusername/flashcard-study/static_collected/`

**6. Set Python Version**: 3.9 (Web tab)

**7. Reload**: Click "Reload" button

---

## Validation

### Pre-Deployment Checklist
```bash
# 1. Environment loads
python -c "from decouple import config; print(len(config('SECRET_KEY')))"
# Output: 50+

# 2. No timezone issues
grep -r "datetime\.now()" flashcards/ --include="*.py"
# Output: (empty)

# 3. Static files work
python manage.py collectstatic --noinput
# Output: Success

# 4. Deployment check
python manage.py check --deploy
# Output: No critical issues

# 5. Test with DEBUG=False locally
# Set DEBUG=False in .env
python manage.py runserver --insecure
```

### Post-Deployment Tests
- [ ] Homepage loads with CSS/JS
- [ ] Login/logout works
- [ ] Create deck → Add cards → Study → View stats
- [ ] Admin panel accessible at /admin/
- [ ] No stack traces visible (DEBUG=False confirmed)
- [ ] Mobile responsive
- [ ] Check PythonAnywhere error logs

---

## Rollback Plan

**Backup before deployment**:
```bash
cp db.sqlite3 db.sqlite3.backup.$(date +%Y%m%d)
```

**Quick revert**:
```bash
git reset --hard <previous-commit>
python manage.py collectstatic --noinput
# Reload web app via PythonAnywhere
```

---

## Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| **Fix Blockers** | #1-6 fixes, security headers, timezone corrections | 2-4h |
| **Deploy** | PythonAnywhere setup, config, testing | 1-2h |
| **Total** | End-to-end production deployment | **4-6h** |

---

## Success Criteria

- [ ] All 6 blockers resolved
- [ ] `python manage.py check --deploy` passes
- [ ] Application accessible at https://yourusername.pythonanywhere.com/
- [ ] Static files load correctly
- [ ] Core workflow functional (deck → cards → study → stats)
- [ ] No security warnings (SECRET_KEY, DEBUG, ALLOWED_HOSTS)
- [ ] Timezone-aware scheduling working
- [ ] Admin panel accessible
- [ ] No console errors or stack traces

---

## References

- Django Deployment: https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/
- PythonAnywhere: https://help.pythonanywhere.com/pages/DeployExistingDjangoProject/
- Related RFCs: 0001 (Algorithm), 0002 (UX), 0003 (API), 0004 (Testing)

---

**Revision History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-01 | Initial deployment preparation plan |
| 1.1 | 2025-11-01 | Condensed to <500 lines per project standards |

---

**END OF RFC 0005**
