"""
Roadmap Agent Module for CareerGenesis.

This module contains the RoadmapAgent class along with Pydantic schemas for
learning roadmaps. The RoadmapAgent generates targeted learning plans divided into chronological
phases based on identified skill gaps and target timelines (4, 8, or 12 weeks),
recommending learning resources, projects, and certifications.

When a GEMINI_API_KEY is available the agent delegates to Gemini 2.5 Flash for
rich, AI-powered roadmap generation.  Gemini produces weekly milestones with
learning objectives, curated resources, practice projects, portfolio ideas,
interview preparation checkpoints, and progress tracking suggestions.  If the
key is absent or any call fails, deterministic rule-based fallbacks are used
transparently.

Compatible with Google ADK framework and designed to act as an MCP-compatible tool.
"""

import json
import logging
import math
import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Graceful import check for Google GenAI SDK
try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

# Graceful import check for Google ADK
try:
    # pyrefly: ignore [missing-import]
    from google.adk.agents import Agent as AdkAgent
    HAS_ADK = True
except ImportError:
    HAS_ADK = False

load_dotenv()

# =====================================================================
# 1. Pydantic Schemas  (original + Gemini-enhanced)
# =====================================================================

class LearningResource(BaseModel):
    """Schema representing a recommended course, tutorial, book, or doc page."""
    
    name: str = Field(..., description="Title of the resource")
    url: Optional[str] = Field(None, description="Direct link to the resource")
    resource_type: str = Field(
        ..., 
        description="Type of resource: 'course', 'documentation', 'book', 'tutorial', 'video'"
    )
    platform: Optional[str] = Field(None, description="Provider/Platform, e.g., 'Coursera', 'Udemy', 'Official'")
    cost: str = Field("Free", description="Cost status: 'Free', 'Paid', 'Subscription'")


class RoadmapPhase(BaseModel):
    """Schema representing a single chronological phase of the learning path."""
    
    phase_number: int = Field(..., description="Sequential index of the phase, starting at 1")
    title: str = Field(..., description="High-level descriptive title of the phase")
    duration_weeks: int = Field(..., description="Duration of this learning phase in weeks")
    topics_to_learn: List[str] = Field(
        default_factory=list,
        description="Key core concepts and skills covered during this phase"
    )
    resources: List[LearningResource] = Field(
        default_factory=list, 
        description="Associated learning materials and web links"
    )
    recommended_projects: List[str] = Field(
        default_factory=list,
        description="Actionable hands-on projects to build to solidify knowledge in this phase"
    )


class RoadmapAnalysis(BaseModel):
    """Payload representing a complete structured learning roadmap."""
    
    summary: str = Field(..., description="High-level overview and study advice for the roadmap")
    target_role: str = Field(..., description="The career path or job title target")
    timeline_weeks: int = Field(..., description="Total length of the learning plan in weeks")
    phases: List[RoadmapPhase] = Field(default_factory=list)
    certifications: List[str] = Field(
        default_factory=list, 
        description="Industry credentials/certifications that add credibility to this path"
    )


# -----------  Gemini-enhanced response schemas  -----------

class LearningObjective(BaseModel):
    """A specific, measurable learning objective for a milestone."""

    objective: str = Field(
        ...,
        description="Clear, measurable learning objective (e.g., 'Build a REST API with authentication using FastAPI')"
    )
    skill_targeted: str = Field(
        ...,
        description="The missing skill this objective helps address"
    )
    success_criteria: str = Field(
        ...,
        description="How to know this objective is met (e.g., 'API passes all endpoint tests')"
    )


class PracticeProject(BaseModel):
    """A hands-on project designed to reinforce skills learned in a milestone."""

    project_name: str = Field(..., description="Descriptive name of the project")
    description: str = Field(
        ...,
        description="What the project involves and what skills it exercises"
    )
    skills_practiced: List[str] = Field(
        default_factory=list,
        description="List of skills this project helps develop"
    )
    difficulty: str = Field(
        ...,
        description="Difficulty level: 'beginner', 'intermediate', 'advanced'"
    )
    estimated_hours: int = Field(
        ...,
        description="Estimated time to complete in hours",
        ge=1,
        le=80
    )


