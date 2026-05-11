"""SkillBridge AI — CrewAI Tasks (4 sequential, context-chained)"""
from crewai import Task, Agent


def extraction_task(agent: Agent, user_input: str) -> Task:
    return Task(
        description=f"""
Analyze this user input and extract a complete structured skill profile.
USER INPUT: "{user_input}"

1. EXPLICIT skills (normalize: JS→JavaScript, py→Python, ML→Machine Learning)
2. IMPLIED skills (e.g. "built REST APIs" implies HTTP/JSON knowledge)
3. Experience level per skill: Beginner / Intermediate / Advanced
4. PRIMARY domain: Frontend / Backend / Data Science / ML-AI / DevOps / Mobile / Other
5. CAREER GOAL / TARGET ROLE ("Not stated" if absent)
6. YEARS OF EXPERIENCE (if mentioned)
7. EDUCATION (if mentioned)
8. CONFIDENCE score 1–10
9. AMBIGUITIES list

Edge cases: normalize abbreviations, fix typos (Recat→React), handle short inputs, flag contradictions.

STRICT OUTPUT:
---EXTRACTED PROFILE---
Current Skills:
  [skill] — [level]
Implied Skills:
  [skill] — [level]
Primary Domain: [domain]
Target Role: [role or Not stated]
Experience: [X years or Not mentioned]
Education: [degree or Not mentioned]
Confidence: [X/10]
Ambiguities: [list or None]
---END PROFILE---
""",
        agent=agent,
        expected_output="A complete ---EXTRACTED PROFILE--- block.",
    )


def matching_task(agent: Agent, user_input: str, t1: Task) -> Task:
    return Task(
        description=f"""
Using the EXTRACTED PROFILE, identify TOP 3 most suitable job roles.
User input context: "{user_input}"

For EACH role provide ALL fields:
1. Specific job title (e.g. "Junior Data Analyst", not just "Analyst")
2. Match rationale (2–3 sentences)
3. Skill match score (0–100%)
4. Salary USA entry-level (USD/yr)
5. Salary Remote entry-level (USD/yr)
6. Demand: High / Growing / Stable / Declining
7. 5-year career growth trajectory
8. Core tech stack (5–8 technologies)
9. Entry difficulty for this user: Easy / Medium / Hard + brief reason

Edge cases: if skills are minimal → recommend trainee/internship paths.
Label: PRIMARY RECOMMENDATION, ALTERNATIVE 1, ALTERNATIVE 2.

STRICT OUTPUT:
---JOB MATCHES---
PRIMARY RECOMMENDATION
  Title: ...
  Match Score: ...%
  Rationale: ...
  Salary USA: $X,000–$Y,000/yr
  Salary Remote: $X,000–$Y,000/yr
  Demand: ...
  Growth: ...
  Tech Stack: ...
  Entry Difficulty: ...
ALTERNATIVE 1
  [same fields]
ALTERNATIVE 2
  [same fields]
---END MATCHES---
""",
        agent=agent,
        expected_output="A complete ---JOB MATCHES--- block with 3 roles.",
        context=[t1],
    )


