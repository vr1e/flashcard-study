# Deploying to PythonAnywhere

The app runs on a free PythonAnywhere account. There's no SSH on the free tier, so everything below happens in a Bash console (Consoles tab) and the Web tab.

## First-time setup

Clone the repo and set up Python 3.11:

```bash
cd ~
git clone https://github.com/vr1e/flashcard-study.git
cd flashcard-study
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

PythonAnywhere doesn't ship Node, which we need to compile the TypeScript. Install it under `~/nodejs` (`scripts/deploy.sh` expects it there):

```bash
cd ~
wget https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz
tar -xf node-v22.20.0-linux-x64.tar.xz
mv node-v22.20.0-linux-x64 nodejs
echo 'export PATH=$HOME/nodejs/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

Create `~/flashcard-study/.env`:

```env
SECRET_KEY=<generate one, see below>
DEBUG=False
ALLOWED_HOSTS=yourusername.pythonanywhere.com
```

To generate a key: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`

Then build and set up the database:

```bash
cd ~/flashcard-study
npm ci
npm run build
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

## Web tab

- Python version: 3.11, same as the venv.
- Virtualenv: `/home/yourusername/flashcard-study/.venv`. Without it you'll get `ModuleNotFoundError: decouple`.
- Static files: map `/static/` to `/home/yourusername/flashcard-study/static_collected/`.
- Security: turn on Force HTTPS.
- WSGI file: replace its contents with:

```python
import os, sys

path = '/home/yourusername/flashcard-study'
if path not in sys.path:
    sys.path.insert(0, path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'flashcard_project.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

`.env` is picked up by python-decouple on its own, so the WSGI file doesn't need to load it.

Hit Reload and check that the site loads with styles, you can register and study a deck, `/admin/` works, and a made-up URL gives a plain "Not Found" instead of the Django debug page.

## Updating

```bash
cd ~/flashcard-study
./scripts/deploy.sh
```

It pulls `main`, installs dependencies, rebuilds the frontend, migrates, collects static files and reloads the app. Clicking Reload on its own just restarts the old code, so always run the script.

If it warns that it can't find the WSGI file, your domain doesn't match your username. Click Reload by hand, or set `PA_USERNAME` before running it.

CI runs on every push to `main`, but it doesn't deploy anything.

## When something breaks

- Check the error log first (Web tab, Log files).
- No CSS or JS: check the static mapping, then rerun `collectstatic`. If JS is missing, rerun `npm run build` first.
- `ModuleNotFoundError`: the virtualenv path in the Web tab is wrong, or `pip install -r requirements.txt` didn't run in the venv.
- Settings errors on startup: `.env` must sit in the project root, next to `manage.py`.
- Database errors: run `python manage.py migrate`.

## Backups

The data is all in `db.sqlite3`. Before anything risky, copy it:

```bash
cp db.sqlite3 db.sqlite3.$(date +%Y%m%d)
```

Every so often, download a copy from the Files tab too.