class PortfolioIdea(BaseModel):
    """A portfolio-worthy project idea the candidate can showcase to employers."""

    title: str = Field(..., description="Portfolio project title")
    description: str = Field(
        ...,
        description="Detailed description of the portfolio project"
    )
    technologies: List[str] = Field(
        default_factory=list,
        description="Technologies and tools used in this project"
    )
    employer_appeal: str = Field(
        ...,
        description="Why this project would impress hiring managers for the target role"
    )


class InterviewCheckpoint(BaseModel):
    """An interview preparation checkpoint tied to a specific milestone."""

    topic: str = Field(..., description="Interview topic area (e.g., 'System Design', 'Data Structures')")
    practice_questions: List[str] = Field(
        default_factory=list,
        description="Sample interview questions the candidate should be able to answer by this point"
    )
    preparation_tips: str = Field(
        ...,
        description="Advice on how to prepare for this interview topic"
    )


class ProgressTracker(BaseModel):
    """Suggestions for how to track and measure learning progress."""

    metric: str = Field(
        ...,
        description="What to measure (e.g., 'GitHub commits per week', 'LeetCode problems solved')"
    )
    target_value: str = Field(
        ...,
        description="Target to aim for (e.g., '5 commits/week', '3 medium problems/week')"
    )
    tracking_method: str = Field(
        ...,
        description="How to track this metric (e.g., 'GitHub contribution graph', 'LeetCode profile')"
    )


class WeeklyMilestone(BaseModel):
    """A single week's milestone within the learning roadmap."""

    week_number: int = Field(..., description="Week number in the roadmap (1-indexed)", ge=1)
    title: str = Field(..., description="Descriptive title for this week's focus")
    learning_objectives: List[LearningObjective] = Field(
        default_factory=list,
        description="Specific, measurable learning objectives for this week"
    )
    resources: List[LearningResource] = Field(
        default_factory=list,
        description="Recommended learning resources for this week"
    )
    practice_projects: List[PracticeProject] = Field(
        default_factory=list,
        description="Hands-on projects to complete this week"
    )
    interview_checkpoint: Optional[InterviewCheckpoint] = Field(
        None,
        description="Interview preparation checkpoint for this week, if applicable"
    )
    progress_trackers: List[ProgressTracker] = Field(
        default_factory=list,
        description="Metrics to track progress this week"
    )
    hours_commitment: int = Field(
        ...,
        description="Recommended hours of study/practice for this week",
        ge=5,
        le=40
    )


class GeminiRoadmapResponse(BaseModel):
    """Full structured response schema for Gemini-powered roadmap generation."""

    summary: str = Field(
        ...,
        description="Executive summary of the learning roadmap with key advice and motivation"
    )
    target_role: str = Field(..., description="The career path or job title target")
    timeline_weeks: int = Field(..., description="Total length of the learning plan in weeks")
    weekly_milestones: List[WeeklyMilestone] = Field(
        default_factory=list,
        description="Week-by-week milestones with objectives, resources, and projects"
    )
    portfolio_ideas: List[PortfolioIdea] = Field(
        default_factory=list,
        description="Portfolio-worthy project ideas to showcase to employers"
    )
    certifications: List[str] = Field(
        default_factory=list,
        description="Industry certifications to pursue during or after the roadmap"
    )
    overall_progress_trackers: List[ProgressTracker] = Field(
        default_factory=list,
        description="Overall progress tracking suggestions across the entire roadmap"
    )
    key_milestones_summary: List[str] = Field(
        default_factory=list,
        description="High-level summary of what the candidate should achieve at key points (e.g., week 4, 8, 12)"
    )


# =====================================================================
# 2. RoadmapAgent Class
# =====================================================================

