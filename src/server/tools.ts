/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db.ts';
import { ToolExecutionLog } from '../types/index.ts';

export interface ToolExecutionContext {
  actor: 'ai_agent' | 'human_rep' | 'system';
  customerId?: string;
  conversationId?: string;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// -----------------------------------------------------------------
// In-Memory Idempotency Store for Mutating Operations
// -----------------------------------------------------------------
interface IdempotentRecord {
  result: ToolResult;
  timestamp: number;
  actor: string;
}

export const idempotencyStore = new Map<string, IdempotentRecord>();

export function clearIdempotencyStore(): void {
  idempotencyStore.clear();
}

// -----------------------------------------------------------------
// Cross-Customer Tenant Isolation & Authorization Guard
// -----------------------------------------------------------------
function checkCrossCustomerAccess(
  ownerCustomerId: string,
  ctx: ToolExecutionContext,
  resourceType: string,
  resourceId: string
): boolean {
  if (ctx.actor === 'ai_agent' && ctx.customerId && ctx.customerId !== ownerCustomerId) {
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'policy_violation_prevented',
      severity: 'warning',
      actor: ctx.actor,
      description: `Security boundary: Blocked unauthorized ${resourceType} access for '${resourceId}' belonging to ${ownerCustomerId} from caller ${ctx.customerId}.`,
      metadata: { resourceType, resourceId, ownerId: ownerCustomerId, callerId: ctx.customerId },
    });
    return false;
  }
  return true;
}

// -----------------------------------------------------------------
// Structured Argument Validation Engine
// -----------------------------------------------------------------
export interface ValidationResult {
  valid: boolean;
  validatedArgs: Record<string, any>;
  errors: string[];
}

export function validateToolArguments(
  toolName: string,
  rawArgs: Record<string, any>
): ValidationResult {
  const errors: string[] = [];
  const validatedArgs: Record<string, any> = { ...rawArgs };

  if (!rawArgs || typeof rawArgs !== 'object') {
    return { valid: false, validatedArgs: {}, errors: ['Parameters must be an object'] };
  }

  switch (toolName) {
    case 'get_customer_profile':
    case 'get_customer_orders':
    case 'get_customer_support_history': {
      if (!rawArgs.customerId || typeof rawArgs.customerId !== 'string' || !rawArgs.customerId.trim()) {
        errors.push('customerId is required and must be a non-empty string');
      } else {
        validatedArgs.customerId = rawArgs.customerId.trim();
      }
      if (rawArgs.limit !== undefined) {
        const lim = Number(rawArgs.limit);
        if (isNaN(lim) || lim <= 0 || lim > 50) {
          errors.push('limit must be an integer between 1 and 50');
        } else {
          validatedArgs.limit = Math.floor(lim);
        }
      }
      break;
    }

    case 'get_order_status':
    case 'get_order_details':
    case 'check_cancellation_eligibility':
    case 'check_refund_eligibility':
    case 'get_refund_status': {
      const idOrNum = rawArgs.orderIdOrNumber || rawArgs.orderId;
      if (!idOrNum || typeof idOrNum !== 'string' || !idOrNum.trim()) {
        errors.push('orderId or orderNumber is required and must be a non-empty string');
      } else {
        validatedArgs.orderIdOrNumber = idOrNum.trim();
        validatedArgs.orderId = idOrNum.trim();
      }
      break;
    }

    case 'request_order_cancellation': {
      if (!rawArgs.orderId || typeof rawArgs.orderId !== 'string' || !rawArgs.orderId.trim()) {
        errors.push('orderId is required and must be a non-empty string');
      } else {
        validatedArgs.orderId = rawArgs.orderId.trim();
      }
      if (rawArgs.reason && typeof rawArgs.reason !== 'string') {
        errors.push('reason must be a string if provided');
      } else {
        validatedArgs.reason = (rawArgs.reason || 'Customer cancellation request').trim();
      }
      if (rawArgs.customerConfirmed !== true) {
        errors.push('customerConfirmed must be true to execute consequential order cancellation');
      } else {
        validatedArgs.customerConfirmed = true;
      }
      if (rawArgs.idempotencyKey) {
        validatedArgs.idempotencyKey = String(rawArgs.idempotencyKey).trim();
      }
      break;
    }

    case 'create_refund_request': {
      if (!rawArgs.orderId || typeof rawArgs.orderId !== 'string' || !rawArgs.orderId.trim()) {
        errors.push('orderId is required and must be a non-empty string');
      } else {
        validatedArgs.orderId = rawArgs.orderId.trim();
      }
      const amount = Number(rawArgs.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.push('amount must be a positive number greater than 0');
      } else {
        validatedArgs.amount = +amount.toFixed(2);
      }
      if (rawArgs.customerConfirmed !== true) {
        errors.push('customerConfirmed must be true to execute consequential refund request');
      } else {
        validatedArgs.customerConfirmed = true;
      }
      if (rawArgs.idempotencyKey) {
        validatedArgs.idempotencyKey = String(rawArgs.idempotencyKey).trim();
      }
      break;
    }

    case 'create_support_ticket': {
      if (!rawArgs.customerId || typeof rawArgs.customerId !== 'string' || !rawArgs.customerId.trim()) {
        errors.push('customerId is required');
      }
      if (!rawArgs.subject || typeof rawArgs.subject !== 'string' || !rawArgs.subject.trim()) {
        errors.push('subject is required and must be non-empty');
      }
      if (!rawArgs.description || typeof rawArgs.description !== 'string' || !rawArgs.description.trim()) {
        errors.push('description is required and must be non-empty');
      }
      break;
    }

    case 'update_support_ticket': {
      if (!rawArgs.ticketId || typeof rawArgs.ticketId !== 'string' || !rawArgs.ticketId.trim()) {
        errors.push('ticketId is required');
      }
      break;
    }

    case 'assign_support_ticket': {
      if (!rawArgs.ticketId || typeof rawArgs.ticketId !== 'string') {
        errors.push('ticketId is required');
      }
      if (!rawArgs.agentId || typeof rawArgs.agentId !== 'string') {
        errors.push('agentId is required');
      }
      if (!rawArgs.agentName || typeof rawArgs.agentName !== 'string') {
        errors.push('agentName is required');
      }
      break;
    }

    case 'get_ticket_status': {
      if (!rawArgs.ticketId || typeof rawArgs.ticketId !== 'string' || !rawArgs.ticketId.trim()) {
        errors.push('ticketId is required');
      }
      break;
    }

    case 'search_knowledge_base': {
      if (!rawArgs.query || typeof rawArgs.query !== 'string' || !rawArgs.query.trim()) {
        errors.push('query is required');
      } else {
        validatedArgs.query = rawArgs.query.trim();
      }
      break;
    }

    case 'retrieve_policy_document': {
      const doc = rawArgs.documentIdOrSlug || rawArgs.documentId;
      if (!doc || typeof doc !== 'string' || !doc.trim()) {
        errors.push('documentIdOrSlug is required');
      } else {
        validatedArgs.documentIdOrSlug = doc.trim();
      }
      break;
    }

    default:
      errors.push(`Unknown tool: ${toolName}`);
  }

  return {
    valid: errors.length === 0,
    validatedArgs,
    errors,
  };
}

