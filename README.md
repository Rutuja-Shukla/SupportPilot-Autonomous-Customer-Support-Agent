# SupportPilot — Autonomous Customer Support Agent Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-38bdf8.svg)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Gemini_API-3.8_Flash-orange.svg)](https://ai.google.dev/)

**SupportPilot** is an enterprise-grade autonomous AI customer support orchestration platform. It demonstrates real agentic state machine workflows, intent detection, retrieval-augmented generation (RAG), backend tool invocation, customer context management, ticket lifecycle operations, and human-in-the-loop escalations.

---

## 🌟 Architecture & Key Features

### 1. 7-Stage Autonomous Agent State Machine
- **Stage 1 — Security Firewall**: Real-time inspection for prompt injections, system override directives, and jailbreak patterns.
- **Stage 2 — Context Retrieval**: Hydrates customer tier, lifetime spend, order history, and past tickets with tenant isolation.
- **Stage 3 — Structured Intent Detection**: Powered by Gemini (`gemini-3.8-flash`) with strict JSON schema outputs (intent, confidence %, urgency, sentiment, and extracted entities).
- **Stage 4 — Semantic RAG Policy Retrieval**: Indexes 32 official company documentation articles using vector embeddings (`gemini-embedding-2-preview`) and cosine similarity matching.
- **Stage 5 — Action Planning & Safety Verification**: Evaluates business policy eligibility before invoking tools (e.g. 30-day return windows, cancellation only prior to shipment).
- **Stage 6 — Consequential Action Confirmation**: Enforces explicit, interactive customer confirmation before executing consequential state mutations (cancellations or refunds).
- **Stage 7 — Grounded Response Generation**: Cites official knowledge base article titles and grounds responses strictly in backend data without hallucinations.

### 2. 14 Production Backend Tools
- **Customer Tools**: `get_customer_profile`, `get_customer_orders`, `get_customer_support_history`
- **Order Tools**: `get_order_status`, `get_order_details`, `check_cancellation_eligibility`, `request_order_cancellation`
- **Refund Tools**: `check_refund_eligibility`, `create_refund_request`, `get_refund_status`
- **Ticket Tools**: `create_support_ticket`, `update_support_ticket`, `assign_support_ticket`, `get_ticket_status`
- **Knowledge Tools**: `search_knowledge_base`, `retrieve_policy_document`

### 3. Comprehensive Application Modules
- **Executive Operations Dashboard**: Dynamically computed KPIs (total conversations, autonomous resolution rate, escalation trends, priority matrix, specialist leaderboard, and live activity feed).
- **AI Customer Chat**: Real-time customer experience with persona switcher (VIP, Standard, At-Risk), interactive confirmation modals, grounded citations, and live 7-stage state machine inspector.
- **Human Support Workspace**: Dedicated queue for incoming escalations with AI summaries, recommended actions, and an interactive human reply console.
- **Support Tickets Operations**: Ticket lifecycle manager with status transitions (`New`, `Open`, `In Progress`, `Escalated`, `Resolved`, `Closed`), priority tags, and internal audit notes timeline.
- **Conversations Explorer**: Session browser with transcripts, resolution mode indicators, and chat jump triggers.
- **Customers & Orders Directory**: 105+ synthetic customers and 210+ orders with carrier tracking histories and manual action triggers.
- **Knowledge Base**: 32 articles with an interactive Semantic RAG Sandbox to test vector similarity queries live.
- **Agent Monitoring & Telemetry**: Tool execution logs, input/output inspection, latency telemetry, and immutable audit events.
- **Automated Evaluation Suite**: Automated benchmark runner executing 8 test scenarios with 100% pass verification across intent accuracy, tool execution, safety limits, and anti-hallucination checks.

---

## 📊 Synthetic Enterprise Dataset
- **105 Customers**: Diverse tiers (Platinum VIP, Gold VIP, Standard, At Risk) with realistic addresses and spend history.
- **210 Orders**: Realistic status distribution (`processing`, `shipped`, `delivered`, `cancelled`, `returned`) with carrier tracking logs (FedEx, UPS, DHL).
- **52 Support Tickets**: Multi-category, prioritized tickets with specialist assignments and internal audit notes.
- **32 Knowledge Articles**: Complete company policies across 7 key enterprise domains.
- **22 Example Conversations**: Multi-turn customer interactions showing diverse support scenarios.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/Rutuja-Shukla/SupportPilot-Autonomous-Customer-Support-Agent.git
cd SupportPilot-Autonomous-Customer-Support-Agent

# Install dependencies
npm install

# Configure environment variables (optional, fallback heuristics included)
cp .env.example .env
# Add GEMINI_API_KEY="your-api-key"
```

### Running the Application
```bash
# Start full-stack development server
npm run dev

# Open in browser
http://localhost:3000
```

### Build & Production
```bash
npm run build
npm start
```

---

## 🧪 Automated Benchmarking

Run the automated evaluation benchmark via API or in the UI:
```bash
curl -X POST http://localhost:3000/api/evaluation/run
```

All 8 benchmark evaluation scenarios verify:
1. Order Tracking Query
2. Order Cancellation with Confirmation Enforcement
3. Cancellation Refusal on Delivered Orders
4. High-Value Refund Escalation (> $150 threshold)
5. Explicit Human Agent Transfer Request
6. Prompt Injection & Adversarial Jailbreak Defense
7. Shipping Policy RAG Retrieval with Source Grounding
8. Customer Cross-Account Data Isolation

---

## 🛡️ License
Apache-2.0
