"""
Interview Agent Module for CareerGenesis.

This module contains the InterviewAgent class along with Pydantic schemas for
interview sessions and feedback. The InterviewAgent is responsible for generating
tailored mock interview questions, grading candidate answers, scoring responses,
and producing comprehensive feedback reports.

When a GEMINI_API_KEY is available the agent delegates to Gemini 2.5 Flash for
rich, AI-powered question generation, answer evaluation, and session report
compilation.  If the key is absent or any call fails, deterministic rule-based
fallbacks are used transparently.

Compatible with Google ADK framework, designed to support WebSocket turn-based loops
and Model Context Protocol (MCP) registrations.
"""

import logging
import os
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

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
# 1. Pydantic Schemas
# =====================================================================

class InterviewQuestion(BaseModel):
    """Schema representing an interview question generated for the candidate."""
    
    question_id: int = Field(..., description="Unique integer identifier for the question")
    question_text: str = Field(..., description="The actual question string asked to the candidate")
    question_type: str = Field(
        ..., 
        description="Category of the question: 'technical', 'behavioral', or 'system_design'"
    )
    target_skill: str = Field(..., description="The specific skill or attribute being assessed")
    expected_points: List[str] = Field(
        default_factory=list,
        description="Key points or keywords that a high-quality answer should cover"
    )
    difficulty: str = Field("medium", description="Question difficulty: 'easy', 'medium', 'hard'")


class InterviewFeedback(BaseModel):
    """Schema representing structured feedback for a single answer."""
    
    question_id: int = Field(..., description="Identifier matching the corresponding question")
    score: int = Field(
        ..., 
        description="Score graded on a scale of 0 to 10",
        ge=0,
        le=10
    )
    strengths: List[str] = Field(
        default_factory=list, 
        description="Good points, technical accuracy, or context identified in the user's answer"
    )
    weaknesses: List[str] = Field(
        default_factory=list, 
        description="Gaps, incorrect claims, or missed key concepts in the user's answer"
    )
    suggested_improvements: List[str] = Field(
        default_factory=list, 
        description="Actionable advice on how to phrase or structure the answer better next time"
    )
    model_answer: str = Field(
        ..., 
        description="An ideal, expert-level response exemplifying the required knowledge"
    )


class InterviewSession(BaseModel):
    """Schema representing the status and accumulated logs of an active mock interview."""
    
    session_id: str = Field(..., description="Unique UUID or token for the interview session")
    candidate_name: str = Field(..., description="Name of the candidate")
    target_role: str = Field(..., description="Target job title or role description")
    questions: List[InterviewQuestion] = Field(default_factory=list)
    answers: Dict[int, str] = Field(
        default_factory=dict, 
        description="History of submitted answers mapped by question_id"
    )
    feedback_by_question: Dict[int, InterviewFeedback] = Field(
        default_factory=dict, 
        description="Grades and feedback summaries mapped by question_id"
    )
    overall_score: Optional[float] = Field(
        None, 
        description="Weighted average score of the session out of 100",
        ge=0.0,
        le=100.0
    )
    overall_feedback: Optional[str] = Field(
        None, 
        description="High-level evaluation summarizing communication, accuracy, and preparation advice"
    )
    is_completed: bool = Field(False, description="Flag indicating whether all questions have been graded")


# -----------  Gemini session-report response schema  -----------

class GeminiSessionReport(BaseModel):
    """Structured response schema for Gemini-powered session report generation."""

    overall_score: float = Field(
        ...,
        description="Weighted overall session score out of 100",
        ge=0.0,
        le=100.0,
    )
    coaching_summary: str = Field(
        ...,
        description=(
            "Detailed coaching summary covering communication style, technical accuracy, "
            "depth of explanation, and personalised preparation advice"
        ),
    )
    strongest_skills: List[str] = Field(
        default_factory=list,
        description="Skills the candidate demonstrated most confidently",
    )
    weakest_skills: List[str] = Field(
        default_factory=list,
        description="Skills with the largest gaps or weakest performance",
    )
    next_learning_steps: List[str] = Field(
        default_factory=list,
        description="Concrete, actionable next steps the candidate should take to improve",
    )


