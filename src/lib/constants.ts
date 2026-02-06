export const CHAIN_COLORS: Record<string, string> = {
  base: '#0052FF',
  solana: '#14F195',  // Solana brand green
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
  'Coinbase': '#00F5FF',      // Cyan glow
  'Dexter': '#FF6B35',
  'PayAI': '#06B6D4',         // Cyan-600
  'Daydreams': '#A78BFA',     // Purple-400
  'Virtuals Protocol': '#8B5CF6', // Violet
  'Meridian': '#0EA5E9',      // Sky blue
  'X402rs': '#EF4444',
  'Mogami': '#22D3EE',        // Cyan-400
  'OpenX402': '#38BDF8',      // Sky-400
  'Thirdweb': '#C084FC',      // Purple-400
  'CodeNut': '#6EE7B7',       // Emerald-300
  'AnySpend': '#FDE047',      // Yellow
  'Polygon Facilitator': '#A78BFA',
  'OpenFacilitator': '#10B981', // Emerald
  'AurraCloud': '#FB923C',
  'Heurist': '#818CF8',       // Indigo-400
  'Questflow': '#F0ABFC',     // Fuchsia-300
  'x402 Jobs': '#2DD4BF',     // Teal-400
  'Polymer': '#F43F5E',       // Rose
  'Corbits': '#C4B5FD',       // Violet-300
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
