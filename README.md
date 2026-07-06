# Bottie — AI Financial Assistant

**Pay bills, subscribe to services, and invest — by chat or tap.**

Bottie is a mobile-first AI financial assistant that lets you manage recurring subscriptions, internet/cable bills, utilities, and investments (stocks, ETFs, pre-IPO) through natural conversation or a clean web2-style UI. The AI agent can execute payments autonomously using Circle Gateway nanopayments on Base Sepolia. Funding the agent wallet uses Arc AppKit Send and Bridge.

---

## How it works

1. **Sign up with email or social.** Privy creates an embedded EOA wallet — no seed phrases, no browser extension required.
2. **Browse bills and investments.** 16 pre-loaded bills (streaming, internet, cable, utility) and 10 assets (stocks, ETFs, pre-IPO) are shown in the UI.
3. **Pay manually or via the AI.** Tap "Subscribe" on any bill or "Buy" on any asset — a payment sheet opens and sends USDC on Base Sepolia. Or type "Pay my Netflix" in the chat and the agent handles it.
4. **Fund the agent wallet** when balance is low via the "Add Funds" sheet — Send from a browser wallet (Arc AppKit) or Bridge from 8 other testnets (Arc AppKit Bridge → Base Sepolia).
5. **Track history.** Every payment is recorded and shown in the History tab.

---

## Features

- **AI agent** — Chat with DeepSeek via Vercel AI SDK. Agent can list bills, pay subscriptions, buy investments, check nanopay balance, deposit/withdraw from Circle Gateway, and pay x402-protected URLs.
- **Arc AppKit Send** — Fund the agent wallet by sending USDC from any EIP-6963 browser wallet (MetaMask, Coinbase Wallet, etc.) on Base Sepolia.
- **Arc AppKit Bridge** — Bridge USDC from 8 source testnets (Arc Testnet, Ethereum Sepolia, Arbitrum Sepolia, Optimism Sepolia, Avalanche Fuji, Polygon Amoy, Linea Sepolia, Base Sepolia) into the agent wallet.
- **Arc AppKit Send in payment modal** — Bill and investment payments route through `arcKit.send()` when a browser wallet is present; wagmi `writeContract` fallback for embedded-wallet-only users.
- **Circle Gateway nanopayments** — Agent wallet makes gas-free USDC payments via the x402 protocol (`@circle-fin/x402-batching`). The `/api/nanopay/sell` endpoint is a live x402-protected seller endpoint.
- **Demo data** — 16 bills and 10 assets are hardcoded in `src/lib/demo-data.ts`. The UI never prompts users to add bills — everything is pre-loaded and feels like a real app.
- **Web2-friendly UX** — No crypto jargon. "Payment cancelled" not "transaction rejected". Receiver wallet never shown in the UI.
- **Low-balance alert** — Amber banner appears when USDC balance < $10, with a one-tap "Add Funds" button.
- **Payment history** — All AI-executed payments are recorded in Postgres (via Drizzle + Neon). UI payments are tracked in localStorage.
- **Voice input** — OpenAI Whisper for chat voice transcription.
- **PWA** — Installable as a home screen app.

---

## Circle integrations

### Arc AppKit (`@circle-fin/app-kit`, `@circle-fin/adapter-viem-v2`)

| Feature | File | What it does |
|---------|------|-------------|
| Send | `src/components/dashboard/fund-wallet-sheet.tsx` | Sends USDC from a browser wallet to the agent wallet on Base Sepolia |
| Bridge | `src/components/dashboard/fund-wallet-sheet.tsx` | Bridges USDC from 8 source chains into the agent wallet |
| Send (payments) | `src/components/dashboard/payment-modal.tsx` | Routes bill/investment payments through Arc AppKit when EIP-6963 wallet detected |
| Config | `src/lib/arc-kit.ts` | `arcKit` singleton, `AGENT_CHAIN = Blockchain.Base_Sepolia`, 8 bridge source options |

