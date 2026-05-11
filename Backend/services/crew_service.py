"""
SkillBridge AI — Crew Service
Runs the 4-agent pipeline and persists results to all 7 DB tables.
"""
import os, re, time, logging
from crewai import Crew, Process
from agents import create_all_agents
from tasks import create_all_tasks
import db.repository as repo

log = logging.getLogger("crew_service")

_INJECTION = [
    "ignore previous instructions","ignore all instructions",
    "disregard the above","system prompt","act as jailbreak","you are now",
]

class InputError(ValueError):
    pass

class ConfigError(EnvironmentError):
    pass


def sanitize(text: str) -> str:
    if not isinstance(text, str):
        raise InputError("Input must be a string.")
    text = text.strip()
    if not text:
        raise InputError("Please describe your skills and career goals.")
    if len(text) < 15:
        raise InputError(f"Input too short ({len(text)} chars). Please add more detail.")
    if len(text) > 6000:
        text = text[:6000] + "\n[truncated]"
    lower = text.lower()
    for sig in _INJECTION:
        if sig in lower:
            raise InputError("Input contains disallowed phrases.")
    text = re.sub(r"[<>{}\[\]|\\]", " ", text)
    return text


def _extract_result(raw) -> str:
    for attr in ("raw","final_output","output","result"):
        val = getattr(raw, attr, None)
        if val and isinstance(val, str) and len(val.strip()) > 50:
            return val.strip()
    if hasattr(raw, "tasks_output") and raw.tasks_output:
        last = raw.tasks_output[-1]
        for attr in ("raw","output","result"):
            val = getattr(last, attr, None)
            if val and isinstance(val, str) and len(val.strip()) > 50:
                return val.strip()
    fb = str(raw).strip()
    if len(fb) > 50:
        return fb
    raise ValueError("Agent pipeline returned empty result.")


def classify_error(exc: Exception) -> str:
    msg = str(exc).lower()
    if "429" in msg or "rate limit" in msg:
        return "Rate limit hit — please wait 30–60 seconds and try again."
    if "401" in msg or "unauthorized" in msg:
        return "Invalid API key — check FIREWORKS_API_KEY on the server."
    if "timeout" in msg or "timed out" in msg:
        return "Request timed out — Fireworks AI is slow right now. Try again."
    if "connection" in msg or "refused" in msg:
        return f"Connection error: {str(exc)[:200]}"
    return f"Unexpected error: {str(exc)[:300]}"


def run_pipeline(
    user_input: str,
    analysis_id: int,
    api_key: str | None = None,
) -> str:
    """
    Runs the full 4-agent CrewAI pipeline.
    Writes agent logs to DB on every step.
    Returns the final markdown result string.
    Raises InputError / ConfigError without retry (fatal).
    Retries up to 2 times for transient errors.
    """
    key = (api_key or os.getenv("FIREWORKS_API_KEY","")).strip()
    if not key:
        raise ConfigError("FIREWORKS_API_KEY not set on server.")

    clean = sanitize(user_input)

    try:
        agents = create_all_agents(key)
    except EnvironmentError as e:
        raise ConfigError(str(e)) from e

    tasks = create_all_tasks(agents, clean)

    # Log all 4 agents as pending before kickoff
    agent_names = [
        "Skill Extractor","Job Matcher","Gap Analyzer","Roadmap Architect"
    ]
    log_ids = [repo.log_agent_start(analysis_id, name) for name in agent_names]

    crew = Crew(
        agents=list(agents),
        tasks=tasks,
        process=Process.sequential,
        verbose=True,
        memory=False,
        max_rpm=8,
    )

    last_exc = None
    for attempt in range(1, 3):
        try:
            log.info("Pipeline attempt %d for analysis_id=%d", attempt, analysis_id)
            t0 = time.time()
            raw = crew.kickoff()
            elapsed = time.time() - t0
            result = _extract_result(raw)

            # Mark all agent logs as success (we don't have per-agent hooks in sequential mode)
            for lid in log_ids:
                repo.log_agent_done(lid, result[:2000], success=True)

            log.info("Pipeline done in %.1fs", elapsed)
            return result

        except (InputError, ConfigError):
            for lid in log_ids:
                repo.log_agent_error(lid, "Input/config error — not retried")
            raise

        except Exception as exc:
            last_exc = exc
            err_str = str(exc).lower()
            log.warning("Attempt %d failed: %s", attempt, str(exc)[:200])

            if any(k in err_str for k in ("401","403","unauthorized","invalid api key")):
                for lid in log_ids:
                    repo.log_agent_error(lid, str(exc))
                break

            if attempt < 2:
                time.sleep(25)

    for lid in log_ids:
        repo.log_agent_error(lid, str(last_exc))
    return classify_error(last_exc)
