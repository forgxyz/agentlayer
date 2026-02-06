import serversData from '../../public/data/x402_servers.json';

interface X402Server {
  name: string;
  url: string;
  description: string;
  x402scan_url: string;
  addresses: string[];
}

export interface ServerInfo {
  name: string;
  url: string;
  description: string;
  x402scan_url: string;
}

// Build address → server lookup (lazy singleton)
let _lookup: Map<string, ServerInfo> | null = null;

function getLookup(): Map<string, ServerInfo> {
  if (_lookup) return _lookup;
  _lookup = new Map();
  for (const server of serversData as X402Server[]) {
    const info: ServerInfo = {
      name: server.name,
      url: server.url,
      description: server.description,
      x402scan_url: server.x402scan_url,
    };
    for (const addr of server.addresses) {
      // EVM addresses: lowercase. Solana: case-sensitive, store both.
      _lookup.set(addr.toLowerCase(), info);
      if (!addr.startsWith('0x')) {
        _lookup.set(addr, info);
      }
    }
  }
  return _lookup;
}

export function lookupServer(address: string): ServerInfo | null {
  const lookup = getLookup();
  return lookup.get(address.toLowerCase()) || lookup.get(address) || null;
}
