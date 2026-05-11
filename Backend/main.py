"""
SkillBridge AI — FastAPI Backend  (production-ready)
REST + SSE endpoints consumed by the React/Vite frontend.
"""
import os, time, logging, hashlib, uuid, json
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, field_validator
import re

from db.database import init_db, health_check
import db.repository as repo
from services.crew_service import run_pipeline, InputError, ConfigError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("main")

# ── Env ───────────────────────────────────────────────────────────────────────
FRONTEND_URL  = os.getenv("FRONTEND_URL", "*")
FIREWORKS_KEY = os.getenv("FIREWORKS_API_KEY", "").strip()

# ── Simple in-process rate limiter (IP → timestamps) ─────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX    = int(os.getenv("RATE_LIMIT_MAX", "5"))   # requests
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))  # seconds


def _check_rate(ip: str) -> bool:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    hits = [t for t in _rate_store[ip] if t > window_start]
    _rate_store[ip] = hits
    if len(hits) >= RATE_LIMIT_MAX:
        return False
    _rate_store[ip].append(now)
    return True


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Initializing database…")
    init_db()
    if not FIREWORKS_KEY:
        log.critical("FIREWORKS_API_KEY NOT SET — all analyses will fail!")
    else:
        log.info("Fireworks key loaded (%s…)", FIREWORKS_KEY[:8])
    yield
    log.info("Shutting down.")


