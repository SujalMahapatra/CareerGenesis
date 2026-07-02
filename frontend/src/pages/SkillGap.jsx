import React from "react";
import { motion } from "framer-motion";
import PageShell from "../components/PageShell";
import { skillGap } from "../lib/mockData";
import { Target, TrendingUp, Sparkles, ArrowRight } from "lucide-react";

const Bar = ({ value, tone = "violet" }) => (
  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      whileInView={{ width: `${value}%` }}
      viewport={{ once: true }}
      transition={{ duration: 1, ease: [0.2, 0.7, 0.2, 1] }}
      className="h-full rounded-full"
      style={{
        background:
          tone === "violet"
            ? "linear-gradient(90deg,#7c3aed,#a855f7)"
            : tone === "cyan"
            ? "linear-gradient(90deg,#06b6d4,#22d3ee)"
            : tone === "green"
            ? "linear-gradient(90deg,#10b981,#22c55e)"
            : "linear-gradient(90deg,#f43f5e,#f97316)",
      }}
    />
  </div>
);

const priorityStyles = {
  high: "text-rose-300 border-rose-400/30 bg-rose-500/10",
  med: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  low: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
};

const SkillGap = () => {
  return (
    <PageShell testId="skill-gap-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 02</div>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
            The delta between <span className="grad-text">now and next.</span>
          </h1>
          <p className="mt-3 text-white/60">
            Target role: <span className="text-white">{skillGap.role}</span>. Below is the shortest
            path to close the gap without over-studying.
          </p>
        </div>
        <div className="glass px-5 py-4 min-w-[220px] text-right">
          <div className="text-xs font-mono uppercase tracking-widest text-white/50">Overall match</div>
          <div className="font-display text-4xl text-white">
            {skillGap.match}<span className="text-white/40 text-2xl">%</span>
          </div>
          <div className="text-xs text-emerald-400 mt-1 inline-flex items-center gap-1 justify-end w-full">
            <TrendingUp className="h-3 w-3" /> +9 this week
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="glass p-6" data-testid="skills-have">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <h3 className="font-display text-xl text-white">You already have</h3>
          </div>
          <div className="mt-6 space-y-5">
            {skillGap.have.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">{s.name}</span>
                  <span className="font-mono text-white/60">{s.level}%</span>
                </div>
                <div className="mt-2">
                  <Bar value={s.level} tone="green" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-6 relative overflow-hidden" data-testid="skills-need">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl bg-rose-500/20" />
          <div className="relative flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400 pulse-dot" />
            <h3 className="font-display text-xl text-white">You need to build</h3>
          </div>
          <div className="relative mt-6 space-y-5">
            {skillGap.need.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white flex items-center gap-2">
                    {s.name}
                    <span className={`text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded-full border ${priorityStyles[s.priority]}`}>
                      {s.priority}
                    </span>
                  </span>
                  <span className="font-mono text-white/60">{s.level}%</span>
                </div>
                <div className="mt-2">
                  <Bar
                    value={s.level}
                    tone={s.priority === "high" ? "rose" : s.priority === "med" ? "cyan" : "violet"}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Radar-like visualization: role fit matrix */}
      <div className="mt-8 glass-strong p-6" data-testid="skills-matrix">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-cyan-300" /> Role fit matrix
          </h3>
          <span className="text-xs font-mono text-white/50">weighted by role signals</span>
        </div>
        <div className="mt-6 grid sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[...skillGap.have, ...skillGap.need].map((s) => (
            <div
              key={s.name}
              className="rounded-xl border border-white/10 bg-white/[0.02] p-4 relative overflow-hidden"
            >
              <div
                className="absolute inset-x-0 bottom-0 opacity-30"
                style={{
                  height: `${s.level}%`,
                  background:
                    "linear-gradient(180deg, rgba(124,58,237,0.35), rgba(6,182,212,0.15))",
                }}
              />
              <div className="relative text-xs font-mono uppercase tracking-widest text-white/50">
                {s.name}
              </div>
              <div className="relative mt-2 font-display text-2xl text-white">
                {s.level}<span className="text-white/40 text-sm">/100</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-8 glass p-6" data-testid="skills-recommendations">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-300" />
          <h3 className="font-display text-xl text-white">Coach recommendations</h3>
        </div>
        <ul className="mt-4 space-y-3">
          {skillGap.recs.map((r, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-xs font-mono">
                {i + 1}
              </span>
              <div className="text-sm text-white/80 flex-1">{r}</div>
              <ArrowRight className="h-4 w-4 text-white/40" />
            </motion.li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
};

export default SkillGap;
