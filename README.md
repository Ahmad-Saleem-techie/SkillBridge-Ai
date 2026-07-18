<div align="center">

# 🌉 SkillBridge AI

### Multi-agent AI career intelligence — from raw experience to a job-ready roadmap

**React 18 + Vite** · **FastAPI + CrewAI** · **SQLite** · **Fireworks AI (Llama 3.1 70B)**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![CrewAI](https://img.shields.io/badge/CrewAI-Agent%20Orchestration-6E56CF)](https://www.crewai.com)
[![SQLite](https://img.shields.io/badge/SQLite-Database-07405E?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Deployed on Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&logoColor=white)](https://render.com)
[![Deployed on Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)](https://vercel.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#)

</div>

> Add a `LICENSE` file and a matching badge once you've picked one — an MIT/Apache badge without a file behind it is a claim the repo doesn't back up yet.

---

## Overview

SkillBridge AI turns a plain-text career description into a structured career plan. Rather than a single LLM call, it runs a **sequential crew of four specialized agents** — each one reading the previous agent's output before doing its own job — so the final result is built up in stages rather than guessed in one shot.

Sessions are secured end-to-end with **JWT authentication**, and the approach has been validated with a **comparative analysis against a classical ML-based job recommendation system**, benchmarking the agentic pipeline against a traditional model.

---

## Key Features

| | |
|---|---|
| 🤖 **4-agent CrewAI pipeline** | Sequential context chaining — each agent builds on the last |
| ⚡ **Real-time progress** | Server-Sent Events, with polling as a fallback |
| 🎯 **Top-3 job matching** | Ranked roles based on the extracted skill profile |
| 🗺️ **Phased learning roadmap** | Concrete next steps tailored to each skill gap |
| 🔑 **JWT-authenticated sessions** | Auth enforced across every route |
| 📊 **Full history & dashboard** | Every analysis persisted and revisitable |
| 🔒 **Defense-in-depth security** | Prompt-injection detection, rate limiting, hashed IPs — see [Security](#security) |
| 💾 **Zero-ops persistence** | SQLite on a mounted Render disk, no external DB to provision |

---

## System Architecture

```
┌────────────────────┐        HTTPS / SSE        ┌─────────────────────────┐
│   React + Vite       │ ─────────────────────────▶ │        FastAPI            │
│   (Vercel)            │ ◀───────────────────────── │       (Render)             │
└────────────────────┘        JSON / stream        │  ├─ JWT auth                │
                                                     │  ├─ rate limiting + CORS    │
                                                     │  └─ crew_service.py         │
                                                     │       (pipeline runner)     │
                                                     └──────────┬──────────────────┘
                                                                │
                                                                ▼
                                        ┌───────────────────────────────────┐
                                        │   CrewAI Agent Crew                  │
                                        │   Fireworks AI · Llama 3.1 70B        │
                                        │                                        │
                                        │  Skill Extractor → Job Matcher →        │
                                        │  Gap Analyzer → Roadmap Builder          │
                                        └──────────────────┬────────────────────┘
                                                            │
                                                            ▼
                                            ┌───────────────────────────┐
                                            │   SQLite · 7 tables          │
                                            │   persistent Render disk      │
                                            └───────────────────────────┘
```

**Request flow:** `POST /analyze` kicks off the crew asynchronously → the client polls `/status` or subscribes to `/stream` (SSE) → each agent logs its step to `agent_logs` as it completes → the client fetches the finished, structured output from `/result`.

---

## Getting Started

**Prerequisites:** Node 18+, Python 3.10+, a [Fireworks AI](https://fireworks.ai/account/api-keys) API key.

```bash
git clone https://github.com/YOUR_USERNAME/skillbridge-ai.git
cd skillbridge-ai

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in FIREWORKS_API_KEY, JWT_SECRET
uvicorn main:app --reload --port 10000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local    # VITE_API_URL=http://localhost:10000
npm run dev                   # → http://localhost:5173
```

---

## Deployment

**Backend → Render**
1. New Web Service → connect repo → Root Directory: `backend`
2. Render auto-applies `render.yaml`
3. Environment tab → add `FIREWORKS_API_KEY` (add `FRONTEND_URL` after step 2)
4. Save — Render builds (~3 min) and mounts a 1 GB disk at `/data` so SQLite survives redeploys

**Frontend → Vercel**
1. Add New Project → import repo → Root Directory: `frontend`
2. Add env var `VITE_API_URL = <your-render-backend-url>`
3. Deploy (~1 min)

**Connect CORS:** back in Render, set `FRONTEND_URL = <your-vercel-url>` → redeploys automatically.

**Verify:**
```bash
curl https://skillbridge-backend.onrender.com/health
# {"status":"ok","db":{"status":"ok",...},"fireworks_key_set":true,"version":"1.0.0"}
```

---

## API Reference

| Method | Path | Description |
|--------|------|--------------|
| `GET` | `/health` | Health check + DB status |
| `POST` | `/analyze` | Start pipeline → returns `analysis_id` |
| `GET` | `/analyze/:id/status` | Poll for status |
| `GET` | `/analyze/:id/stream` | SSE stream (live progress) |
| `GET` | `/analyze/:id/result` | Full structured result |
| `DELETE` | `/analyze/:id` | Delete an analysis |
| `GET` | `/history?limit=N` | Recent analyses |
| `GET` | `/stats` | Dashboard stats |
| `GET` | `/docs` | Interactive Swagger UI |

---

## AI Pipeline

Four CrewAI agents run **strictly in sequence** — not in parallel — because each one's output is the next one's input. This context chaining is what keeps the final roadmap grounded in the skills actually extracted, rather than generated independently and stitched together.

```
   Career Description
          │
          ▼
 ① Skill Extractor      →  parses raw text into a structured, normalized skill list
          │
          ▼
 ② Job Matcher          →  ranks the top 3 roles the skill profile fits best
          │
          ▼
 ③ Gap Analyzer         →  diffs current skills against each matched role's requirements
          │
          ▼
 ④ Roadmap Builder      →  turns the gaps into a phased, sequenced learning plan
          │
          ▼
   Structured Result → persisted to SQLite → streamed to client
```

| # | Agent | Reads | Produces |
|---|-------|-------|----------|
| 1 | **Skill Extractor** | Raw career description | Normalized skill list |
| 2 | **Job Matcher** | Skill list | Top 3 matching roles |
| 3 | **Gap Analyzer** | Skills + matched roles | Skill gaps per role |
| 4 | **Roadmap Builder** | Skill gaps | Phased learning roadmap |

**Runtime & reliability:**
- Model: **Llama 3.1 70B** via **Fireworks AI**, orchestrated with **CrewAI**
- `crew_service.py` runs the crew and retries transient failures (timeouts, rate limits) without re-running completed steps
- Every agent's step is written to `agent_logs`, giving a full audit trail for each analysis
- Auth failures (401/403) are treated as permanent, not transient — they **fail fast** instead of being retried, so a bad token never burns through the retry budget meant for genuine LLM/network hiccups

---

## Database Schema

SQLite, 7 tables, all access routed through `db/repository.py` — no ad-hoc queries elsewhere:

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

## Security

| Layer | Protection |
|---|---|
| Auth | JWT-authenticated sessions across every route |
| Input | Prompt-injection detection (7 known attack phrases) + sanitization (length, special chars, encoding) |
| Traffic | Per-IP rate limiting (5 req/60s, configurable) |
| Identity | Session IDs validated with regex; IPs stored as SHA-256 hashes only, never in plaintext |
| Network | CORS locked to `FRONTEND_URL` in production |
| Failure handling | Auth errors fail fast, never retried; raw stack traces never exposed to end users |

---

## Configuration

| Variable | Where | Required | Default |
|----------|-------|----------|---------|
| `FIREWORKS_API_KEY` | Backend | ✅ | — |
| `FRONTEND_URL` | Backend | ✅ (prod) | — |
| `DB_PATH` | Backend | Auto | `/data/skillbridge.db` |
| `RATE_LIMIT_MAX` | Backend | Optional | `5` |
| `RATE_LIMIT_WINDOW` | Backend | Optional | `60` |
| `VITE_API_URL` | Frontend | ✅ | — |
- Session IDs validated with regex
- IP addresses stored as SHA-256 hashes only
- CORS locked to frontend URL in production
- Security headers on all frontend responses (vercel.json)
- Auth errors never retried (fail fast on 401/403)
- Raw stack traces never exposed to end users
