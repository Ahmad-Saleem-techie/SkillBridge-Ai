# 🌉 SkillBridge AI

> Full-stack AI career intelligence platform — React + Vite (Vercel) × FastAPI + CrewAI (Render) × SQLite

---

## Architecture

```
skillbridge-ai/
├── frontend/          → React 18 + Vite + Tailwind  →  deploy to Vercel
│   ├── src/
│   │   ├── pages/     (Home, Analyze, History, Dashboard)
│   │   ├── components/(Navbar, AgentPipeline, ResultTabs)
│   │   ├── hooks/     (useAnalysis — polling hook)
│   │   └── utils/     (api.js — all HTTP calls)
│   ├── vercel.json
│   └── package.json
│
└── backend/           → FastAPI + CrewAI + SQLite    →  deploy to Render
    ├── main.py        (routes, rate limiting, SSE, CORS)
    ├── agents.py      (4 CrewAI agents — Fireworks AI)
    ├── tasks.py       (4 sequential tasks with context chaining)
    ├── services/
    │   └── crew_service.py  (pipeline runner, retry, error handling)
    ├── db/
    │   ├── schema.sql       (7 tables)
    │   ├── database.py      (thread-safe SQLite)
    │   └── repository.py    (all CRUD operations)
    ├── requirements.txt
    └── render.yaml
```

---

## Step-by-Step Deployment

### 1. Create GitHub repo

```bash
# In the skillbridge-ai folder:
git init
git add .
git commit -m "feat: SkillBridge AI full-stack — initial release"

# On GitHub: create repo named skillbridge-ai (no README, no .gitignore)
git remote add origin https://github.com/YOUR_USERNAME/skillbridge-ai.git
git branch -M main
git push -u origin main
```

---

### 2. Deploy backend → Render.com

1. Go to **render.com** → **New → Web Service**
2. Connect GitHub → select `skillbridge-ai` → set **Root Directory** to `backend`
3. Render auto-detects `render.yaml` → click **Apply**
4. Go to **Environment** tab, add:
   - `FIREWORKS_API_KEY` = `fw-your-actual-key`
   *(leave FRONTEND_URL blank for now — add it after step 3)*
5. Click **Save Changes** — Render builds (~3 min)
6. Note your backend URL: `https://skillbridge-backend.onrender.com`

> 💾 **Disk**: render.yaml mounts a 1 GB persistent disk at `/data` so SQLite survives redeploys.

---

### 3. Deploy frontend → Vercel

1. Go to **vercel.com** → **Add New Project**
2. Import `skillbridge-ai` from GitHub → set **Root Directory** to `frontend`
3. Framework preset: **Vite** (auto-detected)
4. Add environment variable:
   - `VITE_API_URL` = `https://skillbridge-backend.onrender.com`
5. Click **Deploy** (~1 min)
6. Note your frontend URL: `https://skillbridge-ai.vercel.app`

---

### 4. Connect backend ↔ frontend CORS

1. Back in Render → your backend service → **Environment**
2. Add: `FRONTEND_URL` = `https://skillbridge-ai.vercel.app`
3. **Save Changes** → Render redeploys automatically

---

### 5. Verify everything works

```bash
# Backend health check
curl https://skillbridge-backend.onrender.com/health

# Expected:
# {"status":"ok","db":{"status":"ok",...},"fireworks_key_set":true,"version":"1.0.0"}
```

Open `https://skillbridge-ai.vercel.app` → type a career description → watch the agents run.

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in FIREWORKS_API_KEY
uvicorn main:app --reload --port 10000

# Terminal 2 — Frontend
cd frontend
npm install
cp .env.example .env.local    # VITE_API_URL=http://localhost:10000
npm run dev
# → http://localhost:5173
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET  | /health | Health check + DB status |
| POST | /analyze | Start pipeline → returns analysis_id |
| GET  | /analyze/:id/status | Poll for status |
| GET  | /analyze/:id/stream | SSE stream (alternative to polling) |
| GET  | /analyze/:id/result | Full result (call when done) |
| DELETE | /analyze/:id | Delete analysis |
| GET  | /history?limit=N | Recent analyses |
| GET  | /stats | Dashboard stats |
| GET  | /docs | Interactive API docs (Swagger) |

---

## Environment Variables

### Backend (Render)
| Variable | Required | Description |
|----------|----------|-------------|
| `FIREWORKS_API_KEY` | ✅ | From fireworks.ai/account/api-keys |
| `FRONTEND_URL` | ✅ | Your Vercel URL (for CORS) |
| `DB_PATH` | Auto | `/data/skillbridge.db` (set by render.yaml) |
| `RATE_LIMIT_MAX` | Optional | Requests per window (default: 5) |
| `RATE_LIMIT_WINDOW` | Optional | Window in seconds (default: 60) |

### Frontend (Vercel)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Your Render backend URL |

---

## Database (7 tables)

| Table | Purpose |
|-------|---------|
| `users` | One row per browser session ID |
| `sessions` | One row per browser chat session |
| `analyses` | One row per pipeline run |
| `skills` | Extracted skills per analysis |
| `job_matches` | Top 3 roles per analysis |
| `roadmap_phases` | Learning phases per analysis |
| `agent_logs` | Per-agent execution logs |

---

## Security Features

- Prompt injection detection (7 known attack phrases)
- API key format validation before any network call
- Per-IP rate limiting (5 req/60s, configurable)
- Input sanitization (length, special chars, encoding)
- Session IDs validated with regex
- IP addresses stored as SHA-256 hashes only
- CORS locked to frontend URL in production
- Security headers on all frontend responses (vercel.json)
- Auth errors never retried (fail fast on 401/403)
- Raw stack traces never exposed to end users
