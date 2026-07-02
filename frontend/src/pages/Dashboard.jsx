
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import PageShell from "../components/PageShell";
import { features } from "../lib/mockData";

import {
  FileText,
  Target,
  Route,
  Mic,
  Flame,
  TrendingUp,
  Clock,
  ArrowUpRight,
  CalendarDays,
  Sparkles,
} from "lucide-react";

const iconMap = { resume: FileText, skill: Target, roadmap: Route, interview: Mic };
const accentBg = {
  violet: "from-violet-500/20 to-transparent",
  cyan: "from-cyan-500/20 to-transparent",
  green: "from-emerald-500/20 to-transparent",
};

const Metric = ({ label, value, delta, icon: Icon, tone = "violet" }) => (
  <div className="glass p-5 relative overflow-hidden">
    <div
      className={`absolute -top-10 -right-10 h-32 w-32 rounded-full blur-3xl opacity-60 bg-gradient-to-br ${
        tone === "violet"
          ? "from-violet-500 to-transparent"
          : tone === "cyan"
          ? "from-cyan-400 to-transparent"
          : "from-emerald-400 to-transparent"
      }`}
    />
    <div className="flex items-center justify-between relative">
      <div className="text-xs uppercase font-mono tracking-widest text-white/50">{label}</div>
      <Icon className="h-4 w-4 text-white/60" />
    </div>
    <div className="mt-3 flex items-end gap-2 relative">
      <div className="font-display text-4xl text-white">{value}</div>
      {delta && <div className="text-emerald-400 text-sm pb-1.5">{delta}</div>}
    </div>
  </div>
);

const Dashboard = () => {
  return (
    <PageShell testId="dashboard-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Overview</div>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
            Welcome back, <span className="grad-text">Sujal.</span>
          </h1>
          <p className="mt-2 text-white/60 max-w-lg">
            You're 3 weeks into your Senior Full-Stack track. Momentum is strong — one bottleneck to clear.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/50">TODAY</span>
          <span className="glass px-3 py-1.5 text-sm text-white/80 inline-flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Week 4 · Terraform Core
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-metrics">
        <Metric label="ATS score" value="82" delta="+14" icon={TrendingUp} tone="violet" />
        <Metric label="Skill match" value="68%" delta="+9" icon={Target} tone="cyan" />
        <Metric label="Streak" value="14d" delta="🔥" icon={Flame} tone="green" />
        <Metric label="Time to offer" value="5w" delta="-2w" icon={Clock} tone="violet" />
      </div>

      {/* Feature grid */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-white">Modules</h2>
          <span className="text-xs font-mono text-white/50">4 / 4 available</span>
        </div>

        <div className="mt-4 grid md:grid-cols-2 gap-5">
          {features.map((f, i) => {
            const Icon = iconMap[f.key];
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                data-testid={`dashboard-card-${f.key}`}
              >
                <Link to={f.to} className="block glass-strong relative overflow-hidden p-7 group hover:border-white/20 transition">
                  <div className={`absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-70 bg-gradient-to-br ${accentBg[f.accent]}`} />
                  <div className="relative flex items-start justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 px-2 py-1 rounded-full border border-white/10">
                      {f.tag}
                    </span>
                  </div>
                  <div className="relative mt-8 font-display text-2xl text-white">{f.title}</div>
                  <div className="relative mt-2 text-white/60 text-sm max-w-sm">{f.desc}</div>
                  <div className="relative mt-6 inline-flex items-center gap-1 text-sm text-white/80 group-hover:text-white">
                    Open <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
      <div className="mt-10 grid lg:grid-cols-3 gap-5">
        <div className="glass p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl text-white">Recent activity</h3>
            <span className="text-xs font-mono text-white/50">last 7 days</span>
          </div>
          <ul className="mt-4 divide-y divide-white/5">
            {[
              ["Resume re-analyzed", "ATS score jumped 74 → 82", "2h ago", "violet"],
              ["Mock interview #3 completed", "System Design — 7.4 / 10", "1d ago", "cyan"],
              ["Week 3 checkpoint passed", "Helm chart shipped ✅", "2d ago", "green"],
              ["Skill added: Terraform basics", "+5% overall match", "4d ago", "violet"],
            ].map(([t, s, w, tone]) => (
              <li key={t} className="py-3 flex items-center gap-4">
                <span
                  className={`h-2 w-2 rounded-full ${
                    tone === "violet" ? "bg-violet-400" : tone === "cyan" ? "bg-cyan-400" : "bg-emerald-400"
                  }`}
                />
                <div className="flex-1">
                  <div className="text-white text-sm">{t}</div>
                  <div className="text-white/50 text-xs">{s}</div>
                </div>
                <div className="text-xs font-mono text-white/40">{w}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass p-6">
          <h3 className="font-display text-xl text-white">Coach note</h3>
          <div className="mt-3 flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <p className="text-sm text-white/70 leading-relaxed">
              You have 4 weeks left in the sprint. The biggest lever right now is <span className="text-white">Terraform</span>.
              Ship a small infra module publicly this week and your match jumps into the 80s.
            </p>
          </div>
          <Link to="/roadmap" className="btn-ghost mt-5 text-sm w-full justify-center" data-testid="coach-cta">
            View roadmap <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </PageShell>
  );
};

export default Dashboard;
