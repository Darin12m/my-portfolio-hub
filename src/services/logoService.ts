// Logo service for stock logos (stocks only)

// Stock domain mappings for logo APIs
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
  // Trading212 common stocks (UK/EU)
  'LLOY': 'lloydsbankinggroup.com',
  'BP': 'bp.com',
  'HSBA': 'hsbc.com',
  'VOD': 'vodafone.com',
  'GSK': 'gsk.com',
  'AZN': 'astrazeneca.com',
  'BARC': 'barclays.com',
  'RIO': 'riotinto.com',
  'SHEL': 'shell.com',
  'ULVR': 'unilever.com',
  'DGE': 'diageo.com',
  'REL': 'relx.com',
  'NG': 'nationalgrid.com',
  'BT': 'bt.com',
  'IAG': 'iairgroup.com',
  'RR': 'rolls-royce.com',
  'LSEG': 'lseg.com',
  'EXPN': 'experian.com',
  'CPG': 'compass-group.com',
  'PRU': 'prudential.com',
  'AAL': 'anglo-american.com',
  'NWG': 'natwestgroup.com',
  'ANTO': 'antofagasta.co.uk',
  'STAN': 'sc.com',
  'GLEN': 'glencore.com',
  'SSE': 'sse.com',
  'CRH': 'crh.com',
  'ABF': 'abf.co.uk',
  'SBRY': 'about.sainsburys.co.uk',
  'WPP': 'wpp.com',
  'BHP': 'bhp.com',
  'IMB': 'imb.com',
  'BA.': 'bae.com',
  'RKT': 'reckitt.com',
  'TSCO': 'tesco.com',
  'SMDS': 'smds.com',
  'SMT': 'scottishmortgageit.com',
  'III': '3i.com',
  // European stocks
  'SAP': 'sap.com',
  'ASML': 'asml.com',
  'LVMH': 'lvmh.com',
  'OR': 'loreal.com',
  'SIE': 'siemens.com',
  'ALV': 'allianz.com',
  'TTE': 'totalenergies.com',
  'AIR': 'airbus.com',
  'BNP': 'bnpparibas.com',
  'SAN': 'santander.com',
  'EL': 'elkem.com',
  'DTE': 'telekom.com',
  'VOW3': 'volkswagen.com',
  'BMW': 'bmw.com',
  'DAI': 'mercedes-benz.com',
  'BAS': 'basf.com',
  'MBG': 'mercedes-benz.com',
  'ADS': 'adidas.com',
  'MUV2': 'munichre.com',
  'DBK': 'db.com',
  'BAYN': 'bayer.com',
  'IFX': 'infineon.com',
  'HEN3': 'henkel.com',
  'MRK.DE': 'merckgroup.com',
};

// In-memory cache for logo URLs
const logoCache = new Map<string, string | null>();
const failedLogos = new Set<string>();

/**
 * Normalize ticker - handle Trading212 ticker formats
 */
function normalizeTicker(ticker: string): string {
  // Remove any exchange suffix (e.g., "AAPL_US" -> "AAPL")
  let normalized = ticker.split('_')[0];
  // Remove trailing dots (UK stocks like "BP." -> "BP")
  normalized = normalized.replace(/\.$/, '');
  return normalized.toUpperCase();
}

/**
 * Get logo URL for a stock ticker using multiple fallback sources
 */
export function getStockLogoUrl(ticker: string): string | null {
  const normalizedTicker = normalizeTicker(ticker);
  const cacheKey = `stock_${normalizedTicker}`;
  
  // Check cache first
  if (logoCache.has(cacheKey)) {
    return logoCache.get(cacheKey) || null;
  }
  
  // Check if we have a domain mapping
  const domain = stockDomains[normalizedTicker];
  if (domain) {
    const url = `https://logo.clearbit.com/${domain}`;
    logoCache.set(cacheKey, url);
    return url;
  }
  
  // Fallback: Try logo.dev API with ticker (works for many stocks)
  const logoDevUrl = `https://img.logo.dev/${normalizedTicker.toLowerCase()}.com?token=pk_VAZ6PwmyR5icAH0FwGlvYw&size=64`;
  logoCache.set(cacheKey, logoDevUrl);
  return logoDevUrl;
}

/**
 * Mark a logo as failed to prevent retrying
 */
export function markLogoFailed(ticker: string): void {
  failedLogos.add(normalizeTicker(ticker));
}

/**
 * Check if a logo has failed before
 */
export function hasLogoFailed(ticker: string): boolean {
  return failedLogos.has(normalizeTicker(ticker));
}

/**
 * Clear the logo cache
 */
export function clearLogoCache(): void {
  logoCache.clear();
  failedLogos.clear();
}
