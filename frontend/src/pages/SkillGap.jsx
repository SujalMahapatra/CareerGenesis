import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageShell from "../components/PageShell";
import { skillGap } from "../lib/mockData";
import { Target, TrendingUp, Sparkles, ArrowRight, RefreshCw, ArrowLeft, Briefcase, Plus, Terminal } from "lucide-react";
import { analyzeSkillGap } from "../services/api";
import { toast } from "sonner";

const Bar = ({ value, tone = "violet" }) => (
  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
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
  critical: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  high: "text-rose-300 border-rose-400/30 bg-rose-500/10",
  medium: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  med: "text-amber-300 border-amber-400/30 bg-amber-500/10",
  low: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10",
};

const PRESET_ROLES = {
  "Backend Developer": `Required Skills:
Python, FastAPI, REST APIs, Docker, CI/CD, AWS, Git, System Design

Responsibilities:
- Build and maintain high-performance API endpoints.
- Manage database schemas, indexes, and queries on AWS PostgreSQL.
- Setup Docker-based containerization and automated Git pipelines.`,

  "Frontend Developer": `Required Skills:
React, TypeScript, Next.js, HTML, CSS, TailwindCSS, Framer Motion, Redux

Responsibilities:
- Create modular component logic and responsive pages.
- Integrate REST/GraphQL endpoints with robust state management.
- Deploy smooth, micro-animated user interfaces.`,

  "Full Stack Developer": `Required Skills:
React, TypeScript, Node.js, Express, PostgreSQL, AWS, Docker, Git

Responsibilities:
- Build server-side business logic and deploy interactive React views.
- Configure secure client-server API handshakes and remote state.
- Optimize database interactions and system integrations.`,

  "AI Engineer": `Required Skills:
Python, PyTorch, Transformers, Vector Databases, Data Engineering, Docker

Responsibilities:
- Build pipelines for fine-tuning LLM embeddings.
- Deploy cognitive semantic search features using Vector databases.
- Instrument AI agents with specific tool calls and error recovery loops.`,

  "AI Agent Engineer": `Required Skills:
Python, LangChain, LangGraph, LLMs, Vector DBs, FastAPI, Git, Prompt Engineering

Responsibilities:
- Architect agentic state systems using multi-agent loops and graphs.
- Draft robust prompts and guardrails to prevent hallucination.
- Build integrations for API tool executions and memory states.`,

  "Machine Learning Engineer": `Required Skills:
Python, Scikit-learn, TensorFlow, MLOps, SQL, Docker, Pandas, NumPy

Responsibilities:
- Train and evaluate predictive ML models for candidate recommendation.
- Build secure feature engineering pipelines.
- Containerize models and deploy production inference endpoints.`,

  "Data Scientist": `Required Skills:
Python, SQL, R, Pandas, Jupyter, Statistics, Machine Learning, Data Visualization

Responsibilities:
- Analyze user metrics and compile growth performance reports.
- Design A/B testing parameters for dashboard CTA elements.
- Clean and map structured datasets.`,

  "Cloud Engineer": `Required Skills:
AWS, Terraform, Networking, Linux, IAM, CloudWatch, Kubernetes, Git

Responsibilities:
- Manage VPC networking configurations, Subnets, and Gateways.
- Provision IaC architectures using Terraform modules.
- Audit security profiles, permissions, and service integrations.`,

  "DevOps Engineer": `Required Skills:
Kubernetes, Docker, Terraform, GitLab CI, GitHub Actions, Linux, Bash, Prometheus

Responsibilities:
- Architect production Kubernetes clusters and ingress services.
- Automate deployment pipelines for containerized microservices.
- Instrument telemetry monitors and Slack alerting hooks.`,

  "Product Manager": `Required Skills:
Product Roadmap, Agile, User Research, SQL, Jira, PRDs, Communication

Responsibilities:
- Draft product specs and coordinate tasks across multi-agent streams.
- Define success metrics and monitor conversion loops.
- Conduct user research to prioritize feature requests.`,

  "Cybersecurity Engineer": `Required Skills:
Penetration Testing, Network Security, IAM, SIEM, Cryptography, Linux, Firewalls

Responsibilities:
- Perform security audits and vulnerability scans on active endpoints.
- Monitor access controls, JWT tokens, and OAuth scopes.
- Incident response and logs auditing.`,
};

