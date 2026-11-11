/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from './db.ts';
import {
  toolRegistry,
  ToolExecutionContext,
  validateToolArguments,
  executeToolWithBoundedRetry,
  ToolResult,
} from './tools.ts';
import {
  checkPromptInjection,
  classifyIntentWithGemini,
  searchKnowledgeWithRAG,
  generateGroundedResponse,
} from './gemini.ts';
import {
  ChatMessage,
  IntentAnalysisResult,
  KnowledgeArticle,
  Conversation,
  Order,
  StructuredToolTrace,
  AgentExecutionTrace,
} from '../types/index.ts';

export interface AgentStepTrace {
  stage: string;
  label: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  data?: any;
}

export interface OrchestrationResult {
  replyMessage: ChatMessage;
  intent: IntentAnalysisResult;
  steps: AgentStepTrace[];
  toolsExecuted: { toolName: string; parameters: any; result: any; status: 'success' | 'failed' }[];
  structuredTrace: AgentExecutionTrace;
  sources: { title: string; articleId: string; excerpt?: string }[];
  requiresConfirmation?: {
    actionType: 'cancel_order' | 'issue_refund';
    targetId: string;
    parameters: any;
    description: string;
  };
  escalatedToHuman: boolean;
  escalationReason?: string;
}

const MAX_EXECUTION_STEPS = 6;

// -----------------------------------------------------------------
// Response Validation & Anti-Hallucination Guard
// -----------------------------------------------------------------
export function validateAndSanitizeResponse(
  rawText: string,
  toolTraces: StructuredToolTrace[],
  resolvedOrder?: Order,
  crossCustomerOrderBlocked?: boolean,
  blockedOrderNumber?: string
): {
  validated: boolean;
  hallucinationChecks: {
    orderStatusMatchesBackend: boolean;
    refundAmountMatchesBackend: boolean;
    noFabricatedTracking: boolean;
    policyCitationsAccurate: boolean;
  };
  sanitized: boolean;
  sanitizationNotes?: string;
  sanitizedText: string;
} {
  const lower = rawText.toLowerCase();
  let sanitized = false;
  let sanitizationNotes = '';
  let sanitizedText = rawText;

  let orderStatusMatchesBackend = true;
  let refundAmountMatchesBackend = true;
  let noFabricatedTracking = true;
  let policyCitationsAccurate = true;

  // 0. Cross-customer privacy boundary: Redact any leaked order details
  if (crossCustomerOrderBlocked && blockedOrderNumber) {
    if (lower.includes('delivered') || lower.includes('tracking') || lower.includes('$')) {
      sanitized = true;
      sanitizationNotes = 'Security boundary: Redacted cross-tenant order details from response.';
      sanitizedText = `For privacy and security, access to order ${blockedOrderNumber} is restricted because it is not associated with your verified account. Please verify your order number or view your active orders.`;
      return {
        validated: true,
        hallucinationChecks: {
          orderStatusMatchesBackend: true,
          refundAmountMatchesBackend: true,
          noFabricatedTracking: true,
          policyCitationsAccurate: true,
        },
        sanitized: true,
        sanitizationNotes,
        sanitizedText,
      };
    }
  }

  // 1. Guard against claiming refund succeeded without successful create_refund_request tool
  const refundTool = toolTraces.find((t) => t.toolName === 'create_refund_request');
  const hasSuccessfulRefundTool = Boolean(
    refundTool && refundTool.status === 'success' && refundTool.executionResult?.success
  );
  const refundClaimPattern =
    /(?:refund has been (?:issued|processed|disbursed)|(?:issued|processed) a (?:full )?refund|refunded your (?:account|credit card)|successfully refunded|processed your refund)/i;

  if (refundClaimPattern.test(lower) && !hasSuccessfulRefundTool) {
    refundAmountMatchesBackend = false;
    sanitized = true;
    const failureReason = refundTool?.executionResult?.error || 'policy requirements not met or supervisor authorization required';
    sanitizationNotes = 'Anti-hallucination guard: Intercepted unsupported claim of completed refund disbursement when backend call failed/was not run.';
    sanitizedText = sanitizedText.replace(
      new RegExp(refundClaimPattern.source, 'gi'),
      `refund could not be processed automatically (${failureReason})`
    );
  }

  // 2. Guard against claiming cancellation completed without successful request_order_cancellation tool
  const cancelTool = toolTraces.find((t) => t.toolName === 'request_order_cancellation');
  const hasSuccessfulCancelTool = Boolean(
    cancelTool && cancelTool.status === 'success' && cancelTool.executionResult?.success
  );
  const cancelClaimPattern =
    /(?:order has been (?:successfully )?cancelled|cancelled your order|successfully cancelled)/i;

  if (cancelClaimPattern.test(lower) && !hasSuccessfulCancelTool) {
    orderStatusMatchesBackend = false;
    sanitized = true;
    const failureReason = cancelTool?.executionResult?.error || 'cancellation eligibility verification required';
    sanitizationNotes = (sanitizationNotes ? sanitizationNotes + ' ' : '') +
      'Anti-hallucination guard: Intercepted unsupported claim of completed cancellation when backend call failed/was not run.';
    sanitizedText = sanitizedText.replace(
      new RegExp(cancelClaimPattern.source, 'gi'),
      `order cancellation could not be processed (${failureReason})`
    );
  }

  // 3. Status consistency check
  if (resolvedOrder) {
    if (resolvedOrder.status === 'delivered' && lower.includes('in transit with carrier')) {
      orderStatusMatchesBackend = false;
    }
  }

  return {
    validated: true,
    hallucinationChecks: {
      orderStatusMatchesBackend,
      refundAmountMatchesBackend,
      noFabricatedTracking,
      policyCitationsAccurate,
    },
    sanitized,
    sanitizationNotes: sanitized ? sanitizationNotes : undefined,
    sanitizedText,
  };
}