**Send call pattern:**
```ts
const adapter = await createViemAdapterFromProvider({ provider: eip6963Provider });
await arcKit.send({
  from: { adapter, chain: Blockchain.Base_Sepolia },
  to: recipientAddress,
  amount: "10.00",
  token: "USDC",
});
```

**Bridge call pattern:**
```ts
await arcKit.bridge({
  from: { adapter, chain: BridgeChain.Ethereum_Sepolia },
  to: { adapter, chain: Blockchain.Base_Sepolia, recipientAddress: agentAddress },
  amount: "50.00",
  token: "USDC",
});
```

### Circle Gateway (`@circle-fin/x402-batching`)

| Feature | File | What it does |
|---------|------|-------------|
| Buyer client | `src/lib/circle-gateway.ts` | `GatewayClient` for the agent to make nanopayments |
| Facilitator client | `src/lib/circle-gateway.ts` | `BatchFacilitatorClient` to settle incoming payments |
| x402 seller endpoint | `src/app/api/nanopay/sell/route.ts` | Returns `402 + PAYMENT-REQUIRED` without signature; settles with signature |
| Balance check | `src/app/api/nanopay/balance/route.ts` | Agent's Gateway spendable balance |
| Deposit | `src/app/api/nanopay/deposit/route.ts` | Top up Gateway balance from agent wallet |
| Pay | `src/app/api/nanopay/pay/route.ts` | Agent pays any x402-protected URL |
| Withdraw | `src/app/api/nanopay/withdraw/route.ts` | Pull Gateway balance back to agent wallet |

**x402 seller flow:**
1. `GET /api/nanopay/sell` without header → `402` + `PAYMENT-REQUIRED: <base64 requirements>`
2. `GatewayClient.pay(url)` reads the 402, signs, retries with `PAYMENT-SIGNATURE` header
3. Seller calls `facilitator.settle(payload, requirements)` → success

---

## AI agent tools

| Tool | Description |
|------|-------------|
| `get_bills` | Returns full catalog of 16 demo bills with amounts and due dates |
| `pay_bill` | Looks up bill from demo catalog, calls Circle Gateway `client.pay()` on the x402 sell endpoint, records payment in DB |
| `get_investments` | Returns 10 demo assets (stocks, ETFs, pre-IPO) with live prices and 24h change |
| `buy_investment` | Looks up asset from demo catalog, calls Circle Gateway nanopayment, records in DB |
| `get_market_prices` | Current prices filtered by type (stock / ipo / etf) or symbol |
| `get_payment_history` | Recent payments from Postgres `payments` table |
| `get_nanopay_balance` | Agent's Circle Gateway balance on Base Sepolia |
| `nanopay_deposit` | Deposit USDC into Gateway for gas-free spending |
| `nanopay_pay` | Pay any x402-protected URL using Gateway |
| `nanopay_withdraw` | Withdraw unused Gateway balance back to wallet |

---

## Demo data

**Bills** (`src/lib/demo-data.ts`) — 16 pre-loaded:

| Category | Bills |
|----------|-------|
| Streaming | Netflix $15.49, Spotify $9.99, Max $15.99, Disney+ $7.99, Apple TV+ $9.99, Hulu $17.99, YouTube Premium $13.99, Amazon Prime $14.99 |
| Internet | Xfinity Internet $79.99, AT&T Fiber $65.00, Verizon Home Internet $69.99 |
| Cable | Xfinity TV $89.99, DirecTV $74.99 |
| Utility | Electric $120.00, Water & Sewer $45.00, Natural Gas $38.50 |

**Assets** (`src/lib/demo-data.ts`) — 10 pre-loaded:

