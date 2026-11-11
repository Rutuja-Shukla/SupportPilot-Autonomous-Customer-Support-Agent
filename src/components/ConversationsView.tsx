/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Search,
  Filter,
  ChevronRight,
  X,
  CheckCircle,
  ExternalLink,
  BookOpen,
  Clock,
} from 'lucide-react';
import { Conversation } from '../types/index.ts';

interface ConversationsViewProps {
  onSelectConversationForChat: (customerId: string) => void;
}

export const ConversationsView: React.FC<ConversationsViewProps> = ({ onSelectConversationForChat }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?status=${statusFilter}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customerName.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.lastMessageSnippet.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-400" />
            Customer Conversation Explorer
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
              {filteredConversations.length} Sessions
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete multi-turn conversation logs with AI intent tags, tool telemetry, and customer transcripts.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations by customer or topic..."
              className="rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64 sm:w-80"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Conversations</option>
              <option value="active">Active Sessions</option>
              <option value="resolved">Resolved by AI</option>
              <option value="escalated">Escalated to Human</option>
            </select>
          </div>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Session ID</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Inquiry Subject</th>
                <th className="py-3 px-4 font-semibold">Latest Snippet</th>
                <th className="py-3 px-4 font-semibold">Resolution Mode</th>
                <th className="py-3 px-4 font-semibold">Last Updated</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredConversations.map((c) => {
                const isEscalated = c.escalated || c.status === 'escalated';
                const isAiResolved = c.aiResolved || (c.status === 'resolved' && !isEscalated);

                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono text-cyan-400 font-medium">{c.id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{c.customerName}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-200">{c.subject}</td>
                    <td className="py-3 px-4 max-w-sm truncate text-slate-400">{c.lastMessageSnippet}</td>
                    <td className="py-3 px-4">
                      {isEscalated ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-800">
                          <UserCheck className="h-3 w-3" />
                          Escalated
                        </span>
                      ) : isAiResolved ? (
                        <span className="inline-flex items-center gap-1 rounded bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-800">
                          <CheckCircle className="h-3 w-3 text-emerald-400" />
                          AI Resolved
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-700">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                        <span>Transcript</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transcript Modal */}
      {selectedConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 text-xs font-bold">{selectedConv.id}</span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-sm font-bold text-white">{selectedConv.customerName}</span>
                </div>
                <h3 className="text-xs text-slate-300 mt-0.5">{selectedConv.subject}</h3>
              </div>
              <button
                onClick={() => setSelectedConv(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-xs">
              {selectedConv.messages.map((m) => {
                const isCustomer = m.sender === 'customer';
                const isRep = m.sender === 'human_rep';

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3.5 space-y-1 ${
                      isCustomer
                        ? 'bg-blue-950/40 border border-blue-900/60 ml-0 mr-12'
                        : isRep
                        ? 'bg-amber-950/40 border border-amber-900/60 ml-12 mr-0'
                        : 'bg-slate-950 border border-slate-800 ml-6 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {isCustomer ? selectedConv.customerName : isRep ? 'Alex Rivera (Lead Rep)' : 'SupportPilot Autonomous Agent'}
                      </span>
                      <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <p className="text-slate-200 leading-relaxed whitespace-pre-line">{m.content}</p>

                    {m.metadata?.toolsExecuted && m.metadata.toolsExecuted.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex flex-wrap gap-1 text-[10px]">
                        {m.metadata.toolsExecuted.map((t, idx) => (
                          <span key={idx} className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-cyan-400 border border-slate-800">
                            {t.toolName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 flex items-center justify-between">
              <button
                onClick={() => {
                  onSelectConversationForChat(selectedConv.customerId);
                  setSelectedConv(null);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition"
              >
                <span>Open in Live Chat as Customer</span>
                <ExternalLink className="h-3 w-3" />
              </button>

              <button
                onClick={() => setSelectedConv(null)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
