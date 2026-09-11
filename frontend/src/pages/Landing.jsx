import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import BackgroundFX from "./components/BackgroundFX";
import { features } from "../lib/mockData";
import {
  ArrowUpRight,
  FileText,
  Target,
  Route,
  Mic,
  Sparkles,
  Play,
  ShieldCheck,
  Bot,
  Zap,
  ChevronRight,
} from "lucide-react";

const iconMap = { resume: FileText, skill: Target, roadmap: Route, interview: Mic };
const accentMap = {
  violet: "from-violet-500/30 via-fuchsia-500/10 to-transparent border-violet-400/25",
  cyan: "from-cyan-500/30 via-sky-400/10 to-transparent border-cyan-400/25",
  green: "from-emerald-500/30 via-teal-400/10 to-transparent border-emerald-400/25",
};

const Word = ({ children, delay = 0, gradient = false }) => (
  <motion.span
    initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ delay, duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
    className={`inline-block ${gradient ? "grad-text" : ""}`}
  >
    {children}&nbsp;
  </motion.span>
);

const Landing = () => {
  return (
    <div className="relative" data-testid="landing-page">
      <BackgroundFX variant="landing" />
      <Navbar />

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grad-border inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white/80 bg-white/[0.03]"
          data-testid="hero-pill"
        >
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
          <span className="font-mono">v1.0 · Gemini-powered · early access open</span>
        </motion.div>

        <h1 className="font-display mt-6 text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.02] tracking-tight text-white max-w-5xl">
          <Word delay={0.05}>Career</Word>
          <Word delay={0.12} gradient>intelligence,</Word>
          <br />
          <Word delay={0.2}>engineered</Word>
          <Word delay={0.28}>for</Word>
          <Word delay={0.36} gradient>the</Word>
          <Word delay={0.44} gradient>next</Word>
          <Word delay={0.52} gradient>you.</Word>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-6 max-w-2xl text-base sm:text-lg text-white/65 leading-relaxed"
          data-testid="hero-subtitle"
        >
          CareerGenesis blends resume forensics, skill-gap mapping, adaptive
          roadmaps and live mock interviews — orchestrated by Gemini — so you
          ship the career move you keep postponing.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.6 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link to="/dashboard" className="btn-primary" data-testid="hero-cta-primary">
            Enter the platform
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="btn-ghost" data-testid="hero-cta-secondary">
            <Play className="h-4 w-4" />
            See how it works
          </a>
        </motion.div>

        {/* Hero mockup card */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          className="relative mt-16"
          data-testid="hero-mockup"
        >
          <div className="glass-strong overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <div className="text-xs text-white/50 font-mono">careergenesis.app / dashboard</div>
              <div className="text-xs text-white/50 font-mono hidden sm:block">gemini · online</div>
            </div>

            <div className="grid md:grid-cols-3 gap-5 p-5">
              <div className="glass p-5">
                <div className="text-xs text-white/50 font-mono">ATS SCORE</div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="font-display text-5xl text-white">82</div>
                  <div className="text-emerald-400 text-sm mb-1.5">+14</div>
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[82%] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/70">
                  <div className="flex items-center justify-between"><span>Structure</span><span className="text-white">A</span></div>
                  <div className="flex items-center justify-between"><span>Impact metrics</span><span className="text-white">B+</span></div>
                  <div className="flex items-center justify-between"><span>Keywords</span><span className="text-amber-300">C</span></div>
                </div>
              </div>

              <div className="glass p-5">
                <div className="text-xs text-white/50 font-mono">SKILL DELTA</div>
                <div className="mt-3 space-y-3">
                  {[
                    ["Kubernetes", 20, "high"],
                    ["Terraform", 15, "high"],
                    ["System Design", 45, "med"],
                    ["gRPC", 10, "med"],
                  ].map(([k, v, p]) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs text-white/70">
                        <span>{k}</span>
                        <span className="font-mono">{v}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${v}%`,
                            background: p === "high"
                              ? "linear-gradient(90deg,#f43f5e,#f97316)"
                              : "linear-gradient(90deg,#06b6d4,#22c55e)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass p-5">
                <div className="text-xs text-white/50 font-mono">MOCK INTERVIEW</div>
                <div className="mt-2 text-sm text-white/85 leading-relaxed">
                  “Design a scalable notification system for 10M events / hour...”
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 text-xs text-white/60 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 pulse-dot" />
                    RECORDING · 00:42
                  </div>
                  <div className="mt-3 flex items-end gap-1 h-10">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-gradient-to-t from-violet-500 to-cyan-400"
                        style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 80}%` }}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-3 text-xs text-emerald-300/90">
                  Coach: Open with a 15-second thesis.
                </div>
              </div>
            </div>
          </div>

          {/* Glow underneath */}
          <div className="absolute inset-x-16 -bottom-8 h-24 blur-3xl -z-10 bg-gradient-to-r from-violet-600/40 via-fuchsia-500/30 to-cyan-400/40 rounded-full" />
        </motion.div>

        {/* Trust bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/50">
          {[
            ["10,240", "resumes analyzed"],
            ["92%", "interview readiness lift"],
            ["8 weeks", "avg. time to offer"],
            ["4.9 / 5", "coaching rating"],
          ].map(([v, l]) => (
            <div key={l} className="glass px-5 py-4">
              <div className="font-display text-2xl text-white">{v}</div>
              <div className="text-xs mt-0.5 uppercase tracking-wider text-white/50">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// The stack</div>
          <h2 className="font-display mt-3 text-4xl sm:text-5xl font-semibold text-white leading-tight">
            Four instruments. <span className="grad-text">One career OS.</span>
          </h2>
          <p className="mt-3 text-white/60 max-w-lg">
            Each module is intentional — designed to eliminate a specific friction between
            you and the role you deserve.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-5">
          {features.map((f, i) => {
            const Icon = iconMap[f.key];
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
                className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${accentMap[f.accent]} p-[1px]`}
                data-testid={`feature-card-${f.key}`}
              >
                <Link to={f.to} className="block glass-strong h-full p-7 group">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10">
                      <Icon className="h-5 w-5 text-white" />
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/50 px-2 py-1 rounded-full border border-white/10">
                      {f.tag}
                    </span>
                  </div>
                  <div className="mt-8 font-display text-2xl text-white">{f.title}</div>
                  <div className="mt-2 text-white/60 text-sm max-w-sm">{f.desc}</div>
                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/80 group-hover:text-white transition">
                    Open module <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Bot, title: "Talk to your career", body: "Drop your resume, name a role. Gemini reads context, not just keywords." },
            { icon: Zap, title: "Get a plan, not advice", body: "You leave with a 12-week adaptive roadmap — weekly milestones, no fluff." },
            { icon: ShieldCheck, title: "Rehearse with a coach", body: "Voice + text mock interviews scored on structure, signal and calibration." },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass p-7"
              data-testid={`how-step-${i}`}
            >
              <s.icon className="h-6 w-6 text-cyan-300" />
              <div className="mt-4 font-display text-xl text-white">{s.title}</div>
              <div className="mt-2 text-sm text-white/60 leading-relaxed">{s.body}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <div className="glass-strong relative overflow-hidden p-10 md:p-16 text-center">
          <div className="orb orb-violet orb-a" style={{ width: 340, height: 340, left: -80, top: -80 }} />
          <div className="orb orb-cyan orb-b" style={{ width: 320, height: 320, right: -80, bottom: -80 }} />
          <div className="relative">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// The next move</div>
            <h3 className="font-display mt-3 text-4xl sm:text-5xl font-semibold text-white">
              Your future self is <span className="grad-text">already ahead.</span>
            </h3>
            <p className="mt-4 max-w-xl mx-auto text-white/65">
              Start with a free analysis. In 90 seconds you'll know exactly what to fix and where to focus.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link to="/dashboard" className="btn-primary" data-testid="footer-cta">
                Start free analysis <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/interview" className="btn-ghost">
                Try a mock interview <Mic className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
