/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ChatView } from './components/ChatView.tsx';
import { HumanWorkspaceView } from './components/HumanWorkspaceView.tsx';
import { TicketsView } from './components/TicketsView.tsx';
import { ConversationsView } from './components/ConversationsView.tsx';
import { CustomersView } from './components/CustomersView.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { KnowledgeBaseView } from './components/KnowledgeBaseView.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { EvaluationView } from './components/EvaluationView.tsx';
import { DashboardMetrics, CustomerProfile } from './types/index.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoadingMetrics(true);
    try {
      const [analyticsRes, customersRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/customers?limit=105'),
      ]);

      if (analyticsRes.ok) {
        setMetrics(await analyticsRes.json());
      }
      if (customersRes.ok) {
        const custData = await customersRes.json();
        setCustomers(custData.items || []);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const handleResetData = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      if (res.ok) {
        await loadInitialData();
      }
    } catch (err) {
      console.error('Failed to reset synthetic data:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectCustomerForChat = (customerId: string) => {
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onResetData={handleResetData}
        isResetting={isResetting}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === 'overview' && (
          <DashboardView
            metrics={metrics}
            onNavigateTab={setActiveTab}
            isLoading={isLoadingMetrics}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            customers={customers}
            onRefreshMetrics={loadInitialData}
          />
        )}

        {activeTab === 'workspace' && (
          <HumanWorkspaceView onRefreshMetrics={loadInitialData} />
        )}

        {activeTab === 'tickets' && (
          <TicketsView onRefreshMetrics={loadInitialData} />
        )}

        {activeTab === 'conversations' && (
          <ConversationsView onSelectConversationForChat={handleSelectCustomerForChat} />
        )}

        {activeTab === 'customers' && (
          <CustomersView onSelectCustomerForChat={handleSelectCustomerForChat} />
        )}

        {activeTab === 'orders' && (
          <OrdersView onRefreshMetrics={loadInitialData} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeBaseView />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationView />
        )}
      </main>

      {/* Enterprise Status Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-3 px-4 sm:px-6 text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">SupportPilot</span>
            <span>•</span>
            <span>Enterprise Autonomous Customer Support Agent</span>
            <span>•</span>
            <span className="text-emerald-400">Audit Logging Enabled</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Synthetic Enterprise Demo Environment</span>
            <span>•</span>
            <span>Gemini 3.8 Flash RAG Pipeline</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
