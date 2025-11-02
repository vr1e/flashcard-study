# RFC 0006: Automated Deployment Pipeline

**Status**: Implemented
**Created**: 2025-11-02
**Implemented**: 2025-11-02

---

## What are we building?

GitHub Actions CI/CD pipeline that builds TypeScript in CI, uploads compiled JS to PythonAnywhere, and deploys automatically on every push to main.

## Why?

**Current**: Manual 8-step deployment (git pull, npm build, pip install, migrate, collectstatic, reload)

**With automation**:
- One command: `git push origin main`
- Consistent builds (always Node 22, Python 3.11)
- Pre-deployment tests
- No compiled JS in git history

## How?

### Architecture

```
git push → GitHub Actions → PythonAnywhere
           ├─ Run tests
           ├─ Build TypeScript
           ├─ Upload static/js/*.js
           └─ Trigger deploy.sh
                ├─ git pull
                ├─ pip install
                ├─ migrate
                ├─ collectstatic
                └─ reload
```

###Files

**`.github/workflows/deploy.yml`**: GitHub Actions workflow
**`scripts/deploy.sh`**: PythonAnywhere deployment script (copy to `~/deploy.sh`)

### Key Decisions

**1. Build TypeScript in CI vs commit compiled JS**
- ✅ Chose CI build: cleaner git history, consistent Node version
- ⚠️ Tradeoff: Requires GitHub secrets setup

**2. Upload JS via API vs build on PythonAnywhere**
- ✅ Chose API upload: PA has outdated Node.js
- ⚠️ API rate limit: 120 req/min (sufficient for ~5 files/deploy)

**3. Trigger via API vs webhook**
- ✅ Chose API: simpler, no attack surface
- Future: Could add webhook for instant deploys

### Security

**GitHub Secrets** (never commit):
- `PA_USERNAME`: PythonAnywhere username
- `PA_API_TOKEN`: From PA Account → API Token (rotate every 90 days)
- `PA_DOMAIN`: e.g., `username.pythonanywhere.com`

### Performance

- **Deployment time**: ~3-5 minutes
- **GitHub Actions**: ~3 min/deploy (free tier: 2,000 min/month)
- **Capacity**: ~600 deployments/month

## Notes

**Alternative approaches considered**:
1. Commit compiled JS - rejected (pollutes git history)
2. Django webhook endpoint - deferred (adds complexity)
3. Build on PythonAnywhere with NVM - rejected (slow, complex)

**Testing**: Django checks run before deployment; failed tests block deploy

**Rollback**: `git reset --hard <commit> && ~/deploy.sh`

---

## Success Criteria

- [x] `git push` triggers automatic deployment
- [x] TypeScript builds in CI (not committed)
- [x] Tests must pass before deployment
- [x] Deployment completes in <5 minutes
- [x] Zero manual steps required

---

**References**:
- PythonAnywhere API: https://help.pythonanywhere.com/pages/API/
- Related: RFC 0005 (Production Deployment)

---

**END OF RFC 0006**
