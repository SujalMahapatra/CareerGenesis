import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X, ArrowUpRight } from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/resume-analyzer", label: "Resume" },
  { to: "/skill-gap", label: "Skill Gap" },
  { to: "/roadmap", label: "Roadmap" },
  { to: "/interview", label: "Interview" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onLanding = pathname === "/";

  return (
    <header
      data-testid="site-navbar"
      className="sticky top-0 z-40 w-full"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <div className="glass px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <Link to="/" data-testid="brand-logo" className="flex items-center gap-2 group">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_8px_24px_-8px_rgba(124,58,237,0.7)]">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="font-display text-[17px] font-semibold tracking-tight text-white">
              Career<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300">Genesis</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm transition-all ${
                    isActive
                      ? "bg-white/10 text-white border border-white/15"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to={onLanding ? "/dashboard" : "/interview"}
              data-testid="nav-cta"
              className="btn-primary text-sm"
            >
              {onLanding ? "Launch app" : "Start interview"}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white"
            onClick={() => setOpen((v) => !v)}
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mx-4 mt-2 glass p-3"
            data-testid="mobile-menu"
          >
            <div className="flex flex-col gap-1">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  data-testid={`mobile-nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/75 hover:bg-white/5"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <Link to="/dashboard" className="btn-primary mt-2 justify-center" data-testid="mobile-cta">
                Launch app
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
