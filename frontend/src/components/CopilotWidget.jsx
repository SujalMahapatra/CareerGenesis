import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, Send, X, ArrowRight, Activity, ArrowUpRight } from "lucide-react";
import { routeQuery } from "../services/api";
import { toast } from "sonner";

const agentNames = {
  resume: "Resume Analyzer",
  skill_gap: "Skill Gap Analysis",
  roadmap: "Learning Roadmap",
  interview: "Mock Interview",
  general: "General Assistant",
};

const agentPaths = {
  resume: "/resume-analyzer",
  skill_gap: "/skill-gap",
  roadmap: "/roadmap",
  interview: "/interview",
};

export const CopilotWidget = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleQuerySubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await routeQuery({ query: query.trim() });
      const data = response.data;
      setResult(data);
      toast.success("Query analyzed!", {
        description: `Routed to: ${agentNames[data.target_agent] || data.target_agent}`,
      });
    } catch (err) {
      console.error(err);
      toast.error("Coordinator routing failed", {
        description: err.response?.data?.detail || "Make sure the FastAPI backend is running.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (agent) => {
    const path = agentPaths[agent];
    if (path) {
      navigate(path);
      setOpen(false);
      setResult(null);
      setQuery("");
    }
  };

  const selectSuggestion = (text) => {
    setQuery(text);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-[0_8px_32px_rgba(124,58,237,0.4)] border border-white/10 hover:scale-105 active:scale-95 transition-transform"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="copilot-floating-btn"
      >
        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-[#08080b] pulse-dot" />
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6 animate-pulse" />}
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute bottom-18 right-0 w-[360px] max-w-[calc(100vw-2rem)] glass-strong overflow-hidden shadow-2xl border border-white/15"
            data-testid="copilot-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400">
                  <Sparkles className="h-4 w-4 text-white" />
                </span>
                <div>
                  <h4 className="font-display text-sm font-semibold text-white leading-tight">CareerGenesis Copilot</h4>
                  <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase">gemini active</span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-4 max-h-[380px] overflow-y-auto space-y-4">
              {!result && !loading && (
                <div className="space-y-3">
                  <p className="text-xs text-white/50 leading-relaxed font-mono">
                    // I route your queries to specialist AI agents and navigate you to modules.
                  </p>
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Suggested queries</div>
                    {[
                      "Check if my resume fits a senior backend developer role",
                      "Analyze what skills I need to learn for Cloud Architect",
                      "Build a 12-week study plan for Kubernetes & Terraform",
                      "I want to practice system design interview questions",
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => selectSuggestion(sug)}
                        className="w-full text-left text-xs p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 text-white/80 transition"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
                  <Activity className="h-6 w-6 text-violet-400 animate-spin" />
                  <div>
                    <div className="font-display text-sm text-white">Orchestrator Routing...</div>
                    <div className="text-[11px] text-white/40 mt-0.5">Analyzing query semantics with Gemini</div>
                  </div>
                </div>
              )}

              {result && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Agent Card */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">Specialist Routed</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-200 border border-violet-500/30">
                        {(result.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <div className="font-display text-lg text-white mt-1">
                      {agentNames[result.target_agent] || result.target_agent}
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-white/50">Reasoning & Intent</div>
                    <p className="text-xs text-white/70 leading-relaxed bg-white/[0.01] border border-white/5 rounded-xl p-3">
                      {result.reasoning}
                    </p>
                  </div>

                  {/* Action Link */}
                  {agentPaths[result.target_agent] && (
                    <button
                      type="button"
                      onClick={() => handleNavigate(result.target_agent)}
                      className="w-full btn-primary text-xs justify-center py-2.5"
                    >
                      Open {agentNames[result.target_agent]} <ArrowUpRight className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleQuerySubmit} className="p-3 border-t border-white/10 bg-white/[0.01] flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask CareerGenesis..."
                disabled={loading}
                className="flex-1 min-w-0 text-sm rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none disabled:opacity-50"
                data-testid="copilot-input"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-md disabled:opacity-40 hover:brightness-105 active:scale-95 transition"
                data-testid="copilot-submit"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CopilotWidget;