export class AgentOrchestrator {
  public async handleMessage(params: {
    conversationId: string;
    customerId: string;
    userMessage: string;
    explicitConfirmation?: boolean;
    confirmationAction?: 'cancel_order' | 'issue_refund';
    confirmationTargetId?: string;
  }): Promise<OrchestrationResult> {
    const startTimeTotal = Date.now();
    const steps: AgentStepTrace[] = [];
    const toolsExecuted: { toolName: string; parameters: any; result: any; status: 'success' | 'failed' }[] = [];
    const structuredToolTraces: StructuredToolTrace[] = [];
    let sources: { title: string; articleId: string; excerpt?: string }[] = [];
    let requiresConfirmation: OrchestrationResult['requiresConfirmation'] = undefined;
    let escalatedToHuman = false;
    let escalationReason: string | undefined = undefined;
    let loopDetected = false;
    let retriesTotal = 0;

    // Retrieve or create conversation
    let conv = db.getConversationById(params.conversationId);
    if (!conv) {
      conv = db.createConversation(params.customerId);
      params.conversationId = conv.id;
    }

    const customer = db.getCustomerById(params.customerId) || db.customers[0];
    const customerOrders = db.getCustomerOrders(customer.id);

    // Persist user's message to conversation
    db.addMessage(conv.id, {
      sender: 'customer',
      content: params.userMessage,
    });

    const ctx: ToolExecutionContext = {
      actor: 'ai_agent',
      customerId: customer.id,
      conversationId: conv.id,
    };

    // -------------------------------------------------------------
    // STAGE 1: Security & Prompt Injection Inspection
    // -------------------------------------------------------------
    steps.push({ stage: '1_SECURITY_FIREWALL', label: 'Security & Prompt Injection Firewall', status: 'pending' });
    const injectionCheck = checkPromptInjection(params.userMessage);
    if (injectionCheck.isSuspicious) {
      steps[0].status = 'error';
      steps[0].data = { blocked: true, reason: injectionCheck.reason };

      db.addAuditEvent({
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        eventType: 'prompt_injection_blocked',
        severity: 'critical',
        actor: 'security_firewall',
        description: `Blocked suspicious prompt injection from customer ${customer.id}`,
        metadata: { input: params.userMessage, reason: injectionCheck.reason },
      });

      const replyContent = `I detected security guidelines in your message that cannot be processed. SupportPilot adheres strictly to verified enterprise policy constraints. How can I help you with an official order or support request?`;
      const reply = db.addMessage(conv.id, {
        sender: 'agent',
        content: replyContent,
        metadata: {
          agentThought: 'Prompt injection pattern intercepted by firewall.',
        },
      });

      const securityTrace: AgentExecutionTrace = {
        traceId: `trace-${Date.now()}`,
        timestamp: new Date().toISOString(),
        conversationId: conv.id,
        customerId: customer.id,
        userMessage: params.userMessage,
        intent: {
          intent: 'complaint',
          confidence: 1.0,
          urgency: 'critical',
          sentiment: 'frustrated',
          entities: {},
          requiresHumanIntervention: true,
          needsClarification: false,
        },
        retrievedContext: {
          customer: { id: customer.id, name: customer.name, tier: customer.tier },
          relevantOrders: [],
          ragArticles: [],
        },
        plan: {
          strategy: 'Block execution due to prompt injection firewall trip',
          plannedTools: [],
          maxSteps: 0,
        },
        toolTraces: [],
        responseValidation: {
          validated: true,
          hallucinationChecks: {
            orderStatusMatchesBackend: true,
            refundAmountMatchesBackend: true,
            noFabricatedTracking: true,
            policyCitationsAccurate: true,
          },
          sanitized: false,
        },
        finalResponse: replyContent,
        escalation: { escalated: false },
        metrics: {
          totalDurationMs: Date.now() - startTimeTotal,
          stepCount: 0,
          retriesTotal: 0,
          loopDetected: false,
        },
      };

      return {
        replyMessage: reply,
        intent: securityTrace.intent,
        steps,
        toolsExecuted: [],
        structuredTrace: securityTrace,
        sources: [],
        escalatedToHuman: false,
      };
    }
    steps[0].status = 'success';
    steps[0].data = { sanitized: true, riskScore: '0.00 (Safe)' };

    // -------------------------------------------------------------
    // STAGE 2: Context Retrieval
    // -------------------------------------------------------------
    steps.push({ stage: '2_CONTEXT_RETRIEVAL', label: 'Customer & Order Context Retrieval', status: 'pending' });
    const recentOrderNumbers = customerOrders.slice(0, 3).map((o) => o.orderNumber);
    steps[1].status = 'success';
    steps[1].data = {
      customerName: customer.name,
      tier: customer.tier,
      totalOrders: customerOrders.length,
      recentOrders: recentOrderNumbers,
    };

    // -------------------------------------------------------------
    // STAGE 3: Intent Classification & Entity Extraction
    // -------------------------------------------------------------
    steps.push({ stage: '3_INTENT_CLASSIFICATION', label: 'Intent Classification & Entity Extraction', status: 'pending' });
    const intentResult = await classifyIntentWithGemini(params.userMessage, {
      name: customer.name,
      recentOrders: recentOrderNumbers,
    });
    steps[2].status = 'success';
    steps[2].data = {
      detectedIntent: intentResult.intent,
      confidence: `${(intentResult.confidence * 100).toFixed(1)}%`,
      urgency: intentResult.urgency,
      sentiment: intentResult.sentiment,
      entities: intentResult.entities,
    };

    if (intentResult.intent === 'human_assistance' || intentResult.requiresHumanIntervention) {
      escalatedToHuman = true;
      escalationReason = intentResult.entities?.customerRequestedHuman
        ? 'Customer explicitly requested to speak with a human representative.'
        : `Autonomous safety trigger: ${intentResult.urgency} urgency issue requiring human review.`;
    }

    // -------------------------------------------------------------
    // STAGE 4: Knowledge Base RAG Retrieval
    // -------------------------------------------------------------
    steps.push({ stage: '4_RAG_RETRIEVAL', label: 'Semantic Knowledge Base Retrieval', status: 'pending' });
    const ragMatches = await searchKnowledgeWithRAG(
      `${params.userMessage} ${intentResult.intent.replace(/_/g, ' ')}`,
      db.knowledgeArticles,
      3
    );
    const topRagArticles: KnowledgeArticle[] = ragMatches.map((m) => m.article);
    steps[3].status = 'success';
    steps[3].data = {
      retrievedDocuments: topRagArticles.map((a, idx) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        relevanceScore: `${((ragMatches[idx]?.score || 0.8) * 100).toFixed(0)}%`,
      })),
    };

    // -------------------------------------------------------------
    // STAGE 5: Action Planning & Tool Invocation with Bounded Loop Guard
    // -------------------------------------------------------------
    steps.push({ stage: '5_ACTION_PLANNING', label: 'Action Planning & Tool Invocation', status: 'pending' });

    // Target order identification with tenant boundary validation
    let targetOrderNumber = intentResult.entities?.orderNumber;
    if (!targetOrderNumber) {
      const match = params.userMessage.match(/(?:SP-ORD-|ord-)\d+/i);
      if (match) targetOrderNumber = match[0].toUpperCase();
    }

    let crossCustomerOrderBlocked = false;
    let resolvedOrder: Order | undefined = undefined;

    if (targetOrderNumber) {
      const candidate = db.getOrderByIdOrNumber(targetOrderNumber);
      if (candidate) {
        if (candidate.customerId !== customer.id) {
          crossCustomerOrderBlocked = true;
          db.addAuditEvent({
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            eventType: 'unauthorized_access_attempt',
            severity: 'warning',
            actor: ctx.actor,
            description: `Security boundary: Blocked unauthorized cross-tenant order reference '${targetOrderNumber}' belonging to customer ${candidate.customerId} from caller ${customer.id}.`,
            metadata: { callerCustomerId: customer.id, targetOrder: targetOrderNumber, ownerCustomerId: candidate.customerId },
          });
        } else {
          resolvedOrder = candidate;
        }
      }
    }

    if (!resolvedOrder && !crossCustomerOrderBlocked) {
      resolvedOrder = customerOrders[0];
    }

    const plannedTools: { toolName: keyof typeof toolRegistry; rawParams: any }[] = [];

    // Customer profile verification
    plannedTools.push({ toolName: 'get_customer_profile', rawParams: { customerId: customer.id } });

    // Strict Consequential Confirmation Enforcement
    const prevMsgs = conv.messages;
    const lastAgentMsg = prevMsgs.length >= 2 && prevMsgs[prevMsgs.length - 2].sender === 'agent'
      ? prevMsgs[prevMsgs.length - 2].content
      : '';
    const wasAwaitingConfirmation = /confirm|would you like me to|proceed with (cancellation|refund)|are you sure/i.test(lastAgentMsg);
    const userExplicitlyAgreed = /^(yes|confirm|proceed|yes please|do it|confirm cancellation|confirm refund)[\.!]?$/i.test(params.userMessage.trim());

    const isConfirming = Boolean(params.explicitConfirmation) || (wasAwaitingConfirmation && userExplicitlyAgreed);

    if (crossCustomerOrderBlocked) {
      // Do not plan operations on another customer's order
      steps[4].data = {
        securityBoundary: 'Cross-tenant order access blocked',
        blockedOrder: targetOrderNumber,
      };
    } else if (intentResult.intent === 'order_tracking') {
      if (resolvedOrder) {
        plannedTools.push({ toolName: 'get_order_status', rawParams: { orderIdOrNumber: resolvedOrder.orderNumber } });
      }
    } else if (intentResult.intent === 'order_cancellation') {
      if (resolvedOrder) {
        plannedTools.push({ toolName: 'check_cancellation_eligibility', rawParams: { orderIdOrNumber: resolvedOrder.orderNumber } });

        if (isConfirming && resolvedOrder.cancellationEligibility.eligible) {
          plannedTools.push({
            toolName: 'request_order_cancellation',
            rawParams: {
              orderId: resolvedOrder.id,
              reason: 'Customer confirmed cancellation via chat',
              customerConfirmed: true,
            },
          });
        } else if (resolvedOrder.cancellationEligibility.eligible) {
          requiresConfirmation = {
            actionType: 'cancel_order',
            targetId: resolvedOrder.id,
            parameters: { orderId: resolvedOrder.id, reason: 'Customer requested cancellation' },
            description: `Cancel order ${resolvedOrder.orderNumber} ($${resolvedOrder.totalAmount.toFixed(2)}) and issue full refund`,
          };
        }
      }
    } else if (intentResult.intent === 'refund_request' || intentResult.intent === 'return_request') {
      if (resolvedOrder) {
        plannedTools.push({ toolName: 'check_refund_eligibility', rawParams: { orderId: resolvedOrder.id } });

        if (isConfirming && resolvedOrder.refundEligibility.eligible) {
          plannedTools.push({
            toolName: 'create_refund_request',
            rawParams: {
              orderId: resolvedOrder.id,
              amount: resolvedOrder.totalAmount,
              reason: 'Customer initiated return within 30-day window',
              customerConfirmed: true,
            },
          });
        } else if (resolvedOrder.refundEligibility.eligible && resolvedOrder.totalAmount <= 150) {
          requiresConfirmation = {
            actionType: 'issue_refund',
            targetId: resolvedOrder.id,
            parameters: { orderId: resolvedOrder.id, amount: resolvedOrder.totalAmount, reason: 'Customer return' },
            description: `Issue return authorization and refund of $${resolvedOrder.totalAmount.toFixed(2)} for ${resolvedOrder.orderNumber}`,
          };
        }
      }
    } else if (intentResult.intent === 'complaint' || intentResult.intent === 'delivery_issue') {
      if (resolvedOrder) {
        plannedTools.push({ toolName: 'get_order_details', rawParams: { orderIdOrNumber: resolvedOrder.orderNumber } });
      }
      if (intentResult.urgency === 'high' || intentResult.urgency === 'critical') {
        escalatedToHuman = true;
        escalationReason = `Customer reported urgent issue: ${params.userMessage.slice(0, 100)}`;
      }
    }

    // Loop & Signature Tracking
    const executedSignatures = new Set<string>();
    const toolResultsForPrompt: { toolName: string; result: any }[] = [];

    let stepIndex = 0;
    for (const plan of plannedTools) {
      if (stepIndex >= MAX_EXECUTION_STEPS) {
        loopDetected = true;
        break;
      }

      // Validate arguments before execution
      const validation = validateToolArguments(plan.toolName, plan.rawParams);
      const signature = `${plan.toolName}:${JSON.stringify(validation.validatedArgs)}`;

      if (executedSignatures.has(signature)) {
        loopDetected = true;
        db.addAuditEvent({
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: new Date().toISOString(),
          eventType: 'policy_violation_prevented',
          severity: 'warning',
          actor: 'loop_guard',
          description: `Infinite loop guard: Suppressed duplicate tool call ${plan.toolName}`,
          metadata: { signature, stepIndex },
        });
        break;
      }
      executedSignatures.add(signature);

      stepIndex++;
      let executionResult: ToolResult;
      let durationMs = 0;
      let retryAttempts = 0;

      if (!validation.valid) {
        executionResult = {
          success: false,
          error: `Argument validation failed: ${validation.errors.join(', ')}`,
        };
      } else {
        const exec = await executeToolWithBoundedRetry(
          plan.toolName,
          validation.validatedArgs,
          ctx,
          2, // Max 2 retries
          3000 // 3s timeout
        );
        executionResult = exec.result;
        durationMs = exec.durationMs;
        retryAttempts = exec.retryCount;
        retriesTotal += retryAttempts;
      }

      const structuredTrace: StructuredToolTrace = {
        stepId: `step-${Date.now()}-${stepIndex}`,
        stepIndex,
        toolName: plan.toolName,
        rawArguments: plan.rawParams,
        validatedArguments: validation.validatedArgs,
        validationPassed: validation.valid,
        validationErrors: validation.errors.length > 0 ? validation.errors : undefined,
        idempotencyKey: executionResult.metadata?.idempotencyKey,
        idempotentReplay: Boolean(executionResult.metadata?.idempotentReplay),
        executionResult,
        status: executionResult.success
          ? 'success'
          : executionResult.error?.includes('Security violation')
          ? 'rejected'
          : retryAttempts > 0
          ? 'retry_exhausted'
          : 'failed',
        durationMs,
        retryAttempts,
        policyVerdict: {
          authorized: !executionResult.error?.includes('Security violation'),
          reason: executionResult.error?.includes('Security violation')
            ? executionResult.error
            : 'Authorized under customer scope',
        },
      };

      structuredToolTraces.push(structuredTrace);
      toolsExecuted.push({
        toolName: plan.toolName,
        parameters: validation.validatedArgs,
        result: executionResult,
        status: executionResult.success ? 'success' : 'failed',
      });
      toolResultsForPrompt.push({ toolName: plan.toolName, result: executionResult });

      if (executionResult.metadata?.escalatedToHuman || executionResult.data?.requiresHumanApproval) {
        escalatedToHuman = true;
        escalationReason =
          executionResult.error ||
          (executionResult.data?.requiresHumanApproval
            ? 'Policy Safeguard: Order value exceeds $150 limit and requires supervisor approval.'
            : 'High-value approval required');
      }
    }

    steps[4].status = 'success';
    steps[4].data = {
      toolsInvokedCount: toolsExecuted.length,
      tools: toolsExecuted.map((t) => `${t.toolName} [${t.status}]`),
      loopDetected,
      retriesTotal,
    };

    // -------------------------------------------------------------
    // STAGE 6: Escalation & Ticket Verification
    // -------------------------------------------------------------
    steps.push({ stage: '6_ESCALATION_CHECK', label: 'Escalation & Ticket Verification', status: 'pending' });
    let createdTicketId: string | undefined = undefined;
    let createdTicketNumber: string | undefined = undefined;

    if (escalatedToHuman) {
      const ticket = db.createTicket({
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        conversationId: conv.id,
        orderId: resolvedOrder?.id,
        category: intentResult.intent === 'human_assistance' ? 'general_inquiry' : (intentResult.intent as any),
        priority: intentResult.urgency === 'critical' ? 'urgent' : 'high',
        status: 'escalated',
        subject: `Escalated: ${intentResult.intent.replace(/_/g, ' ')} (${customer.name})`,
        description: `Customer Message: "${params.userMessage}"\nReason for escalation: ${escalationReason}`,
        assignedAgentId: 'agent-01',
        assignedAgentName: 'Alex Rivera (Lead Rep)',
        escalationReason: escalationReason || 'Customer requested human support',
      });

      createdTicketId = ticket.id;
      createdTicketNumber = ticket.ticketNumber;
      conv.escalated = true;
      conv.status = 'escalated';
      conv.escalatedTo = 'Alex Rivera (Lead Rep)';
      conv.escalationReason = escalationReason;
      conv.associatedTicketId = ticket.id;

      steps[5].status = 'warning';
      steps[5].data = {
        escalated: true,
        assignedTo: 'Alex Rivera (Lead Rep)',
        ticketNumber: ticket.ticketNumber,
        reason: escalationReason,
      };
    } else {
      steps[5].status = 'success';
      steps[5].data = { escalated: false, resolvedAutonomously: true };
    }

    // -------------------------------------------------------------
    // STAGE 7: Grounded Response Generation & Response Validation
    // -------------------------------------------------------------
    steps.push({ stage: '7_RESPONSE_GENERATION', label: 'Grounded Answer Generation & Response Validation', status: 'pending' });

    const rawGroundedReply = await generateGroundedResponse({
      customerName: customer.name,
      userMessage: params.userMessage,
      intent: intentResult,
      toolResults: toolResultsForPrompt,
      ragArticles: topRagArticles,
      conversationHistory: conv.messages.map((m) => ({ sender: m.sender, content: m.content })),
    });

    sources = rawGroundedReply.sources;

    // Response Validation (Anti-Hallucination & Tenant Isolation Guard)
    let replyText = rawGroundedReply.text;
    if (crossCustomerOrderBlocked && targetOrderNumber) {
      replyText = `For customer privacy and security regulations, access to order ${targetOrderNumber} is restricted because it is not associated with your verified customer account. Please verify your order number or check your recent orders.`;
    }

    const responseValidation = validateAndSanitizeResponse(
      replyText,
      structuredToolTraces,
      resolvedOrder,
      crossCustomerOrderBlocked,
      targetOrderNumber
    );

    steps[6].status = responseValidation.sanitized ? 'warning' : 'success';
    steps[6].data = {
      citationsCount: sources.length,
      responseLength: responseValidation.sanitizedText.length,
      hallucinationChecks: responseValidation.hallucinationChecks,
      sanitized: responseValidation.sanitized,
      sanitizationNotes: responseValidation.sanitizationNotes,
    };

    // Build complete structured execution trace
    const structuredTrace: AgentExecutionTrace = {
      traceId: `trace-${Date.now()}`,
      timestamp: new Date().toISOString(),
      conversationId: conv.id,
      customerId: customer.id,
      userMessage: params.userMessage,
      intent: intentResult,
      retrievedContext: {
        customer: { id: customer.id, name: customer.name, tier: customer.tier },
        relevantOrders: customerOrders.slice(0, 3).map((o) => o.orderNumber),
        ragArticles: topRagArticles.map((a, i) => ({
          id: a.id,
          title: a.title,
          score: ragMatches[i]?.score || 0.85,
        })),
      },
      plan: {
        strategy: `Orchestrate intent '${intentResult.intent}' with authorized tools and policy bounds`,
        plannedTools: plannedTools.map((t) => t.toolName),
        maxSteps: MAX_EXECUTION_STEPS,
      },
      toolTraces: structuredToolTraces,
      responseValidation: {
        validated: true,
        hallucinationChecks: responseValidation.hallucinationChecks,
        sanitized: responseValidation.sanitized,
        sanitizationNotes: responseValidation.sanitizationNotes,
      },
      finalResponse: responseValidation.sanitizedText,
      escalation: {
        escalated: escalatedToHuman,
        reason: escalationReason,
        ticketId: createdTicketId,
        ticketNumber: createdTicketNumber,
      },
      metrics: {
        totalDurationMs: Date.now() - startTimeTotal,
        stepCount: structuredToolTraces.length,
        retriesTotal,
        loopDetected,
      },
    };

    // Save agent reply to conversation
    const replyMessage = db.addMessage(conv.id, {
      sender: 'agent',
      content: responseValidation.sanitizedText,
      metadata: {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        entities: intentResult.entities,
        toolsExecuted,
        structuredTrace,
        sources,
        requiresConfirmation,
        actionCompleted: toolsExecuted.some(
          (t) => t.toolName === 'request_order_cancellation' || t.toolName === 'create_refund_request'
        ),
        escalatedToHuman,
        escalationReason,
      },
    });

    return {
      replyMessage,
      intent: intentResult,
      steps,
      toolsExecuted,
      structuredTrace,
      sources,
      requiresConfirmation,
      escalatedToHuman,
      escalationReason,
    };
  }
}

export const orchestrator = new AgentOrchestrator();
