# Flashcard Study Tool

A web-based flashcard application with **spaced repetition** (SM-2 algorithm) for optimized learning and long-term retention.

## ✨ Features

- 🎯 **Smart Scheduling** - SM-2 algorithm optimizes when you review cards
- 📚 **Deck Organization** - Group flashcards into custom decks
- 📊 **Progress Tracking** - Visualize your learning with charts and statistics
- 🎨 **Interactive Study** - Card flipping animations and keyboard shortcuts
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🔐 **Secure & Private** - User authentication keeps your study data safe

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+ and npm

### Installation

```bash
# 1. Clone or download this repository
git clone <repository-url>
cd flashcard-study

# 2. Create virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
npm install  # Automatically builds TypeScript

# 4. Setup database
python manage.py migrate
python manage.py createsuperuser

# 5. Run the server
python manage.py runserver
```

Visit **http://localhost:8000/** and log in with your superuser credentials.

## 💻 Development

Run these two commands in separate terminals:

```bash
# Terminal 1: TypeScript auto-compile
npm run watch

# Terminal 2: Django server
python manage.py runserver
```

Edit TypeScript files in `src/ts/` and templates in `templates/` - changes appear on refresh.

## 🧠 How Spaced Repetition Works

The SM-2 algorithm schedules reviews based on how well you remember:

- **0-2 (Hard)**: Card resets - review tomorrow
- **3 (Good)**: Interval increases moderately
- **4-5 (Easy)**: Interval increases significantly

Cards you struggle with appear more frequently. Cards you know well appear less often. This optimizes long-term retention.

**Learn more**: `docs/rfcs/0001-spaced-repetition-algorithm.md`

## 📁 Project Structure

```
flashcard-study/
├── flashcards/          # Django app (models, views, business logic)
├── templates/           # HTML templates
├── src/ts/              # TypeScript source files
├── static/
│   ├── css/             # Stylesheets (source controlled)
│   ├── images/          # Images (source controlled)
│   └── js/              # Compiled JavaScript (auto-generated, not in git)
├── docs/                # Technical documentation & RFCs
└── manage.py            # Django management script
```

**Note**: The `static/js/` directory is automatically generated from TypeScript source. It's git-ignored and rebuilt on `npm install`.

## 🛠️ Technology Stack

**Backend**: Django 4.2, Python 3.9+, SQLite  
**Frontend**: TypeScript, Bootstrap 5, Chart.js  
**Algorithm**: SM-2 spaced repetition

## 📚 Documentation

- **API Reference**: `docs/rfcs/0003-api-design.md`
- **Algorithm Details**: `docs/rfcs/0001-spaced-repetition-algorithm.md`
- **Study Flow**: `docs/rfcs/0002-study-session-flow.md`
- **Developer Guide**: `docs/README.md`

## 🎓 About This Project

### Distinctiveness & Complexity

This project demonstrates:

**Distinct from social networks**: No posts, feeds, or social interactions - purely a personal learning tool focused on algorithmic optimization.

**Distinct from e-commerce**: No products, shopping carts, or payments - educational focus with data-driven scheduling.

**Complexity highlights**:

- Custom SM-2 algorithm implementation with mathematical interval calculations
- Multi-model relationships with complex queries (due cards, session tracking)
- Interactive TypeScript frontend with animations and keyboard controls
- Real-time data visualization using Chart.js
- Type-safe development with TypeScript interfaces

## 📄 License

MIT

---

**Admin Panel**: http://localhost:8000/admin/  
**Need help?** Check `docs/README.md` for troubleshooting and development guidelines.
