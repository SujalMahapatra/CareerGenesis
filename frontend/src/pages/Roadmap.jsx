import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "../components/PageShell";
import { roadmap } from "../lib/mockData";
import { CheckCircle2, Circle, Flag, PlayCircle, Sparkles, RefreshCw, BookOpen, Laptop, Award, ArrowLeft } from "lucide-react";
import { generateRoadmap } from "../services/api";
import { toast } from "sonner";

export const Roadmap = () => {
  const [targetRole, setTargetRole] = useState("Senior Full-Stack Engineer");
  const [missingSkills, setMissingSkills] = useState("Kubernetes, Terraform, System Design, gRPC");
  const [timelineWeeks, setTimelineWeeks] = useState(8);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [data, setData] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!missingSkills.trim()) {
      toast.error("Skills required", { description: "Please enter the skills you want to build." });
      return;
    }

    setLoading(true);
    setDone(false);
    setCheckedItems({});
    toast.info("Generating learning roadmap…");

    const skillsArray = missingSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const response = await generateRoadmap({
        target_role: targetRole,
        missing_skills: skillsArray,
        timeline_weeks: Number(timelineWeeks),
      });
      setData(response.data);
      setDone(true);
      toast.success("Learning roadmap generated!");
    } catch (err) {
      console.error(err);
      toast.error("Roadmap generation failed", {
        description: err.response?.data?.detail || "Make sure the FastAPI backend is running.",
      });

      // Fallback fallback data using mockData
      const fallbackResult = {
        summary: "This roadmap is designed to guide you through mastering missing technical capabilities.",
        target_role: targetRole,
        timeline_weeks: Number(timelineWeeks),
        phases: [
          {
            phase_number: 1,
            title: "Phase 1: Foundations & Architecture",
            duration_weeks: 3,
            topics_to_learn: ["Understand core container design", "Learn local deployment configurations", "Familiarize with standard systems topologies"],
            resources: [
              { name: "Kubernetes official docs", url: "https://kubernetes.io/docs", resource_type: "documentation", platform: "Official", cost: "Free" }
            ],
            recommended_projects: ["Deploy Nginx container in local setup"],
          },
          {
            phase_number: 2,
            title: "Phase 2: Cloud Infrastructure & Automation",
            duration_weeks: 5,
            topics_to_learn: ["Provision VPCs using Terraform", "Understand state storage strategies", "Instrument systems tracing and logging"],
            resources: [
              { name: "Terraform AWS Provider guide", url: "https://registry.terraform.io/providers/hashicorp/aws", resource_type: "documentation", platform: "Official", cost: "Free" }
            ],
            recommended_projects: ["Automate a 3-tier VPC configuration"],
          }
        ],
        certifications: ["HashiCorp Certified: Terraform Associate", "Certified Kubernetes Application Developer (CKAD)"],
      };
      setData(fallbackResult);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (phaseIdx, itemIdx) => {
    const key = `${phaseIdx}-${itemIdx}`;
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const totalTopics = data?.phases?.reduce((acc, p) => acc + p.topics_to_learn.length, 0) || 0;
  const doneTopics = Object.values(checkedItems).filter(Boolean).length;
  const pct = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  return (
    <PageShell testId="roadmap-page">
      <AnimatePresence mode="wait">
        {!done && !loading ? (
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 03</div>
              <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
                Your career <span className="grad-text">ascent.</span>
              </h1>
              <p className="mt-3 text-white/60">
                Design a personalized week-by-week study guide tailored directly to your target role and missing tech dependencies.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="glass-strong p-6 sm:p-8 space-y-5 relative overflow-hidden">
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
                    Timeline Weeks
                  </label>
                  <select
                    value={timelineWeeks}
                    onChange={(e) => setTimelineWeeks(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0d0d12] px-4 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
                  >
                    <option value={4}>4 Weeks (Intensive)</option>
                    <option value={8}>8 Weeks (Standard)</option>
                    <option value={12}>12 Weeks (Deep Dive)</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                  Missing Skills to Master (Comma Separated)
                </label>
                <input
                  type="text"
                  value={missingSkills}
                  onChange={(e) => setMissingSkills(e.target.value)}
                  placeholder="Kubernetes, Terraform, System Design, gRPC"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full relative z-10 py-3 text-sm justify-center"
                data-testid="roadmap-submit-btn"
              >
                <Sparkles className="h-4 w-4" /> Generate Learning Roadmap
              </button>
            </form>
          </motion.div>
        ) : loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-strong p-8 min-h-[380px] flex flex-col items-center justify-center text-center max-w-xl mx-auto"
          >
            <RefreshCw className="h-6 w-6 text-white animate-spin" />
            <div className="mt-4 font-display text-lg text-white">Assembling learning modules...</div>
            <div className="text-sm text-white/50 mt-1">Calibrating study schedule and picking resources with Gemini.</div>
            <div className="mt-6 w-full max-w-sm h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.0 }}
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header section */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <button
                  onClick={() => setDone(false)}
                  className="btn-ghost text-xs px-3 py-1.5 mb-3 flex items-center gap-1.5 hover:bg-white/5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Edit roadmap parameters
                </button>
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 03 Result</div>
                <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
                  Your <span className="grad-text">{data.timeline_weeks}-week</span> ascent.
                </h1>
                <p className="mt-3 text-white/60">
                  {data.summary}
                </p>
              </div>

              <div className="glass px-5 py-4 min-w-[240px]" data-testid="roadmap-progress">
                <div className="text-xs font-mono uppercase tracking-widest text-white/50">Objectives Mastered</div>
                <div className="flex items-end justify-between mt-1">
                  <div className="font-display text-3xl text-white">
                    {doneTopics}<span className="text-white/40 text-lg">/{totalTopics}</span>
                  </div>
                  <div className="text-xs font-mono text-emerald-300">{pct}%</div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Timeline Phases */}
            <div className="relative pl-6 sm:pl-10">
              <div className="absolute top-0 bottom-0 left-2 sm:left-4 w-px bg-gradient-to-b from-violet-500/60 via-cyan-400/40 to-emerald-400/30" />

              <div className="space-y-8">
                {data.phases.map((w, phaseIdx) => {
                  return (
                    <motion.div
                      key={phaseIdx}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-80px" }}
                      className="relative"
                      data-testid={`roadmap-week-${w.phase_number}`}
                    >
                      <div
                        className="absolute -left-6 sm:-left-10 top-4 h-6 w-6 rounded-full flex items-center justify-center border bg-gradient-to-br from-violet-500 to-cyan-400 border-white/40 text-white shadow-[0_0_24px_rgba(124,58,237,0.4)]"
                      >
                        <PlayCircle className="h-4 w-4" />
                      </div>

                      <div className="glass p-5 sm:p-6 border-violet-400/30">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                              Phase {w.phase_number} · {w.duration_weeks} {w.duration_weeks === 1 ? 'Week' : 'Weeks'}
                            </span>
                            <h3 className="font-display text-xl text-white">{w.title}</h3>
                          </div>
                        </div>

                        {/* Objectives Checklist */}
                        <div className="mt-4">
                          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Learning Objectives</div>
                          <ul className="space-y-2">
                            {w.topics_to_learn.map((it, k) => {
                              const checked = checkedItems[`${phaseIdx}-${k}`] || false;
                              return (
                                <li key={k}>
                                  <button
                                    onClick={() => toggleItem(phaseIdx, k)}
                                    data-testid={`roadmap-w${w.phase_number}-item-${k}`}
                                    className="w-full flex items-start gap-3 text-left rounded-lg px-2 py-1.5 hover:bg-white/[0.03] transition"
                                  >
                                    <span
                                      className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                        checked
                                          ? "bg-emerald-500/20 border-emerald-400/60"
                                          : "border-white/25"
                                      }`}
                                    >
                                      {checked && <CheckCircle2 className="h-3 w-3 text-emerald-300" />}
                                    </span>
                                    <span className={`text-sm ${checked ? "text-white/50 line-through" : "text-white/85"}`}>
                                      {it}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {/* Recommended Projects */}
                        {w.recommended_projects?.length > 0 && (
                          <div className="mt-5 border-t border-white/5 pt-4">
                            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2 flex items-center gap-1.5">
                              <Laptop className="h-3.5 w-3.5 text-cyan-300" /> Milestone Practice Projects
                            </div>
                            <ul className="space-y-2">
                              {w.recommended_projects.map((proj, pIdx) => (
                                <li key={pIdx} className="text-xs text-white/70 bg-white/[0.01] border border-white/5 rounded-xl p-3 leading-relaxed">
                                  {proj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Resources */}
                        {w.resources?.length > 0 && (
                          <div className="mt-5 border-t border-white/5 pt-4">
                            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2.5 flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-violet-300" /> Study Resources
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {w.resources.map((res, rIdx) => (
                                <a
                                  key={rIdx}
                                  href={res.url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition group text-left"
                                >
                                  <div className="text-xs font-semibold text-white group-hover:text-violet-300 transition line-clamp-1">
                                    {res.name}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-white/45">
                                    <span className="uppercase">{res.platform || "Platform"}</span>
                                    <span>•</span>
                                    <span className="capitalize">{res.resource_type}</span>
                                    <span>•</span>
                                    <span className="text-emerald-400">{res.cost}</span>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Certifications and Adaptive Replanning */}
            <div className="grid sm:grid-cols-5 gap-6 mt-12">
              {data.certifications?.length > 0 && (
                <div className="sm:col-span-3 glass p-6">
                  <h3 className="font-display text-lg text-white flex items-center gap-2 mb-4">
                    <Award className="h-5 w-5 text-emerald-300" /> Targeted Certifications
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {data.certifications.map((cert) => (
                      <div key={cert} className="text-xs p-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-200">
                        {cert}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="sm:col-span-2 glass-strong p-6 flex flex-col justify-between">
                <div>
                  <div className="font-display text-lg text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-300" /> Adaptive replanning
                  </div>
                  <p className="text-xs text-white/60 mt-2 leading-relaxed">
                    Miss a week? CareerGenesis rebalances upcoming milestones automatically — your goal date shifts, your dignity doesn't.
                  </p>
                </div>
                <button
                  onClick={() => toast.success("Rebalanced plan successfully")}
                  className="btn-primary mt-5 text-xs w-full justify-center"
                  data-testid="roadmap-rebalance"
                >
                  <Flag className="h-4 w-4" /> Rebalance plan
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default Roadmap;
