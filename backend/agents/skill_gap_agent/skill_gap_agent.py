"""
Skill Gap Agent Module for CareerGenesis.

This module contains the SkillGapAgent class along with Pydantic schemas for
skill gap analysis results. The SkillGapAgent evaluates candidate skills against
job description requirements, categorizes them into matched, missing, or partially matching,
and calculates the overall matching percentage.

When a GEMINI_API_KEY is available the agent delegates to Gemini 2.5 Flash for
rich, AI-powered semantic skill analysis.  Gemini performs contextual matching
(e.g. "FastAPI" → "Backend API Development"), categorizes skills into groups
(Technical, Tools & Frameworks, Cloud & DevOps, Soft Skills), explains match
reasoning, and prioritizes missing skills by employability impact.  If the key
is absent or any Gemini call fails, deterministic rule-based fallbacks are used
transparently.

Compatible with Google ADK framework and designed to act as an MCP-compatible tool.
"""

import json
import logging
import os
import re
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

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


# =====================================================================
# 1. Pydantic Schemas  (original + Gemini-enhanced)
# =====================================================================

class MatchingSkill(BaseModel):
    """Schema representing a skill successfully matched between candidate and role."""
    
    skill_name: str = Field(..., description="Name of the matching skill")
    proficiency_level: str = Field(
        "intermediate", 
        description="Estimated proficiency level, e.g., 'beginner', 'intermediate', 'advanced'"
    )
    evidence_in_resume: str = Field(
        ..., 
        description="Evidence or context showing where/how the skill was demonstrated in the resume"
    )


class MissingSkill(BaseModel):
    """Schema representing a critical skill missing from the candidate's profile."""
    
    skill_name: str = Field(..., description="Name of the missing skill")
    importance: str = Field(
        "high", 
        description="Importance for the target role: 'critical', 'high', 'medium', 'low'"
    )
    description: str = Field(
        ..., 
        description="Explanation of why this skill is important for the target job description"
    )


class PartialMatch(BaseModel):
    """Schema representing a skill that is partially matched or has transferable experience."""
    
    required_skill: str = Field(..., description="The exact skill required by the employer")
    candidate_skills: List[str] = Field(
        ..., 
        description="Related or overlapping skills the candidate possesses (e.g., MySQL instead of PostgreSQL)"
    )
    gap_description: str = Field(
        ..., 
        description="A description of the gap between what is required and what the candidate knows"
    )
    recommendation: str = Field(
        ..., 
        description="Actionable advice on how to bridge the partial gap"
    )


class SkillGapAnalysis(BaseModel):
    """Payload representing the full output of a skill gap assessment."""
    
    matching_skills: List[MatchingSkill] = Field(default_factory=list)
    missing_skills: List[MissingSkill] = Field(default_factory=list)
    partial_matches: List[PartialMatch] = Field(default_factory=list)
    match_percentage: float = Field(
        ..., 
        description="Calculated match score out of 100", 
        ge=0.0, 
        le=100.0
    )
    recommendations: List[str] = Field(
        default_factory=list, 
        description="General high-level advice on bridging the overall skill gaps"
    )


# -----------  Gemini-enhanced response schemas  -----------

class GeminiMatchedSkill(BaseModel):
    """A skill the candidate possesses that matches (exactly or semantically) a job requirement."""

    skill_name: str = Field(..., description="Name of the matched skill as it appears in the job description")
    candidate_skill: str = Field(..., description="The corresponding skill from the candidate's profile")
    match_type: str = Field(
        ...,
        description="Type of match: 'exact' for identical skills, 'semantic' for conceptually equivalent skills"
    )
    confidence: float = Field(
        ...,
        description="Confidence score between 0.0 and 1.0 indicating match strength",
        ge=0.0,
        le=1.0
    )
    explanation: str = Field(
        ...,
        description="Reasoning for why this skill was considered a match (e.g., 'FastAPI is a Python framework for Backend API Development')"
    )
    proficiency_level: str = Field(
        "intermediate",
        description="Estimated proficiency level: 'beginner', 'intermediate', 'advanced'"
    )