| Type | Assets |
|------|--------|
| Stock | AAPL, TSLA, GOOGL, MSFT, NVDA, AMZN |
| Pre-IPO | SPACEX, OPENAI |
| ETF | SPY, QQQ |

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| AI | Vercel AI SDK v5, DeepSeek Chat, OpenAI Whisper |
| Auth | Privy (EOA embedded wallets) |
| Onchain | wagmi v2, viem |
| Arc AppKit | `@circle-fin/app-kit`, `@circle-fin/adapter-viem-v2` |
| Circle Gateway | `@circle-fin/x402-batching` (buyer + facilitator) |
| Database | Neon Postgres, Drizzle ORM |
| State | React context + localStorage (UI), Postgres (AI payments) |
| Network | Base Sepolia only (chain ID 84532) |
| Hosting | Vercel |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Root layout + providers
│   ├── sw.ts                             # PWA service worker
│   ├── app/
│   │   └── page.tsx                      # Dashboard (DemoStateProvider wrapper)
│   └── api/
│       ├── chat/route.ts                 # AI chat stream endpoint
│       ├── nanopay/
│       │   ├── sell/route.ts             # x402-protected seller endpoint ($0.01 USDC)
│       │   ├── pay/route.ts              # Agent pays an x402 URL
│       │   ├── balance/route.ts          # Agent Gateway balance
│       │   ├── deposit/route.ts          # Deposit into Gateway
│       │   └── withdraw/route.ts         # Withdraw from Gateway
│       ├── bills/route.ts                # Bills CRUD (legacy — UI uses demo-data)
│       ├── investments/route.ts          # Investments CRUD (legacy)
│       └── payments/route.ts             # Payment history
├── components/
│   ├── dashboard/
│   │   ├── bills-screen.tsx              # 16 hardcoded bills, subscribe flow
│   │   ├── investments-screen.tsx        # 10 hardcoded assets, buy flow
│   │   ├── payments-screen.tsx           # Payment history from localStorage
│   │   ├── payment-modal.tsx             # Arc AppKit send → wagmi fallback
│   │   └── fund-wallet-sheet.tsx         # Arc AppKit Send + Bridge tabs
│   └── chat/                             # AI chat UI components
├── contexts/
│   └── demo-state-context.tsx            # localStorage state (paidBillIds, portfolio, payments)
├── hooks/
│   └── use-usdc-balance.ts               # wagmi USDC balance hook
├── lib/
│   ├── arc-kit.ts                        # arcKit singleton + chain/bridge constants
│   ├── circle-gateway.ts                 # GatewayClient + BatchFacilitatorClient
│   ├── demo-data.ts                      # DEMO_BILLS, DEMO_ASSETS, ASSET_PRICES
│   ├── constants.ts                      # Chain IDs, token addresses, Circle constants
│   └── ai/
│       ├── tools.ts                      # 10 AI tools
│       ├── system-prompt.ts              # Agent instructions
│       └── window-messages.ts            # Conversation windowing
└── db/
    └── schema.ts                         # goals, activities, bills, investments, payments
```

---

## Database schema

**payments** — AI-executed payment records

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| userId | text | Privy user ID |
| type | text | `"bill"` or `"investment"` |
| referenceId | text | Bill ID or asset symbol |
| description | text | Human-readable description |
| amountUsdc | text | Payment amount in USDC |
| status | text | `"completed"` or `"failed"` |
| txHash | text (nullable) | Circle Gateway transaction hash if nanopay used |
| createdAt | timestamp | |

**bills** / **investments** / **goals** / **activities** — legacy tables retained from earlier build.

---

## Environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy app public ID | [console.privy.io](https://console.privy.io) |
| `PRIVY_APP_SECRET` | Yes | Privy app secret (server-only) | [console.privy.io](https://console.privy.io) |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Yes | Alchemy RPC key for Base Sepolia | [dashboard.alchemy.com](https://dashboard.alchemy.com) |
| `DATABASE_URL` | Yes | Neon Postgres connection string | [neon.tech](https://neon.tech) |
| `DEEPSEEK_API_KEY` | Yes | DeepSeek API key for AI chat | [platform.deepseek.com](https://platform.deepseek.com) |
| `OPENAI_API_KEY` | Yes | OpenAI API key for voice transcription | [platform.openai.com](https://platform.openai.com) |
| `CIRCLE_BUYER_PRIVATE_KEY` | Yes | Private key of agent EOA wallet (server-only) | Generate a new wallet, export private key, fund with Base Sepolia USDC at [faucet.circle.com](https://faucet.circle.com) |
| `CIRCLE_SELLER_ADDRESS` | Yes | EVM address that receives x402 seller payments | Any wallet address (e.g. the same receiver used for bill payments) |
| `NEXT_PUBLIC_APP_URL` | Yes | Deployed app URL (used by AI tools for internal API calls) | Your Vercel URL or `http://localhost:3000` locally |
| `CIRCLE_USDC_ADDRESS` | No | Override USDC address on Base Sepolia | Default: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| `CIRCLE_GATEWAY_WALLET_ADDRESS` | No | Override Circle GatewayWallet contract | Default: fetched from facilitator |

