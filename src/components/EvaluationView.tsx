/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Target,
  Sparkles,
  Search,
  BookOpen,
  FileCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Lock,
  UserCheck,
  CreditCard,
  Ban,
  Activity,
} from 'lucide-react';
import {
  BenchmarkReport,
  EvaluationScenario,
  RAGBenchmarkReport,
  RAGEvaluationScenario,
  SecurityBenchmarkReport,
  SecurityEvaluationScenario,
} from '../types/index.ts';

type ActiveSuite = 'security' | 'rag' | 'agent';

export const EvaluationView: React.FC = () => {
  const [activeSuite, setActiveSuite] = useState<ActiveSuite>('security');

  // Security Suite state
  const [securityScenarios, setSecurityScenarios] = useState<SecurityEvaluationScenario[]>([]);
  const [securityReport, setSecurityReport] = useState<SecurityBenchmarkReport | null>(null);
  const [isSecurityRunning, setIsSecurityRunning] = useState<boolean>(false);
  const [selectedSecurityCategory, setSelectedSecurityCategory] = useState<string>('all');

  // Agent Orchestrator state
  const [agentScenarios, setAgentScenarios] = useState<EvaluationScenario[]>([]);
  const [agentReport, setAgentReport] = useState<BenchmarkReport | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);

  // RAG Pipeline state
  const [ragScenarios, setRagScenarios] = useState<RAGEvaluationScenario[]>([]);
  const [ragReport, setRagReport] = useState<RAGBenchmarkReport | null>(null);
  const [isRagRunning, setIsRagRunning] = useState<boolean>(false);
  const [selectedRagCategory, setSelectedRagCategory] = useState<string>('all');
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  useEffect(() => {
    fetchSecurityScenarios();
    fetchAgentScenarios();
    fetchRagScenarios();
  }, []);

  const fetchSecurityScenarios = async () => {
    try {
      const res = await fetch('/api/security/eval/scenarios');
      if (res.ok) setSecurityScenarios(await res.json());
    } catch (err) {
      console.error('Error fetching security scenarios:', err);
    }
  };

  const fetchAgentScenarios = async () => {
    try {
      const res = await fetch('/api/evaluation/scenarios');
      if (res.ok) setAgentScenarios(await res.json());
    } catch (err) {
      console.error('Error fetching agent scenarios:', err);
    }
  };

  const fetchRagScenarios = async () => {
    try {
      const res = await fetch('/api/rag/eval/scenarios');
      if (res.ok) setRagScenarios(await res.json());
    } catch (err) {
      console.error('Error fetching RAG scenarios:', err);
    }
  };

  const handleRunSecurityBenchmark = async () => {
    setIsSecurityRunning(true);
    try {
      const res = await fetch('/api/security/eval/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSecurityReport(data);
      }
    } catch (err) {
      console.error('Error running security benchmark:', err);
    } finally {
      setIsSecurityRunning(false);
    }
  };

  const handleRunAgentBenchmark = async () => {
    setIsAgentRunning(true);
    try {
      const res = await fetch('/api/evaluation/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAgentReport(data);
      }
    } catch (err) {
      console.error('Error running agent benchmark:', err);
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleRunRagBenchmark = async () => {
    setIsRagRunning(true);
    try {
      const res = await fetch('/api/rag/eval/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRagReport(data);
      }
    } catch (err) {
      console.error('Error running RAG benchmark:', err);
    } finally {
      setIsRagRunning(false);
    }
  };

  const filteredSecurityScenarios = securityScenarios.filter((sc) => {
    if (selectedSecurityCategory === 'all') return true;
    return sc.category === selectedSecurityCategory;
  });

  const filteredRagScenarios = ragScenarios.filter((sc) => {
    if (selectedRagCategory === 'all') return true;
    return sc.category === selectedRagCategory;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Verification, Safety & Regression Evaluation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated evaluation harness for enterprise security boundaries, tenant isolation, RAG grounding, and autonomous agent orchestration.
          </p>
        </div>

        {/* Action button based on active suite */}
        {activeSuite === 'security' && (
          <button
            onClick={handleRunSecurityBenchmark}
            disabled={isSecurityRunning}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50 shadow-md shadow-red-950/40"
          >
            {isSecurityRunning ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Running Security Audit...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Security Audit ({securityScenarios.length || 12} Tests)</span>
              </>
            )}
          </button>
        )}

        {activeSuite === 'rag' && (
          <button
            onClick={handleRunRagBenchmark}
            disabled={isRagRunning}
            className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50 shadow-md shadow-cyan-950/40"
          >
            {isRagRunning ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Evaluating RAG Retrieval...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run RAG Benchmark (10 Tests)</span>
              </>
            )}
          </button>
        )}

        {activeSuite === 'agent' && (
          <button
            onClick={handleRunAgentBenchmark}
            disabled={isAgentRunning}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50 shadow-md shadow-emerald-950/40"
          >
            {isAgentRunning ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                <span>Running Agent Evaluation...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Agent Benchmark (12 Tests)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Suite Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSuite('security')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition ${
            activeSuite === 'security'
              ? 'bg-red-950/60 text-red-300 border border-red-800 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Lock className="h-4 w-4 text-red-400" />
          <span>Security & Authorization Audit</span>
          <span className="rounded bg-red-900/80 px-2 py-0.5 text-[10px] text-red-200">
            {securityScenarios.length || 12} Tests
          </span>
          {securityReport && (
            <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-300 font-mono border border-emerald-800">
              {securityReport.overallSecurityScore}% Passed
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSuite('rag')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition ${
            activeSuite === 'rag'
              ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Search className="h-4 w-4 text-cyan-400" />
          <span>Semantic RAG & Grounding Suite</span>
          <span className="rounded bg-cyan-900/80 px-2 py-0.5 text-[10px] text-cyan-200">
            {ragScenarios.length || 10} Tests
          </span>
          {ragReport && (
            <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-300 font-mono border border-emerald-800">
              {ragReport.overallScore}% Passed
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSuite('agent')}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition ${
            activeSuite === 'agent'
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
          }`}
        >
          <Cpu className="h-4 w-4 text-emerald-400" />
          <span>Agent Orchestration Suite</span>
          <span className="rounded bg-emerald-900/80 px-2 py-0.5 text-[10px] text-emerald-200">
            {agentScenarios.length || 12} Tests
          </span>
          {agentReport && (
            <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] text-emerald-300 font-mono border border-emerald-800">
              {agentReport.overallScore}% Passed
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ENTERPRISE SECURITY & AUTHORIZATION AUDIT */}
      {/* ============================================================== */}
      {activeSuite === 'security' && (
        <div className="space-y-6">
          {/* Security Scorecards */}
          {securityReport ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in">
              <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
                <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
                  Overall Security Score
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{securityReport.overallSecurityScore}%</div>
                <p className="mt-1 text-[11px] text-red-300">
                  {securityReport.passed} / {securityReport.totalTests} boundaries verified
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Tenant Isolation
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{securityReport.tenantIsolationScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Zero cross-account leaks</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Authorization Boundary
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{securityReport.authorizationScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Capped refunds & RBAC enforced</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Anti-Hallucination
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{securityReport.antiHallucinationScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">No false action completion</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                  Audit Log Coverage
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{securityReport.auditCoverageScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Forensic event trail verified</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-red-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-white">Enterprise Security & Authorization Benchmark Loaded</div>
                  <div className="text-slate-400">
                    Exhaustive tests covering tenant isolation, cross-customer tamper resistance, $150 refund ceiling, confirmation enforcement, idempotency replays, and backend failure containment.
                  </div>
                </div>
              </div>
              <button
                onClick={handleRunSecurityBenchmark}
                disabled={isSecurityRunning}
                className="shrink-0 flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Security Audit
              </button>
            </div>
          )}

          {/* Security Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-2">Filter by Boundary:</span>
            {[
              { id: 'all', label: 'All Boundaries (12)' },
              { id: 'tenant_isolation', label: 'Tenant Isolation' },
              { id: 'authorization_boundary', label: 'Authorization & RBAC' },
              { id: 'confirmation_enforcement', label: 'Confirmation Guards' },
              { id: 'refund_safeguard', label: 'Refund Ceilings' },
              { id: 'idempotency_replay', label: 'Idempotency Replay' },
              { id: 'anti_hallucination', label: 'Failure Containment' },
              { id: 'prompt_injection_defense', label: 'Injection Defense' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedSecurityCategory(cat.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  selectedSecurityCategory === cat.id
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Security Scenarios List */}
          <div className="space-y-3">
            {filteredSecurityScenarios.map((sc) => {
              const result = securityReport?.results.find((r) => r.scenarioId === sc.id);

              return (
                <div
                  key={sc.id}
                  className={`rounded-xl border p-4 text-xs transition ${
                    result
                      ? result.passed
                        ? 'border-emerald-800/80 bg-emerald-950/20'
                        : 'border-red-800/80 bg-red-950/20'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-red-400 font-bold">{sc.id}</span>
                        <span className="font-bold text-white text-sm">{sc.name}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-700">
                          {sc.category}
                        </span>
                        <span className="rounded bg-slate-950 px-2 py-0.5 text-[10px] text-amber-300 border border-slate-800 font-mono">
                          Expected: {sc.expectedOutcome}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{sc.description}</p>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 pt-0.5">
                        <span className="text-red-400 font-semibold">Threat Model:</span>
                        <span>{sc.threatModel}</span>
                      </div>
                    </div>

                    {result ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 font-mono text-[11px]">{result.durationMs}ms</span>
                        {result.passed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            SECURE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-red-950 px-2.5 py-1 text-xs font-bold text-red-400 border border-red-800">
                            <XCircle className="h-3.5 w-3.5" />
                            VULNERABLE
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-400 font-mono">
                        PENDING RUN
                      </span>
                    )}
                  </div>

                  {/* Input Payload & Caller Scope */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-slate-950 p-2 border border-slate-800/80">
                      <span className="text-slate-400 font-semibold">Caller Scope: </span>
                      <span className="text-cyan-300 font-mono">{sc.callerCustomerId}</span>
                      <span className="text-slate-400 font-semibold ml-3">Target: </span>
                      <span className="text-amber-300 font-mono">{sc.targetResourceId}</span>
                    </div>
                    <div className="rounded-lg bg-slate-950 p-2 border border-slate-800/80">
                      <span className="text-slate-400 font-semibold">Expected Audit Event: </span>
                      <span className="text-purple-300 font-mono">{sc.expectedAuditEventType}</span>
                    </div>
                  </div>

                  {/* Result Metrics Strip */}
                  {result && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Actual Outcome:</span>
                        <div className="text-white font-bold mt-0.5">{result.actualOutcome}</div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Threat Neutralized:</span>
                        <div
                          className={`font-bold mt-0.5 ${
                            result.threatNeutralized ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {result.threatNeutralized ? 'Yes (Contained)' : 'Failed'}
                        </div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Tampering Prevented:</span>
                        <div
                          className={`font-bold mt-0.5 ${
                            result.unauthorizedTamperingPrevented ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {result.unauthorizedTamperingPrevented ? 'Zero Mutation' : 'Corrupted'}
                        </div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Audit Trail Written:</span>
                        <div
                          className={`font-bold mt-0.5 ${
                            result.auditEventLogged ? 'text-purple-400' : 'text-red-400'
                          }`}
                        >
                          {result.auditEventLogged ? 'Verified in Log' : 'Missing Trail'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detailed Log Summary */}
                  {result && (
                    <div className="mt-2 text-[10px] text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800/60">
                      <span className="text-emerald-400 font-semibold mr-1">Audit Verification:</span>
                      {result.details}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SEMANTIC RAG & GROUNDING SUITE */}
      {/* ============================================================== */}
      {activeSuite === 'rag' && (
        <div className="space-y-6">
          {ragReport ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in">
              <div className="rounded-xl border border-cyan-800 bg-cyan-950/30 p-4">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  Overall RAG Score
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{ragReport.overallScore}%</div>
                <p className="mt-1 text-[11px] text-cyan-300">
                  {ragReport.passed} / {ragReport.totalQueries} tests passed
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Mean Precision@K
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{ragReport.meanPrecisionAtK}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Zero irrelevant clutter</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Mean Recall@K
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{ragReport.meanRecallAtK}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Target policies retrieved</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Unavailable Refusal
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{ragReport.unavailableAccuracy}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Zero hallucinated policies</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                  Anti-Injection Safety
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{ragReport.safetyScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Adversarial chunks neutralized</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-cyan-400 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-white">RAG Evaluation Suite Loaded</div>
                  <div className="text-slate-400">
                    Includes regression tests for outdated documents, conflicting policies, unavailable queries, and adversarial prompt injections.
                  </div>
                </div>
              </div>
              <button
                onClick={handleRunRagBenchmark}
                disabled={isRagRunning}
                className="shrink-0 flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Benchmark
              </button>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-2">Filter by Category:</span>
            {[
              { id: 'all', label: 'All Tests (10)' },
              { id: 'outdated_suppression', label: 'Outdated Suppression' },
              { id: 'conflicting_policies', label: 'Conflicting Policies' },
              { id: 'prompt_injection_defense', label: 'Prompt Injection Defense' },
              { id: 'information_unavailable', label: 'Unavailable Refusal' },
              { id: 'semantic_fact', label: 'Semantic Fact' },
              { id: 'negative_constraint', label: 'Negative Constraint' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedRagCategory(cat.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  selectedRagCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* RAG Scenarios List */}
          <div className="space-y-3">
            {filteredRagScenarios.map((sc) => {
              const result = ragReport?.results.find((r) => r.scenarioId === sc.id);
              const isExpanded = expandedResultId === sc.id;

              return (
                <div
                  key={sc.id}
                  className={`rounded-xl border p-4 text-xs transition ${
                    result
                      ? result.passed
                        ? 'border-emerald-800/80 bg-emerald-950/20'
                        : 'border-red-800/80 bg-red-950/20'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-cyan-400 font-bold">{sc.id}</span>
                        <span className="font-bold text-white text-sm">{sc.name}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-700">
                          {sc.category}
                        </span>
                        {sc.shouldAdmitUnavailable && (
                          <span className="rounded bg-amber-950 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-800 font-semibold">
                            Unavailable Expected
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-[11px]">{sc.description}</p>
                    </div>

                    {result ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 font-mono text-[11px]">{result.durationMs}ms</span>
                        {result.passed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-red-950 px-2.5 py-1 text-xs font-bold text-red-400 border border-red-800">
                            <XCircle className="h-3.5 w-3.5" />
                            FAILED
                          </span>
                        )}
                        <button
                          onClick={() => setExpandedResultId(isExpanded ? null : sc.id)}
                          className="rounded p-1 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <span className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-400 font-mono">
                        PENDING RUN
                      </span>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-950 p-2.5 border border-slate-800/80 text-[11px]">
                    <span className="text-slate-400 font-semibold">Query: </span>
                    <span className="text-slate-200 font-mono italic">"{sc.query}"</span>
                  </div>

                  {result && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Retrieved Articles:</span>
                        <div className="text-cyan-300 font-bold mt-0.5">
                          {result.retrievedArticleIds.length > 0
                            ? result.retrievedArticleIds.join(', ')
                            : 'None (Unavailable Refusal)'}
                        </div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Precision / Recall:</span>
                        <div className="text-white font-bold mt-0.5">
                          P: {result.precisionAtK}% | R: {result.recallAtK}%
                        </div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Outdated Suppressed:</span>
                        <div
                          className={`font-bold mt-0.5 ${
                            result.outdatedSuppressed ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {result.outdatedSuppressed ? 'Yes (Active Verified)' : 'Failed (Outdated Leaked)'}
                        </div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Anti-Injection Safety:</span>
                        <div
                          className={`font-bold mt-0.5 ${
                            result.injectionNeutralized ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {result.injectionNeutralized ? 'Neutralized / Safe' : 'Flagged Vulnerability'}
                        </div>
                      </div>
                    </div>
                  )}

                  {result && isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3">
                      <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-[11px]">
                        <span className="text-cyan-400 font-semibold block mb-1">Generated Grounded Answer:</span>
                        <p className="text-slate-200 leading-relaxed font-sans">{result.generatedAnswer}</p>
                      </div>

                      {result.citations.length > 0 && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                            Verified Source Citations ({result.citations.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {result.citations.map((c, i) => (
                              <div
                                key={i}
                                className="rounded bg-slate-900/90 p-2 border border-slate-800 text-[10px]"
                              >
                                <div className="flex items-center gap-1.5 font-bold text-white">
                                  <FileCheck className="h-3 w-3 text-cyan-400" />
                                  <span>{c.title}</span>
                                </div>
                                <div className="text-slate-400 font-mono mt-0.5">{c.articleId}</div>
                                {c.excerpt && (
                                  <p className="text-slate-300 mt-1 italic line-clamp-2">"{c.excerpt}"</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 italic">{result.details}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: AGENT ORCHESTRATION SUITE */}
      {/* ============================================================== */}
      {activeSuite === 'agent' && (
        <div className="space-y-6">
          {agentReport && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
              <div className="rounded-xl border border-emerald-800 bg-emerald-950/30 p-4">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Overall Benchmark
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{agentReport.overallScore}%</div>
                <p className="mt-1 text-[11px] text-emerald-300">
                  {agentReport.passed} / {agentReport.totalTests} tests passed
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  Intent Accuracy
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{agentReport.intentAccuracyScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Validated against ground truth</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Tool Execution Accuracy
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{agentReport.toolAccuracyScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Strict parameter & role checks</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                  Policy & Safety Score
                </span>
                <div className="mt-1 text-3xl font-bold text-white">{agentReport.safetyScore}%</div>
                <p className="mt-1 text-[11px] text-slate-400">Zero unauthorized actions</p>
              </div>
            </div>
          )}

          {/* Agent Scenario List */}
          <div className="space-y-3">
            {agentScenarios.map((sc) => {
              const result = agentReport?.results.find((r) => r.scenarioId === sc.id);

              return (
                <div
                  key={sc.id}
                  className={`rounded-xl border p-4 text-xs transition ${
                    result
                      ? result.passed
                        ? 'border-emerald-800/80 bg-emerald-950/20'
                        : 'border-red-800/80 bg-red-950/20'
                      : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-bold">{sc.id}</span>
                        <span className="font-bold text-white text-sm">{sc.name}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          {sc.category}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{sc.description}</p>
                    </div>

                    {result ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 font-mono text-[11px]">{result.durationMs}ms</span>
                        {result.passed ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-red-950 px-2.5 py-1 text-xs font-bold text-red-400 border border-red-800">
                            <XCircle className="h-3.5 w-3.5" />
                            FAILED
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-400 font-mono">
                        PENDING RUN
                      </span>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-950 p-2.5 border border-slate-800/80 text-[11px]">
                    <span className="text-slate-400 font-semibold">Test Input: </span>
                    <span className="text-slate-200 italic font-mono">"{sc.customerInput}"</span>
                  </div>

                  {result && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Detected Intent:</span>
                        <div className="text-white font-bold mt-0.5">{result.detectedIntent}</div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Tools Called:</span>
                        <div className="text-cyan-300 font-bold mt-0.5">
                          {result.toolsExecuted.length > 0 ? result.toolsExecuted.join(', ') : 'None (Correct)'}
                        </div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Escalated:</span>
                        <div className="text-white font-bold mt-0.5">
                          {result.escalatedCorrectly ? 'Correct' : 'Failed'}
                        </div>
                      </div>
                      <div className="rounded bg-slate-900 p-2 border border-slate-800">
                        <span className="text-slate-400">Safety & Grounding:</span>
                        <div className="text-emerald-400 font-bold mt-0.5">
                          {result.hallucinationFree ? 'No Hallucinations' : 'Flagged'}
                        </div>
                      </div>
                    </div>
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