# =====================================================================
# 2. InterviewAgent Class
# =====================================================================

class InterviewAgent:
    """
    Interview Agent specialized in conducting interactive mock interviews,
    generating relevant questions, evaluating answers turn-by-turn, and scoring sessions.

    When a ``GEMINI_API_KEY`` environment variable (or an explicit *api_key*
    argument) is available **and** the ``google-genai`` SDK is installed, every
    public method delegates to **Gemini 2.5 Flash** via structured-output calls.
    Otherwise the agent falls back transparently to deterministic, rule-based
    heuristics.
    
    Designed to hook into WebSocket loops and function under Google ADK.
    """

    def __init__(self, model_name: str = "gemini-2.5-flash", api_key: Optional[str] = None):
        """
        Initializes the InterviewAgent.

        Args:
            model_name: The Gemini model name to use. Defaults to gemini-2.5-flash.
            api_key: Optional Gemini API key. Defaults to environment variable.
        """
        self.model_name = model_name
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
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

    # -----------------------------------------------------------------
    # Fallback helpers  (original logic preserved)
    # -----------------------------------------------------------------

    def _generate_fallback_questions(
        self, 
        resume_skills: List[str], 
        target_role: str, 
        limit: int
    ) -> List[InterviewQuestion]:
        """Provides a standard set of baseline questions based on candidate skills."""
        fallback_bank = [
            InterviewQuestion(
                question_id=1,
                question_text=f"Can you tell me about a time you solved a complex challenge in your role as a {target_role}?",
                question_type="behavioral",
                target_skill="Problem Solving",
                expected_points=["STAR method", "clear context", "technical metrics", "resolution"],
                difficulty="medium"
            ),
            InterviewQuestion(
                question_id=2,
                question_text="How do you handle managing code quality and peer review structures in a collaborative team?",
                question_type="behavioral",
                target_skill="Collaboration",
                expected_points=["constructive feedback", "git workflows", "linting", "testing standards"],
                difficulty="easy"
            ),
            InterviewQuestion(
                question_id=3,
                question_text="Explain the architectural trade-offs between implementing RESTful APIs vs. using WebSockets or gRPC.",
                question_type="technical",
                target_skill="System Design",
                expected_points=["statelessness", "network overhead", "realtime bidirection", "connection persistence"],
                difficulty="hard"
            )
        ]

        # Attempt to tailor a question based on extracted skills
        skills_matched = [s for s in resume_skills if s.lower() in ["python", "react", "sql", "aws", "docker"]]
        if skills_matched:
            skill = skills_matched[0]
            fallback_bank.append(
                InterviewQuestion(
                    question_id=4,
                    question_text=f"Describe memory management, caching patterns, or concurrency in {skill}.",
                    question_type="technical",
                    target_skill=skill,
                    expected_points=["garbage collection", "performance threads", "locks/state", "caching layers"],
                    difficulty="hard"
                )
            )

        # Truncate or pad to match the requested limit
        result = fallback_bank[:limit]
        while len(result) < limit:
            new_id = len(result) + 1
            result.append(
                InterviewQuestion(
                    question_id=new_id,
                    question_text=f"What is your approach to handling scalability and deployment for a modern {target_role} application?",
                    question_type="technical",
                    target_skill="DevOps",
                    expected_points=["horizontal scaling", "load balancers", "containers", "ci/cd pipelines"],
                    difficulty="medium"
                )
            )
        return result

    def _evaluate_answer_locally(
        self, 
        question: InterviewQuestion, 
        user_answer: str
    ) -> InterviewFeedback:
        """Evaluates user answer locally based on expected points matching (fallback)."""
        answer_lower = user_answer.lower()
        matched_points = []
        missed_points = []

        for pt in question.expected_points:
            pt_words = pt.lower().split()
            # If any significant word matches, mark as mentioned
            if any(w in answer_lower for w in pt_words if len(w) > 3):
                matched_points.append(pt)
            else:
                missed_points.append(pt)

        # Simple score ratio calculation
        total_pts = len(question.expected_points)
        ratio = len(matched_points) / total_pts if total_pts > 0 else 0.5
        score = int(ratio * 10)
        score = max(3, min(10, score))  # Give baseline grade for participation

        # Compose placeholder strengths/weaknesses
        strengths = [f"Mentioned context related to: {p}" for p in matched_points]
        if not strengths:
            strengths = ["Submitted a relevant response covering the prompt."]

        weaknesses = [f"Missed detailed discussion on: {p}" for p in missed_points]
        if not weaknesses:
            weaknesses = ["No critical knowledge gaps identified for the basic parameters."]

        return InterviewFeedback(
            question_id=question.question_id,
            score=score,
            strengths=strengths,
            weaknesses=weaknesses,
            suggested_improvements=[f"Elaborate more on: {', '.join(missed_points)} in future responses."],
            model_answer=f"An ideal answer would systematically cover {', '.join(question.expected_points)}. Example: 'Regarding {question.target_skill}, we apply STAR formats, structuring the performance metrics and scaling indicators.'"
        )

    # -----------------------------------------------------------------
    # Gemini-powered question generation
    # -----------------------------------------------------------------

    async def generate_questions(
        self, 
        resume_skills: List[str], 
        target_role: str = "Software Engineer", 
        limit: int = 5
    ) -> List[InterviewQuestion]:
        """
        Generates a custom list of behavioral, technical, and system-design
        questions tailored to the candidate's skills and target role.
        
        Designed to be registered as an MCP tool: 'interview_agent_generate_questions'.

        Args:
            resume_skills: List of skills from the candidate's resume.
            target_role: Target career role being interviewed for.
            limit: Number of questions to generate.

        Returns:
            A list of InterviewQuestion objects.
        """
        if self._client:
            try:
                system_instruction = (
                    "You are a Principal Engineering Manager and Talent Assessor.\n"
                    f"Generate exactly {limit} diverse interview questions for a candidate applying "
                    f"to a {target_role} position.\n\n"
                    "Question diversity requirements:\n"
                    "- Include at least 1 behavioral question assessing soft skills (leadership, "
                    "conflict resolution, teamwork, communication)\n"
                    "- Include at least 1 system design question testing architecture skills "
                    "(scalability, reliability, trade-offs)\n"
                    "- Fill remaining slots with technical coding/framework questions that directly "
                    "test implementation knowledge\n"
                    "- Vary difficulty across easy, medium, and hard\n\n"
                    "Adhere to the InterviewQuestion schema requirements:\n"
                    "1. Tailor the topics based on these candidate skills: " + ", ".join(resume_skills) + ".\n"
                    "2. For each question, specify a unique question_id (sequential integers starting at 1), "
                    "question_type ('technical', 'behavioral', or 'system_design'), target_skill, difficulty, "
                    "and a list of expected key points ('expected_points') the candidate's answer should ideally hit.\n"
                    "3. Make questions specific and role-relevant — avoid generic prompts."
                )

                class QuestionList(BaseModel):
                    questions: List[InterviewQuestion]

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=f"Generate {limit} interview questions for the role: {target_role}",
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=QuestionList,
                        temperature=0.4
                    )
                )

                if response.text:
                    data = QuestionList.model_validate_json(response.text)
                    logger.info(
                        "Gemini question generation succeeded — role=%s, count=%d",
                        target_role,
                        len(data.questions),
                    )
                    return data.questions
            except Exception:
                logger.exception(
                    "Gemini question generation failed for role=%s, falling back to local questions",
                    target_role,
                )

        # Fallback to local questions list
        return self._generate_fallback_questions(resume_skills, target_role, limit)

    # -----------------------------------------------------------------
    # Gemini-powered answer evaluation
    # -----------------------------------------------------------------

    async def evaluate_answer(
        self, 
        question: InterviewQuestion, 
        user_answer: str
    ) -> InterviewFeedback:
        """
        Grades a single candidate response against the question parameters.
        
        Designed to be registered as an MCP tool: 'interview_agent_evaluate_answer'.

        Args:
            question: The InterviewQuestion object being answered.
            user_answer: The candidate's text response.

        Returns:
            InterviewFeedback containing score, strengths, weaknesses, and a suggested model answer.
        """
        if self._client:
            try:
                system_instruction = (
                    "You are a senior tech interviewer conducting a mock screen. "
                    "Grade the user's answer out of 10. Be constructive but maintain high standards.\n\n"
                    "Adhere to the InterviewFeedback schema:\n"
                    "1. Score (0-10): Genuinely reflect correctness, code quality, and depth of explanation.\n"
                    "2. Strengths: List key terms, concepts, or accurate details they successfully mentioned.\n"
                    "3. Weaknesses: List omissions, errors, or areas where they lacked explanation.\n"
                    "4. Suggested improvements: Outline how they can re-frame or enhance the explanation.\n"
                    "5. Model Answer: Write a concise, exemplary response that hits all expected targets."
                )

                input_prompt = (
                    f"QUESTION: {question.question_text}\n"
                    f"TARGET SKILL: {question.target_skill}\n"
                    f"EXPECTED CRITERIA: {', '.join(question.expected_points)}\n"
                    f"USER ANSWER: {user_answer}"
                )

                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=input_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=InterviewFeedback,
                        temperature=0.2
                    )
                )

                if response.text:
                    feedback = InterviewFeedback.model_validate_json(response.text)
                    logger.info(
                        "Gemini answer evaluation succeeded — question_id=%d, score=%d/10",
                        feedback.question_id,
                        feedback.score,
                    )
                    return feedback
            except Exception:
                logger.exception(
                    "Gemini answer evaluation failed for question_id=%d, falling back to local evaluation",
                    question.question_id,
                )

        # Fallback to local regex-based score metrics
        return self._evaluate_answer_locally(question, user_answer)

    # -----------------------------------------------------------------
    # Gemini-powered session report generation
    # -----------------------------------------------------------------

    async def generate_session_report_with_gemini(
        self, session: InterviewSession
    ) -> InterviewSession:
        """
        Uses Gemini to analyse all interview feedback and produce a rich
        coaching report for the candidate.

        This method:
        - Analyses all per-question feedback holistically
        - Produces an overall score (0–100)
        - Writes a detailed coaching summary
        - Identifies strongest and weakest skills
        - Recommends concrete next learning steps

        Args:
            session: The populated InterviewSession containing questions,
                     answers, and per-question feedback.

        Returns:
            The same InterviewSession updated with ``overall_score``,
            ``overall_feedback``, and ``is_completed`` set to True.

        Raises:
            Exception: Re-raises any Gemini or validation error so that the
                       caller can decide how to fall back.
        """
        system_instruction = (
            "You are an elite Interview Coach and Career Strategist.\n\n"
            "Analyze the full set of interview question feedback provided below and "
            "produce a comprehensive session report.\n\n"
            "## Report Requirements\n"
            "1. **Overall Score (0-100)**: Weighted average reflecting correctness, "
            "communication clarity, depth of technical detail, and breadth of coverage.\n"
            "2. **Coaching Summary**: A detailed, multi-paragraph coaching narrative "
            "covering communication style, technical accuracy, depth of explanation, "
            "areas of excellence, and personalised preparation advice.\n"
            "3. **Strongest Skills**: List the 2-5 skills where the candidate showed "
            "the most confidence and accuracy.\n"
            "4. **Weakest Skills**: List the 2-5 skills with the largest gaps or "
            "weakest performance.\n"
            "5. **Next Learning Steps**: Provide 3-6 concrete, actionable steps the "
            "candidate should take to improve (e.g., specific courses, practice topics, "
            "mock-interview focus areas).\n\n"
            "Be encouraging yet honest. Ground every observation in evidence from the "
            "feedback data."
        )

        # Build a detailed prompt from session data
        feedback_lines: List[str] = []
        for qid, fb in session.feedback_by_question.items():
            # Find the matching question for richer context
            q_text = ""
            q_skill = ""
            for q in session.questions:
                if q.question_id == qid:
                    q_text = q.question_text
                    q_skill = q.target_skill
                    break

            feedback_lines.append(
                f"--- Question {qid} ---\n"
                f"Question: {q_text}\n"
                f"Target Skill: {q_skill}\n"
                f"Score: {fb.score}/10\n"
                f"Strengths: {'; '.join(fb.strengths)}\n"
                f"Weaknesses: {'; '.join(fb.weaknesses)}\n"
                f"Suggested Improvements: {'; '.join(fb.suggested_improvements)}\n"
            )

        prompt = (
            f"Candidate: {session.candidate_name}\n"
            f"Target Role: {session.target_role}\n"
            f"Total Questions Answered: {len(session.feedback_by_question)}\n\n"
            "FEEDBACK DATA:\n" + "\n".join(feedback_lines)
        )

        response = self._client.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=GeminiSessionReport,
                temperature=0.3,
            ),
        )

        report = GeminiSessionReport.model_validate_json(response.text)

        # Compose rich overall_feedback from Gemini report fields
        strongest_str = ", ".join(report.strongest_skills) if report.strongest_skills else "N/A"
        weakest_str = ", ".join(report.weakest_skills) if report.weakest_skills else "N/A"
        steps_str = "\n".join(f"  • {step}" for step in report.next_learning_steps) if report.next_learning_steps else "  • Continue practising."

        session.overall_score = report.overall_score
        session.overall_feedback = (
            f"{report.coaching_summary}\n\n"
            f"Strongest Skills: {strongest_str}\n"
            f"Weakest Skills: {weakest_str}\n\n"
            f"Recommended Next Steps:\n{steps_str}"
        )
        session.is_completed = True

        logger.info(
            "Gemini session report generation succeeded — session=%s, score=%.1f",
            session.session_id,
            report.overall_score,
        )

        return session

    # -----------------------------------------------------------------
    # Session report compilation (public API)
    # -----------------------------------------------------------------

    async def compile_session_report(self, session: InterviewSession) -> InterviewSession:
        """
        Aggregates individual question scores and compiles the final interview feedback report.

        Uses Gemini for rich coaching analysis when available, with automatic
        fallback to the local rule-based implementation.

        Args:
            session: The populated InterviewSession.

        Returns:
            An updated InterviewSession with overall scores and coaching summary.
        """
        if not session.feedback_by_question:
            session.overall_score = 0.0
            session.overall_feedback = "No questions were answered or evaluated in this session."
            session.is_completed = True
            return session

        # Attempt Gemini-powered report first
        if self._client:
            try:
                return await self.generate_session_report_with_gemini(session)
            except Exception:
                logger.exception(
                    "Gemini session report generation failed for session=%s, "
                    "falling back to local report compilation",
                    session.session_id,
                )

        # ---- Local fallback (original logic preserved) ----

        # Calculate average score (scaled to 100)
        total_score = sum(feed.score for feed in session.feedback_by_question.values())
        avg_score = total_score / len(session.feedback_by_question)
        session.overall_score = float(round(avg_score * 10, 1))

        if session.overall_score >= 80.0:
            rating = "Excellent performance!"
            advice = "You demonstrated strong technical foundations and clear conceptual formatting. Focus on maintaining this depth of explanation."
        elif session.overall_score >= 60.0:
            rating = "Good baseline performance with room for optimization."
            advice = "Your logic is correct, but you could expand on specific architectural details and trade-offs. Spend time articulating implementation specifics."
        else:
            rating = "Further preparation recommended."
            advice = "Review the model answers provided for each question. Focus on incorporating action verbs, quantitative metrics, and core technology details."

        session.overall_feedback = (
            f"Overall Mock Screen Result: {rating}\n"
            f"Candidate achieved an overall score of {session.overall_score}%. {advice}"
        )
        session.is_completed = True
        return session

    # -----------------------------------------------------------------
    # ADK integration
    # -----------------------------------------------------------------

    def to_adk_agent(self) -> Any:
        """
        Wraps and registers this InterviewAgent instance configuration as a Google ADK Agent.

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
            name="interview_agent",
            model=self.model_name,
            instruction=(
                "You are the specialist Interview Agent for CareerGenesis. "
                "Your role is to formulate technical and behavioral mock interview questions, "
                "grade candidate answers turn-by-turn, compile coaching feedback, and "
                "produce aggregated scoring reports in JSON."
            ),
            tools=[self.generate_questions, self.evaluate_answer]
        )
