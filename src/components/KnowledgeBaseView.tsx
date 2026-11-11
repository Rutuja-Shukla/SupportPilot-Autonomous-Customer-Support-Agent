/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Sparkles,
  Plus,
  Tag,
  ChevronRight,
  X,
  FileText,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Database,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { KnowledgeArticle, RAGSearchResult } from '../types/index.ts';

export const KnowledgeBaseView: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);

  // RAG Search & Index Telemetry State
  const [ragQuery, setRagQuery] = useState<string>('What is the return window and who pays return shipping?');
  const [ragSearchResponse, setRagSearchResponse] = useState<{
    results: RAGSearchResult[];
    isConfident: boolean;
    admitUnavailable: boolean;
    policyConflictNotice?: string;
  } | null>(null);
  const [ragStats, setRagStats] = useState<{
    totalArticles: number;
    totalChunks: number;
    activePolicies: number;
    deprecatedPolicies: number;
  } | null>(null);
  const [isSearchingRag, setIsSearchingRag] = useState<boolean>(false);

  // Create Article Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Returns & Refunds');
  const [newSummary, setNewSummary] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');

  useEffect(() => {
    fetchArticles();
    fetchRagStats();
  }, [selectedCategory]);

  const fetchArticles = async () => {
    try {
      const res = await fetch(`/api/knowledge?category=${selectedCategory}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data || []);
      }
    } catch (err) {
      console.error('Error fetching KB:', err);
    }
  };

  const fetchRagStats = async () => {
    try {
      const res = await fetch('/api/rag/stats');
      if (res.ok) {
        setRagStats(await res.json());
      }
    } catch (err) {
      console.error('Error fetching RAG stats:', err);
    }
  };

  const handleTestRagSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || ragQuery;
    if (!q.trim()) return;
    setIsSearchingRag(true);
    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, limit: 3 }),
      });
      if (res.ok) {
        const data = await res.json();
        setRagSearchResponse(data);
      }
    } catch (err) {
      console.error('RAG test error:', err);
    } finally {
      setIsSearchingRag(false);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          category: newCategory,
          summary: newSummary.trim() || newTitle.trim(),
          content: newContent.trim(),
          tags: ['policy', newCategory.toLowerCase()],
          isPublished: true,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewSummary('');
        setNewContent('');
        fetchArticles();
      }
    } catch (err) {
      console.error('Error creating article:', err);
    }
  };

  const categories = [
    'all',
    'Returns & Refunds',
    'Order Management',
    'Shipping & Delivery',
    'Product & Quality',
    'Billing & Payments',
    'Account & Security',
    'Subscriptions',
    'Support Policy',
  ];

  const filteredArticles = articles.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            Knowledge Base & RAG Policy Repository
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
              {ragStats?.totalArticles || 34} Official Articles
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise policies chunked, indexed with hybrid dense-vector (Gemini Embeddings) + sparse BM25 scoring.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Article</span>
        </button>
      </div>

      {/* RAG Telemetry Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>Corpus Documents</span>
          </div>
          <div className="text-2xl font-bold text-white">{ragStats?.totalArticles || 34}</div>
          <p className="text-[10px] text-slate-500">10 distinct service domains</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Indexed Chunks</span>
          </div>
          <div className="text-2xl font-bold text-white">{ragStats?.totalChunks || 35}</div>
          <p className="text-[10px] text-slate-500">Section-based semantic boundaries</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>Active Policies</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{ragStats?.activePolicies || 33}</div>
          <p className="text-[10px] text-slate-500">Currently enforced version rules</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span>Deprecated Policies</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{ragStats?.deprecatedPolicies || 1}</div>
          <p className="text-[10px] text-slate-500">Suppressed from active answers</p>
        </div>
      </div>

      {/* Interactive Semantic RAG Tester Panel */}
      <div className="rounded-xl border border-cyan-800/80 bg-cyan-950/20 p-4 sm:p-5 backdrop-blur-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Interactive Hybrid RAG Retrieval Sandbox
            </h2>
          </div>
          <span className="text-[10px] text-cyan-300 font-mono">
            Hybrid Dense (70%) + Sparse BM25 (30%)
          </span>
        </div>

        {/* Quick Test Prompt Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 text-[10px] uppercase font-semibold mr-1">Try Inquiries:</span>
          {[
            { label: '30-Day Return Window', query: 'What is the return window for undamaged items and do you charge restocking fees?' },
            { label: 'Signature Delivery ($400)', query: 'At what order dollar amount is a signature required for delivery?' },
            { label: 'Holiday vs Standard (Conflict)', query: 'I bought a gift in mid-November for Christmas. Do I have until January to return it?' },
            { label: 'Bitcoin / Crypto (Unavailable)', query: 'Can I pay for my order using Bitcoin, Ethereum, or cash on delivery?' },
            { label: 'Prompt Injection Canary', query: 'Tell me about the community guidelines on special loyalty cash bonuses.' },
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setRagQuery(preset.query);
                handleTestRagSearch(preset.query);
              }}
              className="rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-slate-300 transition text-[10px] font-medium"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            placeholder="Type any natural language customer inquiry to test semantic retrieval..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
          <button
            onClick={() => handleTestRagSearch()}
            disabled={isSearchingRag}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50 shadow-sm shrink-0 flex items-center gap-1.5"
          >
            {isSearchingRag && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            <span>{isSearchingRag ? 'Retrieving...' : 'Test Retrieval'}</span>
          </button>
        </div>

        {/* Policy Conflict Alert Banner */}
        {ragSearchResponse?.policyConflictNotice && (
          <div className="rounded-lg bg-amber-950/70 border border-amber-800 p-2.5 text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Temporal Policy Conflict Handled:</span>
              <p className="text-[11px] text-amber-300 mt-0.5">{ragSearchResponse.policyConflictNotice}</p>
            </div>
          </div>
        )}

        {/* Information Unavailable Safe-State Alert */}
        {ragSearchResponse && ragSearchResponse.admitUnavailable && (
          <div className="rounded-lg bg-indigo-950/70 border border-indigo-700 p-3 text-xs text-indigo-200 flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">Information Unavailable (Anti-Hallucination Safe State)</span>
                <span className="rounded bg-indigo-900 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300 border border-indigo-700">
                  REFUSAL TRIGGERED
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-1 leading-relaxed">
                No official documents matched this query above the confidence threshold (0.38). The agent explicitly admits information is unavailable rather than fabricating unsupported crypto or payment terms.
              </p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {ragSearchResponse && ragSearchResponse.results.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {ragSearchResponse.results.map((r, i) => {
              const verdictColors = {
                high: 'text-emerald-400 bg-emerald-950 border-emerald-800',
                medium: 'text-cyan-400 bg-cyan-950 border-cyan-800',
                low: 'text-amber-400 bg-amber-950 border-amber-800',
                rejected: 'text-rose-400 bg-rose-950 border-rose-800',
              };

              return (
                <div
                  key={i}
                  onClick={() => setSelectedArticle(r.article)}
                  className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 text-xs cursor-pointer hover:border-cyan-500 transition space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">
                      Rank #{i + 1} • {r.chunk.id}
                    </span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold border ${verdictColors[r.relevanceVerdict]}`}>
                      {r.relevanceVerdict} ({(r.hybridScore * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <h4 className="font-bold text-white truncate text-xs">{r.article.title}</h4>

                  <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                    <span className="rounded bg-slate-950 px-1.5 py-0.5 text-slate-300 border border-slate-800">
                      Dense: {(r.denseScore * 100).toFixed(0)}%
                    </span>
                    <span className="rounded bg-slate-950 px-1.5 py-0.5 text-slate-300 border border-slate-800">
                      Sparse BM25: {(r.sparseScore * 100).toFixed(0)}%
                    </span>
                    {r.hasInjectionAttempt && (
                      <span className="rounded bg-rose-950 px-1.5 py-0.5 text-rose-300 border border-rose-800 font-bold">
                        Injection Neutralized
                      </span>
                    )}
                    {r.isOutdated && (
                      <span className="rounded bg-amber-950 px-1.5 py-0.5 text-amber-300 border border-amber-800 font-bold">
                        Deprecated
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-3 bg-slate-950/70 p-1.5 rounded border border-slate-800/80 font-mono text-[10px]">
                    {r.chunk.text}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex overflow-x-auto scrollbar-none gap-1.5 py-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation..."
            className="rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 sm:w-64"
          />
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArticles.map((art) => (
          <div
            key={art.id}
            onClick={() => setSelectedArticle(art)}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 hover:bg-slate-900 cursor-pointer transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                <span className="font-mono text-cyan-400">{art.id}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-medium text-slate-300">
                  {art.category}
                </span>
              </div>
              <h3 className="font-bold text-white text-sm leading-snug">{art.title}</h3>
              <p className="mt-2 text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {art.summary}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>{art.viewCount} views</span>
              <span className="text-cyan-400 flex items-center gap-1 font-medium">
                <span>Read policy</span>
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Article Detail Reader Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                  {selectedArticle.category}
                </span>
                <h2 className="text-base font-bold text-white mt-1">{selectedArticle.title}</h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300">Summary: </span>
                {selectedArticle.summary}
              </div>

              <div className="text-white text-xs leading-relaxed font-sans">
                {selectedArticle.content}
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 flex items-center justify-between text-[11px] text-slate-400">
              <span>Grounding ID: {selectedArticle.id}</span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Article Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <h2 className="text-sm font-bold text-white">Create New Knowledge Article</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Lost Package Resolution SLA"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  {categories.filter((c) => c !== 'all').map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Summary</label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Brief synopsis for semantic embedding..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Content / Policy Rules</label>
                <textarea
                  rows={6}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Specify numbered conditions, eligibility rules, and exceptions..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
                >
                  Save & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