app = FastAPI(
    title="SkillBridge AI API",
    version="1.0.0",
    description="Multi-agent career intelligence — 4 CrewAI agents × Fireworks AI",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_origins = [FRONTEND_URL] if FRONTEND_URL not in ("*", "") else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# ── Request-ID middleware ─────────────────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    rid = str(uuid.uuid4())[:8]
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response

# ── Pretty validation errors ──────────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = [
        {"field": ".".join(str(l) for l in e["loc"]), "msg": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


# ── Request model ─────────────────────────────────────────────────────────────
_INJECTION = [
    "ignore previous instructions", "ignore all instructions",
    "disregard the above", "system prompt", "act as jailbreak",
    "you are now", "pretend you are",
]

class AnalyzeRequest(BaseModel):
    user_input: str = Field(..., min_length=15, max_length=6000)
    session_id: str = Field(..., min_length=8,  max_length=128)

    @field_validator("user_input")
    @classmethod
    def no_injection(cls, v: str) -> str:
        for sig in _INJECTION:
            if sig in v.lower():
                raise ValueError("Input contains disallowed phrases.")
        return re.sub(r"[<>{}\[\]|\\]", " ", v).strip()

    @field_validator("session_id")
    @classmethod
    def safe_sid(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_\-]+$", v):
            raise ValueError("session_id contains invalid characters.")
        return v


# ── Background pipeline worker ────────────────────────────────────────────────
def _run_bg(analysis_id: int, user_input: str, user_id: int) -> None:
    repo.mark_running(analysis_id)
    t0 = time.time()
    try:
        result   = run_pipeline(user_input, analysis_id)
        duration = time.time() - t0
        repo.mark_done(analysis_id, result, duration)
        repo.increment_user_analyses(user_id)
        log.info("analysis_id=%d done in %.1fs", analysis_id, duration)
    except (InputError, ConfigError) as e:
        repo.mark_failed(analysis_id, str(e))
        log.warning("analysis_id=%d config/input error: %s", analysis_id, e)
    except Exception as e:
        repo.mark_failed(analysis_id, str(e))
        log.exception("analysis_id=%d unexpected failure", analysis_id)


# ────────────────────────────────────────────────────────────────────────────
# ROUTES
# ────────────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
def health():
    db_info = health_check()
    return {
        "status":            "ok" if db_info["status"] == "ok" else "degraded",
        "db":                db_info,
        "fireworks_key_set": bool(FIREWORKS_KEY),
        "version":           "1.0.0",
    }


@app.post("/analyze", tags=["Analysis"])
def start_analysis(body: AnalyzeRequest, request: Request, bg: BackgroundTasks):
    """
    Starts a pipeline run asynchronously.
    Returns analysis_id immediately — client polls /analyze/{id}/status.
    """
    ip = request.client.host if request.client else "unknown"
    if not _check_rate(ip):
        raise HTTPException(429, "Too many requests. Please wait a minute.")

    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    ua      = request.headers.get("user-agent", "")[:256]

    user_id     = repo.upsert_user(body.session_id)
    session_db  = repo.create_session(user_id, ip_hash, ua)
    analysis_id = repo.create_analysis(session_db, body.user_input)

    bg.add_task(_run_bg, analysis_id, body.user_input, user_id)

    return {"analysis_id": analysis_id, "status": "pending"}


@app.get("/analyze/{analysis_id}/status", tags=["Analysis"])
def get_status(analysis_id: int):
    """Poll every 5 s from the frontend to check pipeline progress."""
    row = repo.get_analysis(analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    return {
        "analysis_id":   analysis_id,
        "status":        row["status"],
        "error_message": row.get("error_message"),
        "duration_secs": row.get("duration_secs"),
    }


@app.get("/analyze/{analysis_id}/stream", tags=["Analysis"])
async def stream_status(analysis_id: int):
    """
    SSE endpoint — frontend can subscribe instead of polling.
    Sends a JSON event every 4 s until status is done/failed.
    """
    async def event_gen():
        deadline = time.time() + 900  # 15-min hard cap
        while time.time() < deadline:
            row = repo.get_analysis(analysis_id)
            if not row:
                yield f"event: error\ndata: {json.dumps({'detail': 'not found'})}\n\n"
                return
            payload = {
                "analysis_id":   analysis_id,
                "status":        row["status"],
                "duration_secs": row.get("duration_secs"),
            }
            yield f"data: {json.dumps(payload)}\n\n"
            if row["status"] in ("done", "failed"):
                return
            await asyncio.sleep(4)
        yield f"event: timeout\ndata: {json.dumps({'detail': 'timed out'})}\n\n"

    import asyncio
    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache",
                                      "X-Accel-Buffering": "no"})


@app.get("/analyze/{analysis_id}/result", tags=["Analysis"])
def get_result(analysis_id: int):
    """Full result payload — call once status == 'done'."""
    row = repo.get_analysis(analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    if row["status"] == "running":
        raise HTTPException(202, "Analysis still running.")
    if row["status"] == "pending":
        raise HTTPException(202, "Analysis is queued.")
    return {
        "analysis_id":   analysis_id,
        "status":        row["status"],
        "user_input":    row["user_raw_input"],
        "full_result":   row.get("full_result"),
        "error_message": row.get("error_message"),
        "started_at":    row["started_at"],
        "completed_at":  row.get("completed_at"),
        "duration_secs": row.get("duration_secs"),
        "skills":         repo.get_skills(analysis_id),
        "job_matches":    repo.get_job_matches(analysis_id),
        "roadmap_phases": repo.get_roadmap_phases(analysis_id),
        "agent_logs":     repo.get_agent_logs(analysis_id),
    }


@app.get("/history", tags=["Analysis"])
def history(limit: int = 20):
    if limit < 1:   limit = 1
    if limit > 100: limit = 100
    return {"history": repo.get_history(limit)}


@app.get("/stats", tags=["Dashboard"])
def stats():
    return repo.get_stats()


@app.delete("/analyze/{analysis_id}", tags=["Analysis"])
def delete_analysis(analysis_id: int):
    """Hard-delete an analysis and all related rows (cascades via FK)."""
    row = repo.get_analysis(analysis_id)
    if not row:
        raise HTTPException(404, "Analysis not found.")
    if row["status"] == "running":
        raise HTTPException(409, "Cannot delete a running analysis.")
    repo.delete_analysis(analysis_id)
    return {"deleted": analysis_id}
