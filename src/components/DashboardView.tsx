/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Ticket,
  Clock,
  Star,
  TrendingUp,
  AlertTriangle,
  Shield,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { DashboardMetrics } from '../types/index.ts';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  onNavigateTab: (tab: any) => void;
  isLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  onNavigateTab,
  isLoading,
}) => {
  if (isLoading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading live operational metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Conversations',
      value: metrics.totalConversations,
      change: '+14% vs last week',
      icon: MessageSquare,
      color: 'from-blue-600 to-indigo-600',
    },
    {
      label: 'AI Resolved Autonomously',
      value: metrics.resolvedByAi,
      sub: `${metrics.aiResolutionRate}% resolution rate`,
      icon: Bot,
      color: 'from-cyan-600 to-teal-600',
    },
    {
      label: 'Escalated to Humans',
      value: metrics.escalatedToHumans,
      sub: `${metrics.escalationRate}% escalation rate`,
      icon: UserCheck,
      color: 'from-amber-600 to-orange-600',
    },
    {
      label: 'Open Support Tickets',
      value: metrics.openTickets,
      sub: '4 urgent priority',
      icon: Ticket,
      color: 'from-purple-600 to-pink-600',
    },
    {
      label: 'Avg First Response',
      value: `${metrics.avgFirstResponseTimeSeconds}s`,
      sub: 'Sub-second AI routing',
      icon: Clock,
      color: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'CSAT Customer Rating',
      value: `${metrics.csatScore} / 5.0`,
      sub: 'Based on post-resolution surveys',
      icon: Star,
      color: 'from-yellow-500 to-amber-600',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Banner / Title Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Executive Support Operations Dashboard
            <span className="rounded bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-800">
              Live Production Telemetry
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics computed directly from synthetic multi-customer database transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('chat')}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:bg-cyan-500 transition"
          >
            <Bot className="h-4 w-4" />
            <span>Launch Customer Chat</span>
          </button>
          <button
            onClick={() => onNavigateTab('workspace')}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
          >
            <span>Human Queue</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr ${card.color} text-white shadow-sm`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <p className="mt-1 text-[11px] text-slate-400 truncate">{card.sub || card.change}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversation Volume Trend */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Conversation Volume: Autonomous vs Human Escalation
              </h2>
              <p className="text-xs text-slate-400">Daily support requests handled over the last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
                AI Resolved
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Escalated
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.volumeOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="escGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="aiResolved" stroke="#06b6d4" strokeWidth={2} fill="url(#aiGrad)" name="AI Resolved" />
                <Area type="monotone" dataKey="humanEscalated" stroke="#f59e0b" strokeWidth={2} fill="url(#escGrad)" name="Escalated" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority & Top Request Categories */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white mb-1">Top Customer Request Categories</h2>
            <p className="text-xs text-slate-400 mb-4">Volume distribution by verified intent</p>
            <div className="space-y-2.5">
              {metrics.categoryDistribution.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat.category}</span>
                    <span className="text-slate-400">{cat.count} ({cat.percentage}%)</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${Math.min(100, cat.percentage * 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-semibold uppercase text-slate-400 tracking-wider mb-2">
              Ticket Priority Matrix
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center">
              {metrics.priorityDistribution.map((p, idx) => {
                const colors: Record<string, string> = {
                  Urgent: 'text-red-400 bg-red-950/60 border-red-800',
                  High: 'text-amber-400 bg-amber-950/60 border-amber-800',
                  Medium: 'text-blue-400 bg-blue-950/60 border-blue-800',
                  Low: 'text-slate-400 bg-slate-950/60 border-slate-800',
                };
                return (
                  <div key={idx} className={`rounded-lg border p-2 ${colors[p.priority] || 'border-slate-800'}`}>
                    <div className="text-sm font-bold">{p.count}</div>
                    <div className="text-[10px] uppercase font-semibold">{p.priority}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard and Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Human Representative Leaderboard */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Human Specialist Routing & Resolution</h2>
              <p className="text-xs text-slate-400">Escalated ticket assignment and resolution performance</p>
            </div>
            <button
              onClick={() => onNavigateTab('tickets')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>View Tickets</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="pb-2 font-medium">Specialist</th>
                  <th className="pb-2 font-medium">Assigned</th>
                  <th className="pb-2 font-medium">Resolved</th>
                  <th className="pb-2 font-medium">Avg Time</th>
                  <th className="pb-2 font-medium">CSAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {metrics.agentPerformance.map((ag) => (
                  <tr key={ag.agentId} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-medium text-white flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-cyan-400 border border-slate-700">
                        {ag.name.slice(0, 2).toUpperCase()}
                      </div>
                      {ag.name}
                    </td>
                    <td className="py-2.5">{ag.ticketsAssigned}</td>
                    <td className="py-2.5 text-emerald-400 font-semibold">{ag.ticketsResolved}</td>
                    <td className="py-2.5 text-slate-400">{ag.avgResolutionTimeMinutes}m</td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                        <Star className="h-3 w-3 fill-current" />
                        {ag.csat}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Audit & System Events */}
        <div className="lg:col-span-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                Live Agent Audit & Safety Stream
              </h2>
              <p className="text-xs text-slate-400">Immutable trace of tool calls and policy enforcement</p>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>Full Audit Logs</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {metrics.recentActivity.map((evt) => {
              const severityBadge =
                evt.severity === 'critical'
                  ? 'bg-red-950/80 text-red-300 border-red-800'
                  : evt.severity === 'warning'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : 'bg-slate-800/80 text-cyan-300 border-slate-700';

              return (
                <div
                  key={evt.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-2.5 text-xs transition hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${severityBadge}`}>
                      {evt.eventType.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-slate-300 text-[11px] leading-relaxed">{evt.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
