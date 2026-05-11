-- SkillBridge AI — SQLite Schema (7 tables)
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Table 1: users
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT    NOT NULL UNIQUE,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    last_seen       TEXT    NOT NULL DEFAULT (datetime('now')),
    total_analyses  INTEGER NOT NULL DEFAULT 0
);

-- Table 2: sessions
CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    ended_at    TEXT,
    ip_hash     TEXT,
    user_agent  TEXT
);

-- Table 3: analyses
CREATE TABLE IF NOT EXISTS analyses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_raw_input  TEXT    NOT NULL,
    full_result     TEXT,
    status          TEXT    NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','running','done','failed')),
    error_message   TEXT,
    started_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    duration_secs   REAL
);

-- Table 4: skills
CREATE TABLE IF NOT EXISTS skills (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    skill_name  TEXT    NOT NULL,
    skill_level TEXT    NOT NULL DEFAULT 'Beginner'
                CHECK(skill_level IN ('Beginner','Intermediate','Advanced')),
    is_implied  INTEGER NOT NULL DEFAULT 0
);

-- Table 5: job_matches
CREATE TABLE IF NOT EXISTS job_matches (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id     INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    rank            INTEGER NOT NULL CHECK(rank IN (1,2,3)),
    title           TEXT    NOT NULL,
    match_score     INTEGER NOT NULL CHECK(match_score BETWEEN 0 AND 100),
    salary_usd_low  INTEGER,
    salary_usd_high INTEGER,
    demand_level    TEXT    CHECK(demand_level IN ('High','Growing','Stable','Declining')),
    tech_stack      TEXT,
    rationale       TEXT
);

-- Table 6: roadmap_phases
CREATE TABLE IF NOT EXISTS roadmap_phases (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id     INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    phase_number    INTEGER NOT NULL,
    phase_name      TEXT    NOT NULL,
    duration_weeks  INTEGER,
    skills_covered  TEXT,
    free_resources  TEXT,
    project_desc    TEXT,
    checkpoint      TEXT,
    hrs_per_week    INTEGER
);

-- Table 7: agent_logs
CREATE TABLE IF NOT EXISTS agent_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    agent_name  TEXT    NOT NULL,
    started_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    output_text TEXT,
    error_text  TEXT,
    success     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_session ON analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status  ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_skills_analysis  ON skills(analysis_id);
CREATE INDEX IF NOT EXISTS idx_jobs_analysis    ON job_matches(analysis_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_analysis ON roadmap_phases(analysis_id);
CREATE INDEX IF NOT EXISTS idx_logs_analysis    ON agent_logs(analysis_id);
