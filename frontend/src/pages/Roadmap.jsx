import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import PageShell from "../components/PageShell";
import { roadmap } from "../lib/mockData";
import { CheckCircle2, Circle, Flag, PlayCircle, Sparkles } from "lucide-react";

const Roadmap = () => {
  const [items, setItems] = useState(roadmap);
  const doneCount = useMemo(() => items.filter((i) => i.done).length, [items]);
  const pct = Math.round((doneCount / items.length) * 100);

  const toggleItem = (weekIdx, itemIdx) => {
    setItems((prev) => {
      const next = prev.map((w) => ({ ...w, items: [...w.items] }));
      // Cheap "done" toggling per-week if all items ticked -> mark week done
      const w = next[weekIdx];
      w._checked = w._checked ? { ...w._checked } : {};
      w._checked[itemIdx] = !w._checked[itemIdx];
      const allChecked = w.items.every((_, i) => w._checked[i]);
      w.done = allChecked || w.done;
      return next;
    });
  };

  return (
    <PageShell testId="roadmap-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 03</div>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
            Your <span className="grad-text">12-week</span> ascent.
          </h1>
          <p className="mt-3 text-white/60">
            Adaptive milestones based on your skill gap. Ship weekly. Adjust the plan whenever life happens.
          </p>
        </div>

        <div className="glass px-5 py-4 min-w-[240px]" data-testid="roadmap-progress">
          <div className="text-xs font-mono uppercase tracking-widest text-white/50">Progress</div>
          <div className="flex items-end justify-between mt-1">
            <div className="font-display text-3xl text-white">
              {doneCount}<span className="text-white/40 text-lg">/{items.length}</span>
            </div>
            <div className="text-xs font-mono text-emerald-300">{pct}%</div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8 }}
              className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative mt-12 pl-6 sm:pl-10">
        <div className="absolute top-0 bottom-0 left-2 sm:left-4 w-px bg-gradient-to-b from-violet-500/60 via-cyan-400/40 to-emerald-400/30" />

        <div className="space-y-8">
          {items.map((w, i) => {
            const state = w.done ? "done" : w.active ? "active" : "pending";
            return (
              <motion.div
                key={w.week}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: i * 0.04 }}
                className="relative"
                data-testid={`roadmap-week-${w.week}`}
              >
                <div
                  className={`absolute -left-6 sm:-left-10 top-4 h-6 w-6 rounded-full flex items-center justify-center border ${
                    state === "done"
                      ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300"
                      : state === "active"
                      ? "bg-gradient-to-br from-violet-500 to-cyan-400 border-white/40 text-white shadow-[0_0_24px_rgba(124,58,237,0.6)]"
                      : "bg-white/5 border-white/15 text-white/50"
                  }`}
                >
                  {state === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : state === "active" ? (
                    <PlayCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>

                <div className={`glass p-5 sm:p-6 ${state === "active" ? "border-violet-400/30" : ""}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                        Week {w.week}
                      </span>
                      <h3 className="font-display text-xl text-white">{w.title}</h3>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-mono tracking-widest px-2 py-1 rounded-full border ${
                        state === "done"
                          ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"
                          : state === "active"
                          ? "text-violet-200 border-violet-400/40 bg-violet-500/10"
                          : "text-white/50 border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      {state === "done" ? "Complete" : state === "active" ? "In progress" : "Upcoming"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-white/60">{w.focus}</div>

                  <ul className="mt-4 space-y-2">
                    {w.items.map((it, k) => {
                      const checked = w._checked?.[k] || w.done;
                      return (
                        <li key={k}>
                          <button
                            onClick={() => toggleItem(i, k)}
                            data-testid={`roadmap-w${w.week}-item-${k}`}
                            className="w-full flex items-start gap-3 text-left rounded-lg px-2 py-1.5 hover:bg-white/[0.03] transition"
                          >
                            <span
                              className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
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
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-14 glass-strong p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <div>
            <div className="font-display text-lg text-white">Adaptive replanning</div>
            <div className="text-sm text-white/60 mt-1 max-w-xl">
              Miss a week? CareerGenesis rebalances upcoming milestones automatically —
              your goal date shifts, your dignity doesn't.
            </div>
          </div>
        </div>
        <button className="btn-primary" data-testid="roadmap-rebalance">
          <Flag className="h-4 w-4" /> Rebalance plan
        </button>
      </div>
    </PageShell>
  );
};

export default Roadmap;
