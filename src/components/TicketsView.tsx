/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Filter,
  Plus,
  Search,
  CheckCircle,
  Clock,
  User,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { SupportTicket, TicketStatus, TicketPriority } from '../types/index.ts';

interface TicketsViewProps {
  onRefreshMetrics: () => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ onRefreshMetrics }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      const url = `/api/tickets?status=${statusFilter}&priority=${priorityFilter}&limit=100`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        setSelectedTicket(updated);
        onRefreshMetrics();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (ticketId: string) => {
    if (!newNoteText.trim()) return;

    try {
      const res = await fetch(`/api/tickets/${ticketId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: 'Alex Rivera',
          authorRole: 'Lead Rep',
          text: newNoteText.trim(),
        }),
      });

      if (res.ok) {
        // Refresh ticket details
        const tRes = await fetch(`/api/tickets/${ticketId}`);
        if (tRes.ok) {
          const updated = await tRes.json();
          setSelectedTicket(updated);
          setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
        }
        setNewNoteText('');
      }
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Ticket className="h-5 w-5 text-cyan-400" />
            Support Ticket Operations & Escalation Management
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
              {filteredTickets.length} Tickets
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise support ticket lifecycle with automated intake and human-in-the-loop audit logs.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket #, customer, subject..."
              className="rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 sm:w-72"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="waiting_for_customer">Waiting on Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Ticket #</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Subject</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Assigned Specialist</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTickets.map((t) => {
                const priorityBadge =
                  t.priority === 'urgent'
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : t.priority === 'high'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                    : t.priority === 'medium'
                    ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700';

                const statusBadge =
                  t.status === 'escalated'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : t.status === 'resolved' || t.status === 'closed'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : t.status === 'in_progress'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700';

                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{t.ticketNumber}</td>
                    <td className="py-3 px-4 font-medium text-white">{t.customerName}</td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-200">{t.subject}</td>
                    <td className="py-3 px-4 capitalize text-slate-400">{t.category.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${priorityBadge}`}>
                        {t.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${statusBadge}`}>
                        {t.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {t.assignedAgentName || <span className="text-slate-500 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                        <span>Details</span>
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

      {/* Ticket Detail Drawer Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold text-sm">{selectedTicket.ticketNumber}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300 border border-slate-700">
                    {selectedTicket.priority} Priority
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">{selectedTicket.subject}</h2>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-950 p-3 border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400">Customer:</span>
                  <p className="font-semibold text-white mt-0.5">{selectedTicket.customerName} ({selectedTicket.customerEmail})</p>
                </div>
                <div>
                  <span className="text-slate-400">Assigned Specialist:</span>
                  <p className="font-semibold text-cyan-300 mt-0.5">
                    {selectedTicket.assignedAgentName || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Created:</span>
                  <p className="font-mono text-slate-300 mt-0.5">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Current Status:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value as TicketStatus)}
                      disabled={isUpdating}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="new">New</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="escalated">Escalated</option>
                      <option value="waiting_for_customer">Waiting on Customer</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Description</h3>
                <p className="rounded-lg bg-slate-950/60 p-3 text-slate-200 leading-relaxed border border-slate-800/80">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.escalationReason && (
                <div className="rounded-lg bg-amber-950/40 border border-amber-800/80 p-3 text-amber-200">
                  <span className="font-bold text-[11px]">Escalation Reason:</span>
                  <p className="mt-1 text-[11px]">{selectedTicket.escalationReason}</p>
                </div>
              )}

              {/* Internal Notes History */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Internal Support Audit Notes</span>
                  <span className="text-slate-500 text-[10px]">{selectedTicket.internalNotes.length} notes</span>
                </h3>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedTicket.internalNotes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 text-[11px]">
                      <div className="flex justify-between text-slate-400 text-[10px] mb-1">
                        <span className="font-semibold text-cyan-300">{note.author} ({note.authorRole})</span>
                        <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-200">{note.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Form */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Add internal specialist note (not visible to customer)..."
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleAddNote(selectedTicket.id)}
                    disabled={!newNoteText.trim()}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">SupportPilot Ticket Engine</span>
              <button
                onClick={() => setSelectedTicket(null)}
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
