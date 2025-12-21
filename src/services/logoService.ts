// Logo service with automatic fetching and caching

// Stock domain mappings for Clearbit logo API
const stockDomains: Record<string, string> = {
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  AMZN: 'amazon.com',
  NVDA: 'nvidia.com',
  META: 'meta.com',
  TSLA: 'tesla.com',
  BRK: 'berkshirehathaway.com',
  V: 'visa.com',
  JNJ: 'jnj.com',
  WMT: 'walmart.com',
  JPM: 'jpmorganchase.com',
  MA: 'mastercard.com',
  PG: 'pg.com',
  UNH: 'unitedhealthgroup.com',
  DIS: 'disney.com',
  HD: 'homedepot.com',
  BAC: 'bankofamerica.com',
  XOM: 'exxonmobil.com',
  PFE: 'pfizer.com',
  KO: 'coca-cola.com',
  PEP: 'pepsico.com',
  CSCO: 'cisco.com',
  VZ: 'verizon.com',
  INTC: 'intel.com',
  CMCSA: 'comcast.com',
  NFLX: 'netflix.com',
  ADBE: 'adobe.com',
  CRM: 'salesforce.com',
  ABT: 'abbott.com',
  NKE: 'nike.com',
  TMO: 'thermofisher.com',
  MRK: 'merck.com',
  COST: 'costco.com',
  AVGO: 'broadcom.com',
  CVX: 'chevron.com',
  LLY: 'lilly.com',
  ACN: 'accenture.com',
  MCD: 'mcdonalds.com',
  DHR: 'danaher.com',
  TXN: 'ti.com',
  MDT: 'medtronic.com',
  QCOM: 'qualcomm.com',
  HON: 'honeywell.com',
  UPS: 'ups.com',
  NEE: 'nexteraenergy.com',
  PM: 'pmi.com',
  ORCL: 'oracle.com',
  IBM: 'ibm.com',
  AMD: 'amd.com',
  PYPL: 'paypal.com',
  SBUX: 'starbucks.com',
  GS: 'goldmansachs.com',
  MS: 'morganstanley.com',
  CAT: 'caterpillar.com',
  BLK: 'blackrock.com',
  INTU: 'intuit.com',
  ISRG: 'intuitive.com',
  GE: 'ge.com',
  NOW: 'servicenow.com',
  AMAT: 'appliedmaterials.com',
  BKNG: 'booking.com',
  SPGI: 'spglobal.com',
  AXP: 'americanexpress.com',
  DE: 'deere.com',
  TJX: 'tjx.com',
  SYK: 'stryker.com',
  GILD: 'gilead.com',
  MDLZ: 'mondelezinternational.com',
  SCHW: 'schwab.com',
  MMC: 'mmc.com',
  ADI: 'analog.com',
  LRCX: 'lamresearch.com',
  ZTS: 'zoetis.com',
  CB: 'chubb.com',
  CVS: 'cvshealth.com',
  REGN: 'regeneron.com',
  C: 'citigroup.com',
  VRTX: 'vrtx.com',
  MO: 'altria.com',
  BDX: 'bd.com',
  CI: 'cigna.com',
  SO: 'southerncompany.com',
  BSX: 'bostonscientific.com',
  DUK: 'duke-energy.com',
  EQIX: 'equinix.com',
  KLAC: 'kla.com',
  CME: 'cmegroup.com',
  ICE: 'ice.com',
  ITW: 'itw.com',
  AON: 'aon.com',
  ATVI: 'activision.com',
  WM: 'wm.com',
  CL: 'colgatepalmolive.com',
  MCO: 'moodys.com',
  SNPS: 'synopsys.com',
  CDNS: 'cadence.com',
  NSC: 'nscorp.com',
  SHW: 'sherwin-williams.com',
  PLD: 'prologis.com',
  USB: 'usbank.com',
  TGT: 'target.com',
  FCX: 'fcx.com',
  APD: 'airproducts.com',
  CSX: 'csx.com',
  FIS: 'fisglobal.com',
  EMR: 'emerson.com',
  MMM: '3m.com',
  ECL: 'ecolab.com',
  ADP: 'adp.com',
  PNC: 'pnc.com',
  NOC: 'northropgrumman.com',
  GD: 'gd.com',
  LMT: 'lockheedmartin.com',
  RTX: 'rtx.com',
  BA: 'boeing.com',
  F: 'ford.com',
  GM: 'gm.com',
  UBER: 'uber.com',
  LYFT: 'lyft.com',
  ABNB: 'airbnb.com',
  SQ: 'squareup.com',
  SHOP: 'shopify.com',
  SPOT: 'spotify.com',
  SNAP: 'snap.com',
  PINS: 'pinterest.com',
  TWTR: 'twitter.com',
  ZM: 'zoom.us',
  DOCU: 'docusign.com',
  OKTA: 'okta.com',
  CRWD: 'crowdstrike.com',
  DDOG: 'datadoghq.com',
  NET: 'cloudflare.com',
  SNOW: 'snowflake.com',
  PLTR: 'palantir.com',
  COIN: 'coinbase.com',
  HOOD: 'robinhood.com',
  RBLX: 'roblox.com',
  U: 'unity.com',
  RIVN: 'rivian.com',
  LCID: 'lucidmotors.com',
};