def gap_analysis_task(agent: Agent, user_input: str, t1: Task, t2: Task) -> Task:
    return Task(
        description=f"""
Deep skill gap analysis for the PRIMARY RECOMMENDED ROLE only.
User input context: "{user_input}"

1. EXISTING relevant skills the user already has
2. CRITICAL GAPS — hiring blockers; cannot get hired without these
   Format per gap: [skill] | Time: [X wks/months] @ 10–15 hrs/wk | Difficulty: Easy/Medium/Hard | Why: [reason]
3. IMPORTANT GAPS — significantly improve hire-ability, same format
4. NICE-TO-HAVE — differentiators, same format
5. SOFT SKILL gaps (communication, teamwork, etc.) if evident
6. NOT RELEVANT skills from the user's input
7. TOTAL months to job-ready (sum critical + important, not parallel)

Edge cases: zero gaps → confirm near job-ready, suggest portfolio work.
Overwhelming gaps → suggest intermediate stepping-stone role first.

STRICT OUTPUT:
---SKILL GAP ANALYSIS---
Target Role: [role]
Existing Relevant Skills:
  • [skill]
Critical Gaps:
  • [skill] | Time: [X] | Difficulty: [level] | Why: [reason]
Important Gaps:
  • [skill] | Time: [X] | Difficulty: [level] | Why: [reason]
Nice-to-Have:
  • [skill] | Time: [X] | Why: [reason]
Soft Skill Gaps:
  • [skill] | Suggestion: [how to address]
Not Relevant to This Path:
  • [skill]
Total Time to Job-Ready: [X months] at 10–15 hrs/week
---END GAP ANALYSIS---
""",
        agent=agent,
        expected_output="A complete ---SKILL GAP ANALYSIS--- block.",
        context=[t1, t2],
    )


def roadmap_task(agent: Agent, user_input: str, t1: Task, t2: Task, t3: Task) -> Task:
    return Task(
        description=f"""
Build a complete, personalized learning roadmap closing all Critical and Important gaps.
User input context: "{user_input}"

For EACH PHASE include ALL of:
- Phase name and specific focus
- Skills/concepts covered
- FREE resources (specific names: freeCodeCamp, MDN Docs, The Odin Project, roadmap.sh,
  CS50, JavaScript.info, Kaggle Learn, Google ML Crash Course — no vague "search YouTube")
- PAID resource only if genuinely better (name + cost + free alternative)
- Specific hands-on project:
  GOOD: "Build a weather dashboard fetching from OpenWeatherMap API, display 5-day forecast with Chart.js"
  BAD: "Build a project using APIs"
- Measurable checkpoint (how user knows they mastered this phase)
- Weekly time commitment (hrs/week)

After all phases add:
PORTFOLIO PROJECTS: 3 specific ideas with 2-sentence specs
COMMUNITY: Specific Discord servers, subreddits, newsletters
JOB HUNT TRIGGER: Exact criteria (e.g. "After Phase 3 with 2 live projects and 30+ GitHub commits")
JOB HUNT CHECKLIST: Resume, LinkedIn, GitHub, Portfolio site, Cold outreach, Interview prep

Default 10–15 hrs/wk; note how timeline shifts at 20–30 hrs/wk.
Do not recommend resources older than 2021 unless official evergreen docs.

STRICT OUTPUT:
---LEARNING ROADMAP---
Target Role: [role]
Duration: [X months] @ 10–15 hrs/wk | [Y months] @ 20–30 hrs/wk

PHASE 1: [Name] — [Duration]
  Focus: ...
  Skills: ...
  Free Resources:
    • [Name — description]
  Paid (optional): [Name — cost] (Free alt: ...)
  Project: [specific description]
  Checkpoint: [measurable milestone]
  Weekly: [X hrs/week]

[repeat for all phases]

Portfolio Projects:
  1. [Title] — [2-sentence spec]
  2. ...
  3. ...
Community:
  • [Name — platform — why useful]
Job Hunt Trigger: [specific criteria]
Job Hunt Checklist:
  □ Resume: [tip]
  □ LinkedIn: [tip]
  □ GitHub: [tip]
  □ Portfolio Site: [tip]
  □ Cold Outreach: [tip]
  □ Interview Prep: [resources]
---END ROADMAP---
""",
        agent=agent,
        expected_output="A complete ---LEARNING ROADMAP--- block.",
        context=[t1, t2, t3],
    )


def create_all_tasks(agents: tuple, user_input: str) -> list:
    ext, mat, gap, road = agents
    t1 = extraction_task(ext, user_input)
    t2 = matching_task(mat, user_input, t1)
    t3 = gap_analysis_task(gap, user_input, t1, t2)
    t4 = roadmap_task(road, user_input, t1, t2, t3)
    return [t1, t2, t3, t4]
