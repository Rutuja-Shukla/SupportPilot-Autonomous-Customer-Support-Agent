/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  CheckCircle,
  Truck,
  RotateCcw,
  Clock,
  ChevronRight,
  X,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Order, OrderStatus } from '../types/index.ts';

interface OrdersViewProps {
  onRefreshMetrics: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onRefreshMetrics }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?status=${statusFilter}&limit=210`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const handleManualCancel = async (orderId: string) => {
    setIsActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual support rep override', actor: 'human_rep' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback('Order successfully cancelled and refunded.');
        setSelectedOrder(data.order);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? data.order : o)));
        onRefreshMetrics();
      } else {
        setActionFeedback(`Error: ${data.message || 'Cannot cancel order'}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleManualRefund = async (orderId: string, amount: number) => {
    setIsActionLoading(true);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount, reason: 'Human rep approval', actor: 'human_rep' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(`Refund of $${amount.toFixed(2)} disbursed! (Ref: ${data.refundId})`);
        fetchOrders();
        onRefreshMetrics();
      } else {
        setActionFeedback(`Error: ${data.message || 'Refund failed'}`);
      }
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-400" />
            Order Transactions & Fulfillment Management
            <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
              210 Synthetic Orders
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real order lifecycle tracking, cancellation eligibility validations, and refund authorization workflows.
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
              placeholder="Search by order #, customer name, tracking #..."
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
              <option value="all">All Orders</option>
              <option value="processing">Processing</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="returned">Returned / Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Order #</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Order Date</th>
                <th className="py-3 px-4 font-semibold">Items</th>
                <th className="py-3 px-4 font-semibold">Total Amount</th>
                <th className="py-3 px-4 font-semibold">Fulfillment Status</th>
                <th className="py-3 px-4 font-semibold">Carrier Tracking</th>
                <th className="py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredOrders.map((o) => {
                const statusBadge =
                  o.status === 'delivered'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : o.status === 'shipped'
                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                    : o.status === 'processing'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : o.status === 'cancelled'
                    ? 'bg-red-950 text-red-300 border-red-800'
                    : 'bg-purple-950 text-purple-300 border-purple-800';

                return (
                  <tr
                    key={o.id}
                    onClick={() => {
                      setSelectedOrder(o);
                      setActionFeedback(null);
                    }}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{o.orderNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{o.customerName}</div>
                      <div className="text-[10px] text-slate-400">{o.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {o.items.length} item{o.items.length > 1 ? 's' : ''}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">${o.totalAmount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${statusBadge}`}>
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {o.carrier ? (
                        <div className="font-mono text-[11px] text-slate-300">
                          {o.carrier} ({o.trackingNumber?.slice(-8)})
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Pre-transit</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
                        <span>Inspect</span>
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 text-sm font-bold">{selectedOrder.orderNumber}</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()} by {selectedOrder.customerName}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {actionFeedback && (
                <div className="rounded-lg bg-cyan-950 border border-cyan-800 p-3 text-cyan-200 text-xs">
                  {actionFeedback}
                </div>
              )}

              {/* Items Breakdown */}
              <div>
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Purchased Items</h3>
                <div className="rounded-lg border border-slate-800 bg-slate-950 divide-y divide-slate-800/80">
                  {selectedOrder.items.map((it) => (
                    <div key={it.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{it.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {it.sku} • Qty: {it.quantity}</div>
                      </div>
                      <div className="font-mono font-bold text-white">${(it.unitPrice * it.quantity).toFixed(2)}</div>
                    </div>
                  ))}
                  <div className="p-3 bg-slate-900/50 flex justify-between font-bold text-white">
                    <span>Total Order Amount</span>
                    <span className="text-cyan-400 font-mono">${selectedOrder.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Eligibility Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Cancellation Policy Eligibility</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold">
                    {selectedOrder.cancellationEligibility.eligible ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Eligible for Instant Cancellation
                      </span>
                    ) : (
                      <span className="text-slate-400">Ineligible: {selectedOrder.cancellationEligibility.reason}</span>
                    )}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950 p-3 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Refund Policy Eligibility</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold">
                    {selectedOrder.refundEligibility.eligible ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Eligible (Max: ${selectedOrder.refundEligibility.maxRefundAmount.toFixed(2)})
                      </span>
                    ) : (
                      <span className="text-slate-400">Ineligible: {selectedOrder.refundEligibility.reason}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tracking History */}
              {selectedOrder.trackingHistory && selectedOrder.trackingHistory.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-cyan-400" />
                    Carrier Tracking Telemetry ({selectedOrder.carrier || 'Pending'})
                  </h3>
                  <div className="space-y-2 border-l border-slate-800 ml-2 pl-3">
                    {selectedOrder.trackingHistory.map((ev, idx) => (
                      <div key={idx} className="relative text-[11px]">
                        <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-cyan-400" />
                        <div className="font-semibold text-white">{ev.status} • {ev.location}</div>
                        <div className="text-slate-400 text-[10px]">{ev.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedOrder.cancellationEligibility.eligible && (
                  <button
                    onClick={() => handleManualCancel(selectedOrder.id)}
                    disabled={isActionLoading}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
                  >
                    Execute Cancellation
                  </button>
                )}
                {selectedOrder.refundEligibility.eligible && (
                  <button
                    onClick={() => handleManualRefund(selectedOrder.id, selectedOrder.totalAmount)}
                    disabled={isActionLoading}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition disabled:opacity-50"
                  >
                    Execute Return & Refund
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
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