class GeminiPartialMatch(BaseModel):
    """A skill that is partially matched — the candidate has related but not identical experience."""

    required_skill: str = Field(..., description="The skill required by the job description")
    candidate_skills: List[str] = Field(
        ...,
        description="Related skills from the candidate's profile that partially cover the requirement"
    )
    match_strength: float = Field(
        ...,
        description="How strong the partial match is, between 0.0 and 1.0",
        ge=0.0,
        le=1.0
    )
    explanation: str = Field(
        ...,
        description="Reasoning for why this is a partial match rather than a full match"
    )
    gap_description: str = Field(
        ...,
        description="Description of the gap between what is required and what the candidate knows"
    )
    recommendation: str = Field(
        ...,
        description="Actionable advice on how to bridge this specific gap"
    )


class GeminiMissingSkill(BaseModel):
    """A skill entirely missing from the candidate's profile."""

    skill_name: str = Field(..., description="Name of the missing skill")
    importance: str = Field(
        ...,
        description="Importance for the target role: 'critical', 'high', 'medium', 'low'"
    )
    impact_on_employability: str = Field(
        ...,
        description="How missing this skill affects the candidate's chances for the role"
    )
    description: str = Field(
        ...,
        description="Explanation of why this skill is important for the target job"
    )


class SkillCategory(BaseModel):
    """A category grouping of skills extracted from the job description."""

    category_name: str = Field(
        ...,
        description="Category name: 'Technical Skills', 'Tools & Frameworks', 'Cloud & DevOps', or 'Soft Skills'"
    )
    skills: List[str] = Field(
        default_factory=list,
        description="List of skills belonging to this category"
    )


class PrioritySkill(BaseModel):
    """A missing skill prioritized by its impact on the candidate's employability."""

    skill_name: str = Field(..., description="Name of the priority skill to learn")
    rank: int = Field(..., description="Priority rank (1 = most important)", ge=1, le=5)
    reason: str = Field(
        ...,
        description="Why this skill is the most impactful to learn for this role"
    )
    suggested_resources: List[str] = Field(
        default_factory=list,
        description="Suggested learning resources, courses, or platforms"
    )


class LearningRecommendation(BaseModel):
    """A structured learning recommendation for closing a specific skill gap."""

    skill_name: str = Field(..., description="The skill this recommendation targets")
    action: str = Field(
        ...,
        description="Specific action to take (e.g., 'Complete AWS Solutions Architect certification')"
    )
    estimated_time: str = Field(
        ...,
        description="Estimated time to acquire basic proficiency (e.g., '2-4 weeks')"
    )
    resources: List[str] = Field(
        default_factory=list,
        description="Recommended courses, tutorials, or documentation links"
    )


class GeminiSkillGapResponse(BaseModel):
    """Full structured response schema for Gemini-powered skill gap analysis."""

    matched_skills: List[GeminiMatchedSkill] = Field(
        default_factory=list,
        description="Skills that are fully matched (exactly or semantically)"
    )
    partial_matches: List[GeminiPartialMatch] = Field(
        default_factory=list,
        description="Skills that are partially matched through transferable experience"
    )
    missing_skills: List[GeminiMissingSkill] = Field(
        default_factory=list,
        description="Skills completely missing from the candidate's profile"
    )
    match_percentage: float = Field(
        ...,
        description="Overall match percentage between candidate and job requirements (0-100)",
        ge=0.0,
        le=100.0
    )
    skill_categories: List[SkillCategory] = Field(
        default_factory=list,
        description="Job description skills organized into categories"
    )
    priority_skills_to_learn: List[PrioritySkill] = Field(
        default_factory=list,
        description="Top 5 most impactful missing skills to learn, ordered by priority"
    )
    gap_summary: str = Field(
        ...,
        description="A concise executive summary of the candidate's overall skill alignment and key gaps"
    )
    learning_recommendations: List[LearningRecommendation] = Field(
        default_factory=list,
        description="Structured learning recommendations for closing skill gaps"
    )


