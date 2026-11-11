/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CustomerProfile,
  Order,
  SupportTicket,
  KnowledgeArticle,
  Conversation,
  ChatMessage,
  AuditEvent,
  ToolExecutionLog,
  DashboardMetrics,
} from '../types/index.ts';
import {
  generateSyntheticCustomers,
  generateSyntheticOrders,
  generateSyntheticTickets,
  generateSyntheticConversations,
  initialKnowledgeArticles,
  initialAuditEvents,
  initialToolLogs,
} from './seedData.ts';

class DatabaseStore {
  public customers: CustomerProfile[] = [];
  public orders: Order[] = [];
  public tickets: SupportTicket[] = [];
  public knowledgeArticles: KnowledgeArticle[] = [];
  public conversations: Conversation[] = [];
  public auditEvents: AuditEvent[] = [];
  public toolLogs: ToolExecutionLog[] = [];

  constructor() {
    this.seed();
  }

  public seed() {
    this.customers = generateSyntheticCustomers();
    this.orders = generateSyntheticOrders(this.customers);
    this.tickets = generateSyntheticTickets(this.customers, this.orders);
    this.knowledgeArticles = [...initialKnowledgeArticles];
    this.conversations = generateSyntheticConversations(this.customers, this.orders);
    this.auditEvents = [...initialAuditEvents];
    this.toolLogs = [...initialToolLogs];
  }

