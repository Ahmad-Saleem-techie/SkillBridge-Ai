"""
SkillBridge AI — Repository layer
All DB reads/writes go here. Never raw SQL in routes or services.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from db.database import get_db

log = logging.getLogger("repository")


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def _row(row) -> Optional[dict]:
    return dict(row) if row else None


# ── Users ────────────────────────────────────────────────────────────────────

def upsert_user(session_id: str) -> int:
    with get_db() as db:
        db.execute("""
            INSERT INTO users (session_id, created_at, last_seen)
            VALUES (?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET last_seen = excluded.last_seen
        """, (session_id, _now(), _now()))
        return db.execute(
            "SELECT id FROM users WHERE session_id = ?", (session_id,)
        ).fetchone()["id"]


def increment_user_analyses(user_id: int) -> None:
    with get_db() as db:
        db.execute(
            "UPDATE users SET total_analyses = total_analyses + 1 WHERE id = ?",
            (user_id,)
        )


# ── Sessions ─────────────────────────────────────────────────────────────────

def create_session(user_id: int, ip_hash: str = "", user_agent: str = "") -> int:
    with get_db() as db:
        cur = db.execute("""
            INSERT INTO sessions (user_id, started_at, ip_hash, user_agent)
            VALUES (?, ?, ?, ?)
        """, (user_id, _now(), ip_hash[:64], user_agent[:256]))
        return cur.lastrowid


# ── Analyses ─────────────────────────────────────────────────────────────────

def create_analysis(session_id: int, user_input: str) -> int:
    with get_db() as db:
        cur = db.execute("""
            INSERT INTO analyses (session_id, user_raw_input, status, started_at)
            VALUES (?, ?, 'pending', ?)
        """, (session_id, user_input[:6000], _now()))
        return cur.lastrowid


def mark_running(analysis_id: int) -> None:
    with get_db() as db:
        db.execute("UPDATE analyses SET status='running' WHERE id=?", (analysis_id,))


def mark_done(analysis_id: int, full_result: str, duration: float) -> None:
    with get_db() as db:
        db.execute("""
            UPDATE analyses
            SET status='done', full_result=?, completed_at=?, duration_secs=?
            WHERE id=?
        """, (full_result[:50000], _now(), round(duration, 2), analysis_id))


def mark_failed(analysis_id: int, error: str) -> None:
    with get_db() as db:
        db.execute("""
            UPDATE analyses
            SET status='failed', completed_at=?, error_message=?
            WHERE id=?
        """, (_now(), str(error)[:2000], analysis_id))


def get_analysis(analysis_id: int) -> Optional[dict]:
    with get_db() as db:
        return _row(db.execute(
            "SELECT * FROM analyses WHERE id=?", (analysis_id,)
        ).fetchone())


def get_history(limit: int = 30) -> list[dict]:
    with get_db() as db:
        rows = db.execute("""
            SELECT a.id, a.user_raw_input, a.status, a.started_at,
                   a.duration_secs, a.error_message
            FROM analyses a
            ORDER BY a.started_at DESC LIMIT ?
        """, (limit,)).fetchall()
        return [dict(r) for r in rows]


# ── Skills ───────────────────────────────────────────────────────────────────

def save_skills(analysis_id: int, skills: list[dict]) -> None:
    with get_db() as db:
        db.executemany("""
            INSERT INTO skills (analysis_id, skill_name, skill_level, is_implied)
            VALUES (?, ?, ?, ?)
        """, [(analysis_id,
               s.get("name","Unknown")[:100],
               s.get("level","Beginner"),
               1 if s.get("implied") else 0)
              for s in skills])


def get_skills(analysis_id: int) -> list[dict]:
    with get_db() as db:
        return [dict(r) for r in db.execute(
            "SELECT * FROM skills WHERE analysis_id=?", (analysis_id,)
        ).fetchall()]


# ── Job Matches ───────────────────────────────────────────────────────────────

def save_job_matches(analysis_id: int, matches: list[dict]) -> None:
    with get_db() as db:
        db.executemany("""
            INSERT INTO job_matches
              (analysis_id, rank, title, match_score,
               salary_usd_low, salary_usd_high, demand_level, tech_stack, rationale)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [(analysis_id,
               m.get("rank", 1),
               m.get("title","Unknown")[:200],
               m.get("match_score", 0),
               m.get("salary_low"),
               m.get("salary_high"),
               m.get("demand"),
               json.dumps(m.get("tech_stack", [])),
               m.get("rationale","")[:2000])
              for m in matches])


