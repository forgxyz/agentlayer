export const CHAIN_COLORS: Record<string, string> = {
  base: '#0052FF',
  solana: '#9945FF',
  polygon: '#8247E5',
  ethereum: '#627EEA',
  bsc: '#F0B90B',
  scroll: '#FFEEDA',
  gnosis: '#3E6957',
};

export const CHAIN_LABELS: Record<string, string> = {
  base: 'Base',
  solana: 'Solana',
  polygon: 'Polygon',
  ethereum: 'Ethereum',
  bsc: 'BSC',
  scroll: 'Scroll',
  gnosis: 'Gnosis',
};

export const FACILITATOR_COLORS: Record<string, string> = {
  'Coinbase': '#0052FF',
  'Dexter': '#FF6B35',
  'PayAI': '#00D4AA',
  'Daydreams': '#FF61D8',
  'Virtuals Protocol': '#7B61FF',
  'Meridian': '#FFB800',
  'X402rs': '#FF4444',
  'Mogami': '#4ECDC4',
  'OpenX402': '#45B7D1',
  'Thirdweb': '#F213A4',
  'CodeNut': '#96CEB4',
  'AnySpend': '#FFEAA7',
  'Polygon Facilitator': '#8247E5',
  'OpenFacilitator': '#00FF88',
  'AurraCloud': '#FF9F43',
  'Heurist': '#6C5CE7',
  'Questflow': '#FDA7DF',
  'x402 Jobs': '#55E6C1',
  'Polymer': '#EB2F06',
  'Corbits': '#A29BFE',
};

export const TIME_WINDOWS = [
  { value: '24h' as const, label: '24H' },
  { value: '7d' as const, label: '7D' },
  { value: '30d' as const, label: '30D' },
  { value: 'all' as const, label: 'All' },
];

export function truncateAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatUSD(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}
