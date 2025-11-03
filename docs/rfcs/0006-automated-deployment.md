# RFC 0006: Automated Deployment Pipeline

**Status**: Implemented (Simplified 2025-11-03)
**Created**: 2025-11-02
**Implemented**: 2025-11-02
**Simplified**: 2025-11-03

---

## What are we building?

GitHub Actions CI/CD pipeline that builds TypeScript in CI, uploads compiled JS directly to PythonAnywhere's serving directory, and reloads the web app automatically on every push to main.

## Why?

**Before automation**: Manual 8-step deployment (git pull, npm build, pip install, migrate, collectstatic, reload)

**With automation**:

- One command: `git push origin main`
- Consistent builds (always Node 22, Python 3.11)
- Pre-deployment tests
- No compiled JS in git history
- Fast and reliable (~2 minutes)

## How?

### Architecture (Simplified)

```
git push → GitHub Actions → PythonAnywhere
           ├─ Run tests
           ├─ Build TypeScript
           ├─ Upload to static_collected/js/
           └─ Reload web app
```

**Note**: Removed console-based deployment due to API unreliability. Manual steps now required for:

- Database migrations: `python manage.py migrate`
- Python dependencies: `pip install -r requirements.txt`

These are infrequent operations, so manual execution is acceptable.

### Files

**`.github/workflows/deploy.yml`**: GitHub Actions workflow (simplified, no console API)
**`scripts/deploy.sh`**: PythonAnywhere deployment script (kept for reference, not used in CI)

### Key Decisions

**1. Build TypeScript in CI vs commit compiled JS**

- ✅ Chose CI build: cleaner git history, consistent Node version
- ⚠️ Tradeoff: Requires GitHub secrets setup

**2. Upload JS via API vs build on PythonAnywhere**

- ✅ Chose API upload: PA has outdated Node.js
- ⚠️ API rate limit: 120 req/min (sufficient for ~6 files/deploy)

**3. Upload to static/ vs static_collected/**

- ✅ Chose static_collected/: direct upload to serving directory
- No need for collectstatic step in CI

**4. Console API for migrations vs manual** (2025-11-03 revision)

- ✅ Chose manual: console API unreliable (commands don't execute consistently)
- ⚠️ Tradeoff: Manual `migrate` and `pip install` when needed (infrequent)

### Security

**GitHub Secrets** (never commit):

- `PA_USERNAME`: PythonAnywhere username
- `PA_API_TOKEN`: From PA Account → API Token (rotate every 90 days)
- `PA_DOMAIN`: e.g., `username.pythonanywhere.com`

### Performance

- **Deployment time**: ~2 minutes (simplified from 3-5 minutes)
- **GitHub Actions**: ~2 min/deploy (free tier: 2,000 min/month)
- **Capacity**: ~1000 deployments/month

## Notes

**Alternative approaches considered**:

1. Commit compiled JS - rejected (pollutes git history)
2. Console API for full automation - tried, rejected (unreliable command execution)
3. Django webhook endpoint - deferred (adds complexity)
4. Build on PythonAnywhere with NVM - rejected (slow, complex)

**Testing**: Django checks run before deployment; failed tests block deploy

**Rollback**: Revert code commit, push to trigger new deployment

**Manual steps when needed**:

- Database migrations: `python manage.py migrate` (when models change)
- Dependencies: `pip install -r requirements.txt` (when requirements.txt changes)
- Run these via PythonAnywhere console or bash console

---

## Success Criteria

- [x] `git push` triggers automatic deployment
- [x] TypeScript builds in CI (not committed)
- [x] Tests must pass before deployment
- [x] Deployment completes in <3 minutes (achieved: ~2 min)
- [x] Zero manual steps for JS updates
- [x] Simple, reliable workflow (simplified 2025-11-03)

---

**References**:

- PythonAnywhere API: https://help.pythonanywhere.com/pages/API/
- Related: RFC 0005 (Production Deployment)

---

**END OF RFC 0006**
