"""
Resume Agent Module for CareerGenesis.

This module contains the ResumeAgent class along with Pydantic schemas for
resume profiles and analysis reports. The ResumeAgent is responsible for parsing
resume text, extracting structural components, estimating ATS scores, identifying
extracted skills, and suggesting contextual resume improvements.

When a GEMINI_API_KEY is available the agent delegates to Gemini 2.5 Flash for
rich, AI-powered analysis.  All five report sections (ATS review, strengths,
weaknesses, improvement suggestions, skills summary) are generated through
dedicated Gemini calls with structured-output schemas.  If the key is absent or
any call fails, deterministic rule-based fallbacks are used transparently.

Designed to be typed, clean, and compatible with Google ADK and Model Context Protocol (MCP).
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
    from google.adk.agents import Agent as AdkAgent
    HAS_ADK = True
except ImportError:
    HAS_ADK = False


# =====================================================================
# 1. Pydantic Schemas
# =====================================================================

class ContactInfo(BaseModel):
    """Schema representing candidate contact details."""
    
    name: Optional[str] = Field(None, description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    location: Optional[str] = Field(None, description="Location, e.g., 'City, State' or 'City, Country'")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    portfolio: Optional[str] = Field(None, description="Portfolio or GitHub profile URL")


class WorkExperience(BaseModel):
    """Schema representing a single job role held by the candidate."""
    
    company: str = Field(..., description="Name of the company or organization")
    role: str = Field(..., description="Job title or role name")
    start_date: Optional[str] = Field(None, description="Start date, e.g., 'MM/YYYY' or 'Month YYYY'")
    end_date: Optional[str] = Field(None, description="End date or 'Present'")
    description: List[str] = Field(
        default_factory=list,
        description="List of bullet points outlining responsibilities and quantified accomplishments"
    )


class Education(BaseModel):
    """Schema representing an academic qualification."""
    
    institution: str = Field(..., description="Name of the university, college, or school")
    degree: str = Field(..., description="Type of degree, e.g., 'B.S.', 'M.S.', 'Ph.D.'")
    major: Optional[str] = Field(None, description="Field of study or major")
    graduation_date: Optional[str] = Field(None, description="Graduation date, e.g., 'YYYY' or 'Month YYYY'")
    gpa: Optional[str] = Field(None, description="GPA score (if mentioned)")


class Project(BaseModel):
    """Schema representing an academic or personal project."""
    
    name: str = Field(..., description="Title of the project")
    description: str = Field(..., description="High-level description of the project goals")
    technologies: List[str] = Field(
        default_factory=list,
        description="Programming languages, tools, or frameworks used in the project"
    )
    url: Optional[str] = Field(None, description="Project link or repository URL")


class ResumeProfile(BaseModel):
    """Structured candidate profile extracted from raw resume text."""
    
    contact_info: ContactInfo = Field(default_factory=ContactInfo)
    summary: Optional[str] = Field(None, description="Professional summary or bio paragraph")
    education: List[Education] = Field(default_factory=list)
    experience: List[WorkExperience] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list, description="List of technical and soft skills")
    projects: List[Project] = Field(default_factory=list)


class Suggestion(BaseModel):
    """Detailed optimization suggestion for a resume section."""
    
    section: str = Field(..., description="The section targeted for enhancement (e.g., 'Experience', 'Summary')")
    original: Optional[str] = Field(None, description="The original phrasing or bullet point to replace")
    suggested: str = Field(..., description="The proposed text or optimization suggestion")
    reason: str = Field(..., description="The logic or rationale (e.g., ATS parsing, action-verb usage, missing metrics)")


class ATSMetrics(BaseModel):
    """Scoring dimensions evaluating resume compatibility and formatting."""
    
    overall_score: int = Field(..., description="Weighted average score from 0 to 100")
    structure_score: int = Field(..., description="Formatting, clear headings, and layout parsing compatibility")
    content_score: int = Field(..., description="Action verbs, quantified impacts, and description quality")
    keyword_score: int = Field(..., description="Frequency and coverage of critical job-specific keywords")


# -----------------------------------------------------------------
# Gemini-powered report schemas
# -----------------------------------------------------------------

class ATSReview(BaseModel):
    """In-depth ATS compatibility review generated by Gemini."""

    overall_score: int = Field(..., description="Overall ATS compatibility score 0-100")
    formatting_notes: List[str] = Field(
        default_factory=list,
        description="Observations about formatting, headers, and parsability"
    )
    keyword_coverage: str = Field(
        "", description="Assessment of keyword density relative to target role"
    )
    parse_warnings: List[str] = Field(
        default_factory=list,
        description="Elements that may confuse ATS parsers (tables, columns, images)"
    )
    summary: str = Field("", description="One-paragraph ATS readiness summary")


class ResumeStrengths(BaseModel):
    """Key strengths identified in the resume."""

    strengths: List[str] = Field(
        default_factory=list,
        description="Concrete strengths with supporting evidence from the resume"
    )
    summary: str = Field("", description="Overall strengths narrative")


class ResumeWeaknesses(BaseModel):
    """Weaknesses and gaps identified in the resume."""

    weaknesses: List[str] = Field(
        default_factory=list,
        description="Specific weaknesses, gaps, or red flags"
    )
    summary: str = Field("", description="Overall weaknesses narrative")


class ImprovementItem(BaseModel):
    """A single actionable improvement recommendation."""

    section: str = Field(..., description="Resume section targeted (e.g. Experience, Summary)")
    suggestion: str = Field(..., description="Specific recommended change")
    rationale: str = Field(..., description="Why this change improves the resume")
    priority: str = Field("medium", description="Priority: high, medium, or low")


class ImprovementSuggestions(BaseModel):
    """Structured list of resume improvement suggestions."""

    improvements: List[ImprovementItem] = Field(
        default_factory=list,
        description="Ordered list of actionable improvements"
    )
    summary: str = Field("", description="High-level improvement strategy")


class SkillsSummary(BaseModel):
    """Categorized skills summary extracted from the resume."""

    technical_skills: List[str] = Field(default_factory=list, description="Programming languages, frameworks, tools")
    soft_skills: List[str] = Field(default_factory=list, description="Communication, leadership, teamwork, etc.")
    domain_skills: List[str] = Field(default_factory=list, description="Industry or domain-specific expertise")
    certifications: List[str] = Field(default_factory=list, description="Certifications and credentials")
    missing_skills: List[str] = Field(
        default_factory=list,
        description="Skills commonly expected for the target role but absent from the resume"
    )
    summary: str = Field("", description="Narrative skills assessment")


class GeminiResumeReport(BaseModel):
    """Combined report from all five Gemini-powered analysis sections."""

    ats_review: Optional[ATSReview] = Field(None, description="ATS compatibility review")
    strengths: Optional[ResumeStrengths] = Field(None, description="Resume strengths analysis")
    weaknesses: Optional[ResumeWeaknesses] = Field(None, description="Resume weaknesses analysis")
    improvement_suggestions: Optional[ImprovementSuggestions] = Field(None, description="Actionable improvement plan")
    skills_summary: Optional[SkillsSummary] = Field(None, description="Categorized skills summary")


class ResumeAnalysis(BaseModel):
    """Result payload representing complete resume parser and analyst output."""

    parsed_profile: ResumeProfile = Field(..., description="Parsed and structured profile entities")
    ats_metrics: ATSMetrics = Field(..., description="Calculated ATS performance indicators")
    identified_skills: List[str] = Field(
        default_factory=list,
        description="All extracted and standardized skill terms"
    )
    suggestions: List[Suggestion] = Field(
        default_factory=list,
        description="Actionable improvement recommendations"
    )
    gemini_report: Optional[GeminiResumeReport] = Field(
        None,
        description="Enriched analysis generated by Gemini 2.5 Flash (present only when GEMINI_API_KEY is configured)"
    )


# =====================================================================
# 2. ResumeAgent Class
# =====================================================================

class ResumeAgent:
    """
    Resume Agent specialized in parsing resumes, evaluating ATS readiness,
    extracting skills, and providing optimization feedback.

    When a ``GEMINI_API_KEY`` environment variable (or an explicit *api_key*
    argument) is available **and** the ``google-genai`` SDK is installed, every
    analysis method delegates to **Gemini 2.5 Flash** via structured-output
    calls.  Otherwise the agent falls back transparently to deterministic,
    rule-based heuristics.

    Compatible with Google ADK framework and designed to act as an MCP-compatible tool.
    """

    def __init__(self, model_name: str = "gemini-2.5-flash", api_key: Optional[str] = None):
        """
        Initializes the ResumeAgent.

        Args:
            model_name: The Gemini model name used for parsing and reasoning.
            api_key: Optional Gemini API key. Defaults to environment variable
                     ``GEMINI_API_KEY``.
        """
        from dotenv import load_dotenv
        load_dotenv()
        
        self.model_name = model_name
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self._client = None

        if HAS_GENAI and self.api_key:
            self._client = genai.Client(api_key=self.api_key)
            logger.info("Gemini client initialized (model=%s)", self.model_name)
        else:
            logger.info(
                "Gemini client NOT available (HAS_GENAI=%s, api_key_set=%s). "
                "Using local fallback logic.",
                HAS_GENAI,
                bool(self.api_key),
            )

    def extract_skills(self, resume_text: str) -> List[str]:
        """
        Identifies and extracts technical skills and toolsets from raw resume text.
        
        Designed to be registered as an MCP tool: 'resume_agent_extract_skills'.

        Args:
            resume_text: Raw textual content of the resume.

        Returns:
            A list of unique, standardized skill names.
        """
        if self._client:
            try:
                system_instruction = (
                    "You are a specialized technical talent recruiter. "
                    "Analyze the provided resume text and extract all professional skills, "
                    "programming languages, framework components, methodologies, cloud providers, and databases. "
                    "Return a JSON array of clean, standardized strings. Do not include duplicates or conversational filler."
                )

                class SkillList(BaseModel):
                    skills: List[str]

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=resume_text,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=SkillList,
                        temperature=0.0
                    )
                )

                if response.text:
                    data = SkillList.model_validate_json(response.text)
                    return list(set(data.skills))
            except Exception:
                # Fallback to local rule-based parsing on failure
                pass

        # Fallback to local regex-based parsing
        return self._extract_skills_locally(resume_text)

    def _extract_skills_locally(self, resume_text: str) -> List[str]:
        """Local regex search fallback for common technologies and methodologies."""
        common_skills = [
            "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust",
            "html", "css", "react", "angular", "vue", "next.js", "node.js", "express", "fastapi", "django",
            "sql", "postgresql", "mysql", "mongodb", "redis", "firebase", "sqlite",
            "aws", "azure", "gcp", "docker", "kubernetes", "git", "github", "ci/cd", "jenkins",
            "machine learning", "ml", "deep learning", "nlp", "llm", "tensorflow", "pytorch", "scikit-learn",
            "agile", "scrum", "project management", "system design", "data structures", "algorithms"
        ]
        
        extracted = []
        text_lower = resume_text.lower()
        
        for skill in common_skills:
            # Match boundary for letters/numbers, escape pluses/hashes
            escaped_skill = re.escape(skill)
            pattern = rf"\b{escaped_skill}\b"
            # Special case matching for C++, C#, .NET, Node.js etc.
            if skill in ["c++", "c#"]:
                pattern = rf"{escaped_skill}"
                
            if re.search(pattern, text_lower):
                # Standardize capitalization
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

    def _calculate_fallback_ats_metrics(
        self, 
        resume_text: str, 
        job_description: Optional[str] = None
    ) -> ATSMetrics:
        """
        Computes rule-based indicators for layout structure, content metrics, and keyword coverage.
        
        Args:
            resume_text: Raw resume string.
            job_description: Optional target role description.

        Returns:
            An ATSMetrics model payload.
        """
        text_lower = resume_text.lower()
        
        # 1. Structure Score
        structure_headers = ["education", "experience", "projects", "skills", "summary", "contact"]
        header_matches = sum(1 for h in structure_headers if h in text_lower)
        structure_score = int((header_matches / len(structure_headers)) * 100)
        structure_score = max(30, min(100, structure_score))

        # 2. Content Score
        # Look for metrics: percentages, currency symbols, quantities
        metric_matches = len(re.findall(r"(\b\d+%\b|\b\$\d+|\b\d+\s*(?:percent|million|billion|users|records|servers|clients|developers)\b)", text_lower))
        # Look for action verbs
        action_verbs = ["led", "developed", "managed", "designed", "implemented", "created", "built", "reduced", "increased", "optimized"]
        verb_matches = sum(len(re.findall(rf"\b{verb}\b", text_lower)) for verb in action_verbs)
        
        content_score = int((min(metric_matches, 5) / 5) * 40 + (min(verb_matches, 10) / 10) * 60)
        content_score = max(40, min(100, content_score))

        # 3. Keyword Score
        if job_description:
            jd_keywords = set(self._extract_skills_locally(job_description))
            resume_keywords = set(self._extract_skills_locally(resume_text))
            
            if jd_keywords:
                overlap = jd_keywords.intersection(resume_keywords)
                keyword_score = int((len(overlap) / len(jd_keywords)) * 100)
            else:
                keyword_score = 70
        else:
            keyword_score = 50  # Baseline neutral score

        overall_score = int((structure_score * 0.2) + (content_score * 0.4) + (keyword_score * 0.4))
        
        return ATSMetrics(
            overall_score=overall_score,
            structure_score=structure_score,
            content_score=content_score,
            keyword_score=keyword_score
        )

    # =================================================================
    # 3. Gemini-Powered Analysis Methods
    # =================================================================

    def _gemini_call(self, system_instruction: str, user_prompt: str, schema: type, temperature: float = 0.2) -> Optional[Any]:
        """
        Internal helper that wraps a single Gemini structured-output call.

        Returns the parsed Pydantic model on success, or ``None`` on any failure
        (missing client, network error, validation error, etc.).
        """
        if not self._client:
            return None
        try:
            response = self._client.models.generate_content(
                model=self.model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=temperature,
                ),
            )
            if response.text:
                logger.debug("Gemini response: %s", response.text)
                return schema.model_validate_json(response.text)
            
        except Exception as exc:
            logger.warning("Gemini call failed for %s: %s", schema.__name__, exc)
        return None

    @staticmethod
    def _build_prompt(resume_text: str, job_description: Optional[str] = None) -> str:
        """Constructs the user-content prompt shared across Gemini calls."""
        prompt = f"RESUME:\n{resume_text}"
        if job_description:
            prompt += f"\n\nTARGET JOB DESCRIPTION:\n{job_description}"
        return prompt

    # ----- 3a. ATS Review -----

    def generate_ats_review(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> ATSReview:
        """
        Generates a detailed ATS compatibility review.

        Uses Gemini 2.5 Flash when available; otherwise computes a deterministic
        rule-based review.

        Args:
            resume_text: Raw resume content.
            job_description: Optional target job description for keyword matching.

        Returns:
            An :class:`ATSReview` instance.
        """
        system_instruction = (
            "You are an expert Applicant Tracking System analyst. "
            "Evaluate the provided resume for ATS compatibility. Assess formatting, "
            "header structure, keyword density, and potential parse issues. "
            "Provide an overall ATS score from 0-100, formatting notes, keyword coverage "
            "assessment, parse warnings, and a one-paragraph summary."
        )
        result = self._gemini_call(
            system_instruction,
            self._build_prompt(resume_text, job_description),
            ATSReview,
        )
        if result is not None:
            return result

        # ---------- fallback ----------
        metrics = self._calculate_fallback_ats_metrics(resume_text, job_description)
        text_lower = resume_text.lower()
        formatting_notes: List[str] = []
        parse_warnings: List[str] = []

        expected_headers = ["education", "experience", "projects", "skills", "summary"]
        present = [h for h in expected_headers if h in text_lower]
        missing = [h for h in expected_headers if h not in text_lower]
        if present:
            formatting_notes.append(f"Detected sections: {', '.join(present)}.")
        if missing:
            formatting_notes.append(f"Missing common sections: {', '.join(missing)}.")

        if "|" in resume_text or "\t\t" in resume_text:
            parse_warnings.append("Possible table or multi-column layout detected; may confuse ATS parsers.")
        if any(ext in text_lower for ext in [".png", ".jpg", ".jpeg", ".gif", "image"]):
            parse_warnings.append("References to images detected; ATS systems cannot parse images.")

        return ATSReview(
            overall_score=metrics.overall_score,
            formatting_notes=formatting_notes,
            keyword_coverage=(
                f"Keyword score estimated at {metrics.keyword_score}/100 based on "
                f"{'job description match' if job_description else 'general keyword presence'}."
            ),
            parse_warnings=parse_warnings,
            summary=(
                f"ATS compatibility estimated at {metrics.overall_score}/100. "
                f"Structure score: {metrics.structure_score}, Content score: {metrics.content_score}, "
                f"Keyword score: {metrics.keyword_score}."
            ),
        )

    # ----- 3b. Strengths -----

    def generate_strengths(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> ResumeStrengths:
        """
        Identifies the key strengths of the resume.

        Args:
            resume_text: Raw resume content.
            job_description: Optional target job description.

        Returns:
            A :class:`ResumeStrengths` instance.
        """
        system_instruction = (
            "You are a senior technical recruiter reviewing a candidate's resume. "
            "Identify the top strengths of this resume.  Each strength should be a "
            "concrete, evidence-backed observation (e.g., 'Strong quantified impact — "
            "multiple bullet points include percentage improvements'). Provide a brief "
            "narrative summary."
        )
        result = self._gemini_call(
            system_instruction,
            self._build_prompt(resume_text, job_description),
            ResumeStrengths,
        )
        if result is not None:
            return result

        # ---------- fallback ----------
        strengths: List[str] = []
        text_lower = resume_text.lower()

        action_verbs = ["led", "developed", "managed", "designed", "implemented",
                        "created", "built", "reduced", "increased", "optimized"]
        verb_count = sum(len(re.findall(rf"\b{v}\b", text_lower)) for v in action_verbs)
        if verb_count >= 5:
            strengths.append(f"Good use of action verbs ({verb_count} detected), which signals proactive contribution.")

        metrics_count = len(re.findall(
            r"(\b\d+%\b|\b\$\d+|\b\d+\s*(?:percent|million|billion|users|records)\b)", text_lower
        ))
        if metrics_count >= 2:
            strengths.append(f"Quantified accomplishments present ({metrics_count} metrics found).")

        skills = self._extract_skills_locally(resume_text)
        if len(skills) >= 5:
            strengths.append(f"Broad technical skill set ({len(skills)} skills detected).")

        for header in ["education", "experience", "projects", "skills"]:
            if header in text_lower:
                strengths.append(f"Clear '{header.capitalize()}' section present.")

        if not strengths:
            strengths.append("Resume contains identifiable sections and some relevant content.")

        return ResumeStrengths(
            strengths=strengths,
            summary=f"Identified {len(strengths)} strength(s) based on rule-based analysis.",
        )

    # ----- 3c. Weaknesses -----

    def generate_weaknesses(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> ResumeWeaknesses:
        """
        Identifies weaknesses, gaps, and red flags in the resume.

        Args:
            resume_text: Raw resume content.
            job_description: Optional target job description.

        Returns:
            A :class:`ResumeWeaknesses` instance.
        """
        system_instruction = (
            "You are a senior hiring manager performing a critical review of a "
            "candidate's resume. Identify specific weaknesses, gaps, and red flags. "
            "Each weakness should reference concrete evidence from the resume text. "
            "Provide a brief narrative summary."
        )
        result = self._gemini_call(
            system_instruction,
            self._build_prompt(resume_text, job_description),
            ResumeWeaknesses,
        )
        if result is not None:
            return result

        # ---------- fallback ----------
        weaknesses: List[str] = []
        text_lower = resume_text.lower()

        metrics_count = len(re.findall(
            r"(\b\d+%\b|\b\$\d+|\b\d+\s*(?:percent|million|billion|users|records)\b)", text_lower
        ))
        if metrics_count < 2:
            weaknesses.append("Few or no quantified accomplishments — recruiters prefer data-driven impact statements.")

        expected_sections = ["education", "experience", "skills", "summary"]
        missing = [s for s in expected_sections if s not in text_lower]
        if missing:
            weaknesses.append(f"Missing standard sections: {', '.join(missing)}.")

        word_count = len(resume_text.split())
        if word_count < 150:
            weaknesses.append(f"Resume appears very short ({word_count} words). Consider adding more detail.")
        elif word_count > 1200:
            weaknesses.append(f"Resume may be too long ({word_count} words). Aim for concise, targeted content.")

        if job_description:
            jd_skills = set(self._extract_skills_locally(job_description))
            resume_skills = set(self._extract_skills_locally(resume_text))
            gap = jd_skills - resume_skills
            if gap:
                weaknesses.append(f"Missing keywords from job description: {', '.join(sorted(gap))}.")

        if not weaknesses:
            weaknesses.append("No major weaknesses detected via rule-based analysis — consider Gemini for deeper review.")

        return ResumeWeaknesses(
            weaknesses=weaknesses,
            summary=f"Identified {len(weaknesses)} weakness(es) based on rule-based analysis.",
        )

    # ----- 3d. Improvement Suggestions -----

    def generate_improvement_suggestions(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> ImprovementSuggestions:
        """
        Generates a prioritized list of concrete improvement suggestions.

        Args:
            resume_text: Raw resume content.
            job_description: Optional target job description.

        Returns:
            An :class:`ImprovementSuggestions` instance.
        """
        system_instruction = (
            "You are an expert career coach specializing in resume optimization. "
            "Generate a prioritized list of specific, actionable improvement suggestions. "
            "Each suggestion must reference the exact section to change, the concrete "
            "modification, the rationale, and a priority level (high/medium/low). "
            "Focus on ATS optimization, impact quantification, action verb usage, "
            "and keyword alignment with the target role."
        )
        result = self._gemini_call(
            system_instruction,
            self._build_prompt(resume_text, job_description),
            ImprovementSuggestions,
        )
        if result is not None:
            return result

        # ---------- fallback ----------
        improvements: List[ImprovementItem] = []
        text_lower = resume_text.lower()

        metrics_count = len(re.findall(
            r"(\b\d+%\b|\b\$\d+|\b\d+\s*(?:percent|million|billion|users|records)\b)", text_lower
        ))
        if metrics_count < 3:
            improvements.append(ImprovementItem(
                section="Experience",
                suggestion="Add quantified results to bullet points (e.g., 'Reduced latency by 40%').",
                rationale="Measurable impact differentiates candidates and improves ATS relevance scoring.",
                priority="high",
            ))

        action_verbs = ["led", "developed", "managed", "designed", "implemented",
                        "created", "built", "reduced", "increased", "optimized"]
        verb_count = sum(len(re.findall(rf"\b{v}\b", text_lower)) for v in action_verbs)
        if verb_count < 4:
            improvements.append(ImprovementItem(
                section="Experience",
                suggestion="Start each bullet point with a strong action verb (Led, Developed, Architected).",
                rationale="Action verbs convey ownership and proactive contribution.",
                priority="high",
            ))

        if "summary" not in text_lower and "objective" not in text_lower:
            improvements.append(ImprovementItem(
                section="Summary",
                suggestion="Add a 2-3 sentence professional summary at the top of the resume.",
                rationale="A targeted summary improves first-impression scanning by recruiters and ATS systems.",
                priority="medium",
            ))

        if job_description:
            jd_skills = set(self._extract_skills_locally(job_description))
            resume_skills = set(self._extract_skills_locally(resume_text))
            gap = jd_skills - resume_skills
            if gap:
                improvements.append(ImprovementItem(
                    section="Skills",
                    suggestion=f"Add missing keywords from the job description: {', '.join(sorted(gap))}.",
                    rationale="Keyword alignment is critical for passing automated ATS filters.",
                    priority="high",
                ))

        if not improvements:
            improvements.append(ImprovementItem(
                section="General",
                suggestion="Consider enabling Gemini analysis for deeper, AI-powered improvement recommendations.",
                rationale="Rule-based analysis has limited depth compared to LLM-powered review.",
                priority="low",
            ))

        return ImprovementSuggestions(
            improvements=improvements,
            summary=f"{len(improvements)} improvement(s) identified via rule-based analysis.",
        )

    # ----- 3e. Skills Summary -----

    def generate_skills_summary(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> SkillsSummary:
        """
        Produces a categorized skills summary with gap analysis.

        Args:
            resume_text: Raw resume content.
            job_description: Optional target job description.

        Returns:
            A :class:`SkillsSummary` instance.
        """
        system_instruction = (
            "You are a technical skills analyst. Analyze the resume and produce a "
            "categorized skills summary. Group skills into: technical_skills, soft_skills, "
            "domain_skills, and certifications. If a job description is provided, also "
            "identify missing_skills that are commonly expected for the target role but "
            "absent from the resume. Provide a brief narrative summary."
        )
        result = self._gemini_call(
            system_instruction,
            self._build_prompt(resume_text, job_description),
            SkillsSummary,
        )
        if result is not None:
            return result

        # ---------- fallback ----------
        all_skills = self._extract_skills_locally(resume_text)

        # Simple heuristic categorization
        soft_keywords = {"agile", "scrum", "project management"}
        technical = [s for s in all_skills if s.lower() not in soft_keywords]
        soft = [s for s in all_skills if s.lower() in soft_keywords]

        missing: List[str] = []
        if job_description:
            jd_skills = set(self._extract_skills_locally(job_description))
            resume_skills_set = {s.lower() for s in all_skills}
            missing = [s for s in jd_skills if s.lower() not in resume_skills_set]

        return SkillsSummary(
            technical_skills=technical,
            soft_skills=soft,
            domain_skills=[],
            certifications=[],
            missing_skills=missing,
            summary=f"Extracted {len(all_skills)} skill(s) via rule-based analysis.",
        )

    # ----- 3f. Full Report Orchestrator -----

    async def generate_full_report(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> GeminiResumeReport:
        """
        Generates all five analysis sections and assembles them into a
        :class:`GeminiResumeReport`.

        Each section is independently fault-tolerant — a failure in one Gemini
        call does not prevent the remaining sections from being generated.

        Designed to be registered as an MCP tool: 'resume_agent_full_report'.

        Args:
            resume_text: Raw resume content.
            job_description: Optional target job description.

        Returns:
            A :class:`GeminiResumeReport` containing all five analysis sections.
        """
        return GeminiResumeReport(
            ats_review=self.generate_ats_review(resume_text, job_description),
            strengths=self.generate_strengths(resume_text, job_description),
            weaknesses=self.generate_weaknesses(resume_text, job_description),
            improvement_suggestions=self.generate_improvement_suggestions(resume_text, job_description),
            skills_summary=self.generate_skills_summary(resume_text, job_description),
        )

    async def analyze_resume(
        self, 
        resume_text: str, 
        job_description: Optional[str] = None
    ) -> ResumeAnalysis:
        """
        Performs structural parsing and analytical review on a resume against a target role.
        
        Designed to be registered as an MCP tool: 'resume_agent_analyze_resume'.

        Args:
            resume_text: Raw text extracted from the candidate's resume.
            job_description: Optional text of the target job description.

        Returns:
            ResumeAnalysis containing the structured profile, scoring, and improvement suggestions.
        """
        if self._client:
            try:
                system_instruction = (
                    "You are a Senior ATS Analyst and Technical Recruiter. "
                    "Analyze the resume content and optional job description provided.\n\n"
                    "Your output must adhere to the structured ResumeAnalysis schema:\n"
                    "1. Extract the profile elements (Name, Email, Skills, Experience, Education, Projects) into the 'parsed_profile' structure.\n"
                    "2. Score the resume layout out of 100 ('structure_score'), action verb metrics ('content_score'), "
                    "and match relative to the job description ('keyword_score'). Provide an overall weighted 'overall_score'.\n"
                    "3. Extract a consolidated list of identified technologies and core skills.\n"
                    "4. Suggest concrete, specific modifications (identifying 'section', 'original' text, 'suggested' text, and ATS 'reason') "
                    "to improve formatting, use of action verbs, impact numbers, or keyword density."
                )

                input_prompt = f"RESUME:\n{resume_text}"
                if job_description:
                    input_prompt += f"\n\nTARGET JOB DESCRIPTION:\n{job_description}"

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=input_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=ResumeAnalysis,
                        temperature=0.2
                    )
                )

                if response.text:
                    analysis = ResumeAnalysis.model_validate_json(response.text)
                    # Enrich with the dedicated Gemini report sections
                    analysis.gemini_report = await self.generate_full_report(
                        resume_text, job_description
                    )
                    return analysis
            except Exception as exc:
                logger.warning("Gemini analyze_resume call failed: %s", exc)

        # Robust Fallback Strategy:
        # Construct parsed profile placeholders and compute local rule scoring metrics
        local_skills = self._extract_skills_locally(resume_text)
        metrics = self._calculate_fallback_ats_metrics(resume_text, job_description)
        
        placeholder_profile = ResumeProfile(
            contact_info=ContactInfo(
                name="Candidate Name (Parsed)",
                email="candidate@example.com",
                phone="000-000-0000"
            ),
            summary="Extracted text summary placeholder.",
            education=[],
            experience=[],
            skills=local_skills,
            projects=[]
        )

        fallback_suggestions = [
            Suggestion(
                section="Experience",
                original="General descriptions",
                suggested="Revamp accomplishments to highlight metrics. Example: 'Improved query efficiency by 25% using Redis caching.'",
                reason="ATS software values quantifiable impact and data points over general tasks."
            ),
            Suggestion(
                section="Skills",
                original="Current list",
                suggested=f"Ensure skills include relevant terms, e.g.,: {', '.join(local_skills[:5])}",
                reason="Keyword density optimization helps cross the initial search threshold."
            )
        ]

        # Even in fallback mode, generate the five-section report
        # (each method has its own fallback logic)
        gemini_report = await self.generate_full_report(resume_text, job_description)

        return ResumeAnalysis(
            parsed_profile=placeholder_profile,
            ats_metrics=metrics,
            identified_skills=local_skills,
            suggestions=fallback_suggestions,
            gemini_report=gemini_report,
        )

    def to_adk_agent(self) -> Any:
        """
        Wraps and registers this ResumeAgent instance configuration as a Google ADK Agent.

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
            name="resume_agent",
            model=self.model_name,
            instruction=(
                "You are the specialist Resume Agent for CI. "
                "Your role is to parse user resumes, analyze them for ATS optimization, "
                "identify technical skills, and provide specific improvement suggestions. "
                "All results must conform to the ResumeAnalysis schema."
            ),
            tools=[self.analyze_resume, self.extract_skills, self.generate_full_report]
        )
