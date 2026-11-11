/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Package,
  Ticket,
  ChevronRight,
  X,
  ExternalLink,
  MessageSquare,
  Shield,
  Star,
} from 'lucide-react';
import { CustomerProfile, Order, SupportTicket } from '../types/index.ts';

interface CustomersViewProps {
  onSelectCustomerForChat: (customerId: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onSelectCustomerForChat }) => {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerTickets, setCustomerTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [tierFilter]);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`/api/customers?status=${tierFilter}&limit=105`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const handleSelectCustomer = async (cust: CustomerProfile) => {
    setSelectedCustomer(cust);
    try {
      const res = await fetch(`/api/customers/${cust.id}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerOrders(data.orders || []);
        setCustomerTickets(data.tickets || []);
      }
    } catch (err) {
      console.error('Error loading customer details:', err);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.address.city.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            Customer Directory & Context Management
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
              105 Synthetic Customers
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Persisted customer accounts, VIP tiers, and real-time order history for autonomous context retrieval.
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
              placeholder="Search by customer name, email, ID, or city..."
              className="rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64 sm:w-80"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Filter Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Tiers</option>
              <option value="Platinum">Platinum VIP</option>
              <option value="Gold">Gold VIP</option>
              <option value="Standard">Standard</option>
              <option value="at_risk">At Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Customer ID</th>
                <th className="py-3 px-4 font-semibold">Name & Email</th>
                <th className="py-3 px-4 font-semibold">Tier</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Total Lifetime Spend</th>
                <th className="py-3 px-4 font-semibold">Orders</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredCustomers.map((c) => {
                const tierColor =
                  c.tier === 'Platinum'
                    ? 'text-cyan-300 bg-cyan-950/80 border-cyan-800'
                    : c.tier === 'Gold'
                    ? 'text-yellow-300 bg-yellow-950/80 border-yellow-800'
                    : 'text-slate-300 bg-slate-800 border-slate-700';

                return (
                  <tr
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{c.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-400">{c.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${tierColor}`}>
                        {c.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-300">{c.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      ${c.totalSpend.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">{c.ordersCount} orders</td>
                    <td className="py-3 px-4 text-slate-400">
                      {c.address.city}, {c.address.state}
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                        <span>Profile</span>
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

      {/* Customer Profile Modal Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{selectedCustomer.name}</h2>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-slate-700">
                      {selectedCustomer.tier} Tier
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{selectedCustomer.email} • {selectedCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Account Stats */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Customer ID</div>
                  <div className="text-xs font-mono font-bold text-cyan-400 mt-1">{selectedCustomer.id}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Lifetime Spend</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1">${selectedCustomer.totalSpend.toFixed(2)}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Total Orders</div>
                  <div className="text-xs font-bold text-white mt-1">{selectedCustomer.ordersCount}</div>
                </div>
                <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Shipping Address</div>
                  <div className="text-[11px] font-medium text-slate-300 mt-1 truncate">
                    {selectedCustomer.address.street}, {selectedCustomer.address.city}
                  </div>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-cyan-400" />
                  Order History ({customerOrders.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerOrders.length === 0 ? (
                    <p className="text-slate-500 italic">No orders found.</p>
                  ) : (
                    customerOrders.map((o) => (
                      <div key={o.id} className="rounded-lg bg-slate-950 p-3 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-cyan-400">{o.orderNumber}</span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] font-semibold text-slate-300 capitalize">
                              {o.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {o.items.map((it) => it.productName).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-white">${o.totalAmount.toFixed(2)}</div>
                          <div className="text-[10px] text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Support Tickets */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Ticket className="h-3.5 w-3.5 text-cyan-400" />
                  Support Tickets ({customerTickets.length})
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {customerTickets.length === 0 ? (
                    <p className="text-slate-500 italic">No support tickets found for this customer.</p>
                  ) : (
                    customerTickets.map((t) => (
                      <div key={t.id} className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-cyan-400 font-bold">{t.ticketNumber}</span>: {t.subject}
                        </div>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
                          {t.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 flex items-center justify-between">
              <button
                onClick={() => {
                  onSelectCustomerForChat(selectedCustomer.id);
                  setSelectedCustomer(null);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition shadow-sm"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Simulate Support Chat as {selectedCustomer.name.split(' ')[0]}</span>
              </button>
              <button
                onClick={() => setSelectedCustomer(null)}
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
