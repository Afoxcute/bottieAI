export const YO_GATEWAY = "0xF1EeE0957267b1A474323Ff9CfF7719E964969FA" as const;
export const YO_REGISTRY = "0x56c3119DC3B1a75763C87D5B0A2C55E489502232" as const;
export const YO_ORACLE = "0x6E879d0CcC85085A709eBf5539224f53d0D396B0" as const;
export const YO_REDEEMER = "0x0439e941841f97dc1334d1a433379c6fcdcc2162" as const;

export const VAULTS = {
  yoUSD: {
    base: "0x0000000f2eB9f69274678c76222B35eEc7588a65" as const,
  },
  yoETH: {
    base: "0x3a43aec53490cb9fa922847385d82fe25d0e9de7" as const,
  },
  yoBTC: {
    base: "0xbCbc8cb4D1e8ED048a6276a5E94A3e952660BcbC" as const,
  },
} as const;

export const DEFAULT_CHAIN_ID = 84532; // Base Sepolia
export const SUPPORTED_CHAIN_IDS = [84532] as const;

export const VAULT_DISPLAY_ORDER = ["yoUSD", "yoETH", "yoBTC", "yoEUR"] as const;

export const VAULT_FRIENDLY_NAMES: Record<string, string> = {
  yoUSD: "Dollar Savings",
  yoETH: "Ether Savings",
  yoBTC: "Bitcoin Savings",
  yoEUR: "Euro Savings",
  yoGOLD: "Gold Savings",
  yoUSDT: "Tether Savings",
};

// Base Sepolia token addresses
export const BASE_TOKENS: Record<string, `0x${string}`> = {
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  WETH: "0x4200000000000000000000000000000000000006",
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
};

export const BASE_TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  WETH: 18,
  ETH: 18,
};

// Circle Gateway Nanopayments — Base Sepolia
export const CIRCLE_GATEWAY_CHAIN = "baseSepolia" as const;
// CAIP-2 network identifier for Base Sepolia (chain ID 84532)
export const CIRCLE_GATEWAY_NETWORK = "eip155:84532";
export const CIRCLE_GATEWAY_FACILITATOR_URL =
  "https://gateway-api-testnet.circle.com";
// Addresses sourced from @circle-fin/x402-batching CHAIN_CONFIGS
export const CIRCLE_BASE_SEPOLIA_USDC =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const CIRCLE_BASE_SEPOLIA_GATEWAY_WALLET =
  "0x0077777d7EBA4688BDeF3E311b846F25870A19B9" as const;

export const ALLOWANCE_HOLDER =
  "0x0000000000001fF3684f28c67538d4D072C22734" as const;

/** Per-vault accent palette — subtle, cream-compatible tones */
export const VAULT_ACCENTS: Record<string, { color: string; bg: string; border: string }> = {
  yoUSD: { color: "#6B8F5E", bg: "rgba(107,143,94,0.08)", border: "rgba(107,143,94,0.25)" },
  yoETH: { color: "#6B89A8", bg: "rgba(107,137,168,0.08)", border: "rgba(107,137,168,0.25)" },
  yoBTC: { color: "#B8943E", bg: "rgba(184,148,62,0.08)", border: "rgba(184,148,62,0.25)" },
  yoEUR: { color: "#8B7BAA", bg: "rgba(139,123,170,0.08)", border: "rgba(139,123,170,0.25)" },
  yoGOLD: { color: "#A89460", bg: "rgba(168,148,96,0.08)", border: "rgba(168,148,96,0.25)" },
  yoUSDT: { color: "#5A9E82", bg: "rgba(90,158,130,0.08)", border: "rgba(90,158,130,0.25)" },
};

/** Token logos — local assets in /public/tokens/ */
export const VAULT_LOGOS: Record<string, string> = {
  yoUSD: "/tokens/usdc.png",
  yoETH: "/tokens/eth.png",
  yoBTC: "/tokens/btc.png",
  yoEUR: "/tokens/eur.png",
  yoGOLD: "/tokens/gold.png",
  yoUSDT: "/tokens/usdt.png",
};

/** Token logos keyed by token symbol */
export const TOKEN_LOGOS: Record<string, string> = {
  WETH: "/tokens/eth.png", ETH: "/tokens/eth.png",
  USDC: "/tokens/usdc.png", USDT: "/tokens/usdt.png",
  cbBTC: "/tokens/btc.png", EURC: "/tokens/eur.png",
};

