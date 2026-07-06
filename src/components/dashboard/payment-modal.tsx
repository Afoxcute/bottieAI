"use client";

import { useState, useEffect } from "react";
import { arcKit, AGENT_CHAIN } from "@/lib/arc-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";

const USDC_CONTRACT = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
const RECEIVER = "0x9404966338eB27aF420a952574d777598Bbb58c4" as const;

const TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function" as const,
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

function useFirstBrowserWallet() {
  const [provider, setProvider] = useState<any>(null);
  useEffect(() => {
    const handler = (e: any) => {
      setProvider((prev: any) => prev ?? e.detail.provider);
    };
    window.addEventListener("eip6963:announceProvider", handler);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", handler);
  }, []);
  return provider;
}

interface PaymentModalProps {
  title: string;
  subtitle: string;
  icon: string;
  amount: number;
  ctaLabel?: string;
  onSuccess: (txHash: string) => void;
  onClose: () => void;
}

export function PaymentModal({
  title,
  subtitle,
  icon,
  amount,
  ctaLabel,
  onSuccess,
  onClose,
}: PaymentModalProps) {
  const browserProvider = useFirstBrowserWallet();
  const [arcPending, setArcPending] = useState(false);
  const [arcError, setArcError] = useState<string | null>(null);

  // wagmi fallback (used when no EIP-6963 browser wallet is present)
  const {
    writeContract,
    data: txHash,
    isPending,
    error: wagmiError,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed && txHash) {
      onSuccess(txHash);
    }
  }, [isConfirmed, txHash, onSuccess]);

  const handlePay = async () => {
    setArcError(null);

    if (browserProvider) {
      // Arc AppKit send path — preferred when browser wallet available
      setArcPending(true);
      try {
        const adapter = await createViemAdapterFromProvider({ provider: browserProvider });
        const result = await arcKit.send({
          from: { adapter, chain: AGENT_CHAIN },
          to: RECEIVER,
          amount: amount.toFixed(6),
          token: "USDC",
        });
        const hash =
          (result as any)?.hash ??
          (result as any)?.transactionHash ??
          `arc-${Date.now()}`;
        onSuccess(hash);
      } catch (err: any) {
        const msg = (err?.message ?? "").toLowerCase();
        setArcError(
          msg.includes("reject") || msg.includes("cancel") || msg.includes("denied")
            ? "Payment cancelled."
            : "Payment could not be processed. Please try again.",
        );
      } finally {
        setArcPending(false);
      }
      return;
    }

    // wagmi fallback
    reset();
    writeContract({
      address: USDC_CONTRACT,
      abi: TRANSFER_ABI,
      functionName: "transfer",
      args: [RECEIVER, parseUnits(amount.toFixed(6), 6)],
    });
  };

  const isBusy = arcPending || isPending || isConfirming;

  let btnLabel = ctaLabel ?? `Pay $${amount.toFixed(2)}`;
  if (arcPending || isPending) btnLabel = "Confirm in wallet…";
  if (isConfirming) btnLabel = "Processing payment…";

  const friendlyError =
    arcError ??
    (wagmiError
      ? wagmiError.message?.includes("User rejected")
        ? "Payment cancelled."
        : "Payment could not be processed. Please try again."
      : null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-[#1B1C19] p-6 pb-10 border-t border-[#2A2B27]">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#F2F0E8]">Confirm Payment</h3>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="rounded-full p-1.5 text-[#A7A79A] hover:bg-white/[0.06] disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Details card */}
        <div className="mb-6 rounded-2xl bg-[#141513] border border-[#2A2B27] p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-3xl">
              {icon}
            </div>
            <div>
              <p className="font-semibold text-[#F2F0E8]">{title}</p>
              <p className="text-sm text-[#A7A79A]">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#2A2B27] pt-3">
            <span className="text-sm text-[#A7A79A]">Amount due</span>
            <span className="text-2xl font-bold text-[#F2F0E8]">
              ${amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Error */}
        {friendlyError && (
          <div className="mb-4 rounded-xl bg-red-900/20 px-4 py-2.5 text-sm text-red-400">
            {friendlyError}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handlePay}
          disabled={isBusy}
          className="w-full rounded-2xl bg-[#8FAE82] py-3.5 text-sm font-semibold text-[#141513] disabled:opacity-60"
        >
          {btnLabel}
        </button>
        <button
          onClick={onClose}
          disabled={isBusy}
          className="mt-3 w-full rounded-2xl py-2.5 text-sm text-[#A7A79A] disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
