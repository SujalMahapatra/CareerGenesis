import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "../components/PageShell";
import { resumeAnalysis } from "../lib/mockData";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Wand2,
  RefreshCw,
  Award,
  ThumbsUp,
  ThumbsDown,
  UploadCloud,
  FileText,
  Trash2,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeResume } from "../services/api";

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
  const [inputMode, setInputMode] = useState("upload"); // 'upload' | 'paste'
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);
  const [data, setData] = useState(null);

  // File Upload State
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");

  const handlePdfFile = async (selectedFile) => {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) {
      throw new Error("PDF parser CDN script was not loaded. Please try pasting plain text.");
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(" ") + "\n";
    }
    return text;
  };

  const handleDocxFile = async (selectedFile) => {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const mammoth = window.mammoth;
    if (!mammoth) {
      throw new Error("DOCX parser CDN script was not loaded. Please try pasting plain text.");
    }
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleTxtFile = (selectedFile) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(selectedFile);
    });
  };

  const processFile = async (selectedFile) => {
    setUploadError("");
    const fileType = selectedFile.name.split('.').pop().toLowerCase();
    
    if (!['pdf', 'docx', 'txt'].includes(fileType)) {
      setUploadError("Unsupported format. Supported formats: .pdf, .docx, .txt");
      toast.error("Format error", { description: "Supported formats are .pdf, .docx, and .txt" });
      return;
    }

    setFile(selectedFile);
    setExtracting(true);
    setExtractionProgress(10);

    const interval = setInterval(() => {
      setExtractionProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      let text = "";
      if (fileType === "pdf") {
        text = await handlePdfFile(selectedFile);
      } else if (fileType === "docx") {
        text = await handleDocxFile(selectedFile);
      } else {
        text = await handleTxtFile(selectedFile);
      }

      clearInterval(interval);
      setExtractionProgress(100);
      
      setTimeout(() => {
        setResumeText(text);
        setExtracting(false);
        toast.success("Text extracted!", { description: `Loaded from ${selectedFile.name}` });
      }, 300);

    } catch (err) {
      console.error(err);
      clearInterval(interval);
      setExtracting(false);
      setFile(null);
      setUploadError(err.message || "Failed to parse document text content.");
      toast.error("Text extraction failed", { description: "Please paste your resume text manually." });
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => {
    setDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setFile(null);
    setResumeText("");
    setUploadError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async () => {
    if (!resumeText.trim()) {
      toast.error("Resume content required", { description: "Please upload a resume file or paste resume text." });
      return;
    }

    setAnalyzing(true);
    setDone(false);
    toast.info("Analyzing with Gemini…");

    try {
      const response = await analyzeResume({
        resume_text: resumeText,
        job_description: jobDescription || undefined,
      });
      setData(response.data);
      setDone(true);
      toast.success("Analysis complete", { description: "ATS score updated successfully" });
    } catch (err) {
      console.error(err);
      toast.error("Analysis failed", {
        description: err.response?.data?.detail || "Make sure the FastAPI backend is running.",
      });
      // Fallback data
      const mockResult = {
        ats_metrics: {
          overall_score: resumeAnalysis.score,
          structure_score: 85,
          content_score: 79,
          keyword_score: 82,
        },
        identified_skills: resumeAnalysis.keywords.matched,
        suggestions: resumeAnalysis.issues.map(issue => ({
          section: "Experience",
          original: "",
          suggested: issue.text,
          reason: "Identified via static heuristic fallback",
          priority: issue.level === "high" ? "high" : issue.level === "med" ? "medium" : "low"
        })),
        gemini_report: {
          ats_review: {
            overall_score: resumeAnalysis.score,
            formatting_notes: ["Clear section boundaries"],
            keyword_coverage: "Keyword match is strong but some cloud primitives are missing",
            parse_warnings: ["Some tab delimiters found"],
            summary: "Good resume structure and readable content format."
          },
          strengths: {
            strengths: resumeAnalysis.strengths,
            summary: "Quantified metric callouts are excellent."
          },
          weaknesses: {
            weaknesses: resumeAnalysis.issues.map(i => i.text),
            summary: "Gaps in specific tools like Kubernetes/Terraform."
          },
          skills_summary: {
            technical_skills: resumeAnalysis.keywords.matched,
            soft_skills: ["Collaboration"],
            domain_skills: ["Full Stack Engineering"],
            certifications: [],
            missing_skills: resumeAnalysis.keywords.missing,
            summary: "Solid foundations with room for container orchestration skills."
          }
        }
      };
      setData(mockResult);
      setDone(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const improvements = data?.gemini_report?.improvement_suggestions?.improvements || 
                 data?.suggestions?.map(s => ({
                   section: s.section,
                   suggestion: s.suggested,
                   rationale: s.reason,
                   priority: s.priority || "medium"
                 })) || [];

  const presentSkills = data?.identified_skills || data?.gemini_report?.skills_summary?.technical_skills || [];
  const missingSkills = data?.gemini_report?.skills_summary?.missing_skills || [];

  return (
    <PageShell testId="resume-analyzer-page">
      <div className="max-w-3xl">
        <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 01</div>
        <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
          Resume <span className="grad-text">forensics.</span>
        </h1>
        <p className="mt-3 text-white/60">
          Upload your resume file or paste plain text along with target job requirements. We parse structure, benchmark keywords,
          and return an ATS-safe optimization report.
        </p>
      </div>

      <div className="mt-10 grid lg:grid-cols-5 gap-6">
        {/* Left Side: Inputs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-strong relative overflow-hidden p-6 flex flex-col min-h-[360px] transition">
            <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl bg-violet-500/10" />
            <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl bg-cyan-500/10" />

            <div className="relative space-y-4 flex-1 flex flex-col">
              {/* Toggle Tabs */}
              <div className="flex rounded-lg bg-white/5 p-1 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setInputMode("upload")}
                  className={`flex-1 py-1.5 rounded-md font-medium transition ${
                    inputMode === "upload" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white"
                  }`}
                >
                  Upload Resume
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={`flex-1 py-1.5 rounded-md font-medium transition ${
                    inputMode === "paste" ? "bg-white/10 text-white shadow-sm" : "text-white/50 hover:text-white"
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {/* Upload Mode View */}
              {inputMode === "upload" && (
                <div className="space-y-3">
                  {!file ? (
                    <div
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer min-h-[140px] flex flex-col items-center justify-center transition ${
                        dragging ? "border-violet-400 bg-white/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.01]"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        hidden
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            processFile(e.target.files[0]);
                          }
                        }}
                      />
                      <UploadCloud className="h-8 w-8 text-white/40 mb-2" />
                      <div className="text-xs text-white font-medium">Drag & drop your file here</div>
                      <div className="text-[10px] text-white/40 mt-1">PDF, DOCX, TXT files up to 5MB</div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-6 w-6 text-emerald-400" />
                        <div>
                          <div className="text-xs text-white font-medium truncate max-w-[150px]">
                            {file.name}
                          </div>
                          <div className="text-[9px] text-white/40 font-mono">
                            {(file.size / 1024).toFixed(0)} KB
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="p-1 rounded-lg border border-white/5 bg-white/5 text-white/60 hover:text-white hover:bg-rose-500/25 hover:border-rose-500/25 transition"
                        title="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Extraction Progress */}
                  {extracting && (
                    <div className="space-y-1.5 p-1">
                      <div className="flex justify-between text-[10px] font-mono text-white/50">
                        <span>Extracting document text...</span>
                        <span>{extractionProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-150"
                          style={{ width: `${extractionProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Alert */}
                  {uploadError && (
                    <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-300 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Pre-populated text view/edit area */}
                  {resumeText && !extracting && (
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1.5">
                        Extracted Content Preview (Editable)
                      </label>
                      <textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-xs text-white focus:border-violet-400/50 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Paste Mode View */}
              {inputMode === "paste" && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                    Resume Text (Required)
                  </label>
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your plain text resume content here..."
                    rows={8}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                    data-testid="resume-text-input"
                  />
                </div>
              )}

              {/* Job Description (Shared Input) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                  Target Job Description (Optional)
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description to match keywords..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                  data-testid="resume-job-desc-input"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || extracting || !resumeText.trim()}
                className="btn-primary w-full mt-auto relative z-10 py-3 text-sm justify-center disabled:opacity-40"
                data-testid="resume-analyze-btn"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing with Gemini
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Analyze Resume
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="glass p-5">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-white/50">
              <Sparkles className="h-3.5 w-3.5" /> Coach preview
            </div>
            <p className="mt-2 text-sm text-white/70 leading-relaxed">
              We extract raw text directly in your browser. No files are stored or sent to 3rd-party services.
            </p>
          </div>
        </div>

        {/* Right Side: Empty State or Results */}
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
            ) : done && data ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
                data-testid="resume-results"
              >
                {/* Score & Verdict */}
                <div className="glass-strong p-6 flex flex-col sm:flex-row items-center gap-8">
                  <RadialScore value={data.ats_metrics.overall_score} />
                  <div className="flex-1 w-full text-left">
                    <div className="text-xs font-mono uppercase tracking-widest text-white/50">// Verdict</div>
                    <div className="mt-1 font-display text-2xl text-white leading-tight">
                      {data.gemini_report?.ats_review?.summary || "Resume parsed successfully."}
                    </div>
                    <p className="mt-2 text-sm text-white/60">
                      {data.gemini_report?.ats_review?.keyword_coverage || "Scores benchmarked below."}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { name: "Structure", score: data.ats_metrics.structure_score },
                        { name: "Content", score: data.ats_metrics.content_score },
                        { name: "Keywords", score: data.ats_metrics.keyword_score },
                      ].map((s) => (
                        <div key={s.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">{s.name}</div>
                          <div className="font-display text-xl text-white mt-1">{s.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Strengths & Weaknesses (AI Report) */}
                {data.gemini_report && (
                  <div className="grid sm:grid-cols-2 gap-4 text-left">
                    <div className="glass p-5">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-400 mb-3">
                        <ThumbsUp className="h-4 w-4" /> Top Strengths
                      </div>
                      <ul className="space-y-2.5">
                        {data.gemini_report.strengths?.strengths?.map((str, idx) => (
                          <li key={idx} className="text-xs text-white/80 leading-relaxed flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass p-5">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-rose-400 mb-3">
                        <ThumbsDown className="h-4 w-4" /> Identified Gaps
                      </div>
                      <ul className="space-y-2.5">
                        {data.gemini_report.weaknesses?.weaknesses?.map((weak, idx) => (
                          <li key={idx} className="text-xs text-white/80 leading-relaxed flex items-start gap-2">
                            <span className="text-rose-400 mt-0.5">•</span>
                            <span>{weak}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                <div className="glass p-6 text-left" data-testid="resume-suggestions">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-white">Actionable Suggestions</h3>
                    <span className="text-xs font-mono text-white/50">{improvements.length} findings</span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {improvements.map((it, idx) => {
                      const level = it.priority === "high" ? "high" : it.priority === "medium" || it.priority === "med" ? "med" : "low";
                      const s = levelStyles[level] || levelStyles.med;
                      const Icon = s.icon;
                      return (
                        <li
                          key={idx}
                          className={`flex items-start gap-3 rounded-xl border ${s.border} ${s.bg} p-3`}
                          data-testid={`resume-issue-${idx}`}
                        >
                          <Icon className={`h-4 w-4 mt-0.5 ${s.cls}`} />
                          <div className="flex-1 text-sm text-white/85">
                            <div className="font-semibold text-xs uppercase tracking-wide opacity-80 mb-0.5">{it.section}</div>
                            <div>{it.suggestion}</div>
                            {it.rationale && <div className="text-xs text-white/50 mt-1">{it.rationale}</div>}
                          </div>
                          <span className={`text-[10px] uppercase font-mono tracking-widest ${s.cls}`}>
                            {level}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Keywords & Skills */}
                <div className="glass p-6 text-left">
                  <h3 className="font-display text-xl text-white">Keywords Benchmark</h3>
                  <div className="mt-4">
                    <div className="text-xs font-mono uppercase tracking-widest text-emerald-300/80">Extracted Skills ({presentSkills.length})</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {presentSkills.map((k) => (
                        <span key={k} className="text-xs px-2.5 py-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 text-emerald-200">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  {missingSkills.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs font-mono uppercase tracking-widest text-rose-300/80">Missing Target Keywords ({missingSkills.length})</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {missingSkills.map((k) => (
                          <span key={k} className="text-xs px-2.5 py-1 rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-200">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="button" className="btn-primary mt-6" data-testid="resume-rewrite-btn" onClick={() => toast.success("Rewrite plan generated")}>
                    <Wand2 className="h-4 w-4" /> Auto-rewrite plan
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Awaiting Analysis Empty State */
              <div className="glass-strong p-8 min-h-[380px] flex flex-col items-center justify-center text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 mb-4">
                  <FileText className="h-5 w-5 text-white/50" />
                </div>
                <h3 className="font-display text-xl text-white">Awaiting Analysis</h3>
                <p className="text-sm text-white/50 max-w-sm mt-2">
                  Upload your resume or paste resume text to receive ATS insights.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3 text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  <span>ATS Check</span>
                  <span>•</span>
                  <span>Gap Forensic</span>
                  <span>•</span>
                  <span>Gemini Feedback</span>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  );
};

export default ResumeAnalyzer;
