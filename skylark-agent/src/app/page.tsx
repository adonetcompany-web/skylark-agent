'use client';

import React, { useState } from 'react';
import Chat from '@/components/Chat';
import Dashboard from '@/components/Dashboard';
import { LayoutDashboard, MessageSquare, Menu, X, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <main className="flex h-screen w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className={cn(
        "flex flex-col border-r border-[var(--border)] bg-white transition-all duration-300 ease-in-out relative z-30",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        <div className="h-20 flex items-center px-4 border-b border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 shrink-0">
              <img src="/skylark-drones-logo.svg" alt="Skylark Logo" className="w-full h-full object-contain" />
            </div>
            {/* Fixed: Always render the text but with opacity transition */}
            <div
              className={cn(
                "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
                sidebarOpen ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
              )}
            >
              <span className="font-black text-xs uppercase tracking-[0.2em] text-zinc-900">
                SkyOps AI
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <NavItem
            icon={LayoutDashboard}
            label="Missions Control"
            active={true}
            sidebarOpen={sidebarOpen}
          />
          <NavItem
            icon={MessageSquare}
            label="Agent Logs"
            active={false}
            sidebarOpen={sidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center h-10 rounded hover:bg-zinc-50 text-zinc-400 hover:text-[#F25B2A] transition-all"
            title={sidebarOpen ? "Collapse" : "Expand"}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        {/* Left Side: Performance Metrics */}
        <section className="flex-1 min-w-0 flex flex-col h-full overflow-hidden p-8 lg:p-12">
          <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Fleet Intelligence</h1>
            <div className="h-1 w-12 bg-[#F25B2A]" />
          </div>
          <div className="flex-1 overflow-hidden">
            <Dashboard />
          </div>
        </section>

        {/* Right Side: Command Console */}
        <section className="w-full md:w-[450px] lg:w-[480px] h-full shrink-0 flex flex-col bg-zinc-50/50 border-l border-[var(--border)] p-8">
          <div className="mb-8">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F25B2A]" />
              Command Console
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <Chat />
          </div>
        </section>
      </div>
    </main>
  );
}

function NavItem({ icon: Icon, label, active, sidebarOpen }: any) {
  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3 cursor-not-allowed group transition-all relative",
      active
        ? "text-[#F25B2A]"
        : "text-zinc-400 hover:text-zinc-900"
    )}>
      {active && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F25B2A]" />
      )}
      <Icon size={20} className="shrink-0" />
      {/* Fixed: Wrap text in a div with width transition */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden whitespace-nowrap",
          sidebarOpen ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
        )}
      >
        <span className="font-bold text-[11px] uppercase tracking-widest">
          {label}
        </span>
      </div>
    </div>
  );
}