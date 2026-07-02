import React, { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "../components/PageShell";
import { resumeAnalysis } from "../lib/mockData";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Wand2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const levelStyles = {
  high: { icon: AlertCircle, cls: "text-rose-300", border: "border-rose-400/30", bg: "bg-rose-500/10" },
  med: { icon: AlertTriangle, cls: "text-amber-300", border: "border-amber-400/30", bg: "bg-amber-500/10" },
  low: { icon: CheckCircle2, cls: "text-emerald-300", border: "border-emerald-400/30", bg: "bg-emerald-500/10" },
};

const RadialScore = ({ value = 82 }) => {
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="drop-shadow-[0_0_24px_rgba(124,58,237,0.35)]">
      <defs>
        <linearGradient id="cg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="55%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
        className="ring-progress"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        className="fill-white font-display"
        style={{ fontSize: 46, fontWeight: 600 }}
      >
        {value}
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="fill-white/50" style={{ fontSize: 11, letterSpacing: 2 }}>
        ATS SCORE
      </text>
    </svg>
  );
};

const ResumeAnalyzer = () => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);

  const handleFiles = useCallback((files) => {
    const f = files?.[0];
    if (!f) return;
    setFile(f);
    setAnalyzing(true);
    setDone(false);
    toast.info("Analyzing with Gemini…", { description: f.name });
    setTimeout(() => {
      setAnalyzing(false);
      setDone(true);
      toast.success("Analysis complete", { description: "ATS score updated" });
    }, 1600);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <PageShell testId="resume-analyzer-page">
      <div className="max-w-3xl">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 01</div>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
          Resume <span className="grad-text">forensics.</span>
        </h1>
        <p className="mt-3 text-white/60">
          Drop a PDF or DOCX. We parse structure, quantify impact, benchmark against your target role,
          and return an ATS-safe rewrite plan.
        </p>
      </div>

      <div className="mt-10 grid lg:grid-cols-5 gap-6">
        {/* Upload area */}
        <div className="lg:col-span-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            data-testid="resume-upload-area"
            className={`glass-strong relative overflow-hidden cursor-pointer p-8 flex flex-col items-center justify-center text-center min-h-[320px] transition ${
              dragging ? "border-violet-400/50 bg-white/[0.06]" : ""
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={(e) => handleFiles(e.target.files)}
              data-testid="resume-file-input"
            />
            <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl bg-violet-500/30" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl bg-cyan-500/25" />
            <div className="relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
              <UploadCloud className="h-6 w-6 text-white" />
            </div>
            <div className="relative mt-5 font-display text-xl text-white">
              {file ? file.name : "Drop your resume"}
            </div>
            <div className="relative mt-1 text-sm text-white/50">
              {file ? "Click to replace, or drop a new file." : "PDF, DOC, DOCX · up to 5MB"}
            </div>
            <button className="btn-primary mt-6 relative" data-testid="resume-browse-btn">
              <FileText className="h-4 w-4" /> Choose file
            </button>
          </div>

          <div className="glass mt-4 p-5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/50">
              <Sparkles className="h-3.5 w-3.5" /> Coach preview
            </div>
            <p className="mt-2 text-sm text-white/70 leading-relaxed">
              You're strong on impact metrics. The biggest ROI right now is your <span className="text-white">summary section</span> —
              trim to two tight lines and lead with a role thesis.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {analyzing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-strong p-8 min-h-[360px] flex flex-col items-center justify-center"
                data-testid="resume-analyzing"
              >
                <RefreshCw className="h-6 w-6 text-white animate-spin" />
                <div className="mt-4 font-display text-lg text-white">Analyzing with Gemini…</div>
                <div className="text-sm text-white/50 mt-1">Parsing sections, keywords, and impact signals.</div>
                <div className="mt-6 w-full max-w-sm h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5 }}
                    className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
                data-testid="resume-results"
              >
                <div className="glass-strong p-6 flex flex-col sm:flex-row items-center gap-8">
                  <RadialScore value={resumeAnalysis.score} />
                  <div className="flex-1">
                    <div className="text-xs font-mono uppercase tracking-widest text-white/50">// Verdict</div>
                    <div className="mt-1 font-display text-2xl text-white">
                      Strong candidate profile.
                    </div>
                    <p className="mt-2 text-sm text-white/60">
                      Passes 92% of ATS parsers. Three targeted edits could push you into the top decile.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {resumeAnalysis.sections.slice(0, 3).map((s) => (
                        <div key={s.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">{s.name}</div>
                          <div className="font-display text-xl text-white mt-1">{s.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass p-6" data-testid="resume-suggestions">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-white">Suggestions</h3>
                    <span className="text-xs font-mono text-white/50">{resumeAnalysis.issues.length} findings</span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {resumeAnalysis.issues.map((it, idx) => {
                      const s = levelStyles[it.level];
                      const Icon = s.icon;
                      return (
                        <li
                          key={idx}
                          className={`flex items-start gap-3 rounded-xl border ${s.border} ${s.bg} p-3`}
                          data-testid={`resume-issue-${idx}`}
                        >
                          <Icon className={`h-4 w-4 mt-0.5 ${s.cls}`} />
                          <div className="flex-1 text-sm text-white/85">{it.text}</div>
                          <span className={`text-[10px] uppercase font-mono tracking-widest ${s.cls}`}>
                            {it.level}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="glass p-6">
                  <h3 className="font-display text-xl text-white">Keywords</h3>
                  <div className="mt-4">
                    <div className="text-xs font-mono uppercase tracking-widest text-emerald-300/80">Matched</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {resumeAnalysis.keywords.matched.map((k) => (
                        <span key={k} className="text-xs px-2.5 py-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-200">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-mono uppercase tracking-widest text-rose-300/80">Missing</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {resumeAnalysis.keywords.missing.map((k) => (
                        <span key={k} className="text-xs px-2.5 py-1 rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-200">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="btn-primary mt-6" data-testid="resume-rewrite-btn" onClick={() => toast.success("Rewrite plan queued")}>
                    <Wand2 className="h-4 w-4" /> Generate rewrite plan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
};

export default ResumeAnalyzer;
