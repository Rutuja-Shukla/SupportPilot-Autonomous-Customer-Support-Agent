/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  Users,
  Package,
  Ticket,
  BookOpen,
  Activity,
  Headphones,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export type ActiveTab =
  | 'overview'
  | 'chat'
  | 'conversations'
  | 'customers'
  | 'orders'
  | 'tickets'
  | 'knowledge'
  | 'workspace'
  | 'analytics'
  | 'evaluation';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onResetData: () => void;
  isResetting: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onResetData,
  isResetting,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'chat', label: 'Customer Chat', icon: MessageSquare, highlight: true },
    { id: 'workspace', label: 'Human Workspace', icon: Headphones, badge: 'Live Queue' },
    { id: 'tickets', label: 'Support Tickets', icon: Ticket },
    { id: 'conversations', label: 'Conversations', icon: Bot },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'analytics', label: 'Agent Telemetry', icon: Activity },
    { id: 'evaluation', label: 'Evaluation Suite', icon: CheckCircle2, badge: 'Tests' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      {/* Top utility row */}
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">SupportPilot</span>
              <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/60">
                Autonomous Agent v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Enterprise Customer Support Orchestration Platform
            </p>
          </div>
        </div>

        {/* Right status & controls */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 rounded-md bg-slate-900/80 border border-slate-800 px-2.5 py-1 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-400">Gemini 3.8 Flash & Embeddings Active</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 rounded-md bg-slate-900/80 border border-slate-800 px-2 py-1 text-xs text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-400">Synthetic Data Verified</span>
          </div>

          <button
            onClick={onResetData}
            disabled={isResetting}
            title="Reset synthetic database to clean initial state"
            className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 text-slate-400 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs row */}
      <div className="flex overflow-x-auto scrollbar-none border-t border-slate-900 px-4 sm:px-6">
        <nav className="flex space-x-1 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as ActiveTab)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider ${
                      isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.highlight && !isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
