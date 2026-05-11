"""
SkillBridge AI — Database connection manager
Thread-safe SQLite with WAL, FK enforcement, and auto-init.
"""
import os
import sqlite3
import logging
import threading
from pathlib import Path
from contextlib import contextmanager

log = logging.getLogger("db")

_HERE   = Path(__file__).parent
SCHEMA  = _HERE / "schema.sql"
DB_PATH = Path(os.getenv("DB_PATH", str(_HERE / "skillbridge.db")))

_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA cache_size=-32000")
        _local.conn = conn
    return conn


@contextmanager
def get_db():
    conn = _get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def init_db() -> None:
    if not SCHEMA.exists():
        raise FileNotFoundError(f"schema.sql not found at {SCHEMA}")
    sql = SCHEMA.read_text(encoding="utf-8")
    with get_db() as db:
        db.executescript(sql)
    log.info("DB initialized at %s", DB_PATH)


def health_check() -> dict:
    try:
        with get_db() as db:
            c = db.execute("SELECT COUNT(*) as c FROM analyses").fetchone()["c"]
        return {"status": "ok", "total_analyses": c, "db_path": str(DB_PATH)}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
