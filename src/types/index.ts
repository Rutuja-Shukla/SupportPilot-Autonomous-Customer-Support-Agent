/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'customer' | 'support_agent' | 'supervisor' | 'admin';

export type CustomerStatus = 'active' | 'vip' | 'at_risk' | 'churned';

export type OrderStatus = 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded' | 'partially_refunded';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketStatus = 'new' | 'open' | 'in_progress' | 'waiting_for_customer' | 'escalated' | 'resolved' | 'closed';

export type TicketCategory =
  | 'order_tracking'
  | 'order_cancellation'
  | 'refund_request'
  | 'return_request'
  | 'payment_issue'
  | 'account_access'
  | 'product_defect'
  | 'shipping_delay'
  | 'technical_support'
  | 'general_inquiry';

export type IntentName =
  | 'order_tracking'
  | 'order_cancellation'
  | 'refund_request'
  | 'return_request'
  | 'payment_issue'
  | 'account_access'
  | 'product_info'
  | 'delivery_issue'
  | 'complaint'
  | 'technical_support'
  | 'general_inquiry'
  | 'human_assistance';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  accountCreatedAt: string;
  status: CustomerStatus;
  tier: 'Standard' | 'Gold' | 'Platinum';
  totalSpend: number;
  ordersCount: number;
  openTicketsCount: number;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

export interface TrackingEvent {
  timestamp: string;
  status: string;
  location: string;
  details: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  createdAt: string;
  items: OrderItem[];
  totalAmount: number;
  shippingFee: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trackingNumber?: string;
  carrier?: string;
  estimatedDeliveryDate?: string;
  deliveredDate?: string;
  trackingHistory: TrackingEvent[];
  cancellationEligibility: {
    eligible: boolean;
    reason?: string;
  };
  refundEligibility: {
    eligible: boolean;
    reason?: string;
    maxRefundAmount: number;
  };
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  conversationId?: string;
  orderId?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  internalNotes: {
    id: string;
    author: string;
    authorRole: string;
    text: string;
    createdAt: string;
  }[];
  resolutionNotes?: string;
  escalationReason?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  content: string;
  summary: string;
  tags: string[];
  updatedAt: string;
  version: number;
  isPublished: boolean;
  viewCount: number;
  status?: 'active' | 'deprecated' | 'superseded';
  isOutdated?: boolean;
  supersededBy?: string;
  effectiveDate?: string;
}

export interface KnowledgeChunk {
  id: string;
  articleId: string;
  articleTitle: string;
  category: string;
  chunkIndex: number;
  totalChunks: number;
  sectionHeading?: string;
  text: string;
  tags: string[];
  version: number;
  isOutdated?: boolean;
  supersededBy?: string;
  hasInjectionPattern?: boolean;
  embedding?: number[];
}

export interface RAGSearchResult {
  chunk: KnowledgeChunk;
  article: KnowledgeArticle;
  denseScore: number;
  sparseScore: number;
  hybridScore: number;
  relevanceVerdict: 'high' | 'medium' | 'low' | 'rejected';
  sanitizedSnippet: string;
  hasInjectionAttempt: boolean;
  isOutdated: boolean;
}

export interface RAGEvaluationScenario {
  id: string;
  name: string;
  query: string;
  expectedArticleIds: string[];
  category:
    | 'exact_relevance'
    | 'semantic_fact'
    | 'information_unavailable'
    | 'outdated_suppression'
    | 'conflicting_policies'
    | 'prompt_injection_defense'
    | 'negative_constraint'
    | 'distractor_rejection';
  description: string;
  shouldAdmitUnavailable: boolean;
  expectedKeyFacts?: string[];
}

export interface RAGEvaluationResult {
  scenarioId: string;
  scenarioName: string;
  category: string;
  query: string;
  passed: boolean;
  retrievedArticleIds: string[];
  expectedArticleIds: string[];
  precisionAtK: number;
  recallAtK: number;
  admittedUnavailableCorrectly: boolean;
  outdatedSuppressed: boolean;
  injectionNeutralized: boolean;
  hallucinationFree: boolean;
  durationMs: number;
  generatedAnswer: string;
  citations: { title: string; articleId: string; chunkId?: string; excerpt?: string }[];
  details: string;
}

export interface RAGBenchmarkReport {
  timestamp: string;
  totalQueries: number;
  passed: number;
  failed: number;
  overallScore: number;
  meanPrecisionAtK: number;
  meanRecallAtK: number;
  unavailableAccuracy: number;
  safetyScore: number;
  results: RAGEvaluationResult[];
}

export interface StructuredToolTrace {
  stepId: string;
  stepIndex: number;
  toolName: string;
  rawArguments: Record<string, any>;
  validatedArguments: Record<string, any>;
  validationPassed: boolean;
  validationErrors?: string[];
  idempotencyKey?: string;
  idempotentReplay?: boolean;
  executionResult: Record<string, any>;
  status: 'success' | 'failed' | 'rejected' | 'retry_exhausted';
  durationMs: number;
  retryAttempts: number;
  policyVerdict?: {
    authorized: boolean;
    reason?: string;
  };
}