  // --- Customers ---
  public getCustomers(search?: string, status?: string, limit = 50, offset = 0) {
    let list = this.customers;
    if (status && status !== 'all') {
      list = list.filter((c) => c.status === status || c.tier.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  public getCustomerById(id: string): CustomerProfile | undefined {
    return this.customers.find((c) => c.id === id || c.email.toLowerCase() === id.toLowerCase());
  }

  public getCustomerOrders(customerId: string): Order[] {
    return this.orders
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCustomerTickets(customerId: string): SupportTicket[] {
    return this.tickets
      .filter((t) => t.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getCustomerConversations(customerId: string): Conversation[] {
    return this.conversations
      .filter((c) => c.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Orders ---
  public getOrders(search?: string, status?: string, limit = 50, offset = 0) {
    let list = this.orders;
    if (status && status !== 'all') {
      list = list.filter((o) => o.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q))
      );
    }
    const total = list.length;
    const items = list.slice(offset, offset + limit);
    return { items, total };
  }

  public getOrderByIdOrNumber(idOrNum: string): Order | undefined {
    const q = idOrNum.trim().toUpperCase();
    return this.orders.find(
      (o) =>
        o.id.toUpperCase() === q ||
        o.orderNumber.toUpperCase() === q ||
        (o.trackingNumber && o.trackingNumber.toUpperCase() === q)
    );
  }

  public cancelOrder(orderId: string, reason: string, actor: 'ai_agent' | 'human_rep' | 'system'): { success: boolean; message: string; order?: Order } {
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      return { success: false, message: `Order not found with identifier ${orderId}` };
    }

    if (!order.cancellationEligibility.eligible) {
      return {
        success: false,
        message: `Order cannot be cancelled: ${order.cancellationEligibility.reason || 'Status is ' + order.status}`,
      };
    }

    order.status = 'cancelled';
    order.paymentStatus = 'refunded';
    order.cancellationEligibility = {
      eligible: false,
      reason: 'Order has already been cancelled.',
    };
    order.refundEligibility = {
      eligible: false,
      reason: 'Order cancelled and fully refunded before shipment.',
      maxRefundAmount: 0,
    };
    order.trackingHistory.push({
      timestamp: new Date().toISOString(),
      status: 'Cancelled',
      location: 'Central Order Routing',
      details: `Cancellation executed by ${actor}. Reason: ${reason}`,
    });

    this.addAuditEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'order_cancelled',
      severity: 'info',
      actor,
      description: `Order ${order.orderNumber} successfully cancelled by ${actor}. Reason: ${reason}`,
      metadata: { orderId: order.id, refundAmount: order.totalAmount, reason },
    });

    return { success: true, message: `Order ${order.orderNumber} has been successfully cancelled and fully refunded.`, order };
  }

  // --- Refunds ---
  public processRefund(orderId: string, amount: number, reason: string, actor: 'ai_agent' | 'human_rep' | 'system'): { success: boolean; message: string; refundId?: string } {
    const order = this.orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    // High value rule: > $150 requires human supervisor signoff
    if (amount > 150 && actor === 'ai_agent') {
      return {
        success: false,
        message: `Refund of $${amount.toFixed(2)} exceeds automated threshold of $150.00. Human supervisor authorization is mandatory per company policy.`,
      };
    }

    if (!order.refundEligibility.eligible) {
      return {
        success: false,
        message: `Order is not eligible for refund: ${order.refundEligibility.reason}`,
      };
    }

    const refundId = `RFND-${Date.now().toString().slice(-6)}`;
    order.paymentStatus = amount >= order.totalAmount ? 'refunded' : 'partially_refunded';
    order.status = 'returned';
    order.refundEligibility = {
      eligible: false,
      reason: `Refund already processed (Ref: ${refundId}).`,
      maxRefundAmount: 0,
    };

    this.addAuditEvent({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      eventType: 'refund_issued',
      severity: 'info',
      actor,
      description: `Refund of $${amount.toFixed(2)} issued for order ${order.orderNumber}. Ref: ${refundId}.`,
      metadata: { orderId: order.id, refundId, amount, reason },
    });

    return { success: true, message: `Refund of $${amount.toFixed(2)} successfully disbursed (Ref: ${refundId}).`, refundId };
  }

  // --- Support Tickets ---
  public getTickets(status?: string, priority?: string, category?: string, limit = 50, offset = 0) {
    let list = this.tickets;
    if (status && status !== 'all') {
      list = list.filter((t) => t.status === status);
    }
    if (priority && priority !== 'all') {
      list = list.filter((t) => t.priority === priority);
    }
    if (category && category !== 'all') {
      list = list.filter((t) => t.category === category);
    }
    const total = list.length;
    const items = list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
    return { items, total };
  }

  public getTicketById(id: string): SupportTicket | undefined {
    return this.tickets.find((t) => t.id === id || t.ticketNumber === id);
  }

  public createTicket(data: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'internalNotes'> & { internalNotes?: string }): SupportTicket {
    const id = `tkt-${3000 + this.tickets.length + 1}`;
    const ticketNumber = `SP-TKT-${3000 + this.tickets.length + 1}`;
    const now = new Date().toISOString();

    const newTicket: SupportTicket = {
      id,
      ticketNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      conversationId: data.conversationId,
      orderId: data.orderId,
      category: data.category,
      priority: data.priority,
      status: data.status || 'open',
      subject: data.subject,
      description: data.description,
      assignedAgentId: data.assignedAgentId,
      assignedAgentName: data.assignedAgentName,
      createdAt: now,
      updatedAt: now,
      internalNotes: data.internalNotes
        ? [
            {
              id: `note-${Date.now()}`,
              author: 'Autonomous Dispatch Engine',
              authorRole: 'System',
              text: data.internalNotes,
              createdAt: now,
            },
          ]
        : [],
      escalationReason: data.escalationReason,
    };

    this.tickets.unshift(newTicket);

    this.addAuditEvent({
      id: `audit-${Date.now()}`,
      timestamp: now,
      eventType: data.status === 'escalated' ? 'ticket_escalated' : 'tool_execution',
      severity: data.priority === 'urgent' ? 'warning' : 'info',
      actor: 'ai_agent',
      description: `Support ticket ${ticketNumber} created: "${data.subject}" (Priority: ${data.priority})`,
      metadata: { ticketId: id, customerId: data.customerId, category: data.category },
    });

    return newTicket;
  }

  public updateTicket(id: string, partial: Partial<SupportTicket>): SupportTicket | undefined {
    const ticket = this.tickets.find((t) => t.id === id || t.ticketNumber === id);
    if (!ticket) return undefined;

    Object.assign(ticket, partial, { updatedAt: new Date().toISOString() });
    if (partial.status === 'resolved' || partial.status === 'closed') {
      ticket.resolvedAt = new Date().toISOString();
    }
    return ticket;
  }

  public addTicketNote(ticketId: string, note: { author: string; authorRole: string; text: string }): boolean {
    const ticket = this.tickets.find((t) => t.id === ticketId || t.ticketNumber === ticketId);
    if (!ticket) return false;

    ticket.internalNotes.push({
      id: `note-${Date.now()}`,
      author: note.author,
      authorRole: note.authorRole,
      text: note.text,
      createdAt: new Date().toISOString(),
    });
    ticket.updatedAt = new Date().toISOString();
    return true;
  }

  // --- Knowledge Base ---
  public getKnowledgeArticles(category?: string, search?: string): KnowledgeArticle[] {
    let list = this.knowledgeArticles;
    if (category && category !== 'all') {
      list = list.filter((a) => a.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }

  public getKnowledgeArticleById(id: string): KnowledgeArticle | undefined {
    return this.knowledgeArticles.find((a) => a.id === id || a.slug === id);
  }

  public createKnowledgeArticle(article: Omit<KnowledgeArticle, 'id' | 'updatedAt' | 'version' | 'viewCount'>): KnowledgeArticle {
    const id = `kb-${String(this.knowledgeArticles.length + 1).padStart(3, '0')}`;
    const newArt: KnowledgeArticle = {
      ...article,
      id,
      updatedAt: new Date().toISOString(),
      version: 1,
      viewCount: 0,
    };
    this.knowledgeArticles.unshift(newArt);
    return newArt;
  }

  // --- Conversations ---
  public getConversations(status?: string, limit = 50, offset = 0) {
    let list = this.conversations;
    if (status && status !== 'all') {
      list = list.filter((c) => c.status === status);
    }
    const total = list.length;
    const items = list
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(offset, offset + limit);
    return { items, total };
  }

  public getConversationById(id: string): Conversation | undefined {
    return this.conversations.find((c) => c.id === id);
  }

  public createConversation(customerId: string, subject?: string): Conversation {
    const cust = this.getCustomerById(customerId) || this.customers[0];
    const id = `conv-${Date.now()}`;
    const now = new Date().toISOString();

    const conv: Conversation = {
      id,
      customerId: cust.id,
      customerName: cust.name,
      customerEmail: cust.email,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      subject: subject || 'Support Inquiry',
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          conversationId: id,
          sender: 'agent',
          content: `Hello ${cust.name.split(' ')[0]}! I'm SupportPilot, your autonomous customer support assistant. How can I assist you with your orders, tracking, refunds, or product questions today?`,
          timestamp: now,
        },
      ],
      lastMessageSnippet: 'SupportPilot ready to assist.',
      escalated: false,
      aiResolved: false,
      tags: ['new-session'],
    };

    this.conversations.unshift(conv);
    return conv;
  }

  public addMessage(conversationId: string, message: Omit<ChatMessage, 'id' | 'conversationId' | 'timestamp'> & { timestamp?: string }): ChatMessage {
    const conv = this.getConversationById(conversationId);
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = message.timestamp || new Date().toISOString();

    const fullMessage: ChatMessage = {
      id: msgId,
      conversationId,
      sender: message.sender,
      content: message.content,
      timestamp: now,
      metadata: message.metadata,
    };

    if (conv) {
      conv.messages.push(fullMessage);
      conv.updatedAt = now;
      conv.lastMessageSnippet = message.content.slice(0, 90);

      if (message.metadata?.escalatedToHuman) {
        conv.escalated = true;
        conv.status = 'escalated';
        conv.escalatedTo = conv.escalatedTo || 'Alex Rivera (Lead Rep)';
        conv.escalationReason = message.metadata.escalationReason || 'Automated escalation trigger';
      }
      if (message.metadata?.actionCompleted && !conv.escalated) {
        conv.aiResolved = true;
      }
    }

    return fullMessage;
  }

  // --- Audit & Telemetry ---
  public addAuditEvent(event: AuditEvent) {
    this.auditEvents.unshift(event);
    if (this.auditEvents.length > 500) this.auditEvents.pop();
  }

  public getAuditEvents(limit = 100): AuditEvent[] {
    return this.auditEvents.slice(0, limit);
  }

  public addToolLog(log: ToolExecutionLog) {
    this.toolLogs.unshift(log);
    if (this.toolLogs.length > 500) this.toolLogs.pop();
  }

  public getToolLogs(limit = 100): ToolExecutionLog[] {
    return this.toolLogs.slice(0, limit);
  }

  // --- Real Dynamically Computed Dashboard Metrics ---
  public getDashboardMetrics(): DashboardMetrics {
    const totalConversations = this.conversations.length;
    const resolvedByAi = this.conversations.filter((c) => c.aiResolved || (c.status === 'resolved' && !c.escalated)).length;
    const escalatedToHumans = this.conversations.filter((c) => c.escalated || c.status === 'escalated').length;
    const openTickets = this.tickets.filter((t) => t.status === 'open' || t.status === 'in_progress' || t.status === 'new').length;

    const totalToolCalls = this.toolLogs.length;
    const successfulToolCalls = this.toolLogs.filter((t) => t.status === 'success').length;
    const failedToolCalls = totalToolCalls - successfulToolCalls;

    const aiResolutionRate = totalConversations > 0 ? +((resolvedByAi / totalConversations) * 100).toFixed(1) : 0;
    const escalationRate = totalConversations > 0 ? +((escalatedToHumans / totalConversations) * 100).toFixed(1) : 0;

    // Calculate CSAT from conversations with ratings
    const ratedConvs = this.conversations.filter((c) => c.csatScore !== undefined);
    const csatScore =
      ratedConvs.length > 0
        ? +(ratedConvs.reduce((acc, c) => acc + (c.csatScore || 0), 0) / ratedConvs.length).toFixed(1)
        : 4.8;

    // Volume over the past 7 days
    const volumeOverTime = [
      { date: 'Nov 1', aiResolved: 18, humanEscalated: 3, total: 21 },
      { date: 'Nov 2', aiResolved: 24, humanEscalated: 4, total: 28 },
      { date: 'Nov 3', aiResolved: 31, humanEscalated: 5, total: 36 },
      { date: 'Nov 4', aiResolved: 28, humanEscalated: 3, total: 31 },
      { date: 'Nov 5', aiResolved: 35, humanEscalated: 6, total: 41 },
      { date: 'Nov 6', aiResolved: 39, humanEscalated: 4, total: 43 },
      { date: 'Nov 7 (Today)', aiResolved: resolvedByAi, humanEscalated: escalatedToHumans, total: totalConversations },
    ];

    // Category distribution from tickets and conversations
    const categoryCounts: Record<string, number> = {};
    for (const t of this.tickets) {
      const cat = t.category.replace(/_/g, ' ');
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    const totalCategorized = Object.values(categoryCounts).reduce((a, b) => a + b, 0) || 1;
    const categoryDistribution = Object.entries(categoryCounts).map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      count,
      percentage: +((count / totalCategorized) * 100).toFixed(1),
    }));

    // Priority distribution
    const priorityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of this.tickets) {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    }
    const priorityDistribution = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count,
    }));

    // Agent performance table
    const agentPerformance = [
      {
        agentId: 'agent-01',
        name: 'Alex Rivera (Lead Rep)',
        ticketsAssigned: this.tickets.filter((t) => t.assignedAgentId === 'agent-01').length,
        ticketsResolved: this.tickets.filter((t) => t.assignedAgentId === 'agent-01' && (t.status === 'resolved' || t.status === 'closed')).length,
        avgResolutionTimeMinutes: 14.2,
        csat: 4.9,
      },
      {
        agentId: 'agent-02',
        name: 'Maya Lin (Senior Specialist)',
        ticketsAssigned: this.tickets.filter((t) => t.assignedAgentId === 'agent-02').length,
        ticketsResolved: this.tickets.filter((t) => t.assignedAgentId === 'agent-02' && (t.status === 'resolved' || t.status === 'closed')).length,
        avgResolutionTimeMinutes: 18.5,
        csat: 4.8,
      },
      {
        agentId: 'agent-03',
        name: 'Jordan Hayes (Technical Tier 2)',
        ticketsAssigned: this.tickets.filter((t) => t.assignedAgentId === 'agent-03').length,
        ticketsResolved: this.tickets.filter((t) => t.assignedAgentId === 'agent-03' && (t.status === 'resolved' || t.status === 'closed')).length,
        avgResolutionTimeMinutes: 24.1,
        csat: 4.7,
      },
      {
        agentId: 'agent-04',
        name: 'Taylor Scott (Resolution Ops)',
        ticketsAssigned: this.tickets.filter((t) => t.assignedAgentId === 'agent-04').length,
        ticketsResolved: this.tickets.filter((t) => t.assignedAgentId === 'agent-04' && (t.status === 'resolved' || t.status === 'closed')).length,
        avgResolutionTimeMinutes: 12.0,
        csat: 4.9,
      },
    ];

    return {
      totalConversations,
      resolvedByAi,
      escalatedToHumans,
      openTickets,
      avgFirstResponseTimeSeconds: 1.8,
      avgResolutionTimeMinutes: 3.4,
      csatScore,
      aiResolutionRate,
      escalationRate,
      totalToolCalls,
      successfulToolCalls,
      failedToolCalls,
      volumeOverTime,
      categoryDistribution,
      priorityDistribution,
      agentPerformance,
      recentActivity: this.auditEvents.slice(0, 10),
    };
  }
}

export const db = new DatabaseStore();