> `CIRCLE_BUYER_PRIVATE_KEY` is server-only and **never** prefixed with `NEXT_PUBLIC_`. Keep it secret.

---

## Getting started

### Prerequisites

- Node.js 20+ or Bun
- A [Privy](https://privy.io) app (EOA wallets enabled, Base Sepolia)
- A [Neon](https://neon.tech) Postgres database

### Setup

```bash
git clone https://github.com/Afoxcute/bottieAI.git
cd bottieAI
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` is required due to `@circle-fin/app-kit` peer dependency constraints.

Copy and fill environment variables:

```bash
cp .env.example .env
# edit .env with your values
```

Push the database schema:

```bash
npx drizzle-kit push
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key implementation notes

### EIP-6963 wallet discovery
`fund-wallet-sheet.tsx` and `payment-modal.tsx` both use native browser EIP-6963 events to discover injected wallets (MetaMask, Coinbase Wallet, etc.) without requiring a wallet-connect modal. The pattern:
```ts
window.addEventListener("eip6963:announceProvider", handler);
window.dispatchEvent(new Event("eip6963:requestProvider"));
```

### Payment flow (UI)
1. User taps "Subscribe" or "Buy"
2. `PaymentModal` opens
3. If EIP-6963 wallet detected → `arcKit.send()` via `createViemAdapterFromProvider({ provider })`
4. If no browser wallet → wagmi `writeContract` (USDC ERC-20 transfer)
5. On success → `onSuccess(txHash)` updates `DemoStateContext` (localStorage)

### Payment flow (AI agent)
1. User says "Pay my Netflix"
2. Agent calls `pay_bill({ billName: "Netflix" })`
3. Tool looks up bill from `DEMO_BILLS`, calls `GatewayClient.pay(${APP_URL}/api/nanopay/sell)`
4. Sell endpoint returns 402 → client signs → retries → facilitator settles
5. Payment recorded in Postgres `payments` table

### Demo state
UI payment state (which bills are active, portfolio positions) lives in `DemoStateContext` backed by `localStorage` key `"bottie_v1"`. This is independent of the Postgres DB — AI tools write to DB, UI reads from localStorage. The two are intentionally decoupled for demo simplicity.

### Arc AppKit chain enums
Verified by inspecting the installed package at runtime:
```
Blockchain.Base_Sepolia = "Base_Sepolia"
BridgeChain.Arc_Testnet = "Arc_Testnet"
BridgeChain.Ethereum_Sepolia = "Ethereum_Sepolia"
// etc.
```

---

## Hackathon

Built for **Lepton by Canteen** — Circle / Arc hackathon.

**Circle tools used:**
- `@circle-fin/app-kit` — Arc AppKit Send + Bridge
- `@circle-fin/adapter-viem-v2` — viem adapter for Arc AppKit from EIP-6963 providers
- `@circle-fin/x402-batching` — Circle Gateway nanopayments (buyer + facilitator/seller)

---

## License

MIT
