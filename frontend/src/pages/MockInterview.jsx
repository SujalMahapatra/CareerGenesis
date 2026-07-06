import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "../components/PageShell";
import { coachingTips } from "../lib/mockData";
import {
  Mic,
  Square,
  Send,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Timer,
  Lightbulb,
  BadgeCheck,
  RefreshCw,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { generateQuestions, evaluateAnswer } from "../services/api";
import { toast } from "sonner";

// Browser speech recognition
const getRecognizer = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
};

export const MockInterview = () => {
  // Setup inputs
  const [targetRole, setTargetRole] = useState("Senior Full-Stack Engineer");
  const [resumeSkills, setResumeSkills] = useState("React, TypeScript, AWS, Node.js");
  const [limit, setLimit] = useState(3);

  // States
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // question_id -> string
  const [evaluations, setEvaluations] = useState({}); // question_id -> feedback object
  
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [doneSetup, setDoneSetup] = useState(false);

  // Speech and Timer states
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState("");
  const recRef = useRef(null);
  const timerRef = useRef(null);

  const q = questions[idx];
  const currentAnswer = answers[q?.question_id] || "";
  const currentFeedback = evaluations[q?.question_id] || null;

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  const handleStartInterview = async (e) => {
    e.preventDefault();
    setLoadingQuestions(true);
    toast.info("Generating tailored questions…");

    const skillsArray = resumeSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const response = await generateQuestions({
        target_role: targetRole,
        resume_skills: skillsArray,
        limit: Number(limit),
      });
      setQuestions(response.data);
      setIdx(0);
      setAnswers({});
      setEvaluations({});
      setDoneSetup(true);
      toast.success("Questions generated!", { description: "Let's begin the screen." });
    } catch (err) {
      console.error(err);
      toast.error("Generation failed", {
        description: err.response?.data?.detail || "Make sure the FastAPI backend is running.",
      });
      // Fallback fallback questions
      const fallbackQuestions = [
        {
          question_id: 1,
          question_text: `Can you tell me about a time you solved a complex challenge in your role as a ${targetRole}?`,
          question_type: "behavioral",
          target_skill: "Problem Solving",
          expected_points: ["STAR method", "clear context", "technical metrics", "resolution"],
          difficulty: "medium",
        },
        {
          question_id: 2,
          question_text: "Describe memory management, caching patterns, or concurrency in modern web platforms.",
          question_type: "technical",
          target_skill: "Architecture",
          expected_points: ["garbage collection", "performance threads", "locks/state", "caching layers"],
          difficulty: "hard",
        }
      ];
      setQuestions(fallbackQuestions);
      setIdx(0);
      setAnswers({});
      setEvaluations({});
      setDoneSetup(true);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const startRec = () => {
    const rec = getRecognizer();
    if (!rec) {
      toast.error("Voice not supported", { description: "Your browser lacks SpeechRecognition. Use text input." });
      return;
    }
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = currentAnswer ? currentAnswer + " " : "";
    
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setLive(interim);
      setAnswers((prev) => ({
        ...prev,
        [q.question_id]: (finalText + interim).trim(),
      }));
    };

    rec.onerror = () => setRecording(false);
    rec.onend = () => {
      setRecording(false);
      setLive("");
    };

    rec.start();
    recRef.current = rec;
    setRecording(true);
    setSeconds(0);
    toast.info("Recording…", { description: "Speak clearly. Live transcript is on." });
  };

  const stopRec = () => {
    recRef.current?.stop();
    setLive("");
    setRecording(false);
  };

  const submit = async () => {
    if (!currentAnswer.trim()) {
      toast.error("Nothing to submit yet", { description: "Record or type your answer." });
      return;
    }

    setEvaluating(true);
    toast.info("Evaluating answer with Gemini…");

    try {
      const response = await evaluateAnswer({
        question: q,
        user_answer: currentAnswer,
      });
      setEvaluations((prev) => ({
        ...prev,
        [q.question_id]: response.data,
      }));
      toast.success("Answer evaluated", { description: "See scorecard on the right" });
    } catch (err) {
      console.error(err);
      toast.error("Evaluation failed", {
        description: err.response?.data?.detail || "Failed to contact evaluation endpoint.",
      });

      // Heuristic fallback
      const fallbackFeedback = {
        question_id: q.question_id,
        score: 7,
        strengths: ["Clear communication structure", "Answered the prompt directly"],
        weaknesses: ["Could explain specific metrics or latency logs in depth"],
        suggested_improvements: ["Incorporate standard performance figures", "Refer to the STAR pattern format"],
        model_answer: "Ideal answer structures the problem statement first, followed by direct actions taken.",
      };
      setEvaluations((prev) => ({
        ...prev,
        [q.question_id]: fallbackFeedback,
      }));
    } finally {
      setEvaluating(false);
    }
  };

  const nextQ = () => {
    setIdx((i) => (i + 1) % questions.length);
    setSeconds(0);
  };
  const prevQ = () => {
    setIdx((i) => (i - 1 + questions.length) % questions.length);
    setSeconds(0);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <PageShell testId="interview-page">
      <AnimatePresence mode="wait">
        {!doneSetup && !loadingQuestions ? (
          <motion.div
            key="setup-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 04</div>
              <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
                Mock interview <span className="grad-text">coach.</span>
              </h1>
              <p className="mt-3 text-white/60">
                Generate custom behavioral, technical, and architecture screening screens tailored to your profile.
              </p>
            </div>

            <form onSubmit={handleStartInterview} className="glass-strong p-6 sm:p-8 space-y-5 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl bg-violet-600/10" />
              <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-cyan-500/10" />

              <div className="grid sm:grid-cols-3 gap-4 relative">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                    Target Role Title
                  </label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Senior Full-Stack Engineer"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                    Questions Count
                  </label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0d12] px-4 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                  Your Resume Skills (Comma Separated)
                </label>
                <input
                  type="text"
                  value={resumeSkills}
                  onChange={(e) => setResumeSkills(e.target.value)}
                  placeholder="React, TypeScript, AWS, Node.js"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full relative z-10 py-3 text-sm justify-center"
                data-testid="interview-setup-btn"
              >
                <Sparkles className="h-4 w-4" /> Start Interview Screen
              </button>
            </form>
          </motion.div>
        ) : loadingQuestions ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-strong p-8 min-h-[380px] flex flex-col items-center justify-center text-center max-w-xl mx-auto"
          >
            <RefreshCw className="h-6 w-6 text-white animate-spin" />
            <div className="mt-4 font-display text-lg text-white">Generating technical screen...</div>
            <div className="text-sm text-white/50 mt-1">Creating tailored scenarios and grading checkpoints with Gemini.</div>
            <div className="mt-6 w-full max-w-sm h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8 }}
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="interview-screen"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <button
                  onClick={() => setDoneSetup(false)}
                  className="btn-ghost text-xs px-3 py-1.5 mb-3 flex items-center gap-1.5 hover:bg-white/5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to edit setup
                </button>
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 04 Active Session</div>
                <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
                  Mock interview <span className="grad-text">coach.</span>
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                <button onClick={prevQ} data-testid="interview-prev" className="glass px-2.5 py-2 hover:bg-white/5 rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="glass px-3 py-2 rounded-full">
                  Q {idx + 1} / {questions.length}
                </span>
                <button onClick={nextQ} data-testid="interview-next" className="glass px-2.5 py-2 hover:bg-white/5 rounded-full">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* Question & Answer Card */}
              <div className="lg:col-span-3 space-y-5">
                <motion.div
                  key={q.question_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong p-7 relative overflow-hidden"
                  data-testid="interview-question-card"
                >
                  <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl bg-violet-500/25" />
                  <div className="relative flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
                    <span className="text-violet-300">{q.question_type}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-white/60">{q.difficulty}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-cyan-300">{q.target_skill}</span>
                  </div>
                  <p className="relative mt-4 font-display text-2xl text-white leading-snug">
                    {q.question_text}
                  </p>
                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {q.expected_points.map((h) => (
                      <span key={h} className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] text-white/70">
                        <Lightbulb className="inline h-3 w-3 mr-1 text-amber-300" />{h}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Answer Box */}
                <div className="glass p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/50">
                      <Mic className="h-3.5 w-3.5" /> Your answer
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                      <Timer className="h-3.5 w-3.5" /> {mm}:{ss}
                    </div>
                  </div>

                  <textarea
                    value={currentAnswer + (live ? " " + live : "")}
                    onChange={(e) => {
                      const text = e.target.value;
                      setAnswers((prev) => ({
                        ...prev,
                        [q.question_id]: text,
                      }));
                    }}
                    placeholder="Type here, or click the mic to speak. Interim voice transcript appears live."
                    rows={7}
                    className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                    data-testid="interview-transcript"
                    disabled={evaluating}
                  />

                  {recording && (
                    <div className="mt-3 flex items-center gap-3">
                      <span className="inline-flex items-center gap-2 text-xs font-mono text-rose-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 pulse-dot" /> RECORDING
                      </span>
                      <div className="flex items-end gap-0.5 h-6 flex-1">
                        {Array.from({ length: 48 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-full bg-gradient-to-t from-violet-500 to-cyan-400"
                            style={{
                              height: `${25 + Math.abs(Math.sin((seconds + i) * 0.6)) * 75}%`,
                              opacity: 0.85,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {!recording ? (
                      <button className="btn-primary" onClick={startRec} data-testid="interview-record-btn" disabled={evaluating}>
                        <Mic className="h-4 w-4" /> Start voice
                      </button>
                    ) : (
                      <button className="btn-ghost border-rose-400/40 text-rose-200" onClick={stopRec} data-testid="interview-stop-btn">
                        <Square className="h-4 w-4" /> Stop
                      </button>
                    )}
                    <button
                      className="btn-ghost"
                      onClick={submit}
                      data-testid="interview-submit-btn"
                      disabled={evaluating || !currentAnswer.trim()}
                    >
                      {evaluating ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" /> Evaluating
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Submit for evaluation
                        </>
                      )}
                    </button>
                    <span className="text-xs text-white/40 font-mono">
                      {currentAnswer.trim().split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                </div>
              </div>

              {/* Coaching & Scorecard */}
              <div className="lg:col-span-2 space-y-5">
                <AnimatePresence mode="wait">
                  {currentFeedback ? (
                    <motion.div
                      key="score"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="glass-strong p-6"
                      data-testid="interview-scorecard"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-xl text-white">Scorecard</h3>
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-300">
                          <BadgeCheck className="h-3.5 w-3.5" /> Evaluated
                        </span>
                      </div>
                      
                      {/* Overall score */}
                      <div className="mt-4 flex items-end gap-3">
                        <div className="font-display text-6xl text-white">{currentFeedback.score}</div>
                        <div className="text-white/50 text-sm pb-2">/ 10</div>
                      </div>

                      {/* Criteria details */}
                      <div className="mt-6 space-y-4 text-left">
                        {currentFeedback.strengths?.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 mb-1.5">Strengths</div>
                            <ul className="space-y-1 text-xs text-white/80">
                              {currentFeedback.strengths.map((str, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-1">
                                  <span>•</span> <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentFeedback.weaknesses?.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-rose-300 mb-1.5">Gaps / Omissions</div>
                            <ul className="space-y-1 text-xs text-white/80">
                              {currentFeedback.weaknesses.map((weak, wIdx) => (
                                <li key={wIdx} className="flex items-start gap-1">
                                  <span>•</span> <span>{weak}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {currentFeedback.suggested_improvements?.length > 0 && (
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-violet-300 mb-1.5">Improvement Tips</div>
                            <ul className="space-y-1 text-xs text-white/80">
                              {currentFeedback.suggested_improvements.map((tip, tIdx) => (
                                <li key={tIdx} className="flex items-start gap-1">
                                  <span>•</span> <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Model Answer Toggle Drawer */}
                      {currentFeedback.model_answer && (
                        <div className="mt-6 pt-4 border-t border-white/5 text-left">
                          <details className="group cursor-pointer">
                            <summary className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-white/60 hover:text-white select-none">
                              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-cyan-300" /> View Model Answer</span>
                              <ChevronRight className="h-4 w-4 transform group-open:rotate-90 transition-transform" />
                            </summary>
                            <p className="mt-3 text-xs text-white/70 leading-relaxed bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                              {currentFeedback.model_answer}
                            </p>
                          </details>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-score"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass p-6 text-left"
                      data-testid="interview-scorecard-empty"
                    >
                      <h3 className="font-display text-xl text-white">Scorecard</h3>
                      <p className="mt-2 text-sm text-white/55">
                        Submit an answer to see structure, clarity and signal scored by Gemini.
                      </p>
                      <div className="mt-4 grid grid-cols-3 gap-2 opacity-40">
                        {["Structure", "Clarity", "Signal"].map((s) => (
                          <div key={s} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                            <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">{s}</div>
                            <div className="font-display text-2xl text-white/40 mt-1">—</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Coaching Tips */}
                <div className="glass p-6 text-left" data-testid="interview-coach">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400">
                      <Bot className="h-4 w-4 text-white" />
                    </span>
                    <h3 className="font-display text-lg text-white">AI coaching</h3>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {coachingTips.map((t, i) => (
                      <li key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <Sparkles className="h-4 w-4 text-violet-300 mt-0.5" />
                        <span className="text-sm text-white/80">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default MockInterview;