class RoadmapAgent:
    """
    Roadmap Agent specialized in compiling custom study paths, resource recommendations,
    projects, and certifications, optimized for candidate speed and target timelines.

    When a GEMINI_API_KEY is available, uses Gemini 2.5 Flash for:
      - Weekly milestones with specific learning objectives
      - Curated learning resources (courses, docs, tutorials, videos)
      - Hands-on practice projects with difficulty ratings
      - Portfolio-worthy project ideas with employer appeal explanations
      - Interview preparation checkpoints with sample questions
      - Progress tracking suggestions with measurable metrics
      - Support for 4, 8, and 12 week plans

    Falls back to deterministic rule-based roadmap generation when Gemini is unavailable.
    
    Compatible with Google ADK framework and designed to act as an MCP-compatible tool.
    """

    GEMINI_SYSTEM_INSTRUCTION = (
        "You are an elite Technical Curriculum Designer, Career Coach, and Interview Preparation "
        "Expert with deep knowledge of modern software engineering, data science, DevOps, and "
        "related fields.\n\n"
        "Your task: Generate a comprehensive, personalized weekly learning roadmap based on the "
        "candidate's missing skills, target role, and timeline.\n\n"
        "## Roadmap Structure\n"
        "Create a week-by-week plan where each week includes:\n"
        "1. **Title**: A descriptive theme for the week (e.g., 'Week 1: Python Fundamentals & Environment Setup')\n"
        "2. **Learning Objectives**: 2-4 specific, measurable objectives with clear success criteria\n"
        "3. **Resources**: 2-3 curated resources (mix of free and paid, variety of formats)\n"
        "4. **Practice Projects**: 1-2 hands-on projects with difficulty level and time estimates\n"
        "5. **Interview Checkpoint**: Every 2-3 weeks, include an interview prep checkpoint with "
        "sample questions relevant to skills learned so far\n"
        "6. **Progress Trackers**: 1-2 measurable metrics to track learning progress\n"
        "7. **Hours Commitment**: Realistic weekly hours (typically 10-20 for part-time learners)\n\n"
        "## Curriculum Design Principles\n"
        "- **Prerequisites first**: Order skills so foundational skills come before advanced ones\n"
        "- **Spaced repetition**: Revisit earlier skills in later projects\n"
        "- **Progressive complexity**: Start with fundamentals, build to real-world applications\n"
        "- **Practical focus**: At least 50% of time should be hands-on coding/building\n"
        "- **Interview readiness**: Integrate interview prep throughout, not just at the end\n\n"
        "## Timeline Guidelines\n"
        "- **4-week plan**: Intensive bootcamp style — focus on the 3-4 most critical skills, "
        "prioritize practical projects, include 2 interview checkpoints\n"
        "- **8-week plan**: Balanced learning — cover all missing skills with depth, include "
        "3-4 interview checkpoints, build 1-2 portfolio projects\n"
        "- **12-week plan**: Comprehensive mastery — deep dive into all skills, include "
        "4-5 interview checkpoints, build 2-3 portfolio projects, pursue 1 certification\n\n"
        "## Portfolio Ideas\n"
        "Suggest 2-4 portfolio-worthy projects that:\n"
        "- Combine multiple missing skills into a single impressive project\n"
        "- Are relevant to the target role\n"
        "- Would impress hiring managers (explain why)\n"
        "- Use modern tools and best practices\n\n"
        "## Progress Tracking\n"
        "Include overall progress metrics such as:\n"
        "- GitHub activity (commits, repos)\n"
        "- Coding challenges completed (LeetCode, HackerRank)\n"
        "- Projects deployed and documented\n"
        "- Blog posts or technical writing produced\n"
        "- Mock interviews completed\n\n"
        "## Key Milestones Summary\n"
        "Provide 3-5 high-level milestone descriptions for key points in the timeline "
        "(e.g., 'By week 4, you should be able to...')\n\n"
        "## Resource Quality Standards\n"
        "- Prefer well-known platforms: Coursera, Udemy, freeCodeCamp, official documentation, "
        "YouTube channels with established educators\n"
        "- Include a mix of: free and paid, videos and text, beginner and intermediate\n"
        "- Always specify resource_type, platform, and cost\n"
        "- Provide real, plausible URLs when possible\n\n"
        "## Certifications\n"
        "Recommend 1-3 industry certifications relevant to the target role and missing skills. "
        "Prioritize certifications that are widely recognized and achievable within or shortly "
        "after the roadmap timeline."
    )

    def __init__(self, model_name: str = "gemini-2.5-flash", api_key: Optional[str] = None):
        """
        Initializes the RoadmapAgent.

        Args:
            model_name: The Gemini model name used for routing and reasoning.
            api_key: Optional Gemini API key. Defaults to environment variable.
        """
        self.model_name = model_name
       
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self._client = None

        print("\n=== ROADMAP INIT ===")
        print("HAS_GENAI =", HAS_GENAI)
        print("API_KEY =", bool(self.api_key))
        print("MODEL =", self.model_name)
        print("====================\n")

        if HAS_GENAI and self.api_key:
            self._client = genai.Client(api_key=self.api_key)
            print("\n=== ROADMAP AGENT INIT ===")
            print("HAS_GENAI:", HAS_GENAI)
            print("API_KEY_PRESENT:", bool(self.api_key))
            print("CLIENT_CREATED:", self._client is not None)
            print("==========================\n")

    # -----------------------------------------------------------------
    # Gemini-powered roadmap generation
    # -----------------------------------------------------------------

    def _build_gemini_prompt(
        self,
        missing_skills: List[str],
        timeline_weeks: int,
        target_role: str,
    ) -> str:
        """Build the user prompt sent to Gemini for roadmap generation."""
        return (
            "Generate a comprehensive, personalized learning roadmap based on the following inputs.\n\n"
            f"## TARGET ROLE\n{target_role}\n\n"
            f"## TIMELINE\n{timeline_weeks} weeks\n\n"
            f"## MISSING SKILLS TO LEARN\n{', '.join(missing_skills)}\n\n"
            "Instructions:\n"
            f"1. Create a week-by-week plan covering all {timeline_weeks} weeks.\n"
            "2. Order skills logically — foundational prerequisites first, advanced topics later.\n"
            "3. Each week should have clear learning objectives with measurable success criteria.\n"
            "4. Include curated resources (courses, docs, tutorials, videos) with platform and cost info.\n"
            "5. Add 1-2 practice projects per week with difficulty level and time estimates.\n"
            "6. Include interview preparation checkpoints every 2-3 weeks with sample questions.\n"
            "7. Add progress tracking metrics for each week.\n"
            "8. Suggest 2-4 portfolio-worthy projects that combine multiple skills.\n"
            "9. Recommend relevant industry certifications.\n"
            "10. Provide a motivating summary with key strategic advice.\n"
            "11. Include 3-5 key milestone descriptions for important points in the timeline.\n"
        )

    def _gemini_response_to_legacy(self, gemini_result: GeminiRoadmapResponse) -> RoadmapAnalysis:
        """
        Convert the rich Gemini response into the original RoadmapAnalysis schema
        so the external API contract remains unchanged.
        """
        # Group weekly milestones into phases
        milestones = gemini_result.weekly_milestones
        total_weeks = gemini_result.timeline_weeks

        # Determine phase count (same logic as fallback)
        if total_weeks <= 4:
            num_phases = 2
        elif total_weeks <= 8:
            num_phases = 3
        else:
            num_phases = 4

        weeks_per_phase = math.ceil(total_weeks / num_phases)

        phases: List[RoadmapPhase] = []
        for phase_idx in range(num_phases):
            start_week = phase_idx * weeks_per_phase + 1
            end_week = min((phase_idx + 1) * weeks_per_phase, total_weeks)

            # Gather milestones belonging to this phase
            phase_milestones = [
                m for m in milestones
                if start_week <= m.week_number <= end_week
            ]

            # Aggregate topics, resources, and projects from weekly milestones
            topics: List[str] = []
            resources: List[LearningResource] = []
            projects: List[str] = []

            for milestone in phase_milestones:
                for obj in milestone.learning_objectives:
                    topics.append(obj.objective)
                resources.extend(milestone.resources)
                for proj in milestone.practice_projects:
                    projects.append(f"{proj.project_name} ({proj.difficulty}, ~{proj.estimated_hours}h): {proj.description}")

                # Include interview checkpoint info as a project/topic
                if milestone.interview_checkpoint:
                    cp = milestone.interview_checkpoint
                    projects.append(
                        f"[Interview Prep] {cp.topic}: {cp.preparation_tips}"
                    )

            # Deduplicate resources by name
            seen_resources = set()
            unique_resources: List[LearningResource] = []
            for r in resources:
                if r.name not in seen_resources:
                    seen_resources.add(r.name)
                    unique_resources.append(r)

            # Build phase title from milestone titles
            milestone_titles = [m.title for m in phase_milestones]
            if milestone_titles:
                phase_title = f"Phase {phase_idx + 1} (Weeks {start_week}-{end_week}): {milestone_titles[0]}"
            else:
                phase_title = f"Phase {phase_idx + 1} (Weeks {start_week}-{end_week})"

            phases.append(
                RoadmapPhase(
                    phase_number=phase_idx + 1,
                    title=phase_title,
                    duration_weeks=end_week - start_week + 1,
                    topics_to_learn=topics[:10],  # Cap to avoid overly long lists
                    resources=unique_resources[:6],
                    recommended_projects=projects[:5],
                )
            )

        # Build recommendations into the summary
        summary_parts = [gemini_result.summary]

        if gemini_result.portfolio_ideas:
            portfolio_str = "; ".join(
                f"{p.title} — {p.employer_appeal}" for p in gemini_result.portfolio_ideas
            )
            summary_parts.append(f"Portfolio ideas: {portfolio_str}")

        if gemini_result.key_milestones_summary:
            summary_parts.append(
                "Key milestones: " + " | ".join(gemini_result.key_milestones_summary)
            )

        if gemini_result.overall_progress_trackers:
            trackers_str = "; ".join(
                f"{t.metric}: target {t.target_value} via {t.tracking_method}"
                for t in gemini_result.overall_progress_trackers
            )
            summary_parts.append(f"Progress tracking: {trackers_str}")

        return RoadmapAnalysis(
            summary=" | ".join(summary_parts),
            target_role=gemini_result.target_role,
            timeline_weeks=gemini_result.timeline_weeks,
            phases=phases,
            certifications=gemini_result.certifications,
        )

    async def _generate_with_gemini(
        self,
        missing_skills: List[str],
        timeline_weeks: int,
        target_role: str,
    ) -> Optional[RoadmapAnalysis]:
        """
        Generate a Gemini-powered personalized learning roadmap.

        Returns:
            RoadmapAnalysis on success, or None if the Gemini call fails (triggers fallback).
        """
        
        if not self._client:
            return None

        try:
            prompt = self._build_gemini_prompt(missing_skills, timeline_weeks, target_role)

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.GEMINI_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=GeminiRoadmapResponse,
                    temperature=0.2,
                ),
            )

            if response.text:
                
                gemini_result = GeminiRoadmapResponse.model_validate_json(response.text)
                logger.info(
                    "Gemini roadmap generation succeeded — role=%s, weeks=%d, milestones=%d",
                    gemini_result.target_role,
                    gemini_result.timeline_weeks,
                    len(gemini_result.weekly_milestones),
                )
                return self._gemini_response_to_legacy(gemini_result)

        except Exception as exc:
            
            logger.warning(
                "Gemini roadmap generation failed, falling back to rule-based generation: %s",
                exc,
            )

        return None

    # -----------------------------------------------------------------
    # Rule-based fallback  (original logic preserved)
    # -----------------------------------------------------------------

    def _get_preset_resources(self, skill: str) -> List[LearningResource]:
        """Returns pre-defined learning resources for common technical terms."""
        skill_lower = skill.lower()
        resources = []

        if "python" in skill_lower:
            resources.append(LearningResource(
                name="Python Core Official Documentation",
                url="https://docs.python.org/3/",
                resource_type="documentation",
                platform="Official",
                cost="Free"
            ))
            resources.append(LearningResource(
                name="Google IT Automation with Python Professional Certificate",
                url="https://www.coursera.org/professional-certificates/google-it-automation",
                resource_type="course",
                platform="Coursera",
                cost="Subscription"
            ))
        elif "react" in skill_lower:
            resources.append(LearningResource(
                name="React Official Quick Start Guide",
                url="https://react.dev/learn",
                resource_type="documentation",
                platform="Official",
                cost="Free"
            ))
            resources.append(LearningResource(
                name="React - The Complete Guide (incl. Hooks, React Router, Redux)",
                url="https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
                resource_type="course",
                platform="Udemy",
                cost="Paid"
            ))
        elif "sql" in skill_lower or "postgres" in skill_lower:
            resources.append(LearningResource(
                name="PostgreSQL Tutorial for Beginners",
                url="https://www.postgresqltutorial.com/",
                resource_type="tutorial",
                platform="Official",
                cost="Free"
            ))
        elif "aws" in skill_lower:
            resources.append(LearningResource(
                name="AWS Cloud Practitioner Essentials",
                url="https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/",
                resource_type="course",
                platform="AWS Training",
                cost="Free"
            ))
        elif "machine learning" in skill_lower or "pytorch" in skill_lower or "tensorflow" in skill_lower:
            resources.append(LearningResource(
                name="Machine Learning Specialization by Andrew Ng",
                url="https://www.coursera.org/specializations/machine-learning-introduction",
                resource_type="course",
                platform="Coursera",
                cost="Subscription"
            ))
            resources.append(LearningResource(
                name="PyTorch Tutorials - Getting Started Guide",
                url="https://pytorch.org/tutorials/",
                resource_type="documentation",
                platform="Official",
                cost="Free"
            ))
        else:
            # Dynamic fallback resource template
            resources.append(LearningResource(
                name=f"Official {skill} Documentation",
                url=None,
                resource_type="documentation",
                platform="Official Docs",
                cost="Free"
            ))
            resources.append(LearningResource(
                name=f"Introduction to {skill} & Best Practices",
                url=None,
                resource_type="tutorial",
                platform="YouTube/Medium",
                cost="Free"
            ))

        return resources

    def _generate_fallback_roadmap(
        self, 
        missing_skills: List[str], 
        timeline_weeks: int, 
        target_role: str
    ) -> RoadmapAnalysis:
        """
        Generates a chronological timeline dividing skills and resources locally.
        
        Args:
            missing_skills: List of skills to study.
            timeline_weeks: Length of the study plan.
            target_role: Target career title.

        Returns:
            RoadmapAnalysis structure.
        """
        # Ensure fallback has at least some placeholder if no missing skills are provided
        skills_to_plan = missing_skills if missing_skills else ["General Industry Standards", "Core Stack Frameworks"]
        
        # Configure phase dimensions based on requested timeline duration
        # We target 2 phases for 4-weeks, 3 for 8-weeks, and 4 for 12-weeks
        if timeline_weeks <= 4:
            num_phases = 2
        elif timeline_weeks <= 8:
            num_phases = 3
        else:
            num_phases = 4

        weeks_per_phase = int(math.ceil(timeline_weeks / num_phases))
        
        # Distribute skills across phases evenly
        phase_skills: List[List[str]] = [[] for _ in range(num_phases)]
        for idx, skill in enumerate(skills_to_plan):
            phase_idx = idx % num_phases
            phase_skills[phase_idx].append(skill)

        phases: List[RoadmapPhase] = []
        for i in range(num_phases):
            p_skills = phase_skills[i]
            if not p_skills:
                p_skills = ["Advanced Practices"]
                
            p_resources: List[LearningResource] = []
            for skill in p_skills:
                p_resources.extend(self._get_preset_resources(skill))

            # Build mock portfolio project names
            project_name = f"Build a {p_skills[0]} Capstone Application"
            if len(p_skills) > 1:
                project_name = f"Integrate {p_skills[0]} with {p_skills[1]} in a full-stack dashboard"

            phases.append(
                RoadmapPhase(
                    phase_number=i + 1,
                    title=f"Phase {i + 1}: Mastering {', '.join(p_skills[:2])}",
                    duration_weeks=weeks_per_phase,
                    topics_to_learn=p_skills,
                    resources=p_resources,
                    recommended_projects=[project_name]
                )
            )

        # Map certifications
        certs = []
        skills_lower = [s.lower() for s in skills_to_plan]
        if any("aws" in s or "cloud" in s for s in skills_lower):
            certs.append("AWS Certified Cloud Practitioner")
        if any("ml" in s or "machine learning" in s for s in skills_lower):
            certs.append("TensorFlow Developer Certificate")
        if not certs:
            certs.append(f"General {target_role} Skill Certification")

        summary = (
            f"This fallback plan is tailored to prepare you for the {target_role} path "
            f"over a {timeline_weeks}-week curriculum. Focus on hands-on project deliverables "
            f"in each milestone to maximize retention."
        )

        return RoadmapAnalysis(
            summary=summary,
            target_role=target_role,
            timeline_weeks=timeline_weeks,
            phases=phases,
            certifications=certs
        )

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    async def generate_roadmap(
        self, 
        missing_skills: List[str], 
        timeline_weeks: int = 8, 
        target_role: str = "Software Engineer"
    ) -> RoadmapAnalysis:
        """
        Generates a chronological study path based on skill gap elements.
        
        Uses Gemini 2.5 Flash for personalized roadmap generation when available,
        with automatic fallback to rule-based generation.

        Designed to be registered as an MCP tool: 'roadmap_agent_generate_roadmap'.

        Args:
            missing_skills: List of skills currently missing from candidate profile.
            timeline_weeks: Desired timeline length in weeks (typically 4, 8, or 12).
            target_role: Target job description title.

        Returns:
            RoadmapAnalysis schema containing phases, resources, and checklists.
        """
        # Enforce timeline standards
        if timeline_weeks not in [4, 8, 12]:
            # Adjust to nearest supported baseline
            if timeline_weeks < 6:
                timeline_weeks = 4
            elif timeline_weeks < 10:
                timeline_weeks = 8
            else:
                timeline_weeks = 12
        
        print("\n=== GENERATE ROADMAP ===")
        print("CLIENT:", self._client)
        print("========================\n")
        # Attempt Gemini-powered generation first
        if self._client:
            gemini_result = await self._generate_with_gemini(
                missing_skills, timeline_weeks, target_role
            )
            if gemini_result is not None:
                return gemini_result
            logger.info("Gemini roadmap generation returned None, using rule-based fallback.")

        # Fallback to local rule-based generation
        return self._generate_fallback_roadmap(missing_skills, timeline_weeks, target_role)

    async def generate_roadmap_detailed(
        self,
        missing_skills: List[str],
        timeline_weeks: int = 8,
        target_role: str = "Software Engineer",
    ) -> Dict[str, Any]:
        """
        Extended roadmap endpoint that returns the full Gemini-enhanced response
        when available, including weekly milestones, portfolio ideas, interview
        checkpoints, and progress tracking.

        Falls back to a best-effort conversion of rule-based results when Gemini
        is unavailable.

        Args:
            missing_skills: List of skills currently missing from candidate profile.
            timeline_weeks: Desired timeline length in weeks (typically 4, 8, or 12).
            target_role: Target job description title.

        Returns:
            Dictionary containing the full GeminiRoadmapResponse structure:
            weekly_milestones, portfolio_ideas, certifications, overall_progress_trackers,
            key_milestones_summary, plus summary, target_role, timeline_weeks.
        """
        # Enforce timeline standards
        if timeline_weeks not in [4, 8, 12]:
            if timeline_weeks < 6:
                timeline_weeks = 4
            elif timeline_weeks < 10:
                timeline_weeks = 8
            else:
                timeline_weeks = 12

        # Try Gemini first for the full rich response
        if self._client:
            try:
                prompt = self._build_gemini_prompt(missing_skills, timeline_weeks, target_role)

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=self.GEMINI_SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        response_schema=GeminiRoadmapResponse,
                        temperature=0.2,
                    ),
                )

                if response.text:
                    gemini_result = GeminiRoadmapResponse.model_validate_json(response.text)
                    logger.info(
                        "Gemini detailed roadmap succeeded — role=%s, weeks=%d",
                        gemini_result.target_role,
                        gemini_result.timeline_weeks,
                    )
                    return gemini_result.model_dump()

            except Exception as exc:
                logger.warning(
                    "Gemini detailed roadmap failed, building from rule-based fallback: %s",
                    exc,
                )

        # Fallback: build a best-effort detailed response from rule-based analysis
        legacy = self._generate_fallback_roadmap(missing_skills, timeline_weeks, target_role)

        # Convert phases into weekly milestones
        weekly_milestones = []
        week_counter = 1
        for phase in legacy.phases:
            for w in range(phase.duration_weeks):
                if week_counter > timeline_weeks:
                    break
                # Distribute topics across weeks within the phase
                week_topics = phase.topics_to_learn[w::phase.duration_weeks] if phase.topics_to_learn else []
                weekly_milestones.append({
                    "week_number": week_counter,
                    "title": f"Week {week_counter}: {phase.title}",
                    "learning_objectives": [
                        {
                            "objective": f"Study and practice {topic}",
                            "skill_targeted": topic,
                            "success_criteria": f"Complete exercises and build a small project using {topic}",
                        }
                        for topic in week_topics
                    ],
                    "resources": [r.model_dump() for r in phase.resources[:2]],
                    "practice_projects": [
                        {
                            "project_name": proj,
                            "description": proj,
                            "skills_practiced": week_topics,
                            "difficulty": "intermediate",
                            "estimated_hours": 10,
                        }
                        for proj in phase.recommended_projects[:1]
                    ] if w == phase.duration_weeks - 1 else [],
                    "interview_checkpoint": None,
                    "progress_trackers": [
                        {
                            "metric": "Hours studied",
                            "target_value": "10-15 hours",
                            "tracking_method": "Personal log or time-tracking app",
                        }
                    ],
                    "hours_commitment": 15,
                })
                week_counter += 1

        return {
            "summary": legacy.summary,
            "target_role": legacy.target_role,
            "timeline_weeks": legacy.timeline_weeks,
            "weekly_milestones": weekly_milestones,
            "portfolio_ideas": [
                {
                    "title": proj,
                    "description": proj,
                    "technologies": missing_skills[:3],
                    "employer_appeal": f"Demonstrates hands-on experience with {', '.join(missing_skills[:3])}.",
                }
                for phase in legacy.phases
                for proj in phase.recommended_projects[:1]
            ],
            "certifications": legacy.certifications,
            "overall_progress_trackers": [
                {
                    "metric": "Projects completed",
                    "target_value": f"{len(legacy.phases)} projects",
                    "tracking_method": "GitHub repositories",
                },
                {
                    "metric": "Skills acquired",
                    "target_value": f"{len(missing_skills)} skills",
                    "tracking_method": "Self-assessment checklist",
                },
            ],
            "key_milestones_summary": [
                f"By week {min(timeline_weeks, 4)}: Complete foundational skills and first practice project.",
                f"By week {min(timeline_weeks, max(timeline_weeks // 2, 4))}: Build portfolio project combining multiple skills.",
                f"By week {timeline_weeks}: Be interview-ready for {target_role} positions.",
            ],
        }

    def to_adk_agent(self) -> Any:
        """
        Wraps and registers this RoadmapAgent instance configuration as a Google ADK Agent.

        Returns:
            An instance of google.adk.agents.Agent.

        Raises:
            ImportError: If the google-adk library is not installed.
        """
        if not HAS_ADK:
            raise ImportError(
                "google-adk package is not installed. Ensure `google-adk` is present in dependencies "
                "to register the ADK agent."
            )

        return AdkAgent(
            name="roadmap_agent",
            model=self.model_name,
            instruction=(
                "You are the specialist Roadmap Agent for CareerGenesis. "
                "Your role is to formulate week-by-week study roadmaps, suggest online courses and certifications, "
                "propose portfolio projects, and output structural study schedules in JSON format."
            ),
            tools=[self.generate_roadmap]
        )