export interface AgentExecutionTrace {
  traceId: string;
  timestamp: string;
  conversationId: string;
  customerId: string;
  userMessage: string;
  intent: IntentAnalysisResult;
  retrievedContext: {
    customer: { id: string; name: string; tier: string };
    relevantOrders: string[];
    ragArticles: { id: string; title: string; score: number }[];
  };
  plan: {
    strategy: string;
    plannedTools: string[];
    maxSteps: number;
  };
  toolTraces: StructuredToolTrace[];
  responseValidation: {
    validated: boolean;
    hallucinationChecks: {
      orderStatusMatchesBackend: boolean;
      refundAmountMatchesBackend: boolean;
      noFabricatedTracking: boolean;
      policyCitationsAccurate: boolean;
    };
    sanitized: boolean;
    sanitizationNotes?: string;
  };
  finalResponse: string;
  escalation: {
    escalated: boolean;
    reason?: string;
    ticketId?: string;
    ticketNumber?: string;
  };
  metrics: {
    totalDurationMs: number;
    stepCount: number;
    retriesTotal: number;
    loopDetected: boolean;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'customer' | 'agent' | 'human_rep' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    intent?: IntentName;
    confidence?: number;
    entities?: Record<string, any>;
    agentThought?: string;
    toolsExecuted?: {
      toolName: string;
      parameters: any;
      result: any;
      status: 'success' | 'failed';
    }[];
    structuredTrace?: AgentExecutionTrace;
    sources?: { title: string; articleId: string; excerpt?: string }[];
    requiresConfirmation?: {
      actionType: 'cancel_order' | 'issue_refund';
      targetId: string;
      parameters: any;
      description: string;
    };
    actionCompleted?: boolean;
    escalatedToHuman?: boolean;
    escalationReason?: string;
  };
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: 'active' | 'resolved' | 'escalated' | 'closed';
  createdAt: string;
  updatedAt: string;
  subject: string;
  messages: ChatMessage[];
  lastMessageSnippet: string;
  escalated: boolean;
  escalatedTo?: string;
  escalationReason?: string;
  aiResolved: boolean;
  csatScore?: number;
  csatFeedback?: string;
  associatedTicketId?: string;
  associatedOrderId?: string;
  tags: string[];
}

export interface IntentAnalysisResult {
  intent: IntentName;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'frustrated' | 'angry';
  entities: {
    orderNumber?: string;
    orderId?: string;
    productName?: string;
    amount?: number;
    issueType?: string;
    trackingNumber?: string;
    customerRequestedHuman?: boolean;
  };
  requiredBackendAction?: string;
  requiresHumanIntervention: boolean;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

export interface ToolExecutionLog {
  id: string;
  timestamp: string;
  toolName: string;
  parameters: Record<string, any>;
  result: Record<string, any>;
  status: 'success' | 'failed' | 'rejected';
  durationMs: number;
  actor: 'ai_agent' | 'human_rep' | 'system';
  conversationId?: string;
  customerId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: 'tool_execution' | 'order_cancelled' | 'refund_issued' | 'ticket_escalated' | 'human_takeover' | 'policy_violation_prevented' | 'prompt_injection_blocked';
  severity: 'info' | 'warning' | 'critical';
  actor: string;
  description: string;
  metadata: Record<string, any>;
}

export interface DashboardMetrics {
  totalConversations: number;
  resolvedByAi: number;
  escalatedToHumans: number;
  openTickets: number;
  avgFirstResponseTimeSeconds: number;
  avgResolutionTimeMinutes: number;
  csatScore: number;
  aiResolutionRate: number;
  escalationRate: number;
  totalToolCalls: number;
  successfulToolCalls: number;
  failedToolCalls: number;
  volumeOverTime: { date: string; aiResolved: number; humanEscalated: number; total: number }[];
  categoryDistribution: { category: string; count: number; percentage: number }[];
  priorityDistribution: { priority: string; count: number }[];
  agentPerformance: {
    agentId: string;
    name: string;
    ticketsAssigned: number;
    ticketsResolved: number;
    avgResolutionTimeMinutes: number;
    csat: number;
  }[];
  recentActivity: AuditEvent[];
}

export interface EvaluationScenario {
  id: string;
  name: string;
  category: string;
  customerInput: string;
  expectedIntent: IntentName;
  expectedTools: string[];
  shouldEscalate: boolean;
  shouldRequireConfirmation: boolean;
  isSecurityTest?: boolean;
  customerId?: string;
  description: string;
}

export interface EvaluationResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  detectedIntent: IntentName;
  intentAccuracy: boolean;
  toolsExecuted: string[];
  toolsAccuracy: boolean;
  escalatedCorrectly: boolean;
  confirmationEnforced: boolean;
  hallucinationFree: boolean;
  durationMs: number;
  details: string;
}

export interface BenchmarkReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  overallScore: number;
  intentAccuracyScore: number;
  toolAccuracyScore: number;
  safetyScore: number;
  results: EvaluationResult[];
}