// Crypto logo mappings using CoinGecko CDN
const cryptoLogos: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  TRX: 'https://assets.coingecko.com/coins/images/1094/small/tron-logo.png',
  TON: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
  LINK: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  SHIB: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
  LTC: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  BCH: 'https://assets.coingecko.com/coins/images/780/small/bitcoin-cash-circle.png',
  AVAX: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  XLM: 'https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png',
  UNI: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png',
  ATOM: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png',
  ETC: 'https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png',
  NEAR: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg',
  APT: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png',
  ARB: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
  OP: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  FIL: 'https://assets.coingecko.com/coins/images/12817/small/filecoin.png',
  CRO: 'https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png',
  VET: 'https://assets.coingecko.com/coins/images/1167/small/VeChain-Logo-768x725.png',
  ALGO: 'https://assets.coingecko.com/coins/images/4380/small/download.png',
  FTM: 'https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png',
  SAND: 'https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg',
  MANA: 'https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png',
  AAVE: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png',
  AXS: 'https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png',
  PEPE: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg',
  SUI: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg',
  SEI: 'https://assets.coingecko.com/coins/images/28205/small/Sei_Logo_-_Transparent.png',
  INJ: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png',
  RENDER: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  IMX: 'https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png',
  GRT: 'https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png',
  HBAR: 'https://assets.coingecko.com/coins/images/3688/small/hbar.png',
  MKR: 'https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png',
  QNT: 'https://assets.coingecko.com/coins/images/3370/small/5ZOu7brX_400x400.jpg',
  EGLD: 'https://assets.coingecko.com/coins/images/12335/small/multiversx-symbol.png',
  FLOW: 'https://assets.coingecko.com/coins/images/13446/small/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png',
  THETA: 'https://assets.coingecko.com/coins/images/2538/small/theta-token-logo.png',
  XTZ: 'https://assets.coingecko.com/coins/images/976/small/Tezos-logo.png',
  RUNE: 'https://assets.coingecko.com/coins/images/6595/small/Rune200x200.png',
  CHZ: 'https://assets.coingecko.com/coins/images/8834/small/CHZ_Token_updated.png',
  CAKE: 'https://assets.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_%281%29.png',
  CRV: 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  LDO: 'https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png',
  RNDR: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png',
  ENS: 'https://assets.coingecko.com/coins/images/19785/small/acatxTm8_400x400.jpg',
  RPL: 'https://assets.coingecko.com/coins/images/2090/small/rocket_pool_%28RPL%29.png',
  COMP: 'https://assets.coingecko.com/coins/images/10775/small/COMP.png',
  SNX: 'https://assets.coingecko.com/coins/images/3406/small/SNX.png',
  SUSHI: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
  YFI: 'https://assets.coingecko.com/coins/images/11849/small/yearn.jpg',
};

// In-memory cache for logo URLs
const logoCache = new Map<string, string | null>();
const failedLogos = new Set<string>();

/**
 * Get logo URL for a stock symbol
 */
export function getStockLogoUrl(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase();
  
  // Check cache first
  if (logoCache.has(`stock_${upperSymbol}`)) {
    return logoCache.get(`stock_${upperSymbol}`) || null;
  }
  
  // Check if we have a domain mapping
  const domain = stockDomains[upperSymbol];
  if (domain) {
    const url = `https://logo.clearbit.com/${domain}`;
    logoCache.set(`stock_${upperSymbol}`, url);
    return url;
  }
  
  // Try common patterns
  const commonPatterns = [
    `${upperSymbol.toLowerCase()}.com`,
    `${upperSymbol.toLowerCase()}corp.com`,
    `${upperSymbol.toLowerCase()}inc.com`,
  ];
  
  // Use first pattern as fallback
  const fallbackUrl = `https://logo.clearbit.com/${commonPatterns[0]}`;
  logoCache.set(`stock_${upperSymbol}`, fallbackUrl);
  return fallbackUrl;
}

/**
 * Get logo URL for a crypto symbol
 */
export function getCryptoLogoUrl(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase();
  
  // Check cache first
  if (logoCache.has(`crypto_${upperSymbol}`)) {
    return logoCache.get(`crypto_${upperSymbol}`) || null;
  }
  
  // Check if we have a direct mapping
  if (cryptoLogos[upperSymbol]) {
    logoCache.set(`crypto_${upperSymbol}`, cryptoLogos[upperSymbol]);
    return cryptoLogos[upperSymbol];
  }
  
  // No logo found
  logoCache.set(`crypto_${upperSymbol}`, null);
  return null;
}

/**
 * Get logo URL for any asset (stock or crypto)
 */
export function getAssetLogoUrl(symbol: string, assetType: 'stock' | 'crypto'): string | null {
  if (assetType === 'crypto') {
    return getCryptoLogoUrl(symbol);
  }
  return getStockLogoUrl(symbol);
}

/**
 * Mark a logo as failed to prevent retrying
 */
export function markLogoFailed(symbol: string): void {
  failedLogos.add(symbol.toUpperCase());
}

/**
 * Check if a logo has failed before
 */
export function hasLogoFailed(symbol: string): boolean {
  return failedLogos.has(symbol.toUpperCase());
}

/**
 * Clear the logo cache
 */
export function clearLogoCache(): void {
  logoCache.clear();
  failedLogos.clear();
}