// -----------------------------------------------------------------
// Helper to log tool execution with latency & structured output
// -----------------------------------------------------------------
function logToolExecution(
  toolName: string,
  parameters: Record<string, any>,
  result: Record<string, any>,
  status: 'success' | 'failed' | 'rejected',
  startTime: number,
  ctx: ToolExecutionContext
) {
  const durationMs = Date.now() - startTime;
  const log: ToolExecutionLog = {
    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    toolName,
    parameters,
    result,
    status,
    durationMs,
    actor: ctx.actor,
    conversationId: ctx.conversationId,
    customerId: ctx.customerId,
  };
  db.addToolLog(log);
}

// =================================================================
// 1. CUSTOMER TOOLS
// =================================================================

export async function get_customer_profile(
  params: { customerId: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  if (!params.customerId || typeof params.customerId !== 'string') {
    const err = 'Invalid customerId parameter';
    logToolExecution('get_customer_profile', params, { error: err }, 'failed', startTime, ctx);
    return { success: false, error: err };
  }

  // Tenant Isolation Security check
  if (!checkCrossCustomerAccess(params.customerId, ctx, 'customer_profile', params.customerId)) {
    const err = 'Security violation: Access to unauthorized customer profile is blocked';
    logToolExecution('get_customer_profile', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const customer = db.getCustomerById(params.customerId);
  if (!customer) {
    const err = `Customer record not found for ID ${params.customerId}`;
    logToolExecution('get_customer_profile', params, { error: err }, 'failed', startTime, ctx);
    return { success: false, error: err };
  }

  const sanitized = {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    tier: customer.tier,
    status: customer.status,
    accountCreatedAt: customer.accountCreatedAt,
    totalSpend: customer.totalSpend,
    ordersCount: customer.ordersCount,
    openTicketsCount: customer.openTicketsCount,
    city: customer.address.city,
    state: customer.address.state,
  };

  logToolExecution('get_customer_profile', params, sanitized, 'success', startTime, ctx);
  return { success: true, data: sanitized };
}

export async function get_customer_orders(
  params: { customerId: string; limit?: number },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  if (!params.customerId) {
    return { success: false, error: 'customerId is required' };
  }

  if (!checkCrossCustomerAccess(params.customerId, ctx, 'customer_orders', params.customerId)) {
    const err = 'Security violation: Access to unauthorized customer orders is blocked';
    logToolExecution('get_customer_orders', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const orders = db.getCustomerOrders(params.customerId);
  const limit = params.limit || 5;
  const recentOrders = orders.slice(0, limit).map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    paymentStatus: o.paymentStatus,
    totalAmount: o.totalAmount,
    currency: o.currency,
    items: o.items.map((it) => `${it.quantity}x ${it.productName} ($${it.unitPrice})`),
    carrier: o.carrier,
    trackingNumber: o.trackingNumber,
    estimatedDeliveryDate: o.estimatedDeliveryDate,
    deliveredDate: o.deliveredDate,
    cancellationEligible: o.cancellationEligibility.eligible,
    refundEligible: o.refundEligibility.eligible,
  }));

  logToolExecution('get_customer_orders', params, { count: recentOrders.length }, 'success', startTime, ctx);
  return { success: true, data: { customerId: params.customerId, orders: recentOrders } };
}

export async function get_customer_support_history(
  params: { customerId: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  if (!params.customerId) {
    return { success: false, error: 'customerId is required' };
  }

  if (!checkCrossCustomerAccess(params.customerId, ctx, 'support_history', params.customerId)) {
    const err = 'Security violation: Access to unauthorized support history is blocked';
    logToolExecution('get_customer_support_history', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const tickets = db.getCustomerTickets(params.customerId);
  const convs = db.getCustomerConversations(params.customerId);

  const history = {
    openTickets: tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed').map((t) => ({
      ticketNumber: t.ticketNumber,
      category: t.category,
      priority: t.priority,
      status: t.status,
      subject: t.subject,
      createdAt: t.createdAt,
    })),
    recentConversations: convs.slice(0, 3).map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status,
      updatedAt: c.updatedAt,
      aiResolved: c.aiResolved,
    })),
  };

  logToolExecution('get_customer_support_history', params, { ticketCount: tickets.length }, 'success', startTime, ctx);
  return { success: true, data: history };
}

