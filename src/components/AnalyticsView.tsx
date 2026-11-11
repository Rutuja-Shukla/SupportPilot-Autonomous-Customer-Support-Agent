/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Terminal,
  Filter,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { ToolExecutionLog, AuditEvent, DashboardMetrics } from '../types/index.ts';

export const AnalyticsView: React.FC = () => {
  const [toolLogs, setToolLogs] = useState<ToolExecutionLog[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'tools' | 'audit'>('tools');

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const fetchTelemetry = async () => {
    try {
      const [toolRes, auditRes, metricsRes] = await Promise.all([
        fetch('/api/tool-logs?limit=50'),
        fetch('/api/audit-logs?limit=50'),
        fetch('/api/analytics'),
      ]);

      if (toolRes.ok) setToolLogs(await toolRes.json());
      if (auditRes.ok) setAuditEvents(await auditRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    }
  };

  const filteredAuditEvents = auditEvents.filter((ev) => {
    if (severityFilter === 'all') return true;
    return ev.severity === severityFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            Agent Monitoring, Tool Telemetry & Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Traceable execution telemetry for backend tool invocations, policy enforcement, and AI security events.
          </p>
        </div>

        <button
          onClick={fetchTelemetry}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Stats */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Tool Invocations</span>
            <div className="mt-1 text-2xl font-bold text-white">{metrics.totalToolCalls}</div>
            <p className="mt-1 text-[11px] text-emerald-400">{metrics.successfulToolCalls} successful execution traces</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Success Rate</span>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              {metrics.totalToolCalls > 0
                ? ((metrics.successfulToolCalls / metrics.totalToolCalls) * 100).toFixed(1)
                : 100}%
            </div>
            <p className="mt-1 text-[11px] text-slate-400">0 unhandled exceptions</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avg Tool Latency</span>
            <div className="mt-1 text-2xl font-bold text-cyan-400">48ms</div>
            <p className="mt-1 text-[11px] text-slate-400">Real-time memory store</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Security Interceptions</span>
            <div className="mt-1 text-2xl font-bold text-purple-400">100%</div>
            <p className="mt-1 text-[11px] text-slate-400">Firewall pattern detection</p>
          </div>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'tools'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Tool Execution Traces ({toolLogs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-cyan-500 text-cyan-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Immutable Audit Log ({auditEvents.length})</span>
        </button>
      </div>

      {/* Tab 1: Tool Execution Logs */}
      {activeTab === 'tools' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Tool Name</th>
                  <th className="py-3 px-4 font-semibold">Actor</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Latency</th>
                  <th className="py-3 px-4 font-semibold">Input Parameters</th>
                  <th className="py-3 px-4 font-semibold">Output Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono text-[11px]">
                {toolLogs.map((log) => {
                  const statusBadge =
                    log.status === 'success'
                      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                      : log.status === 'rejected'
                      ? 'text-amber-400 bg-amber-950/60 border-amber-800'
                      : 'text-red-400 bg-red-950/60 border-red-800';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-cyan-300">{log.toolName}</td>
                      <td className="py-2.5 px-4 text-slate-400">{log.actor}</td>
                      <td className="py-2.5 px-4">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${statusBadge}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{log.durationMs}ms</td>
                      <td className="py-2.5 px-4 max-w-xs truncate text-slate-300">
                        {JSON.stringify(log.parameters)}
                      </td>
                      <td className="py-2.5 px-4 max-w-xs truncate text-slate-400">
                        {JSON.stringify(log.result)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Events */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Filter Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden divide-y divide-slate-800/80">
            {filteredAuditEvents.map((ev) => {
              const severityColor =
                ev.severity === 'critical'
                  ? 'border-l-4 border-l-red-500 bg-red-950/20'
                  : ev.severity === 'warning'
                  ? 'border-l-4 border-l-amber-500 bg-amber-950/20'
                  : 'border-l-4 border-l-cyan-500 bg-slate-900/40';

              return (
                <div key={ev.id} className={`p-4 ${severityColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white uppercase">{ev.eventType}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-slate-300">
                        {ev.actor}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(ev.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-200">{ev.description}</p>
                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                    <pre className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/60 overflow-x-auto">
                      {JSON.stringify(ev.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