def get_job_matches(analysis_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM job_matches WHERE analysis_id=? ORDER BY rank",
            (analysis_id,)
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["tech_stack"] = json.loads(d.get("tech_stack") or "[]")
            except Exception:
                d["tech_stack"] = []
            result.append(d)
        return result


# ── Roadmap Phases ────────────────────────────────────────────────────────────

def save_roadmap_phases(analysis_id: int, phases: list[dict]) -> None:
    with get_db() as db:
        db.executemany("""
            INSERT INTO roadmap_phases
              (analysis_id, phase_number, phase_name, duration_weeks,
               skills_covered, free_resources, project_desc, checkpoint, hrs_per_week)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [(analysis_id,
               p.get("number", i+1),
               p.get("name", f"Phase {i+1}")[:200],
               p.get("duration_weeks"),
               json.dumps(p.get("skills", [])),
               json.dumps(p.get("resources", [])),
               p.get("project","")[:1000],
               p.get("checkpoint","")[:500],
               p.get("hrs_per_week"))
              for i, p in enumerate(phases)])


def get_roadmap_phases(analysis_id: int) -> list[dict]:
    with get_db() as db:
        rows = db.execute(
            "SELECT * FROM roadmap_phases WHERE analysis_id=? ORDER BY phase_number",
            (analysis_id,)
        ).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            for k in ("skills_covered","free_resources"):
                try:
                    d[k] = json.loads(d.get(k) or "[]")
                except Exception:
                    d[k] = []
            result.append(d)
        return result


# ── Agent Logs ────────────────────────────────────────────────────────────────

def log_agent_start(analysis_id: int, agent_name: str) -> int:
    with get_db() as db:
        cur = db.execute("""
            INSERT INTO agent_logs (analysis_id, agent_name, started_at)
            VALUES (?, ?, ?)
        """, (analysis_id, agent_name[:100], _now()))
        return cur.lastrowid


def log_agent_done(log_id: int, output: str, success: bool = True) -> None:
    with get_db() as db:
        db.execute("""
            UPDATE agent_logs
            SET finished_at=?, output_text=?, success=?
            WHERE id=?
        """, (_now(), output[:8000], 1 if success else 0, log_id))


def log_agent_error(log_id: int, error: str) -> None:
    with get_db() as db:
        db.execute("""
            UPDATE agent_logs SET finished_at=?, error_text=?, success=0 WHERE id=?
        """, (_now(), str(error)[:2000], log_id))


def get_agent_logs(analysis_id: int) -> list[dict]:
    with get_db() as db:
        return [dict(r) for r in db.execute(
            "SELECT * FROM agent_logs WHERE analysis_id=? ORDER BY id",
            (analysis_id,)
        ).fetchall()]


# ── Delete ────────────────────────────────────────────────────────────────────

def delete_analysis(analysis_id: int) -> None:
    with get_db() as db:
        db.execute("DELETE FROM analyses WHERE id=?", (analysis_id,))


# ── Dashboard ─────────────────────────────────────────────────────────────────

def get_stats() -> dict:
    with get_db() as db:
        total = db.execute("SELECT COUNT(*) as c FROM analyses").fetchone()["c"]
        done  = db.execute("SELECT COUNT(*) as c FROM analyses WHERE status='done'").fetchone()["c"]
        failed= db.execute("SELECT COUNT(*) as c FROM analyses WHERE status='failed'").fetchone()["c"]
        users = db.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        avg   = db.execute(
            "SELECT AVG(duration_secs) as a FROM analyses WHERE status='done'"
        ).fetchone()["a"]
        return {
            "total_analyses": total,
            "completed": done,
            "failed": failed,
            "total_users": users,
            "avg_duration_secs": round(avg or 0, 1),
        }
