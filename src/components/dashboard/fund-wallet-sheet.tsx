"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { arcKit, AGENT_CHAIN, BRIDGE_SOURCE_OPTIONS } from "@/lib/arc-kit";
import type { BridgeSourceChain } from "@/lib/arc-kit";

// ─── EIP-6963 browser-wallet discovery ───────────────────────────────────────

type EIP6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  };
};

function useBrowserWallet() {
  const [discovered, setDiscovered] = useState<EIP6963ProviderDetail[]>([]);
  const [connected, setConnected] = useState<{
    detail: EIP6963ProviderDetail;
    address: string;
  } | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const map = new Map<string, EIP6963ProviderDetail>();

    const onAnnounce = (e: Event) => {
      const { detail } = e as CustomEvent<EIP6963ProviderDetail>;
      map.set(detail.info.uuid, detail);
      setDiscovered([...map.values()]);
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  const connect = useCallback(async (detail: EIP6963ProviderDetail) => {
    setConnecting(true);
    try {
      await detail.provider.request({ method: "eth_requestAccounts" });
      const accounts = (await detail.provider.request({
        method: "eth_accounts",
      })) as string[];
      const address = accounts[0] ?? "";
      setConnected({ detail, address });
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setConnected(null), []);

  return { discovered, connected, connect, disconnect, connecting };
}

// ─── Shared state types ───────────────────────────────────────────────────────

type TxState =
  | { status: "idle" }
  | { status: "pending"; label: string }
  | { status: "success"; explorerUrl?: string }
  | { status: "error"; message: string };

// ─── Copy-to-clipboard helper ─────────────────────────────────────────────────

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

// ─── Wallet selector ──────────────────────────────────────────────────────────

function WalletSelector({
  discovered,
  connected,
  onConnect,
  onDisconnect,
  connecting,
}: {
  discovered: EIP6963ProviderDetail[];
  connected: { detail: EIP6963ProviderDetail; address: string } | null;
  onConnect: (d: EIP6963ProviderDetail) => void;
  onDisconnect: () => void;
  connecting: boolean;
}) {
  if (connected) {
    return (
      <div className="flex items-center justify-between rounded-xl bg-[#141513] border border-[#2A2B27] px-4 py-3">
        <div className="flex items-center gap-2.5">
          {connected.detail.info.icon && (
            <img src={connected.detail.info.icon} alt="" className="h-6 w-6 rounded" />
          )}
          <div>
            <p className="text-xs font-medium text-[#F2F0E8]">{connected.detail.info.name}</p>
            <p className="text-[10px] text-[#A7A79A] font-mono">
              {connected.address.slice(0, 6)}…{connected.address.slice(-4)}
            </p>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="text-xs text-[#A7A79A] hover:text-[#F2F0E8]"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (discovered.length === 0) {
    return (
      <div className="rounded-xl bg-[#141513] border border-[#2A2B27] px-4 py-3 text-sm text-[#A7A79A]">
        No browser wallets detected. Install MetaMask or another wallet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {discovered.map((d) => (
        <button
          key={d.info.uuid}
          onClick={() => onConnect(d)}
          disabled={connecting}
          className="flex items-center gap-3 rounded-xl bg-[#141513] border border-[#2A2B27] px-4 py-3 text-left disabled:opacity-50"
        >
          {d.info.icon && (
            <img src={d.info.icon} alt="" className="h-8 w-8 rounded" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-[#F2F0E8]">{d.info.name}</p>
            <p className="text-xs text-[#A7A79A]">Click to connect</p>
          </div>
          <span className="text-[#8FAE82] text-xs font-medium">Connect →</span>
        </button>
      ))}
    </div>
  );
}

// ─── Transaction result banner ────────────────────────────────────────────────

function TxResult({ state, onReset }: { state: TxState; onReset: () => void }) {
  if (state.status === "idle") return null;
  if (state.status === "pending") {
    return (
      <div className="rounded-xl bg-blue-900/20 border border-blue-900/40 px-4 py-3 text-sm text-blue-300">
        ⏳ {state.label}
      </div>
    );
  }
  if (state.status === "success") {
    return (
      <div className="rounded-xl bg-green-900/20 border border-green-900/40 px-4 py-3 text-sm text-green-400">
        ✓ Transfer complete!{" "}
        {state.explorerUrl && (
          <span className="text-[#A7A79A] text-xs">(confirmed on-chain)</span>
        )}
        <button onClick={onReset} className="ml-3 text-xs underline">
          New transfer
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-red-900/20 border border-red-900/40 px-4 py-3 text-sm text-red-400">
      {state.message}
      <button onClick={onReset} className="ml-3 text-xs underline">
        Try again
      </button>
    </div>
  );
}

// ─── Send tab ─────────────────────────────────────────────────────────────────

function SendTab({ agentAddress }: { agentAddress: string }) {
  const { discovered, connected, connect, disconnect, connecting } = useBrowserWallet();
  const { copied, copy } = useCopy(agentAddress);
  const [amount, setAmount] = useState("");
  const [txState, setTxState] = useState<TxState>({ status: "idle" });

  const handleSend = async () => {
    if (!connected || !amount || Number(amount) <= 0 || txState.status === "pending") return;
    setTxState({ status: "pending", label: "Preparing transfer…" });
    try {
      const adapter = await createViemAdapterFromProvider({
        provider: connected.detail.provider as Parameters<typeof createViemAdapterFromProvider>[0]["provider"],
      });

      setTxState({ status: "pending", label: "Confirm in your wallet…" });
      const result = await arcKit.send({
        from: { adapter, chain: AGENT_CHAIN },
        to: agentAddress,
        amount,
        token: "USDC",
      });

      setTxState({
        status: result.state === "success" ? "success" : "error",
        explorerUrl: (result as any).explorerUrl,
        message: result.state !== "success" ? "Transfer could not be completed." : "",
      } as TxState);
    } catch (err: any) {
      const msg = err?.message ?? "";
      setTxState({
        status: "error",
        message: msg.includes("rejected") || msg.includes("denied")
          ? "Transfer cancelled."
          : "Transfer could not be completed. Please check your balance and try again.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Address display */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-[#A7A79A]">Your wallet address</p>
        <div className="flex items-center gap-2 rounded-xl bg-[#141513] border border-[#2A2B27] px-4 py-3">
          <p className="flex-1 font-mono text-xs text-[#F2F0E8] truncate">{agentAddress}</p>
          <button
            onClick={copy}
            className="shrink-0 rounded-lg bg-[#8FAE82]/20 px-3 py-1 text-xs font-medium text-[#8FAE82]"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[#A7A79A]">
          Share this address to receive funds from any wallet on Base Sepolia.
        </p>
      </div>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-[#2A2B27]" />
        <span className="mx-3 text-xs text-[#A7A79A]">or send directly</span>
        <div className="flex-1 border-t border-[#2A2B27]" />
      </div>

      {/* Browser wallet */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-[#A7A79A]">
          Connect a browser wallet (Base Sepolia)
        </p>
        <WalletSelector
          discovered={discovered}
          connected={connected}
          onConnect={connect}
          onDisconnect={disconnect}
          connecting={connecting}
        />
      </div>

      {connected && (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A7A79A]">
              Amount (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              className="w-full rounded-xl border border-[#2A2B27] bg-[#141513] px-4 py-2.5 text-sm text-[#F2F0E8] placeholder:text-[#A7A79A]/50 outline-none focus:border-[#8FAE82]"
            />
          </div>

          <TxResult state={txState} onReset={() => setTxState({ status: "idle" })} />

          {txState.status !== "success" && (
            <button
              onClick={handleSend}
              disabled={!amount || Number(amount) <= 0 || txState.status === "pending"}
              className="w-full rounded-2xl bg-[#8FAE82] py-3.5 text-sm font-semibold text-[#141513] disabled:opacity-50"
            >
              {txState.status === "pending" ? txState.label : `Send $${amount || "0.00"}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Bridge tab ───────────────────────────────────────────────────────────────

function BridgeTab({ agentAddress }: { agentAddress: string }) {
  const { discovered, connected, connect, disconnect, connecting } = useBrowserWallet();
  const [sourceChain, setSourceChain] = useState<BridgeSourceChain>(
    BRIDGE_SOURCE_OPTIONS[0].value
  );
  const [amount, setAmount] = useState("");
  const [txState, setTxState] = useState<TxState>({ status: "idle" });

  const selectedSource = BRIDGE_SOURCE_OPTIONS.find((o) => o.value === sourceChain)!;

  const handleBridge = async () => {
    if (!connected || !amount || Number(amount) <= 0 || txState.status === "pending") return;
    setTxState({ status: "pending", label: "Preparing bridge…" });
    try {
      const adapter = await createViemAdapterFromProvider({
        provider: connected.detail.provider as Parameters<typeof createViemAdapterFromProvider>[0]["provider"],
      });

      setTxState({ status: "pending", label: "Confirm in your wallet…" });
      const result = await arcKit.bridge({
        from: { adapter, chain: sourceChain },
        to: {
          adapter,
          chain: AGENT_CHAIN,
          recipientAddress: agentAddress,
        },
        amount,
        token: "USDC",
      });

      setTxState({
        status: result.state === "success" ? "success" : "error",
        explorerUrl: (result as any).explorerUrl,
        message: result.state !== "success" ? "Bridge could not be completed." : "",
      } as TxState);
    } catch (err: any) {
      const msg = err?.message ?? "";
      setTxState({
        status: "error",
        message: msg.includes("rejected") || msg.includes("denied")
          ? "Bridge cancelled."
          : "Bridge could not be completed. Check that you have sufficient balance on the source network.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Info blurb */}
      <div className="rounded-xl bg-[#141513] border border-[#2A2B27] px-4 py-3 text-xs text-[#A7A79A] leading-relaxed">
        Bridge moves funds from another network into your wallet on Base Sepolia automatically — no manual steps needed.
      </div>

      {/* Source chain selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#A7A79A]">
          From network
        </label>
        <div className="flex flex-wrap gap-2">
          {BRIDGE_SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSourceChain(opt.value as BridgeSourceChain)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                sourceChain === opt.value
                  ? "bg-[#F2F0E8] text-[#141513]"
                  : "bg-white/[0.06] text-[#A7A79A]"
              }`}
            >
              <span>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Destination display */}
      <div className="flex items-center justify-between rounded-xl bg-[#141513] border border-[#2A2B27] px-4 py-3">
        <div>
          <p className="text-xs text-[#A7A79A]">To network</p>
          <p className="text-sm font-medium text-[#F2F0E8]">🔷 Base Sepolia</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#A7A79A]">Recipient</p>
          <p className="font-mono text-xs text-[#F2F0E8]">Your wallet</p>
        </div>
      </div>

      {/* Browser wallet */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-[#A7A79A]">
          Connect a browser wallet on {selectedSource.label}
        </p>
        <WalletSelector
          discovered={discovered}
          connected={connected}
          onConnect={connect}
          onDisconnect={disconnect}
          connecting={connecting}
        />
      </div>

      {connected && (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A7A79A]">
              Amount (USDC)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50.00"
              className="w-full rounded-xl border border-[#2A2B27] bg-[#141513] px-4 py-2.5 text-sm text-[#F2F0E8] placeholder:text-[#A7A79A]/50 outline-none focus:border-[#8FAE82]"
            />
          </div>

          <TxResult state={txState} onReset={() => setTxState({ status: "idle" })} />

          {txState.status !== "success" && (
            <button
              onClick={handleBridge}
              disabled={!amount || Number(amount) <= 0 || txState.status === "pending"}
              className="w-full rounded-2xl bg-[#8FAE82] py-3.5 text-sm font-semibold text-[#141513] disabled:opacity-50"
            >
              {txState.status === "pending"
                ? txState.label
                : `Bridge $${amount || "0.00"} → Base Sepolia`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

interface FundWalletSheetProps {
  agentAddress: string;
  onClose: () => void;
}

export function FundWalletSheet({ agentAddress, onClose }: FundWalletSheetProps) {
  const [tab, setTab] = useState<"send" | "bridge">("send");

  const sheet = (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1B1C19] border-t border-[#2A2B27] flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h3 className="text-lg font-semibold text-[#F2F0E8]">Add Funds</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#A7A79A] hover:bg-white/[0.06]"
          >
            ✕
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 px-6 pb-4">
          {(["send", "bridge"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-[#F2F0E8] text-[#141513]"
                  : "bg-white/[0.06] text-[#A7A79A]"
              }`}
            >
              {t === "send" ? "↗ Send" : "⇌ Bridge"}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pb-10 flex-1">
          {tab === "send" && <SendTab agentAddress={agentAddress} />}
          {tab === "bridge" && <BridgeTab agentAddress={agentAddress} />}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
