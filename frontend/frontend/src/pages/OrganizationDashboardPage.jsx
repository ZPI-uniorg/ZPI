import React, { useState } from "react";
import useAuth from "../hooks/useAuth.js";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OrganizationDashboardPage() {
  const { user, organization: activeOrganization } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const buttonStyleClassname = "px-6 py-3 rounded-full border border-slate-400/30 bg-transparent text-inherit cursor-pointer transition-colors duration-200 hover:bg-slate-400/15 hover:border-slate-400/60";

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(145deg,#0f172a,#1e293b)] p-[clamp(24px,5vw,48px)] text-slate-100 relative overflow-hidden">
      {/* Header */}
      <header className="mb-8 flex items-center justify-center relative">
        {/* Menu Icon (top-left corner) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[rgba(15,23,42,0.75)] border border-[rgba(148,163,184,0.35)] shadow-[0_8px_20px_rgba(15,23,42,0.4)] hover:shadow-[0_8px_25px_rgba(56,189,248,0.2)] transition"
        >
          <Menu className="w-6 h-6 text-slate-200" />
        </button>

        <h1 className="text-[clamp(1.8rem,2.5vw,2.4rem)] font-semibold text-center">
          {activeOrganization.name}
        </h1>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Background overlay */}
            <motion.div
              className="fixed inset-0 bg-black/40 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 20, stiffness: 250 }}
              className="fixed top-0 left-0 z-50 h-full w-72 bg-[rgba(15,23,42,0.95)] border-r border-[rgba(148,163,184,0.35)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] p-6 flex flex-col gap-6 rounded-r-[24px]"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-100">
                    {`${user.first_name} ${user.last_name}`}
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className={buttonStyleClassname}
                >
                  <X className="w-6 h-6 text-slate-300" />
                </button>
              </div>

              <nav className="flex flex-col gap-4 text-slate-300">
                <button className={buttonStyleClassname}>
                  Dashboard
                </button>
                <button className={buttonStyleClassname}>
                  Members
                </button>
                <button className={buttonStyleClassname}>
                  Settings
                </button>
                <button className={buttonStyleClassname}>
                  Logout
                </button>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="flex flex-1 gap-6 max-w-7xl mx-auto w-full">
        <div className="flex-1 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(32px,4vw,48px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-center justify-center text-slate-300 border border-[rgba(148,163,184,0.35)]">
          Chats
        </div>

        <div className="flex flex-col flex-1 gap-6">
          <div className="flex-1 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-center justify-center text-slate-300 border border-[rgba(148,163,184,0.35)]">
            Calendar
          </div>

          <div className="flex-1 bg-[rgba(15,23,42,0.92)] rounded-[24px] p-[clamp(24px,3vw,40px)] shadow-[0_25px_50px_rgba(15,23,42,0.45)] flex items-center justify-center text-slate-300 border border-[rgba(148,163,184,0.35)]">
            Kanban
          </div>
        </div>
      </div>
    </div>
  );
}
