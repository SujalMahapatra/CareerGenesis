import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "../components/PageShell";
import { interviewQuestions, coachingTips } from "../lib/mockData";
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
} from "lucide-react";
import { toast } from "sonner";

// Browser speech recognition (mock-friendly, no backend)
const getRecognizer = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
};

const scoreOf = (text) => {
  if (!text?.trim()) return null;
  const words = text.trim().split(/\s+/).length;
  const structure = Math.min(10, Math.max(3, Math.round(words / 22)));
  const clarity = Math.min(10, Math.max(4, Math.round((text.match(/[.,;!?]/g)?.length || 1) + 4)));
  const signal = Math.min(10, Math.max(2, Math.round(words / 30) + (/\d/.test(text) ? 2 : 0)));
  const overall = Math.round(((structure + clarity + signal) / 3) * 10) / 10;
  return { structure, clarity, signal, overall };
};

const MockInterview = () => {
  const [idx, setIdx] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [live, setLive] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef(null);
  const timerRef = useRef(null);

  const q = interviewQuestions[idx];
  const score = useMemo(() => (submitted ? scoreOf(transcript) : null), [submitted, transcript]);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [recording]);

  const startRec = () => {
    const rec = getRecognizer();
    if (!rec) {
      toast.error("Voice not supported", { description: "Your browser lacks SpeechRecognition. Use text input." });
      return;
    }
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = transcript ? transcript + " " : "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setLive(interim);
      setTranscript(finalText.trim());
    };
    rec.onerror = () => setRecording(false);
    rec.onend = () => setRecording(false);
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

  const submit = () => {
    if (!transcript.trim()) {
      toast.error("Nothing to submit yet", { description: "Record or type your answer." });
      return;
    }
    setSubmitted(true);
    toast.success("Answer evaluated", { description: "See scorecard on the right" });
  };

  const nextQ = () => {
    setIdx((i) => (i + 1) % interviewQuestions.length);
    setTranscript("");
    setLive("");
    setSubmitted(false);
    setSeconds(0);
  };
  const prevQ = () => {
    setIdx((i) => (i - 1 + interviewQuestions.length) % interviewQuestions.length);
    setTranscript("");
    setLive("");
    setSubmitted(false);
    setSeconds(0);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <PageShell testId="interview-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 04</div>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
            Mock interview <span className="grad-text">coach.</span>
          </h1>
          <p className="mt-3 text-white/60">
            Voice or text — rehearse real questions, get scored on structure, clarity and signal.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-white/60">
          <button onClick={prevQ} data-testid="interview-prev" className="glass px-2.5 py-2 hover:bg-white/5 rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="glass px-3 py-2 rounded-full">
            Q {idx + 1} / {interviewQuestions.length}
          </span>
          <button onClick={nextQ} data-testid="interview-next" className="glass px-2.5 py-2 hover:bg-white/5 rounded-full">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-10 grid lg:grid-cols-5 gap-6">
        {/* Question + Answer */}
        <div className="lg:col-span-3 space-y-5">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong p-7 relative overflow-hidden"
            data-testid="interview-question-card"
          >
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl bg-violet-500/25" />
            <div className="relative flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
              <span className="text-violet-300">{q.category}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/60">{q.difficulty}</span>
            </div>
            <p className="relative mt-4 font-display text-2xl text-white leading-snug">
              {q.text}
            </p>
            <div className="relative mt-5 flex flex-wrap gap-2">
              {q.hints.map((h) => (
                <span key={h} className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] text-white/70">
                  <Lightbulb className="inline h-3 w-3 mr-1 text-amber-300" />{h}
                </span>
              ))}
            </div>
          </motion.div>

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
              value={transcript + (live ? " " + live : "")}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Type here, or click the mic to speak. Interim voice transcript appears live."
              rows={7}
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
              data-testid="interview-transcript"
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
                <button className="btn-primary" onClick={startRec} data-testid="interview-record-btn">
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
                disabled={!transcript.trim()}
              >
                <Send className="h-4 w-4" /> Submit for evaluation
              </button>
              <span className="text-xs text-white/40 font-mono">
                {transcript.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
          </div>
        </div>

        {/* Coaching + Score */}
        <div className="lg:col-span-2 space-y-5">
          <AnimatePresence mode="wait">
            {submitted && score ? (
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
                <div className="mt-4 flex items-end gap-3">
                  <div className="font-display text-6xl text-white">{score.overall}</div>
                  <div className="text-white/50 text-sm pb-2">/ 10</div>
                </div>
                <div className="mt-6 space-y-4">
                  {[
                    ["Structure", score.structure, "violet"],
                    ["Clarity", score.clarity, "cyan"],
                    ["Signal / metrics", score.signal, "green"],
                  ].map(([label, v, tone]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/80">{label}</span>
                        <span className="font-mono text-white/60">{v}/10</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${v * 10}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{
                            background:
                              tone === "violet"
                                ? "linear-gradient(90deg,#7c3aed,#a855f7)"
                                : tone === "cyan"
                                ? "linear-gradient(90deg,#06b6d4,#22d3ee)"
                                : "linear-gradient(90deg,#10b981,#22c55e)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty-score"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass p-6"
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

          <div className="glass p-6" data-testid="interview-coach">
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
    </PageShell>
  );
};

export default MockInterview;