# =====================================================================
# 2. SkillGapAgent Class
# =====================================================================

class SkillGapAgent:
    """
    Skill Gap Agent specialized in comparing candidate capabilities with target jobs,
    diagnosing missing skills, mapping transferability, and scoring alignment.

    When a GEMINI_API_KEY is available, uses Gemini 2.5 Flash for:
      - Semantic skill matching (e.g. FastAPI → Backend API Development)
      - Skill categorization (Technical, Tools & Frameworks, Cloud & DevOps, Soft Skills)
      - Match explanation reasoning
      - Priority-ranked missing skills with employability impact
      - Structured learning recommendations

    Falls back to deterministic rule-based analysis when Gemini is unavailable.
    
    Compatible with Google ADK framework and designed to act as an MCP-compatible tool.
    """

    GEMINI_SYSTEM_INSTRUCTION = (
        "You are an elite Skill Mapping and Career Architecture Expert with deep knowledge of "
        "modern tech stacks, tools, frameworks, cloud platforms, and soft skills.\n\n"
        "Your task: Analyze the candidate's skills against the target job description and produce "
        "a comprehensive, structured skill gap analysis.\n\n"
        "## Matching Rules\n"
        "1. **Exact Match**: Skill names are identical or trivially equivalent "
        "(e.g., 'Python' = 'Python 3', 'JS' = 'JavaScript').\n"
        "2. **Semantic Match**: The candidate's skill strongly implies the required capability. "
        "Examples:\n"
        "   - 'FastAPI' → 'Backend API Development' (FastAPI IS a backend API framework)\n"
        "   - 'AWS' → 'Cloud Deployment' (AWS IS a cloud platform)\n"
        "   - 'Docker' → 'Containerization' (Docker IS a containerization tool)\n"
        "   - 'React' → 'Frontend Development' (React IS a frontend framework)\n"
        "   - 'PostgreSQL' → 'Database Management' (PostgreSQL IS a database system)\n"
        "   For semantic matches, explain the reasoning clearly.\n"
        "3. **Partial Match**: The candidate has related skills that partially cover the "
        "requirement but don't fully satisfy it. Examples:\n"
        "   - Candidate has 'MySQL' but job requires 'PostgreSQL' (same category, different tool)\n"
        "   - Candidate has 'AWS' but job requires 'Azure' (both cloud, different vendor)\n"
        "   For partial matches, explain the gap and recommend how to bridge it.\n"
        "4. **Missing**: No matching or related skill found in the candidate's profile.\n\n"
        "## Skill Categorization\n"
        "Categorize ALL skills extracted from the job description into exactly these categories:\n"
        "- **Technical Skills**: Programming languages, algorithms, data structures, system design\n"
        "- **Tools & Frameworks**: Specific tools, libraries, frameworks (React, FastAPI, TensorFlow, etc.)\n"
        "- **Cloud & DevOps**: Cloud platforms, CI/CD, containerization, orchestration, IaC\n"
        "- **Soft Skills**: Communication, leadership, teamwork, problem-solving, agile, project management\n\n"
        "## Priority Skills\n"
        "Identify the top 5 most impactful missing skills to learn, ranked by:\n"
        "1. How frequently the skill appears in job requirements\n"
        "2. Whether it's marked as 'required' vs 'nice-to-have'\n"
        "3. How much it would improve the candidate's overall match percentage\n"
        "4. Market demand and career growth potential\n\n"
        "## Match Percentage Calculation\n"
        "- Exact/semantic matches count as 1.0\n"
        "- Partial matches count as 0.5\n"
        "- Missing skills count as 0.0\n"
        "- Formula: (sum of match values / total required skills) × 100\n\n"
        "## Learning Recommendations\n"
        "For each priority missing skill, provide:\n"
        "- A specific, actionable learning path\n"
        "- Estimated time to basic proficiency\n"
        "- Recommended resources (courses, certifications, documentation)\n\n"
        "## Gap Summary\n"
        "Write a concise executive summary (2-4 sentences) covering:\n"
        "- Overall alignment strength\n"
        "- Key strengths the candidate brings\n"
        "- Most critical gaps to address\n"
        "- Overall hiring readiness assessment"
    )

    def __init__(self, model_name: str = "gemini-2.5-flash", api_key: Optional[str] = None):
        """
        Initializes the SkillGapAgent.

        Args:
            model_name: The Gemini model name used for routing and reasoning.
            api_key: Optional Gemini API key. Defaults to environment variable.
        """
        self.model_name = model_name
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self._client = None

        if HAS_GENAI and self.api_key:
            self._client = genai.Client(api_key=self.api_key)

    # -----------------------------------------------------------------
    # Gemini-powered analysis
    # -----------------------------------------------------------------

    def _build_gemini_prompt(
        self,
        candidate_skills: List[str],
        job_description: str,
    ) -> str:
        """Build the user prompt sent to Gemini for skill gap analysis."""
        return (
            "Perform a comprehensive skill gap analysis based on the following inputs.\n\n"
            "## CANDIDATE SKILLS\n"
            f"{', '.join(candidate_skills)}\n\n"
            "## TARGET JOB DESCRIPTION\n"
            f"{job_description}\n\n"
            "Instructions:\n"
            "1. Extract ALL required skills from the job description.\n"
            "2. Categorize them into: Technical Skills, Tools & Frameworks, Cloud & DevOps, Soft Skills.\n"
            "3. Perform semantic matching against the candidate's skills — do NOT rely solely on exact keyword matching.\n"
            "4. For each matched skill, explain WHY it was considered a match.\n"
            "5. For each partial match, explain the gap and how to bridge it.\n"
            "6. List all missing skills with their importance and impact on employability.\n"
            "7. Calculate the overall match percentage.\n"
            "8. Rank the top 5 most impactful missing skills by priority.\n"
            "9. Provide structured learning recommendations for each priority skill.\n"
            "10. Write a concise gap summary.\n"
        )

    def _gemini_response_to_legacy(self, gemini_result: GeminiSkillGapResponse) -> SkillGapAnalysis:
        """
        Convert the rich Gemini response into the original SkillGapAnalysis schema
        so the external API contract remains unchanged.
        """
        # Convert matched skills
        matching_skills = [
            MatchingSkill(
                skill_name=m.skill_name,
                proficiency_level=m.proficiency_level,
                evidence_in_resume=(
                    f"[{m.match_type} match, confidence={m.confidence:.0%}] "
                    f"Candidate skill '{m.candidate_skill}' — {m.explanation}"
                ),
            )
            for m in gemini_result.matched_skills
        ]

        # Convert partial matches
        partial_matches = [
            PartialMatch(
                required_skill=p.required_skill,
                candidate_skills=p.candidate_skills,
                gap_description=f"[match_strength={p.match_strength:.0%}] {p.gap_description}",
                recommendation=p.recommendation,
            )
            for p in gemini_result.partial_matches
        ]

        # Convert missing skills
        missing_skills = [
            MissingSkill(
                skill_name=m.skill_name,
                importance=m.importance,
                description=f"{m.description} Impact: {m.impact_on_employability}",
            )
            for m in gemini_result.missing_skills
        ]

        # Build recommendations from multiple Gemini outputs
        recommendations: List[str] = []

        # Gap summary as first recommendation
        if gemini_result.gap_summary:
            recommendations.append(gemini_result.gap_summary)

        # Priority skills
        if gemini_result.priority_skills_to_learn:
            priority_names = [
                f"{p.rank}. {p.skill_name}" for p in gemini_result.priority_skills_to_learn
            ]
            recommendations.append(
                f"Priority skills to learn: {', '.join(priority_names)}"
            )

        # Learning recommendations
        for lr in gemini_result.learning_recommendations:
            resources_str = f" Resources: {', '.join(lr.resources)}" if lr.resources else ""
            recommendations.append(
                f"[{lr.skill_name}] {lr.action} (est. {lr.estimated_time}).{resources_str}"
            )

        # Skill categories summary
        if gemini_result.skill_categories:
            cat_summaries = [
                f"{cat.category_name}: {', '.join(cat.skills)}"
                for cat in gemini_result.skill_categories
                if cat.skills
            ]
            if cat_summaries:
                recommendations.append(
                    "Skill categories from job description — " + " | ".join(cat_summaries)
                )

        return SkillGapAnalysis(
            matching_skills=matching_skills,
            missing_skills=missing_skills,
            partial_matches=partial_matches,
            match_percentage=gemini_result.match_percentage,
            recommendations=recommendations,
        )

    async def _analyze_with_gemini(
        self,
        candidate_skills: List[str],
        job_description: str,
    ) -> Optional[SkillGapAnalysis]:
        """
        Perform Gemini-powered semantic skill gap analysis.

        Returns:
            SkillGapAnalysis on success, or None if Gemini call fails (triggers fallback).
        """
        if not self._client:
            return None

        try:
            prompt = self._build_gemini_prompt(candidate_skills, job_description)

            response = self._client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=self.GEMINI_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=GeminiSkillGapResponse,
                    temperature=0.1,
                ),
            )

            if response.text:
                gemini_result = GeminiSkillGapResponse.model_validate_json(response.text)
                logger.info(
                    "Gemini skill gap analysis succeeded — match=%.1f%%, "
                    "matched=%d, partial=%d, missing=%d",
                    gemini_result.match_percentage,
                    len(gemini_result.matched_skills),
                    len(gemini_result.partial_matches),
                    len(gemini_result.missing_skills),
                )
                return self._gemini_response_to_legacy(gemini_result)

        except Exception as exc:
            logger.warning(
                "Gemini skill gap analysis failed, falling back to rule-based analysis: %s",
                exc,
            )

        return None

    # -----------------------------------------------------------------
    # Rule-based fallback analysis  (original logic preserved)
    # -----------------------------------------------------------------

    def _extract_skills_locally(self, text: str) -> List[str]:
        """Local regex search helper for common technical terms."""
        common_skills = [
            "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust",
            "html", "css", "react", "angular", "vue", "next.js", "node.js", "express", "fastapi", "django",
            "sql", "postgresql", "mysql", "mongodb", "redis", "firebase", "sqlite",
            "aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "ci/cd", "jenkins",
            "machine learning", "ml", "deep learning", "nlp", "llm", "tensorflow", "pytorch", "scikit-learn",
            "agile", "scrum", "project management", "system design", "data structures", "algorithms"
        ]
        
        extracted = []
        text_lower = text.lower()
        
        for skill in common_skills:
            escaped_skill = re.escape(skill)
            pattern = rf"\b{escaped_skill}\b"
            if skill in ["c++", "c#"]:
                pattern = rf"{escaped_skill}"
                
            if re.search(pattern, text_lower):
                # Normalize names
                matched_label = skill
                if skill == "golang":
                    matched_label = "Go"
                elif skill == "fastapi":
                    matched_label = "FastAPI"
                elif skill == "next.js":
                    matched_label = "Next.js"
                else:
                    matched_label = skill.capitalize() if len(skill) > 3 else skill.upper()
                
                extracted.append(matched_label)
                
        return list(set(extracted))

    def _analyze_skill_gap_locally(
        self, 
        candidate_skills: List[str], 
        job_description: str
    ) -> SkillGapAnalysis:
        """
        Fallback matching logic using rule-based tech categorization and token distance checks.
        
        Args:
            candidate_skills: List of candidate skills.
            job_description: Job description text.

        Returns:
            A populated SkillGapAnalysis model.
        """
        required_skills = self._extract_skills_locally(job_description)
        
        # Skill groups for partial matching mapping
        skill_groups = [
            {"react", "angular", "vue", "next.js", "html", "css", "javascript", "typescript"},  # Frontend
            {"python", "django", "fastapi", "flask", "node.js", "express", "go", "golang", "java", "spring", "c++", "c#", "rust"},  # Backend/Lang
            {"sql", "postgresql", "mysql", "mongodb", "redis", "firebase", "sqlite", "nosql"},  # DB
            {"aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "ci/cd", "jenkins"},  # Cloud/Devops
            {"machine learning", "ml", "deep learning", "nlp", "llm", "tensorflow", "pytorch", "scikit-learn"}  # AI/ML
        ]

        candidate_lower = [c.lower() for c in candidate_skills]
        required_lower = [r.lower() for r in required_skills]

        matched_list: List[MatchingSkill] = []
        partial_list: List[PartialMatch] = []
        missing_list: List[MissingSkill] = []

        # Iterate over required skills to determine matching status
        for req in required_skills:
            req_l = req.lower()
            if req_l in candidate_lower:
                matched_list.append(
                    MatchingSkill(
                        skill_name=req,
                        proficiency_level="intermediate",
                        evidence_in_resume="Matched directly in candidate skills list."
                    )
                )
            else:
                # Check for partial matches in the same technology groups
                related_possessed = []
                for group in skill_groups:
                    if req_l in group:
                        related_possessed = [c for c in candidate_skills if c.lower() in group]
                        break
                
                if related_possessed:
                    partial_list.append(
                        PartialMatch(
                            required_skill=req,
                            candidate_skills=related_possessed,
                            gap_description=f"Candidate possesses related group skills ({', '.join(related_possessed)}) but lacks exact experience with {req}.",
                            recommendation=f"Leverage conceptual understanding of {related_possessed[0]} to quickly pick up syntax and design patterns for {req}."
                        )
                    )
                else:
                    # Check importance from job description context
                    # If skill appears near words like "required", "must", "essential", mark as high/critical
                    jd_lower = job_description.lower()
                    pattern = rf"(?:required|must|essential|critical|strong\s+knowledge)\s+.*?\b{re.escape(req_l)}\b"
                    is_critical = bool(re.search(pattern, jd_lower))
                    importance = "high" if is_critical else "medium"

                    missing_list.append(
                        MissingSkill(
                            skill_name=req,
                            importance=importance,
                            description=f"Skill '{req}' is explicitly mentioned in job requirements, but candidate profile shows no similar domain keywords."
                        )
                    )

        # Calculate matching percentage
        total_req = len(required_skills)
        if total_req > 0:
            # Matched counts as 1.0, Partial counts as 0.5, Missing counts as 0
            score = (len(matched_list) * 1.0 + len(partial_list) * 0.5) / total_req
            match_pct = float(round(score * 100, 1))
        else:
            match_pct = 100.0 if len(candidate_skills) > 0 else 0.0

        # General recommendations
        recommendations = [
            f"Your skills match approximately {match_pct}% of the job description requirements.",
        ]
        if missing_list:
            recommendations.append(
                f"Prioritize learning {', '.join([m.skill_name for m in missing_list[:3]])} which are core missing skill areas."
            )
        if partial_list:
            recommendations.append(
                "Emphasize transferable skills during discussions to mitigate worries about exact tool familiarity."
            )

        return SkillGapAnalysis(
            matching_skills=matched_list,
            missing_skills=missing_list,
            partial_matches=partial_list,
            match_percentage=match_pct,
            recommendations=recommendations
        )

    # -----------------------------------------------------------------
    # Public API
    # -----------------------------------------------------------------

    async def analyze_skill_gap(
        self, 
        candidate_skills: List[str], 
        job_description: str
    ) -> SkillGapAnalysis:
        """
        Compares candidate skills against target job description requirements.
        
        Uses Gemini 2.5 Flash for semantic skill matching when available, with
        automatic fallback to rule-based analysis.

        Designed to be registered as an MCP tool: 'skill_gap_agent_analyze_skill_gap'.

        Args:
            candidate_skills: List of skills extracted from candidate resume.
            job_description: Raw text of the target job description.

        Returns:
            SkillGapAnalysis schema containing lists of match metrics and gap actions.
        """
        # Attempt Gemini-powered analysis first
        if self._client:
            gemini_result = await self._analyze_with_gemini(candidate_skills, job_description)
            if gemini_result is not None:
                return gemini_result
            logger.info("Gemini analysis returned None, using rule-based fallback.")

        # Fallback to local rule-based analysis
        return self._analyze_skill_gap_locally(candidate_skills, job_description)

    async def analyze_skill_gap_detailed(
        self,
        candidate_skills: List[str],
        job_description: str,
    ) -> Dict[str, Any]:
        """
        Extended analysis endpoint that returns the full Gemini-enhanced response
        when available, including skill categories, priority skills, learning
        recommendations, and gap summary.

        Falls back to a best-effort conversion of rule-based results when Gemini
        is unavailable.

        Args:
            candidate_skills: List of skills extracted from candidate resume.
            job_description: Raw text of the target job description.

        Returns:
            Dictionary containing: matched_skills, partial_matches, missing_skills,
            match_percentage, skill_categories, priority_skills_to_learn,
            gap_summary, learning_recommendations.
        """
        # Try Gemini first for the full rich response
        if self._client:
            try:
                prompt = self._build_gemini_prompt(candidate_skills, job_description)

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=self.GEMINI_SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        response_schema=GeminiSkillGapResponse,
                        temperature=0.1,
                    ),
                )

                if response.text:
                    gemini_result = GeminiSkillGapResponse.model_validate_json(response.text)
                    logger.info(
                        "Gemini detailed analysis succeeded — match=%.1f%%",
                        gemini_result.match_percentage,
                    )
                    return gemini_result.model_dump()

            except Exception as exc:
                logger.warning(
                    "Gemini detailed analysis failed, building from rule-based fallback: %s",
                    exc,
                )

        # Fallback: build a best-effort detailed response from rule-based analysis
        legacy = self._analyze_skill_gap_locally(candidate_skills, job_description)
        return {
            "matched_skills": [
                {
                    "skill_name": m.skill_name,
                    "candidate_skill": m.skill_name,
                    "match_type": "exact",
                    "confidence": 1.0,
                    "explanation": m.evidence_in_resume,
                    "proficiency_level": m.proficiency_level,
                }
                for m in legacy.matching_skills
            ],
            "partial_matches": [
                {
                    "required_skill": p.required_skill,
                    "candidate_skills": p.candidate_skills,
                    "match_strength": 0.5,
                    "explanation": p.gap_description,
                    "gap_description": p.gap_description,
                    "recommendation": p.recommendation,
                }
                for p in legacy.partial_matches
            ],
            "missing_skills": [
                {
                    "skill_name": m.skill_name,
                    "importance": m.importance,
                    "impact_on_employability": f"Missing {m.importance}-importance skill for the role.",
                    "description": m.description,
                }
                for m in legacy.missing_skills
            ],
            "match_percentage": legacy.match_percentage,
            "skill_categories": [],
            "priority_skills_to_learn": [
                {
                    "skill_name": m.skill_name,
                    "rank": i + 1,
                    "reason": m.description,
                    "suggested_resources": [],
                }
                for i, m in enumerate(legacy.missing_skills[:5])
            ],
            "gap_summary": (
                f"Rule-based analysis: {legacy.match_percentage:.0f}% match. "
                f"{len(legacy.matching_skills)} matched, "
                f"{len(legacy.partial_matches)} partial, "
                f"{len(legacy.missing_skills)} missing skills identified."
            ),
            "learning_recommendations": [
                {
                    "skill_name": m.skill_name,
                    "action": f"Study and practice {m.skill_name}.",
                    "estimated_time": "2-4 weeks",
                    "resources": [],
                }
                for m in legacy.missing_skills[:5]
            ],
        }

    def to_adk_agent(self) -> Any:
        """
        Wraps and registers this SkillGapAgent instance configuration as a Google ADK Agent.

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
            name="skill_gap_agent",
            model=self.model_name,
            instruction=(
                "You are the specialist Skill Gap Agent for CareerGenesis. "
                "Your role is to map candidate skills to job specifications, locate missing capabilities, "
                "propose transferable skills adjustments, and yield structured match analyses in JSON."
            ),
            tools=[self.analyze_skill_gap]
        )