/** Friendly display names for token symbols */
export const TOKEN_DISPLAY_NAMES: Record<string, string> = {
  WETH: "ETH", cbBTC: "BTC", EURC: "EUR",
};

export const NARRATION_CACHE_KEY = "bottie:narration-cache";

// Bill providers with mock payee addresses (Base Sepolia wallets for demo)
export const BILL_PROVIDERS: Record<string, {
  name: string;
  category: string;
  defaultAmount: number;
  logo: string;
  payeeAddress: string;
}> = {
  netflix: { name: "Netflix", category: "streaming", defaultAmount: 15.49, logo: "/providers/netflix.svg", payeeAddress: "0x1111111111111111111111111111111111111111" },
  hulu: { name: "Hulu", category: "streaming", defaultAmount: 7.99, logo: "/providers/hulu.svg", payeeAddress: "0x2222222222222222222222222222222222222222" },
  hbo: { name: "HBO Max", category: "streaming", defaultAmount: 15.99, logo: "/providers/hbo.svg", payeeAddress: "0x3333333333333333333333333333333333333333" },
  comcast: { name: "Comcast Internet", category: "internet", defaultAmount: 79.99, logo: "/providers/comcast.svg", payeeAddress: "0x4444444444444444444444444444444444444444" },
  att: { name: "AT&T Internet", category: "internet", defaultAmount: 65.00, logo: "/providers/att.svg", payeeAddress: "0x5555555555555555555555555555555555555555" },
  verizon: { name: "Verizon", category: "cable", defaultAmount: 89.99, logo: "/providers/verizon.svg", payeeAddress: "0x6666666666666666666666666666666666666666" },
  xfinity: { name: "Xfinity Cable", category: "cable", defaultAmount: 99.00, logo: "/providers/xfinity.svg", payeeAddress: "0x7777777777777777777777777777777777777777" },
  spotify: { name: "Spotify", category: "streaming", defaultAmount: 9.99, logo: "/providers/spotify.svg", payeeAddress: "0x8888888888888888888888888888888888888888" },
  apple_tv: { name: "Apple TV+", category: "streaming", defaultAmount: 9.99, logo: "/providers/apple.svg", payeeAddress: "0x9999999999999999999999999999999999999999" },
  disney: { name: "Disney+", category: "streaming", defaultAmount: 13.99, logo: "/providers/disney.svg", payeeAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1" },
};

// Investment options
export const INVESTMENT_OPTIONS: Record<string, {
  name: string;
  type: string;
  currentPriceUsd: number;
  description: string;
  available: boolean;
}> = {
  AAPL: { name: "Apple Inc.", type: "stock", currentPriceUsd: 213.49, description: "Consumer electronics & software", available: true },
  TSLA: { name: "Tesla Inc.", type: "stock", currentPriceUsd: 248.23, description: "Electric vehicles & energy", available: true },
  GOOGL: { name: "Alphabet Inc.", type: "stock", currentPriceUsd: 178.90, description: "Search, cloud & AI", available: true },
  MSFT: { name: "Microsoft Corp.", type: "stock", currentPriceUsd: 415.32, description: "Software & cloud", available: true },
  NVDA: { name: "NVIDIA Corp.", type: "stock", currentPriceUsd: 875.40, description: "AI chips & hardware", available: true },
  AMZN: { name: "Amazon.com", type: "stock", currentPriceUsd: 192.15, description: "E-commerce & cloud", available: true },
  SPACEX: { name: "SpaceX", type: "ipo", currentPriceUsd: 185.00, description: "Pre-IPO: Space exploration", available: true },
  OPENAI: { name: "OpenAI", type: "ipo", currentPriceUsd: 150.00, description: "Pre-IPO: Artificial intelligence", available: true },
  SPY: { name: "S&P 500 ETF", type: "etf", currentPriceUsd: 545.20, description: "Top 500 US companies", available: true },
  QQQ: { name: "Nasdaq 100 ETF", type: "etf", currentPriceUsd: 472.80, description: "Top 100 tech companies", available: true },
};

/** Known token addresses on Base Sepolia */
export const TOKEN_ADDRESSES: Record<string, string> = {
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  WETH: "0x4200000000000000000000000000000000000006",
};

export const SYMBOL_TO_COINGECKO: Record<string, string> = {
  usdc: "usd-coin",
  weth: "ethereum",
  eth: "ethereum",
  cbbtc: "coinbase-wrapped-btc",
  eurc: "euro-coin",
  xaut: "tether-gold",
  usdt: "tether",
};