export const SkillGap = () => {
  const [targetRole, setTargetRole] = useState("Senior Full-Stack Engineer");
  const [candidateSkills, setCandidateSkills] = useState("React, TypeScript, Node.js, PostgreSQL, AWS");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [data, setData] = useState(null);

  // Smart JD Generator States
  const [jdRoleName, setJdRoleName] = useState("");
  const [jdExpLevel, setJdExpLevel] = useState("Mid Level");

  const selectPresetRole = (roleName) => {
    const template = PRESET_ROLES[roleName];
    if (template) {
      setTargetRole(roleName);
      setJobDescription(template);
      toast.info(`Populated template for ${roleName}`);
    }
  };

  const handleSmartJDGenerate = () => {
    const role = jdRoleName.trim() || targetRole;
    if (!role) {
      toast.error("Role name required", { description: "Please enter a target role name to generate." });
      return;
    }

    const level = jdExpLevel;
    let skills = ["Git", "Agile"];
    let duties = [
      "Collaborate with product managers and engineers to deliver features.",
      "Participate in system code reviews and maintain clean syntax.",
    ];

    const lowRole = role.toLowerCase();
    if (lowRole.includes("ai") || lowRole.includes("agent") || lowRole.includes("learning") || lowRole.includes("model")) {
      skills = ["Python", "FastAPI", "Vector Databases", "LLMs", "Prompt Engineering", ...skills];
      duties = [
        `Architect cognitive tools and agentic structures for ${level} roles.`,
        "Deploy and monitor AI model pipelines in production setups.",
        ...duties,
      ];
    } else if (lowRole.includes("back") || lowRole.includes("cloud") || lowRole.includes("devops") || lowRole.includes("infra")) {
      skills = ["Docker", "Kubernetes", "AWS", "Terraform", "CI/CD", "PostgreSQL", ...skills];
      duties = [
        `Configure secure microservice architectures fitting a ${level} mandate.`,
        "Automate system deployment tracks and monitor endpoint logs.",
        ...duties,
      ];
    } else if (lowRole.includes("front") || lowRole.includes("design") || lowRole.includes("ui") || lowRole.includes("ux")) {
      skills = ["React", "TypeScript", "TailwindCSS", "Next.js", "State Management", ...skills];
      duties = [
        `Develop modular, reusable view components suited for ${level} platforms.`,
        "Coordinate with UI/UX engineers to ship sleek web screens.",
        ...duties,
      ];
    } else {
      skills = ["Python", "JavaScript", "SQL", "Docker", "REST APIs", ...skills];
      duties = [
        `Perform application development duties mapping the ${level} requirements.`,
        "Maintain code structures and test coverage metrics.",
        ...duties,
      ];
    }

    const generatedTemplate = `Required Skills:
${skills.join(", ")}

Responsibilities:
${duties.map((d) => `- ${d}`).join("\n")}`;

    setTargetRole(role);
    setJobDescription(generatedTemplate);
    toast.success("Job description template generated!");
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!candidateSkills.trim()) {
      toast.error("Skills required", { description: "Please enter your current skills." });
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Job Description required", { description: "Please select a preset role, generate one, or paste a job description." });
      return;
    }

    setLoading(true);
    setDone(false);
    toast.info("Analyzing skill gaps…");

    const skillsArray = candidateSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const response = await analyzeSkillGap({
        candidate_skills: skillsArray,
        job_description: jobDescription,
      });
      setData(response.data);
      setDone(true);
      toast.success("Skill gap analysis loaded!");
    } catch (err) {
      console.error(err);
      toast.error("Analysis failed", {
        description: err.response?.data?.detail || "Make sure the FastAPI backend is running.",
      });
      // Fallback logic
      const fallbackResult = {
        match_percentage: skillGap.match,
        matching_skills: skillGap.have.map((s) => ({
          skill_name: s.name,
          proficiency_level: "advanced",
          evidence_in_resume: `Demonstrated ${s.level}% match dynamically.`,
        })),
        missing_skills: skillGap.need.map((s) => ({
          skill_name: s.name,
          importance: s.priority,
          description: `Skill needs scaling to bridge ${s.level}% delta.`,
        })),
        partial_matches: [],
        recommendations: skillGap.recs,
      };
      setData(fallbackResult);
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell testId="skill-gap-page">
      <AnimatePresence mode="wait">
        {!done && !loading ? (
          <motion.div
            key="input-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-4xl mx-auto space-y-6 text-left"
          >
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 02</div>
              <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
                Analyze your <span className="grad-text">skill gap.</span>
              </h1>
              <p className="mt-3 text-white/60">
                Choose a role template, dynamically generate a job description, or paste one directly to calculate missing skill deltas.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Left Side: Preset Assistant */}
              <div className="space-y-4">
                <div className="glass p-5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-violet-300 mb-3">
                    <Briefcase className="h-4 w-4" /> Role Templates
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {Object.keys(PRESET_ROLES).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => selectPresetRole(role)}
                        className={`text-left text-xs px-3 py-2 rounded-lg transition border ${
                          targetRole === role
                            ? "bg-violet-500/10 text-violet-200 border-violet-500/25"
                            : "bg-white/[0.01] hover:bg-white/[0.04] text-white/70 border-white/5"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smart JD Generator */}
                <div className="glass p-5">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-cyan-300 mb-3">
                    <Terminal className="h-4 w-4" /> Smart JD Generator
                  </div>
                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        value={jdRoleName}
                        onChange={(e) => setJdRoleName(e.target.value)}
                        placeholder="Target Role (e.g. AI Agent Engineer)"
                        className="w-full text-xs rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2 text-white placeholder:text-white/30 focus:outline-none"
                      />
                    </div>
                    <div>
                      <select
                        value={jdExpLevel}
                        onChange={(e) => setJdExpLevel(e.target.value)}
                        className="w-full text-xs rounded-xl border border-white/10 bg-[#0d0d12] px-3.5 py-2 text-white focus:outline-none"
                      >
                        <option value="Entry Level">Entry Level</option>
                        <option value="Mid Level">Mid Level</option>
                        <option value="Senior Level">Senior Level</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleSmartJDGenerate}
                      className="btn-primary w-full text-xs py-2 justify-center"
                    >
                      <Plus className="h-3.5 w-3.5" /> Generate Job Description
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: Main inputs */}
              <div className="md:col-span-2">
                <form onSubmit={handleAnalyze} className="glass-strong p-6 space-y-5 relative overflow-hidden h-full flex flex-col">
                  <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl bg-violet-600/10" />
                  <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full blur-3xl bg-cyan-500/10" />

                  <div className="grid sm:grid-cols-2 gap-4 relative">
                    <div>
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
                        Your Skills (Comma Separated)
                      </label>
                      <input
                        type="text"
                        value={candidateSkills}
                        onChange={(e) => setCandidateSkills(e.target.value)}
                        placeholder="React, TypeScript, AWS, Node.js"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative flex-1 flex flex-col">
                    <label className="block text-xs font-mono uppercase tracking-widest text-white/50 mb-2">
                      Target Job Description (Editable)
                    </label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Select a role on the left, click Generate, or paste requirements details here..."
                      rows={6}
                      className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white placeholder:text-white/30 focus:border-violet-400/50 focus:outline-none flex-1"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full relative z-10 py-3 text-sm justify-center mt-3"
                    data-testid="skill-gap-submit-btn"
                  >
                    <Sparkles className="h-4 w-4" /> Compare Skill Delta
                  </button>
                </form>
              </div>
            </div>
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
            <div className="mt-4 font-display text-lg text-white">Mapping capability matrices...</div>
            <div className="text-sm text-white/50 mt-1">Cross-referencing technical skills against job requirements.</div>
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
            key="results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header / Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-left">
              <div className="max-w-2xl">
                <button
                  type="button"
                  onClick={() => setDone(false)}
                  className="btn-ghost text-xs px-3 py-1.5 mb-3 flex items-center gap-1.5 hover:bg-white/5"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to edit inputs
                </button>
                <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">// Module 02 Result</div>
                <h1 className="font-display mt-2 text-4xl sm:text-5xl font-semibold text-white leading-tight">
                  The delta between <span className="grad-text">now and next.</span>
                </h1>
                <p className="mt-3 text-white/60">
                  Target role: <span className="text-white">{targetRole}</span>. Below is the shortest
                  path to close the gap without over-studying.
                </p>
              </div>
              <div className="glass px-5 py-4 min-w-[220px] text-right">
                <div className="text-xs font-mono uppercase tracking-widest text-white/50">Overall match</div>
                <div className="font-display text-4xl text-white">
                  {data.match_percentage.toFixed(0)}<span className="text-white/40 text-2xl">%</span>
                </div>
                <div className="text-xs text-emerald-400 mt-1 inline-flex items-center gap-1 justify-end w-full">
                  <TrendingUp className="h-3 w-3" /> Real-time Gemini calibration
                </div>
              </div>
            </div>

            {/* Comparison panels */}
            <div className="grid lg:grid-cols-2 gap-6 text-left">
              {/* Have */}
              <div className="glass p-6" data-testid="skills-have">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <h3 className="font-display text-xl text-white">You already have</h3>
                </div>
                <div className="mt-6 space-y-5">
                  {data.matching_skills.length > 0 ? (
                    data.matching_skills.map((s, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white">{s.skill_name}</span>
                          <span className="font-mono text-white/50 text-xs">
                            {s.proficiency_level ? s.proficiency_level.toUpperCase() : "FOUND"}
                          </span>
                        </div>
                        <p className="text-xs text-white/40 mt-1 leading-normal">
                          {s.evidence_in_resume}
                        </p>
                        <div className="mt-2">
                          <Bar value={100} tone="green" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-white/45 py-4">No matching skills found in the profile.</div>
                  )}
                </div>
              </div>

              {/* Need */}
              <div className="glass p-6 relative overflow-hidden" data-testid="skills-need">
                <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl bg-rose-500/10" />
                <div className="relative flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400 pulse-dot" />
                  <h3 className="font-display text-xl text-white">You need to build</h3>
                </div>
                <div className="relative mt-6 space-y-5">
                  {/* Partial Matches */}
                  {data.partial_matches && data.partial_matches.map((s, idx) => (
                    <div key={`partial-${idx}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white flex items-center gap-2">
                          {s.required_skill}
                          <span className={`text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded-full border ${priorityStyles.medium}`}>
                            partial match
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-white/70 mt-1">
                        {s.gap_description}
                      </p>
                      <p className="text-xs text-violet-300 mt-1 leading-normal italic">
                        💡 Recommendation: {s.recommendation}
                      </p>
                      <div className="mt-2.5">
                        <Bar value={45} tone="cyan" />
                      </div>
                    </div>
                  ))}

                  {/* Missing Skills */}
                  {data.missing_skills.length > 0 ? (
                    data.missing_skills.map((s, idx) => {
                      const level = s.importance === "critical" || s.importance === "high" ? "high" : s.importance === "medium" || s.importance === "med" ? "med" : "low";
                      const style = priorityStyles[level] || priorityStyles.high;
                      return (
                        <div key={`missing-${idx}`}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white flex items-center gap-2">
                              {s.skill_name}
                              <span className={`text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.5 rounded-full border ${style}`}>
                                {s.importance || "high"}
                              </span>
                            </span>
                          </div>
                          <p className="text-xs text-white/50 mt-1 leading-normal">
                            {s.description}
                          </p>
                          <div className="mt-2">
                            <Bar value={15} tone="rose" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    data.partial_matches?.length === 0 && (
                      <div className="text-sm text-white/45 py-4">No gaps found. You possess all required skills!</div>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-8 glass p-6 text-left" data-testid="skills-recommendations">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-300" />
                <h3 className="font-display text-xl text-white">Coach recommendations</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {data.recommendations.map((r, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white text-xs font-mono">
                      {i + 1}
                    </span>
                    <div className="text-sm text-white/80 flex-1">{r}</div>
                    <ArrowRight className="h-4 w-4 text-white/40" />
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
};

export default SkillGap;
