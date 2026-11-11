/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Headphones,
  UserCheck,
  AlertTriangle,
  Send,
  CheckCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { Conversation, SupportTicket, CustomerProfile } from '../types/index.ts';

interface HumanWorkspaceViewProps {
  onRefreshMetrics: () => void;
}

export const HumanWorkspaceView: React.FC<HumanWorkspaceViewProps> = ({ onRefreshMetrics }) => {
  const [escalations, setEscalations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);

  useEffect(() => {
    fetchEscalatedConversations();
  }, []);

  const fetchEscalatedConversations = async () => {
    try {
      const res = await fetch('/api/conversations?status=escalated');
      if (res.ok) {
        const data = await res.json();
        const items: Conversation[] = data.items || [];
        setEscalations(items);
        if (items.length > 0 && !selectedConv) {
          selectConversation(items[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching escalations:', err);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    if (conv.associatedTicketId) {
      try {
        const res = await fetch(`/api/tickets/${conv.associatedTicketId}`);
        if (res.ok) {
          const t = await res.json();
          setActiveTicket(t);
        }
      } catch (err) {
        console.error('Error loading ticket:', err);
      }
    } else {
      setActiveTicket(null);
    }
  };

  const handleHumanReply = async () => {
    if (!replyText.trim() || !selectedConv || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedConv.id}/human-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText.trim(),
          agentName: 'Alex Rivera (Lead Rep)',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local messages
        const updated = {
          ...selectedConv,
          messages: [...selectedConv.messages, data.message],
        };
        setSelectedConv(updated);
        setReplyText('');
        onRefreshMetrics();
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveEscalation = async () => {
    if (!selectedConv) return;
    try {
      if (activeTicket) {
        await fetch(`/api/tickets/${activeTicket.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'resolved',
            resolutionNotes: 'Resolved satisfactorily by Lead Rep Alex Rivera in Human Support Workspace.',
          }),
        });
      }

      // Update state
      setEscalations((prev) => prev.filter((c) => c.id !== selectedConv.id));
      if (escalations.length > 1) {
        selectConversation(escalations.find((c) => c.id !== selectedConv.id)!);
      } else {
        setSelectedConv(null);
      }
      onRefreshMetrics();
    } catch (err) {
      console.error('Error resolving escalation:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Headphones className="h-5 w-5 text-amber-400" />
            Human Support Representative Workspace
            <span className="rounded bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-800">
              {escalations.length} Active Escalations
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time escalation queue for high-value refunds, policy exceptions, and customer handoffs.
          </p>
        </div>

        <button
          onClick={fetchEscalatedConversations}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
        >
          Refresh Queue
        </button>
      </div>

      {/* Main Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Escalation Queue Column */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col">
          <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Incoming Escalation Queue</span>
            <span className="text-[10px] text-slate-400">Sorted by Urgency</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
            {escalations.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-300">Escalation Queue Clear</p>
                <p className="text-[11px] text-slate-400 mt-1">All issues currently resolved or handled autonomously.</p>
              </div>
            ) : (
              escalations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`p-3.5 cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-950/30 border-l-4 border-l-amber-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-xs">{conv.customerName}</span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-300 mt-1 truncate">{conv.subject}</p>
                    <p className="text-[10px] text-amber-300/80 mt-1 line-clamp-2">
                      Reason: {conv.escalationReason || 'Policy rule trigger'}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>ID: {conv.id}</span>
                      {conv.associatedTicketId && (
                        <span className="rounded bg-slate-800 px-1 py-0.2 text-cyan-300">
                          {conv.associatedTicketId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Escalation Detail & Action Workspace */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col">
          {selectedConv ? (
            <>
              {/* Detail Header */}
              <div className="border-b border-slate-800 bg-slate-950/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">{selectedConv.customerName}</h2>
                      <span className="rounded bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-800 uppercase">
                        Escalated
                      </span>
                      {activeTicket && (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-cyan-300 border border-slate-700">
                          {activeTicket.ticketNumber} ({activeTicket.priority.toUpperCase()})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedConv.customerEmail}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResolveEscalation}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Resolve & Close Ticket</span>
                    </button>
                  </div>
                </div>

                {/* AI Escalation Context Banner */}
                <div className="mt-3 rounded-lg border border-amber-800/80 bg-amber-950/40 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Agent Escalation Summary & Recommended Next Actions
                  </div>
                  <p className="text-amber-100 text-[11px] leading-relaxed">
                    {selectedConv.escalationReason || 'Policy exception required. Customer awaiting human authorization.'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-slate-300 border border-slate-800">
                      Recommendation: Inspect order tracking & approve supervisor return authorization
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Transcript Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px]">
                {selectedConv.messages.map((m) => {
                  const isCustomer = m.sender === 'customer';
                  const isRep = m.sender === 'human_rep';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col text-xs rounded-xl p-3 ${
                        isCustomer
                          ? 'bg-blue-950/40 border border-blue-900/60 ml-0 mr-12'
                          : isRep
                          ? 'bg-amber-950/40 border border-amber-900/60 ml-12 mr-0'
                          : 'bg-slate-950/60 border border-slate-800/80 ml-6 mr-6'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-semibold text-slate-300">
                          {isCustomer ? selectedConv.customerName : isRep ? 'Alex Rivera (Lead Rep)' : 'SupportPilot AI Agent'}
                        </span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-200 leading-relaxed whitespace-pre-line">{m.content}</p>
                    </div>
                  );
                })}
              </div>

              {/* Human Reply Console */}
              <div className="border-t border-slate-800 bg-slate-950 p-4">
                <div className="text-[11px] font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Reply Directly to Customer as Lead Representative
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official human support response to customer..."
                    disabled={isSending}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleHumanReply();
                    }}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    onClick={handleHumanReply}
                    disabled={!replyText.trim() || isSending}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-500 transition disabled:opacity-40 shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-12 text-center text-slate-400 text-xs">
              Select an escalation from the incoming queue on the left to review telemetry and take action.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
