#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

# ── 1. Abhängigkeiten installieren ───────────────────────────────────────────
echo "==> Prüfe Abhängigkeiten…"

if ! command -v psql &>/dev/null; then
  echo "==> Installiere PostgreSQL 16…"
  brew install postgresql@16
  brew link postgresql@16 --force
fi
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

if ! brew list pgvector &>/dev/null 2>&1; then
  echo "==> Installiere pgvector…"
  brew install pgvector
fi

if ! command -v node &>/dev/null; then
  echo "==> Installiere Node.js…"
  brew install node
fi

# ── 2. PostgreSQL starten ────────────────────────────────────────────────────
echo "==> Starte PostgreSQL…"
brew services start postgresql@16
sleep 2

# ── 3. Datenbank anlegen ─────────────────────────────────────────────────────
if ! psql -U "$USER" -lqt 2>/dev/null | cut -d\| -f1 | grep -qw "anforderungsdb"; then
  echo "==> Lege Datenbank an…"
  createdb anforderungsdb 2>/dev/null || true
  psql -U "$USER" -d anforderungsdb -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
  psql -U "$USER" -d anforderungsdb -f init.sql
  echo "    ✓ Datenbank initialisiert"
fi

# ── 4. .env anlegen ──────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "  ┌─────────────────────────────────────────────────────────────┐"
  echo "  │  Bitte trage deinen Voyage AI API-Key in .env ein:          │"
  echo "  │  VOYAGE_API_KEY=...                                          │"
  echo "  │  Dann starte ./start.sh erneut.                             │"
  echo "  └─────────────────────────────────────────────────────────────┘"
  echo ""
  exit 1
fi

source .env
if [ -z "$VOYAGE_API_KEY" ] || [ "$VOYAGE_API_KEY" = "your_voyage_api_key_here" ]; then
  echo "FEHLER: Kein VOYAGE_API_KEY in .env gesetzt."
  exit 1
fi

# ── 5. Python-Backend ────────────────────────────────────────────────────────
echo "==> Bereite Python-Backend vor…"
cd backend

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Datenbankurl für lokalen Betrieb (kein Passwort nötig bei lokalem Postgres)
export DATABASE_URL="postgresql://$USER@localhost:5432/anforderungsdb"
export VOYAGE_API_KEY="$VOYAGE_API_KEY"

echo "==> Starte Backend auf http://localhost:8000 …"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd ..

# ── 6. Frontend ──────────────────────────────────────────────────────────────
echo "==> Bereite Frontend vor…"
cd frontend

if [ ! -d node_modules ]; then
  npm install
fi

echo "==> Starte Frontend auf http://localhost:5173 …"
npm run dev &
FRONTEND_PID=$!

cd ..

# ── 7. Browser öffnen ────────────────────────────────────────────────────────
sleep 3
open "http://localhost:5173" 2>/dev/null || true

echo ""
echo "  ✓ Anforderungsdatenbank läuft!"
echo "  Frontend:  http://localhost:5173"
echo "  API-Docs:  http://localhost:8000/docs"
echo ""
echo "  Zum Beenden: Ctrl+C"

# Warten bis Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; brew services stop postgresql@16; echo 'Gestoppt.'" EXIT
wait
