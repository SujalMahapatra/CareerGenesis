
// Mock data for CareerGenesis demo (frontend-only)

export const features = [
  {
    key: "resume",
    title: "Resume Analyzer",
    tag: "ATS",
    desc: "Score, structure & keyword insights parsed by Gemini.",
    to: "/resume-analyzer",
    accent: "violet",
  },
  {
    key: "skill",
    title: "Skill Gap Analysis",
    tag: "Delta",
    desc: "Map current skills vs the role you want.",
    to: "/skill-gap",
    accent: "cyan",
  },
  {
    key: "roadmap",
    title: "Learning Roadmap",
    tag: "12 weeks",
    desc: "Weekly milestones with adaptive checkpoints.",
    to: "/roadmap",
    accent: "green",
  },
  {
    key: "interview",
    title: "Mock Interview",
    tag: "Voice + Text",
    desc: "Real-time coaching, scoring & body-of-work feedback.",
    to: "/interview",
    accent: "violet",
  },
];

export const resumeAnalysis = {
  score: 82,
  strengths: [
    "Clear reverse-chronological structure",
    "Quantified impact in 6/8 bullets",
    "Strong action verbs (shipped, orchestrated, reduced)",
  ],
  issues: [
    { level: "high", text: "Missing keywords for target role: Kubernetes, Terraform, gRPC" },
    { level: "med", text: "Summary is 4 lines — trim to 2 tight lines" },
    { level: "low", text: "Consider a Projects section above Education" },
  ],
  keywords: {
    matched: ["React", "TypeScript", "GraphQL", "AWS", "CI/CD", "Postgres"],
    missing: ["Kubernetes", "Terraform", "gRPC", "OpenTelemetry"],
  },
  sections: [
    { name: "Contact", score: 96 },
    { name: "Summary", score: 71 },
    { name: "Experience", score: 88 },
    { name: "Skills", score: 79 },
    { name: "Education", score: 92 },
    { name: "Projects", score: 64 },
  ],
};

export const skillGap = {
  role: "Senior Full-Stack Engineer",
  match: 68,
  have: [
    { name: "React", level: 92 },
    { name: "TypeScript", level: 84 },
    { name: "Node.js", level: 78 },
    { name: "PostgreSQL", level: 71 },
    { name: "AWS", level: 62 },
  ],
  need: [
    { name: "Kubernetes", level: 20, priority: "high" },
    { name: "Terraform", level: 15, priority: "high" },
    { name: "System Design", level: 45, priority: "med" },
    { name: "gRPC", level: 10, priority: "med" },
    { name: "OpenTelemetry", level: 8, priority: "low" },
  ],
  recs: [
    "Ship a K8s side-project — deploy a 3-service app on kind + Helm.",
    "Complete a hands-on Terraform course on AWS provisioning.",
    "Read Designing Data-Intensive Applications, chapters 5–9.",
  ],
};

export const roadmap = [
  {
    week: 1,
    title: "Foundations",
    focus: "Set the baseline",
    done: true,
    items: ["Publish updated portfolio", "Rewrite resume with quantified bullets", "Baseline mock interview"],
  },
  {
    week: 2,
    title: "Kubernetes 101",
    focus: "Local clusters & pods",
    done: true,
    items: ["Install kind + kubectl", "Deploy nginx + service", "Read Kubernetes: Up & Running ch. 1–4"],
  },
  {
    week: 3,
    title: "Helm & Ingress",
    focus: "Package & expose",
    done: true,
    items: ["Write your first Helm chart", "Set up an ingress controller", "Deploy a 3-tier app"],
  },
  {
    week: 4,
    title: "Terraform Core",
    focus: "IaC discipline",
    done: false,
    active: true,
    items: ["Provision VPC + EC2 module", "Remote state on S3", "Module composition patterns"],
  },
  {
    week: 5,
    title: "Observability",
    focus: "OpenTelemetry",
    done: false,
    items: ["Instrument a Node service", "Ship traces to Tempo", "Build a Grafana board"],
  },
  {
    week: 6,
    title: "System Design",
    focus: "Scaling patterns",
    done: false,
    items: ["Design a URL shortener", "Design a rate-limiter", "Design a feed service"],
  },
  {
    week: 7,
    title: "Interview Sprint",
    focus: "Mock, iterate, refine",
    done: false,
    items: ["3 mock interviews", "Behavioral STAR bank", "Salary negotiation prep"],
  },
  {
    week: 8,
    title: "Offer Ready",
    focus: "Ship, apply, negotiate",
    done: false,
    items: ["30 targeted applications", "2 referrals", "Offer decision framework"],
  },
];

export const interviewQuestions = [
  {
    id: "q1",
    category: "System Design",
    difficulty: "Hard",
    text: "Design a scalable notification system that fans out 10M events per hour with delivery guarantees across email, push and SMS.",
    hints: ["Message queue?", "Idempotency keys", "Backpressure & retries", "Priority lanes"],
  },
  {
    id: "q2",
    category: "Behavioral",
    difficulty: "Medium",
    text: "Tell me about a time you disagreed with a senior engineer. How did you resolve it and what did you learn?",
    hints: ["Use STAR", "Show ownership", "Highlight outcome"],
  },
  {
    id: "q3",
    category: "Coding",
    difficulty: "Medium",
    text: "Given a stream of stock prices, design a data structure that returns the max price in the last N seconds in O(1) amortized.",
    hints: ["Monotonic deque", "Sliding window", "Time-based eviction"],
  },
];

export const coachingTips = [
  "Open with a 15-second thesis — the shape of your answer before the details.",
  "Trade one adjective for one number. Metrics beat adjectives every time.",
  "Name the trade-off you rejected. Interviewers score depth, not just choice.",
];
