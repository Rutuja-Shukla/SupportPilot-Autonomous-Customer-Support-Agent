/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db.ts';
import { orchestrator } from './src/server/orchestrator.ts';
import { runAutomatedBenchmark, evaluationScenarios } from './src/server/evaluator.ts';
import { searchKnowledgeWithRAG } from './src/server/gemini.ts';
import {
  hybridRetrieve,
  buildKnowledgeIndex,
  ragEvaluationScenarios,
  runRAGBenchmark,
} from './src/server/ragPipeline.ts';
import { securityScenarios, runSecurityBenchmark } from './src/server/securitySuite.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// =================================================================
// REST API ROUTES (/api/*)
// =================================================================

// 1. Chat & Orchestration Endpoints
app.post('/api/chat/messages', async (req, res) => {
  try {
    const { conversationId, customerId, message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const result = await orchestrator.handleMessage({
      conversationId: conversationId || `conv-${Date.now()}`,
      customerId: customerId || 'cust-1001',
      userMessage: message,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Internal agent error' });
  }
});

// Explicit confirmation for consequential actions (refund / cancel)
app.post('/api/chat/confirm', async (req, res) => {
  try {
    const { conversationId, customerId, actionType, targetId, confirmed } = req.body;
    if (!confirmed) {
      res.json({ success: false, message: 'Action cancelled by user.' });
      return;
    }

    const confirmationMessage = actionType === 'cancel_order'
      ? `Yes, please confirm cancellation of order ${targetId}.`
      : `Yes, please proceed with the refund for ${targetId}.`;

    const result = await orchestrator.handleMessage({
      conversationId,
      customerId,
      userMessage: confirmationMessage,
      explicitConfirmation: true,
      confirmationAction: actionType,
      confirmationTargetId: targetId,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Confirmation error:', err);
    res.status(500).json({ error: err.message || 'Error processing confirmation' });
  }
});

// 2. Conversations Endpoints
app.get('/api/conversations', (req, res) => {
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  res.json(db.getConversations(status, limit, offset));
});

app.get('/api/conversations/:id', (req, res) => {
  const conv = db.getConversationById(req.params.id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json(conv);
});

// Human agent takeover / reply
app.post('/api/conversations/:id/human-reply', (req, res) => {
  const { content, agentName } = req.body;
  const conv = db.getConversationById(req.params.id);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const msg = db.addMessage(conv.id, {
    sender: 'human_rep',
    content: content || 'Hello, human support specialist here to assist you.',
  });

  db.addAuditEvent({
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    eventType: 'human_takeover',
    severity: 'info',
    actor: agentName || 'Alex Rivera (Lead Rep)',
    description: `Human specialist replied to conversation ${conv.id}`,
    metadata: { conversationId: conv.id, agentName },
  });

  res.json({ success: true, message: msg });
});

// 3. Customers Endpoints
app.get('/api/customers', (req, res) => {
  const search = req.query.search as string;
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  res.json(db.getCustomers(search, status, limit, offset));
});

app.get('/api/customers/:id', (req, res) => {
  const cust = db.getCustomerById(req.params.id);
  if (!cust) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  const orders = db.getCustomerOrders(cust.id);
  const tickets = db.getCustomerTickets(cust.id);
  const conversations = db.getCustomerConversations(cust.id);
  res.json({ customer: cust, orders, tickets, conversations });
});

// 4. Orders Endpoints
app.get('/api/orders', (req, res) => {
  const search = req.query.search as string;
  const status = req.query.status as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  res.json(db.getOrders(search, status, limit, offset));
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.getOrderByIdOrNumber(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order);
});

app.post('/api/orders/:id/cancel', (req, res) => {
  const { reason, actor } = req.body;
  const result = db.cancelOrder(req.params.id, reason || 'Customer request', actor || 'human_rep');
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// 5. Refunds Endpoints
app.post('/api/refunds/check', (req, res) => {
  const { orderId } = req.body;
  const order = db.getOrderByIdOrNumber(orderId);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }
  res.json(order.refundEligibility);
});

app.post('/api/refunds', (req, res) => {
  const { orderId, amount, reason, actor } = req.body;
  const result = db.processRefund(orderId, parseFloat(amount), reason, actor || 'human_rep');
  if (!result.success) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

// 6. Tickets Endpoints
app.get('/api/tickets', (req, res) => {
  const status = req.query.status as string;
  const priority = req.query.priority as string;
  const category = req.query.category as string;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  res.json(db.getTickets(status, priority, category, limit, offset));
});

app.get('/api/tickets/:id', (req, res) => {
  const ticket = db.getTicketById(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

app.post('/api/tickets', (req, res) => {
  try {
    const ticket = db.createTicket(req.body);
    res.status(201).json(ticket);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/tickets/:id', (req, res) => {
  const updated = db.updateTicket(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(updated);
});

app.post('/api/tickets/:id/notes', (req, res) => {
  const { author, authorRole, text } = req.body;
  const ok = db.addTicketNote(req.params.id, { author, authorRole, text });
  if (!ok) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json({ success: true });
});

// 7. Knowledge Base Endpoints
app.get('/api/knowledge', (req, res) => {
  const category = req.query.category as string;
  const search = req.query.search as string;
  res.json(db.getKnowledgeArticles(category, search));
});

app.get('/api/knowledge/:id', (req, res) => {
  const article = db.getKnowledgeArticleById(req.params.id);
  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }
  res.json(article);
});

app.post('/api/knowledge', (req, res) => {
  const newArt = db.createKnowledgeArticle(req.body);
  res.status(201).json(newArt);
});

app.post('/api/knowledge/search', async (req, res) => {
  const { query, limit, category } = req.body;
  const retrieval = await hybridRetrieve(query || '', db.knowledgeArticles, {
    limit: limit || 4,
    categoryFilter: category,
  });
  res.json(retrieval);
});

// RAG Knowledge Index Stats & Telemetry
app.get('/api/rag/stats', (_req, res) => {
  const chunks = buildKnowledgeIndex(db.knowledgeArticles);
  res.json({
    totalArticles: db.knowledgeArticles.length,
    totalChunks: chunks.length,
    activePolicies: db.knowledgeArticles.filter((a) => !a.isOutdated).length,
    deprecatedPolicies: db.knowledgeArticles.filter((a) => a.isOutdated).length,
    categories: Array.from(new Set(db.knowledgeArticles.map((a) => a.category))),
  });
});

// RAG Automated Regression & Benchmark Endpoints
app.get('/api/rag/eval/scenarios', (_req, res) => {
  res.json(ragEvaluationScenarios);
});

app.post('/api/rag/eval/run', async (_req, res) => {
  try {
    const report = await runRAGBenchmark(db.knowledgeArticles);
    res.json(report);
  } catch (err: any) {
    console.error('RAG benchmark error:', err);
    res.status(500).json({ error: err.message || 'RAG benchmark run failed' });
  }
});

// 8. Analytics & Audit Telemetry
app.get('/api/analytics', (_req, res) => {
  res.json(db.getDashboardMetrics());
});

app.get('/api/audit-logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  res.json(db.getAuditEvents(limit));
});

app.get('/api/tool-logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  res.json(db.getToolLogs(limit));
});

// 9. Testing & Automated Benchmark Evaluation
app.get('/api/evaluation/scenarios', (_req, res) => {
  res.json(evaluationScenarios);
});

app.post('/api/evaluation/run', async (_req, res) => {
  try {
    const report = await runAutomatedBenchmark();
    res.json(report);
  } catch (err: any) {
    console.error('Benchmark execution error:', err);
    res.status(500).json({ error: err.message || 'Benchmark run failed' });
  }
});

// Autonomous Security & Authorization Benchmark
app.get('/api/security/eval/scenarios', (_req, res) => {
  res.json(securityScenarios);
});

app.post('/api/security/eval/run', async (_req, res) => {
  try {
    const report = await runSecurityBenchmark();
    res.json(report);
  } catch (err: any) {
    console.error('Security benchmark execution error:', err);
    res.status(500).json({ error: err.message || 'Security benchmark run failed' });
  }
});

// 10. Database Re-seed / Demo Reset
app.post('/api/seed/reset', (_req, res) => {
  db.seed();
  res.json({ success: true, message: 'Database reset to synthetic baseline dataset.' });
});

// =================================================================
// Vite Dev Server / Static Hosting Integration
// =================================================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve production build from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SupportPilot server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
