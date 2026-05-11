"""SkillBridge AI — CrewAI Agents (Fireworks AI / Llama 3.1 70B)"""
import os, logging
from crewai import Agent
from langchain_openai import ChatOpenAI

log = logging.getLogger("agents")


def build_llm(api_key: str | None = None) -> ChatOpenAI:
    key = (api_key or os.getenv("FIREWORKS_API_KEY","")).strip()
    if not key:
        raise EnvironmentError("FIREWORKS_API_KEY not set.")
    if not key.startswith("fw-"):
        raise EnvironmentError(f"FIREWORKS_API_KEY malformed (got '{key[:4]}...').")
    return ChatOpenAI(
        model="accounts/fireworks/models/llama-v3p1-70b-instruct",
        openai_api_key=key,
        openai_api_base="https://api.fireworks.ai/inference/v1",
        temperature=0.3, max_tokens=4096,
        request_timeout=150, max_retries=3,
    )


def create_all_agents(api_key: str | None = None) -> tuple:
    llm = build_llm(api_key)
    return (
        Agent(role="Skill Extraction Specialist",
              goal="Parse user input into a fully structured skill profile.",
              backstory="Senior NLP engineer, 10 yrs building resume parsers. Normalizes abbreviations, infers implied skills, rates confidence honestly.",
              llm=llm, verbose=True, allow_delegation=False, max_iter=3),
        Agent(role="Career Path & Job Matching Specialist",
              goal="Map skill profile to top 3 realistic roles with salary and demand data.",
              backstory="Career strategist, 15 yrs recruiting at top tech firms. Knows market reality — never over-promises.",
              llm=llm, verbose=True, allow_delegation=False, max_iter=3),
        Agent(role="Skill Gap Analysis Expert",
              goal="Compare current skills vs primary role. Prioritized gaps with time estimates.",
              backstory="Technical curriculum designer, thousands of assessments. Honest about difficulty and timelines.",
              llm=llm, verbose=True, allow_delegation=False, max_iter=3),
        Agent(role="Personalized Learning Roadmap Architect",
              goal="Design phased roadmap with free resources, projects, job-hunt trigger.",
              backstory="Edtech architect, 500K+ learners. Specific, time-boxed roadmaps — never vague wish lists.",
              llm=llm, verbose=True, allow_delegation=False, max_iter=3),
    )
