"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useChatSheet } from "@/contexts/chat-context";
import { DemoStateProvider, useDemoState } from "@/contexts/demo-state-context";
import { BillsScreen } from "@/components/dashboard/bills-screen";
import { InvestmentsScreen } from "@/components/dashboard/investments-screen";
import { PaymentsScreen } from "@/components/dashboard/payments-screen";
import { DEMO_BILLS, DEMO_ASSETS, ASSET_PRICES } from "@/lib/demo-data";

type Tab = "bills" | "investments" | "payments" | "chat";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "bills",       label: "Bills",   icon: "🧾" },
  { key: "investments", label: "Invest",  icon: "📈" },
  { key: "payments",    label: "History", icon: "💳" },
  { key: "chat",        label: "Chat",    icon: "💬" },
];

function DashboardInner() {
  const { openSidebar, open: openChat } = useChatSheet();
  const [activeTab, setActiveTab] = useState<Tab>("bills");
  const { paidBillIds, portfolio } = useDemoState();

  const handleTabClick = (tab: Tab) => {
    if (tab === "chat") {
      openChat();
    } else {
      setActiveTab(tab);
    }
  };

  const monthlyBills = DEMO_BILLS.filter((b) => paidBillIds.includes(b.id)).reduce(
    (sum, b) => sum + b.amount,
    0
  );

  const portfolioValue = portfolio.reduce(
    (sum, p) => sum + p.shares * (ASSET_PRICES[p.symbol] ?? p.avgPriceUsd),
    0
  );

  const pendingCount = DEMO_BILLS.length - paidBillIds.length;

  return (
    <div className="relative min-h-dvh">
      {/* Header */}
      <div className="fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3 bg-cream-dark/80 backdrop-blur-sm">
        <button
          onClick={openSidebar}
          className="rounded-full p-2 transition-colors duration-200 hover:bg-ink/[0.04]"
          aria-label="Open settings"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-light">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-xs font-medium text-ink-light/50 uppercase tracking-wide">Bottie</p>
        </div>

        <button
          onClick={() => openChat()}
          className="rounded-full p-2 transition-colors duration-200 hover:bg-ink/[0.04]"
          aria-label="Open chat"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-ink-light">
            <path
              d="M18 10c0 4.418-3.582 8-8 8a7.96 7.96 0 01-4-.107L2 19l1.107-4A7.96 7.96 0 012 10C2 5.582 5.582 2 10 2s8 3.582 8 8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Summary strip */}
      <div className="mt-[calc(env(safe-area-inset-top)+56px)] px-5 pb-2 pt-2">
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-[#1B1C19] border border-[#2A2B27] p-4">
            <p className="text-xs text-[#A7A79A] font-medium">Monthly Bills</p>
            <p className="text-xl font-bold text-[#F2F0E8] mt-0.5">
              ${monthlyBills.toFixed(2)}
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-400 mt-0.5">{pendingCount} not subscribed</p>
            )}
          </div>
          <div className="flex-1 rounded-2xl bg-[#1B1C19] border border-[#2A2B27] p-4">
            <p className="text-xs text-[#A7A79A] font-medium">Portfolio</p>
            <p className="text-xl font-bold text-[#F2F0E8] mt-0.5">
              ${portfolioValue.toFixed(2)}
            </p>
            <p className="text-xs text-green-400 mt-0.5">
              {portfolio.length} position{portfolio.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-20 flex gap-1 bg-cream-dark/90 backdrop-blur-sm px-5 py-2 border-b border-[#2A2B27]">
        {TABS.filter((t) => t.key !== "chat").map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 rounded-xl py-2 transition-colors ${
              activeTab === tab.key
                ? "bg-[#F2F0E8] text-[#141513]"
                : "text-[#A7A79A] hover:bg-white/[0.04]"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {activeTab === "bills"       && <BillsScreen />}
        {activeTab === "investments" && <InvestmentsScreen />}
        {activeTab === "payments"    && <PaymentsScreen />}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DemoStateProvider>
      <DashboardInner />
    </DemoStateProvider>
  );
}
