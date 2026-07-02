import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Resume Analyzer",
      description: "Upload your resume and get ATS insights powered by Gemini.",
      route: "/resume",
    },
    {
      title: "Skill Gap Analysis",
      description: "Compare your skills with target job requirements.",
      route: "/skill-gap",
    },
    {
      title: "Learning Roadmap",
      description: "Generate a personalized career roadmap.",
      route: "/roadmap",
    },
    {
      title: "Mock Interview",
      description: "Practice with AI-generated interview questions.",
      route: "/interview",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">

        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4">
            CareerGenesis
          </h1>

          <p className="text-xl text-slate-400">
            AI-Powered Career Intelligence Platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {cards.map((card) => (
            <div
              key={card.title}
              onClick={() => navigate(card.route)}
              className="cursor-pointer rounded-2xl border border-slate-800 bg-slate-900 p-8 hover:border-blue-500 transition"
            >
              <h2 className="text-2xl font-semibold mb-3">
                {card.title}
              </h2>

              <p className="text-slate-400">
                {card.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}