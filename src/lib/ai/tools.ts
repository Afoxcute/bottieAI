import { tool } from "ai";
import { z } from "zod";
import { eq, desc, and, or } from "drizzle-orm";
import { INVESTMENT_OPTIONS, BILL_PROVIDERS } from "@/lib/constants";
import { db } from "@/lib/db";
import { bills, investments, payments } from "@/lib/db/schema";

export function createTools(walletAddress?: string, userId?: string) {
  return {
    // ── Bills ─────────────────────────────────────────────────────────────────

    get_bills: tool({
      description:
        "Fetch the user's tracked bills — subscriptions, utilities, cable, internet. Returns all bills with status.",
      inputSchema: z.object({
        category: z
          .string()
          .optional()
          .describe("Filter by category: streaming, internet, cable, utility"),
      }),
      execute: async ({ category }) => {
        if (!userId) return { error: "Not authenticated" };
        try {
          const userBills = await db
            .select()
            .from(bills)
            .where(eq(bills.userId, userId))
            .orderBy(desc(bills.createdAt));

          const filtered = category
            ? userBills.filter((b) => b.category === category)
            : userBills;

          if (filtered.length === 0)
            return { message: "No bills found", bills: [] };

          return {
            bills: filtered.map((b) => ({
              id: b.id,
              name: b.name,
              category: b.category,
              amount: b.amount,
              dueDate: b.dueDate,
              status: b.status,
              autopay: b.autopay,
            })),
          };
        } catch (err: any) {
          return { error: err?.message || "Failed to fetch bills" };
        }
      },
    }),

    pay_bill: tool({
      description:
        "Pay a specific bill by name or ID. The user must have explicitly said 'pay my [bill name] bill' or similar. Looks up the bill, sends USDC payment via Circle Gateway (or simulates if no key set), records the payment.",
      inputSchema: z.object({
        billName: z
          .string()
          .optional()
          .describe("The bill name to pay (e.g. 'Netflix', 'AT&T Internet')"),
        billId: z
          .string()
          .optional()
          .describe("The bill ID to pay (UUID)"),
      }),
      execute: async ({ billName, billId }) => {
        if (!userId) return { error: "Not authenticated" };
        if (!billName && !billId)
          return { error: "Provide a bill name or ID" };

        try {
          // Find the bill
          const userBills = await db
            .select()
            .from(bills)
            .where(eq(bills.userId, userId));

          const bill = billId
            ? userBills.find((b) => b.id === billId)
            : userBills.find((b) =>
                b.name.toLowerCase().includes((billName ?? "").toLowerCase())
              );

          if (!bill) return { error: `Bill not found: ${billName ?? billId}` };
          if (bill.status === "paid")
            return { message: `${bill.name} is already marked as paid.` };

          const amountUsdc = String(bill.amount);
          let txHash: string | null = null;
          let paymentStatus = "completed";

          // Attempt real payment if key available
          if (process.env.CIRCLE_BUYER_PRIVATE_KEY && bill.payeeAddress) {
            try {
              const { getBuyerClient } = await import("@/lib/circle-gateway");
              const client = getBuyerClient();
              // Use a simple transfer / pay call — simulate URL payment
              const resourceUrl = `https://pay.bottie.app/bill/${bill.id}`;
              // For demo: attempt nanopay-style payment via the gateway
              const result = await (client as any).pay?.(resourceUrl).catch(() => null);
              txHash = result?.transaction ?? null;
            } catch {
              // Fall through to simulation
            }
          }

          // Record payment
          const [payment] = await db
            .insert(payments)
            .values({
              userId,
              type: "bill",
              referenceId: bill.id,
              description: `Paid ${bill.name}`,
              amountUsdc,
              status: paymentStatus,
              txHash,
            })
            .returning();

          // Update bill status
          await db
            .update(bills)
            .set({ status: "paid", updatedAt: new Date() })
            .where(eq(bills.id, bill.id));

          return {
            success: true,
            message: `Successfully paid ${bill.name} — $${amountUsdc} USDC`,
            paymentId: payment.id,
            txHash,
            simulated: !txHash,
          };
        } catch (err: any) {
          return { error: err?.message || "Payment failed" };
        }
      },
    }),

    add_bill: tool({
      description:
        "Add a new bill or subscription to track. Use when the user wants to add a bill to their list.",
      inputSchema: z.object({
        name: z.string().describe("Bill name, e.g. 'Netflix', 'AT&T Internet'"),
        category: z
          .enum(["streaming", "cable", "internet", "utility", "investment"])
          .describe("Category of the bill"),
        amount: z
          .string()
          .describe("Monthly amount in USDC, e.g. '15.49'"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date, e.g. '15' for 15th of month or '2024-02-15'"),
        autopay: z.boolean().optional().describe("Whether to autopay this bill"),
      }),
      execute: async ({ name, category, amount, dueDate, autopay }) => {
        if (!userId) return { error: "Not authenticated" };
        try {
          // Look up known provider for payee address
          const providerKey = Object.keys(BILL_PROVIDERS).find((k) =>
            name.toLowerCase().includes(k) ||
            BILL_PROVIDERS[k].name.toLowerCase().includes(name.toLowerCase())
          );
          const provider = providerKey ? BILL_PROVIDERS[providerKey] : null;

          const [bill] = await db
            .insert(bills)
            .values({
              userId,
              name,
              category,
              amount,
              dueDate: dueDate ?? null,
              payeeAddress: provider?.payeeAddress ?? null,
              autopay: autopay ?? false,
              status: "pending",
              logoUrl: provider?.logo ?? null,
            })
            .returning();

          return {
            success: true,
            bill: {
              id: bill.id,
              name: bill.name,
              category: bill.category,
              amount: bill.amount,
              dueDate: bill.dueDate,
              status: bill.status,
            },
          };
        } catch (err: any) {
          return { error: err?.message || "Failed to add bill" };
        }
      },
    }),

    // ── Investments ───────────────────────────────────────────────────────────

    get_investments: tool({
      description:
        "Fetch the user's current investment portfolio — stocks, ETFs, pre-IPO positions.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!userId) return { error: "Not authenticated" };
        try {
          const positions = await db
            .select()
            .from(investments)
            .where(eq(investments.userId, userId))
            .orderBy(desc(investments.createdAt));

          if (positions.length === 0)
            return { message: "No investments yet", portfolio: [] };

          const portfolio = positions.map((pos) => {
            const market = INVESTMENT_OPTIONS[pos.symbol];
            const currentPrice = market?.currentPriceUsd ?? Number(pos.avgPriceUsd);
            const currentValue = currentPrice * Number(pos.shares);
            const costBasis = Number(pos.avgPriceUsd) * Number(pos.shares);
            const gainLoss = currentValue - costBasis;
            return {
              id: pos.id,
              symbol: pos.symbol,
              name: pos.name,
              type: pos.type,
              shares: pos.shares,
              avgPriceUsd: pos.avgPriceUsd,
              currentPriceUsd: currentPrice.toFixed(2),
              currentValueUsd: currentValue.toFixed(2),
              gainLossUsd: gainLoss.toFixed(2),
            };
          });

          const totalValue = portfolio.reduce(
            (sum, p) => sum + Number(p.currentValueUsd),
            0
          );

          return { portfolio, totalValueUsd: totalValue.toFixed(2) };
        } catch (err: any) {
          return { error: err?.message || "Failed to fetch investments" };
        }
      },
    }),

    buy_investment: tool({
      description:
        "Buy shares of a stock, ETF, or pre-IPO company using USDC. The user must confirm the purchase. Calculates total USDC cost and records the transaction.",
      inputSchema: z.object({
        symbol: z
          .string()
          .describe(
            "Ticker symbol to buy (e.g. AAPL, TSLA, SPACEX, SPY)"
          ),
        shares: z
          .string()
          .describe("Number of shares to buy (e.g. '1', '0.5', '2')"),
      }),
      execute: async ({ symbol, shares }) => {
        if (!userId) return { error: "Not authenticated" };
        const sym = symbol.toUpperCase();
        const market = INVESTMENT_OPTIONS[sym];
        if (!market) {
          return {
            error: `Unknown symbol: ${sym}. Available: ${Object.keys(INVESTMENT_OPTIONS).join(", ")}`,
          };
        }
        if (!market.available) return { error: `${sym} is not available for purchase` };

        const sharesNum = Number(shares);
        if (isNaN(sharesNum) || sharesNum <= 0)
          return { error: "Invalid number of shares" };

        const totalUsdc = (sharesNum * market.currentPriceUsd).toFixed(6);
        let txHash: string | null = null;
        let paymentStatus = "completed";

        // Attempt real payment if key available
        if (process.env.CIRCLE_BUYER_PRIVATE_KEY) {
          try {
            const { getBuyerClient } = await import("@/lib/circle-gateway");
            const client = getBuyerClient();
            const resourceUrl = `https://invest.bottie.app/${sym}/${sharesNum}`;
            const result = await (client as any).pay?.(resourceUrl).catch(() => null);
            txHash = result?.transaction ?? null;
          } catch {
            // Fall through to simulation
          }
        }

        try {
          // Check for existing position
          const existing = await db
            .select()
            .from(investments)
            .where(and(eq(investments.userId, userId), eq(investments.symbol, sym)));

          if (existing.length > 0) {
            // Update existing position with weighted avg price
            const pos = existing[0];
            const oldShares = Number(pos.shares);
            const oldAvg = Number(pos.avgPriceUsd);
            const newShares = oldShares + sharesNum;
            const newAvg = (oldShares * oldAvg + sharesNum * market.currentPriceUsd) / newShares;

            await db
              .update(investments)
              .set({
                shares: newShares.toFixed(8),
                avgPriceUsd: newAvg.toFixed(6),
                updatedAt: new Date(),
              })
              .where(eq(investments.id, pos.id));
          } else {
            await db.insert(investments).values({
              userId,
              symbol: sym,
              name: market.name,
              type: market.type,
              shares: sharesNum.toFixed(8),
              avgPriceUsd: market.currentPriceUsd.toFixed(6),
            });
          }

          const [payment] = await db
            .insert(payments)
            .values({
              userId,
              type: "investment",
              referenceId: sym,
              description: `Bought ${shares} shares of ${market.name} (${sym})`,
              amountUsdc: totalUsdc,
              status: paymentStatus,
              txHash,
            })
            .returning();

          return {
            success: true,
            message: `Bought ${shares} shares of ${market.name} (${sym}) for $${totalUsdc} USDC`,
            symbol: sym,
            shares,
            pricePerShare: market.currentPriceUsd,
            totalUsdc,
            paymentId: payment.id,
            txHash,
            simulated: !txHash,
          };
        } catch (err: any) {
          return { error: err?.message || "Investment purchase failed" };
        }
      },
    }),

    get_market_prices: tool({
      description:
        "Get current prices and details for available stocks, ETFs, and pre-IPO companies.",
      inputSchema: z.object({
        type: z
          .enum(["stock", "ipo", "etf", "all"])
          .optional()
          .describe("Filter by asset type"),
        symbol: z
          .string()
          .optional()
          .describe("Get details for a specific symbol"),
      }),
      execute: async ({ type, symbol }) => {
        const options = Object.entries(INVESTMENT_OPTIONS);
        let filtered = options;

        if (symbol) {
          filtered = options.filter(([k]) => k === symbol.toUpperCase());
        } else if (type && type !== "all") {
          filtered = options.filter(([, v]) => v.type === type);
        }

        return {
          assets: filtered.map(([sym, v]) => ({
            symbol: sym,
            name: v.name,
            type: v.type,
            currentPriceUsd: v.currentPriceUsd,
            description: v.description,
            available: v.available,
          })),
        };
      },
    }),

    get_payment_history: tool({
      description:
        "Fetch the user's payment history — bills paid and investments made.",
      inputSchema: z.object({
        limit: z
          .number()
          .optional()
          .describe("Number of records to return (default 20)"),
        type: z
          .enum(["bill", "investment"])
          .optional()
          .describe("Filter by payment type"),
      }),
      execute: async ({ limit, type }) => {
        if (!userId) return { error: "Not authenticated" };
        try {
          const cap = Math.min(limit ?? 20, 100);
          const records = await db
            .select()
            .from(payments)
            .where(
              type
                ? and(eq(payments.userId, userId), eq(payments.type, type))
                : eq(payments.userId, userId)
            )
            .orderBy(desc(payments.createdAt))
            .limit(cap);

          return {
            payments: records.map((p) => ({
              id: p.id,
              type: p.type,
              description: p.description,
              amountUsdc: p.amountUsdc,
              status: p.status,
              txHash: p.txHash,
              createdAt: p.createdAt,
            })),
          };
        } catch (err: any) {
          return { error: err?.message || "Failed to fetch payment history" };
        }
      },
    }),

    // ── Circle Gateway Nanopayments ────────────────────────────────────────────

    get_nanopay_balance: tool({
      description:
        "Check the agent's Circle Gateway nanopayments balance on Base Sepolia — both the wallet USDC balance and the spendable Gateway balance for gas-free payments",
      inputSchema: z.object({}),
      execute: async () => {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const res = await fetch(`${base}/api/nanopay/balance`);
        if (!res.ok) return { error: "Failed to fetch nanopay balance" };
        return res.json();
      },
    }),

    nanopay_deposit: tool({
      description:
        "Deposit USDC from the agent wallet into the Circle Gateway balance so it can make gas-free nanopayments. Use this before making payments.",
      inputSchema: z.object({
        amount: z
          .string()
          .describe("Amount of USDC to deposit (e.g. '1' for 1 USDC)"),
      }),
      execute: async ({ amount }) => {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const res = await fetch(`${base}/api/nanopay/deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { error: (err as any).error ?? "Deposit failed" };
        }
        return res.json();
      },
    }),

    nanopay_pay: tool({
      description:
        "Pay for an x402-protected API or content using Circle Gateway nanopayments (gas-free USDC). Provide the full URL of the resource to pay for.",
      inputSchema: z.object({
        url: z
          .string()
          .url()
          .describe("The URL of the x402-protected resource to pay for"),
      }),
      execute: async ({ url }) => {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const res = await fetch(`${base}/api/nanopay/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { error: (err as any).error ?? "Payment failed" };
        }
        return res.json();
      },
    }),

    nanopay_withdraw: tool({
      description:
        "Withdraw USDC from the Circle Gateway balance back to the agent wallet on Base Sepolia.",
      inputSchema: z.object({
        amount: z
          .string()
          .describe("Amount of USDC to withdraw (e.g. '0.5' for 0.5 USDC)"),
      }),
      execute: async ({ amount }) => {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        const res = await fetch(`${base}/api/nanopay/withdraw`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { error: (err as any).error ?? "Withdrawal failed" };
        }
        return res.json();
      },
    }),
  };
}
