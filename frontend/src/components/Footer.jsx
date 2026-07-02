import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const Footer = () => {
    return (
        <footer data-testid="site-footer" className="relative mt-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
                <div className="glass p-8 md:p-10">
                    <div className="grid md:grid-cols-4 gap-10">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </span>
                                <span className="font-display text-xl font-semibold text-white">
                                    Career<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300">Genesis</span>
                                </span>
                            </div>
                            <p className="mt-4 max-w-md text-sm text-white/60 leading-relaxed">
                                An AI-powered career intelligence platform. Analyze resumes, map skill gaps,
                                follow adaptive learning roadmaps, and rehearse interviews — all powered by Gemini.
                            </p>
                            <div className="mt-5 flex items-center gap-4">
                                <a
                                    href="https://github.com/SujalMahapatra"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/70 hover:text-white transition"
                                >
                                    GitHub
                                </a>

                                <a
                                    href="https://linkedin.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/70 hover:text-white transition"
                                >
                                    LinkedIn
                                </a>

                                <a
                                    href="https://twitter.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/70 hover:text-white transition"
                                >
                                    X
                                </a>
                            </div>

                        </div>
                        <div>
                            <h4 className="text-white/90 text-sm font-semibold">Product</h4>
                            <ul className="mt-4 space-y-2 text-sm text-white/60">
                                <li><Link to="/resume-analyzer" className="hover:text-white">Resume Analyzer</Link></li>
                                <li><Link to="/skill-gap" className="hover:text-white">Skill Gap</Link></li>
                                <li><Link to="/roadmap" className="hover:text-white">Learning Roadmap</Link></li>
                                <li><Link to="/interview" className="hover:text-white">Mock Interview</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white/90 text-sm font-semibold">Company</h4>
                            <ul className="mt-4 space-y-2 text-sm text-white/60">
                                <li><a href="#" className="hover:text-white">About</a></li>
                                <li><a href="#" className="hover:text-white">Careers</a></li>
                                <li><a href="#" className="hover:text-white">Press</a></li>
                                <li><a href="#" className="hover:text-white">Contact</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/50">
                        <div>© {new Date().getFullYear()} CareerGenesis Labs. Crafted with intention.</div>
                        <div className="flex items-center gap-4">
                            <a href="#" className="hover:text-white">Privacy</a>
                            <a href="#" className="hover:text-white">Terms</a>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-dot" />
                                All systems normal
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