// =================================================================
// 2. ORDER TOOLS
// =================================================================

export async function get_order_status(
  params: { orderIdOrNumber: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const orderTarget = params.orderIdOrNumber || (params as any).orderId;
  if (!orderTarget) {
    return { success: false, error: 'orderIdOrNumber is required' };
  }

  const order = db.getOrderByIdOrNumber(orderTarget);
  if (!order) {
    const err = `Order not found matching '${orderTarget}'`;
    logToolExecution('get_order_status', params, { error: err }, 'failed', startTime, ctx);
    return { success: false, error: err };
  }

  if (!checkCrossCustomerAccess(order.customerId, ctx, 'order_status', order.orderNumber)) {
    const err = 'Security violation: Access to unauthorized order is blocked';
    logToolExecution('get_order_status', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const res = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    carrier: order.carrier || 'Not yet dispatched',
    trackingNumber: order.trackingNumber || 'Pending pickup',
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    deliveredDate: order.deliveredDate,
    recentTrackingEvents: order.trackingHistory.slice(-2),
    cancellationEligible: order.cancellationEligibility.eligible,
  };

  logToolExecution('get_order_status', params, res, 'success', startTime, ctx);
  return { success: true, data: res };
}

export async function get_order_details(
  params: { orderIdOrNumber: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const orderTarget = params.orderIdOrNumber || (params as any).orderId;
  if (!orderTarget) {
    return { success: false, error: 'orderIdOrNumber is required' };
  }

  const order = db.getOrderByIdOrNumber(orderTarget);
  if (!order) {
    const err = `Order details not found for '${orderTarget}'`;
    logToolExecution('get_order_details', params, { error: err }, 'failed', startTime, ctx);
    return { success: false, error: err };
  }

  if (!checkCrossCustomerAccess(order.customerId, ctx, 'order_details', order.orderNumber)) {
    const err = 'Security violation: Access to unauthorized order details is blocked';
    logToolExecution('get_order_details', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const data = {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customerName,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    currency: order.currency,
    items: order.items,
    shippingAddress: order.shippingAddress,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    trackingHistory: order.trackingHistory,
    cancellationEligibility: order.cancellationEligibility,
    refundEligibility: order.refundEligibility,
  };

  logToolExecution('get_order_details', params, { orderNumber: order.orderNumber }, 'success', startTime, ctx);
  return { success: true, data };
}

export async function check_cancellation_eligibility(
  params: { orderIdOrNumber: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const orderTarget = params.orderIdOrNumber || (params as any).orderId;
  if (!orderTarget) {
    return { success: false, error: 'orderIdOrNumber is required' };
  }

  const order = db.getOrderByIdOrNumber(orderTarget);
  if (!order) {
    return { success: false, error: `Order '${orderTarget}' was not found.` };
  }

  if (!checkCrossCustomerAccess(order.customerId, ctx, 'cancellation_check', order.orderNumber)) {
    const err = 'Security violation: Access to unauthorized order is blocked';
    logToolExecution('check_cancellation_eligibility', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const isEligible = order.status === 'processing' || order.status === 'confirmed';
  const reason = isEligible
    ? 'Order is currently processing and can be cancelled immediately for a 100% full refund.'
    : `Order status is '${order.status}'. Shipped or delivered orders cannot be cancelled mid-transit. A standard return must be initiated after arrival.`;

  const res = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    currentStatus: order.status,
    eligible: isEligible,
    reason,
    totalAmount: order.totalAmount,
    requiresCustomerConfirmation: true,
  };

  logToolExecution('check_cancellation_eligibility', params, res, 'success', startTime, ctx);
  return { success: true, data: res };
}

export async function request_order_cancellation(
  params: { orderId: string; reason?: string; customerConfirmed: boolean; idempotencyKey?: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  if (!params.orderId) {
    return { success: false, error: 'orderId is required' };
  }

  // Safety safeguard: Explicit confirmation requirement
  if (!params.customerConfirmed) {
    const err = 'Explicit customer confirmation is required before submitting order cancellation.';
    logToolExecution('request_order_cancellation', params, { error: err }, 'rejected', startTime, ctx);
    return {
      success: false,
      error: err,
      metadata: { requiresConfirmation: true, actionType: 'cancel_order', targetId: params.orderId },
    };
  }

  const order = db.getOrderByIdOrNumber(params.orderId);
  if (!order) {
    return { success: false, error: `Order '${params.orderId}' not found.` };
  }

  // Authorization check
  if (!checkCrossCustomerAccess(order.customerId, ctx, 'order_cancellation', order.orderNumber)) {
    const err = 'Security violation: Unauthorized attempt to cancel order belonging to another customer';
    logToolExecution('request_order_cancellation', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  // Idempotency check (Must evaluate before eligibility checks so retransmissions replay cached response)
  const idempotencyKey = params.idempotencyKey || `cancel:${order.id}:${ctx.customerId || order.customerId}`;
  const existing = idempotencyStore.get(idempotencyKey);
  if (existing) {
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'idempotent_replay',
      severity: 'info',
      actor: ctx.actor,
      description: `Idempotency replay: Returned cached result for cancellation of ${order.orderNumber}.`,
      metadata: { idempotencyKey, orderId: order.id },
    });
    logToolExecution('request_order_cancellation', params, { ...existing.result, idempotentReplay: true }, 'success', startTime, ctx);
    return {
      ...existing.result,
      metadata: {
        ...existing.result.metadata,
        idempotentReplay: true,
        idempotencyKey,
      },
    };
  }

  // Eligibility check before mutation
  if (!order.cancellationEligibility.eligible) {
    const err = `Cancellation policy rejection: ${order.cancellationEligibility.reason || 'Order status is ' + order.status}`;
    logToolExecution('request_order_cancellation', params, { error: err }, 'rejected', startTime, ctx);
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'policy_violation_prevented',
      severity: 'warning',
      actor: ctx.actor,
      description: `Blocked unauthorized cancellation attempt on ineligible order ${order.orderNumber}. Reason: ${order.cancellationEligibility.reason}`,
      metadata: { orderId: order.id, status: order.status, reason: order.cancellationEligibility.reason },
    });
    return { success: false, error: err };
  }

  const result = db.cancelOrder(order.id, params.reason || 'Customer request', ctx.actor);
  logToolExecution('request_order_cancellation', params, result, result.success ? 'success' : 'failed', startTime, ctx);

  if (!result.success) {
    return { success: false, error: result.message };
  }

  const response: ToolResult = {
    success: true,
    data: result,
    metadata: { idempotencyKey, idempotentReplay: false },
  };

  idempotencyStore.set(idempotencyKey, {
    result: response,
    timestamp: Date.now(),
    actor: ctx.actor,
  });

  return response;
}

// =================================================================
// 3. REFUND TOOLS
// =================================================================

export async function check_refund_eligibility(
  params: { orderId: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const orderTarget = params.orderId || (params as any).orderIdOrNumber;
  const order = db.getOrderByIdOrNumber(orderTarget);
  if (!order) {
    return { success: false, error: `Order '${orderTarget}' not found.` };
  }

  if (!checkCrossCustomerAccess(order.customerId, ctx, 'refund_check', order.orderNumber)) {
    const err = 'Security violation: Access to unauthorized order is blocked';
    logToolExecution('check_refund_eligibility', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const isDelivered = order.status === 'delivered';
  const daysSinceDelivery = order.deliveredDate
    ? Math.floor((Date.now() - new Date(order.deliveredDate).getTime()) / 86400000)
    : 999;

  let eligible = isDelivered && daysSinceDelivery <= 30;
  let reason = '';
  let requiresHumanApproval = order.totalAmount > 150;

  if (order.paymentStatus === 'refunded') {
    eligible = false;
    reason = `Order ${order.orderNumber} has already been fully refunded. No additional refunds can be processed.`;
  } else if (order.status === 'cancelled') {
    eligible = false;
    reason = `Order ${order.orderNumber} was cancelled and refunded prior to shipment.`;
  } else if (!isDelivered) {
    eligible = false;
    reason = `Order status is '${order.status}'. Refunds for undelivered items are handled through order cancellation or carrier lost package claims.`;
  } else if (daysSinceDelivery > 30) {
    eligible = false;
    reason = `Order was delivered ${daysSinceDelivery} days ago, which exceeds our 30-day return policy window. Warranty repair may apply.`;
  } else {
    reason = `Delivered ${daysSinceDelivery} days ago (within 30-day window). Eligible for return & refund.`;
    if (requiresHumanApproval) {
      reason += ' Note: Order value exceeds $150.00 and requires human supervisor approval.';
    }
  }

  const res = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    deliveredDate: order.deliveredDate,
    daysSinceDelivery: isDelivered ? daysSinceDelivery : null,
    eligible,
    maxRefundAmount: eligible ? order.totalAmount : 0,
    requiresHumanApproval,
    policyReason: reason,
  };

  logToolExecution('check_refund_eligibility', params, res, 'success', startTime, ctx);
  return { success: true, data: res };
}

export async function create_refund_request(
  params: { orderId: string; amount: number; reason?: string; customerConfirmed: boolean; idempotencyKey?: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();

  if (!params.orderId || params.amount === undefined) {
    return { success: false, error: 'orderId and amount are required' };
  }

  if (typeof params.amount !== 'number' || isNaN(params.amount) || params.amount <= 0) {
    const err = 'Invalid refund amount: Amount must be a positive number greater than 0.';
    logToolExecution('create_refund_request', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  // Safety safeguard: Explicit confirmation check
  if (!params.customerConfirmed) {
    const err = 'Explicit customer confirmation is required before issuing a refund.';
    logToolExecution('create_refund_request', params, { error: err }, 'rejected', startTime, ctx);
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'action_confirmation_required',
      severity: 'info',
      actor: ctx.actor,
      description: `Halted unconfirmed refund request for order ${params.orderId}. Required explicit confirmation.`,
      metadata: { orderId: params.orderId, amount: params.amount },
    });
    return {
      success: false,
      error: err,
      metadata: { requiresConfirmation: true, actionType: 'issue_refund', targetId: params.orderId },
    };
  }

  const order = db.getOrderByIdOrNumber(params.orderId);
  if (!order) {
    return { success: false, error: 'Order not found.' };
  }

  // Cross-tenant authorization check
  if (!checkCrossCustomerAccess(order.customerId, ctx, 'refund_request', order.orderNumber)) {
    const err = 'Security violation: Unauthorized attempt to refund order belonging to another customer';
    logToolExecution('create_refund_request', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  // Idempotency check (Evaluate early so retransmissions replay cached receipt)
  const idempotencyKey = params.idempotencyKey || `refund:${order.id}:${params.amount}:${ctx.customerId || order.customerId}`;
  const existing = idempotencyStore.get(idempotencyKey);
  if (existing) {
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'idempotent_replay',
      severity: 'info',
      actor: ctx.actor,
      description: `Idempotency replay: Returned cached result for refund of $${params.amount.toFixed(2)} on ${order.orderNumber}.`,
      metadata: { idempotencyKey, orderId: order.id, amount: params.amount },
    });
    logToolExecution('create_refund_request', params, { ...existing.result, idempotentReplay: true }, 'success', startTime, ctx);
    return {
      ...existing.result,
      metadata: {
        ...existing.result.metadata,
        idempotentReplay: true,
        idempotencyKey,
      },
    };
  }

  // Check if order already refunded or cancelled
  if (order.paymentStatus === 'refunded') {
    const err = `Policy rejection: Order ${order.orderNumber} has already been refunded. Duplicate refunds are prohibited.`;
    logToolExecution('create_refund_request', params, { error: err }, 'rejected', startTime, ctx);
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'policy_violation_prevented',
      severity: 'warning',
      actor: ctx.actor,
      description: `Blocked duplicate refund attempt on order ${order.orderNumber} (already refunded).`,
      metadata: { orderId: order.id, amount: params.amount },
    });
    return { success: false, error: err };
  }

  if (order.status === 'cancelled') {
    const err = `Policy rejection: Order ${order.orderNumber} is cancelled and was already refunded.`;
    logToolExecution('create_refund_request', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  // Check 30-day policy return eligibility
  if (!order.refundEligibility.eligible) {
    const err = `Refund policy rejection: ${order.refundEligibility.reason}`;
    logToolExecution('create_refund_request', params, { error: err }, 'rejected', startTime, ctx);
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'policy_violation_prevented',
      severity: 'warning',
      actor: ctx.actor,
      description: `Blocked ineligible refund request on order ${order.orderNumber}. Reason: ${order.refundEligibility.reason}`,
      metadata: { orderId: order.id, amount: params.amount, reason: order.refundEligibility.reason },
    });
    return { success: false, error: err };
  }

  // Cap refund amount to order total
  if (params.amount > order.totalAmount) {
    const err = `Policy rejection: Refund amount $${params.amount.toFixed(2)} exceeds total order value of $${order.totalAmount.toFixed(2)}.`;
    logToolExecution('create_refund_request', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  // High value threshold rule (> $150)
  if (params.amount > 150 && ctx.actor === 'ai_agent') {
    const ticket = db.createTicket({
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      orderId: order.id,
      category: 'refund_request',
      priority: 'urgent',
      status: 'escalated',
      subject: `Supervisor Approval Required: High-Value Refund ($${params.amount.toFixed(2)}) for ${order.orderNumber}`,
      description: `Customer requested refund of $${params.amount.toFixed(2)}. Reason: ${params.reason || 'Customer return'}. Exceeds autonomous limit ($150).`,
      assignedAgentId: 'agent-01',
      assignedAgentName: 'Alex Rivera (Lead Rep)',
      escalationReason: 'Policy Safeguard: Refund amount exceeds autonomous AI limit ($150).',
    });

    const msg = `Refund of $${params.amount.toFixed(2)} exceeds our autonomous AI approval limit of $150.00. Per company security policy, this has been escalated to Lead Representative Alex Rivera on ticket ${ticket.ticketNumber} for immediate supervisor signoff.`;
    logToolExecution('create_refund_request', params, { escalated: true, ticketNumber: ticket.ticketNumber }, 'success', startTime, ctx);
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'ticket_escalated',
      severity: 'info',
      actor: ctx.actor,
      description: `High-value refund request ($${params.amount.toFixed(2)}) escalated to supervisor Alex Rivera (Ticket: ${ticket.ticketNumber}).`,
      metadata: { orderId: order.id, amount: params.amount, ticketNumber: ticket.ticketNumber },
    });
    return {
      success: false,
      error: msg,
      metadata: { escalatedToHuman: true, ticketNumber: ticket.ticketNumber, ticketId: ticket.id },
    };
  }

  const res = db.processRefund(order.id, params.amount, params.reason || 'Customer refund request', ctx.actor);
  logToolExecution('create_refund_request', params, res, res.success ? 'success' : 'failed', startTime, ctx);

  if (!res.success) {
    return { success: false, error: res.message };
  }

  const response: ToolResult = {
    success: true,
    data: res,
    metadata: { idempotencyKey, idempotentReplay: false },
  };

  idempotencyStore.set(idempotencyKey, {
    result: response,
    timestamp: Date.now(),
    actor: ctx.actor,
  });

  return response;
}

export async function get_refund_status(
  params: { orderId: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const orderTarget = params.orderId || (params as any).orderIdOrNumber;
  const order = db.getOrderByIdOrNumber(orderTarget);
  if (!order) return { success: false, error: 'Order not found.' };

  if (!checkCrossCustomerAccess(order.customerId, ctx, 'refund_status', order.orderNumber)) {
    const err = 'Security violation: Access to unauthorized order is blocked';
    logToolExecution('get_refund_status', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const data = {
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    refundEligibility: order.refundEligibility,
    totalAmount: order.totalAmount,
  };

  logToolExecution('get_refund_status', params, data, 'success', startTime, ctx);
  return { success: true, data };
}

// =================================================================
// 4. SUPPORT TICKET TOOLS
// =================================================================

export async function create_support_ticket(
  params: {
    customerId: string;
    category: any;
    priority: any;
    subject: string;
    description: string;
    orderId?: string;
    escalateToHuman?: boolean;
    escalationReason?: string;
    idempotencyKey?: string;
  },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const customer = db.getCustomerById(params.customerId);
  if (!customer) {
    return { success: false, error: `Customer not found with ID ${params.customerId}` };
  }

  if (!checkCrossCustomerAccess(customer.id, ctx, 'ticket_creation', customer.id)) {
    return { success: false, error: 'Security violation: Cannot create ticket for another customer' };
  }

  const idempotencyKey = params.idempotencyKey || `ticket:${customer.id}:${params.subject}:${ctx.conversationId || 'anon'}`;
  const existing = idempotencyStore.get(idempotencyKey);
  if (existing) {
    logToolExecution('create_support_ticket', params, { ...existing.result, idempotentReplay: true }, 'success', startTime, ctx);
    return {
      ...existing.result,
      metadata: { ...existing.result.metadata, idempotentReplay: true, idempotencyKey },
    };
  }

  const ticket = db.createTicket({
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    category: params.category || 'general_inquiry',
    priority: params.priority || 'medium',
    status: params.escalateToHuman ? 'escalated' : 'open',
    subject: params.subject,
    description: params.description,
    orderId: params.orderId,
    conversationId: ctx.conversationId,
    assignedAgentId: params.escalateToHuman ? 'agent-01' : undefined,
    assignedAgentName: params.escalateToHuman ? 'Alex Rivera (Lead Rep)' : undefined,
    escalationReason: params.escalationReason,
    internalNotes: `Automated creation by ${ctx.actor}. Context: ${params.subject}`,
  });

  const res: ToolResult = {
    success: true,
    data: ticket,
    metadata: { idempotencyKey, idempotentReplay: false },
  };

  idempotencyStore.set(idempotencyKey, {
    result: res,
    timestamp: Date.now(),
    actor: ctx.actor,
  });

  logToolExecution('create_support_ticket', params, { ticketNumber: ticket.ticketNumber }, 'success', startTime, ctx);
  return res;
}

export async function update_support_ticket(
  params: { ticketId: string; status?: any; priority?: any; internalNote?: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const ticket = db.getTicketById(params.ticketId);
  if (!ticket) {
    return { success: false, error: 'Ticket not found.' };
  }

  // Cross-tenant customer check
  if (!checkCrossCustomerAccess(ticket.customerId, ctx, 'ticket_update', ticket.ticketNumber)) {
    const err = 'Security violation: Access to unauthorized ticket is blocked';
    logToolExecution('update_support_ticket', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  // RBAC: Autonomous AI agent cannot close or resolve tickets unilaterally
  if (ctx.actor === 'ai_agent' && (params.status === 'closed' || params.status === 'resolved')) {
    const err = 'Security boundary: Autonomous AI agents cannot close or resolve tickets. Human supervisor signoff required.';
    logToolExecution('update_support_ticket', params, { error: err }, 'rejected', startTime, ctx);
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'policy_violation_prevented',
      severity: 'warning',
      actor: ctx.actor,
      description: `Blocked autonomous ticket closure attempt on ticket ${ticket.ticketNumber} by ai_agent.`,
      metadata: { ticketId: ticket.id, attemptedStatus: params.status },
    });
    return { success: false, error: err };
  }

  const updated = db.updateTicket(params.ticketId, {
    status: params.status,
    priority: params.priority,
  });

  if (params.internalNote && updated) {
    db.addTicketNote(updated.id, {
      author: ctx.actor === 'ai_agent' ? 'Autonomous AI Agent' : 'Human Representative',
      authorRole: ctx.actor === 'ai_agent' ? 'System' : 'Support Specialist',
      text: params.internalNote,
    });
  }

  logToolExecution('update_support_ticket', params, { ticketNumber: updated?.ticketNumber }, 'success', startTime, ctx);
  return { success: true, data: updated };
}

export async function assign_support_ticket(
  params: { ticketId: string; agentId: string; agentName: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();

  // Role check: Only human representatives or system dispatchers can assign tickets
  if (ctx.actor === 'ai_agent') {
    const err = 'Security boundary: Autonomous AI agents are not authorized to assign support tickets to representatives.';
    db.addAuditEvent({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      eventType: 'policy_violation_prevented',
      severity: 'warning',
      actor: ctx.actor,
      description: `Blocked unauthorized ticket assignment attempt for ticket ${params.ticketId} by ai_agent.`,
      metadata: { ticketId: params.ticketId, targetAgent: params.agentName },
    });
    logToolExecution('assign_support_ticket', params, { error: err }, 'rejected', startTime, ctx);
    return { success: false, error: err };
  }

  const updated = db.updateTicket(params.ticketId, {
    assignedAgentId: params.agentId,
    assignedAgentName: params.agentName,
    status: 'in_progress',
  });

  if (!updated) {
    return { success: false, error: 'Ticket not found.' };
  }

  logToolExecution('assign_support_ticket', params, { assignedTo: params.agentName }, 'success', startTime, ctx);
  return { success: true, data: updated };
}

export async function get_ticket_status(
  params: { ticketId: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const ticket = db.getTicketById(params.ticketId);
  if (!ticket) {
    return { success: false, error: 'Ticket not found.' };
  }

  if (!checkCrossCustomerAccess(ticket.customerId, ctx, 'ticket_status', ticket.ticketNumber)) {
    return { success: false, error: 'Security violation: Access to unauthorized ticket is blocked' };
  }

  logToolExecution('get_ticket_status', params, { status: ticket.status }, 'success', startTime, ctx);
  return { success: true, data: ticket };
}

// =================================================================
// 5. KNOWLEDGE TOOLS
// =================================================================

export async function search_knowledge_base(
  params: { query: string; category?: string; limit?: number },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  if (!params.query) {
    return { success: false, error: 'query is required' };
  }

  const articles = db.getKnowledgeArticles(params.category, params.query);
  const limit = params.limit || 3;
  const topArticles = articles.slice(0, limit).map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    summary: a.summary,
    relevantExcerpt: a.content.slice(0, 320) + '...',
  }));

  logToolExecution('search_knowledge_base', params, { matches: topArticles.length }, 'success', startTime, ctx);
  return { success: true, data: { query: params.query, count: topArticles.length, articles: topArticles } };
}

export async function retrieve_policy_document(
  params: { documentIdOrSlug: string },
  ctx: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const target = params.documentIdOrSlug || (params as any).documentId;
  const article = db.getKnowledgeArticleById(target);
  if (!article) {
    return { success: false, error: `Document '${target}' not found.` };
  }

  logToolExecution('retrieve_policy_document', params, { title: article.title }, 'success', startTime, ctx);
  return { success: true, data: article };
}

// =================================================================
// Bounded Retry & Execution Wrapper
// =================================================================
export async function executeToolWithBoundedRetry(
  toolName: keyof typeof toolRegistry,
  params: Record<string, any>,
  ctx: ToolExecutionContext,
  maxRetries = 2,
  timeoutMs = 3000
): Promise<{ result: ToolResult; retryCount: number; durationMs: number }> {
  const startTime = Date.now();
  let retryCount = 0;
  let lastError = 'Unknown error';

  const fn = toolRegistry[toolName];
  if (!fn) {
    return {
      result: { success: false, error: `Tool ${toolName} not found in registry` },
      retryCount: 0,
      durationMs: Date.now() - startTime,
    };
  }

  while (retryCount <= maxRetries) {
    try {
      const callPromise = (fn as any)(params, ctx);
      const timeoutPromise = new Promise<ToolResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool ${toolName} exceeded execution timeout of ${timeoutMs}ms`)), timeoutMs)
      );

      const res = (await Promise.race([callPromise, timeoutPromise])) as ToolResult;
      return {
        result: res,
        retryCount,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      lastError = err.message || 'Transient failure';
      retryCount++;
      if (retryCount <= maxRetries) {
        // Exponential backoff: 30ms, 60ms
        await new Promise((r) => setTimeout(r, retryCount * 30));
      }
    }
  }

  return {
    result: { success: false, error: `Tool ${toolName} failed after ${maxRetries} retries: ${lastError}` },
    retryCount,
    durationMs: Date.now() - startTime,
  };
}

// Tool Registry for Agent Orchestrator
export const toolRegistry = {
  get_customer_profile,
  get_customer_orders,
  get_customer_support_history,
  get_order_status,
  get_order_details,
  check_cancellation_eligibility,
  request_order_cancellation,
  check_refund_eligibility,
  create_refund_request,
  get_refund_status,
  create_support_ticket,
  update_support_ticket,
  assign_support_ticket,
  get_ticket_status,
  search_knowledge_base,
  retrieve_policy_document,
};
