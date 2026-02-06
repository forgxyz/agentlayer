/**
 * Data Fetchers Registry for AgentLayer OS
 *
 * Each dataset has:
 * - fetch: Live query via Explorer API
 * - fallback: Static JSON (local dev only)
 */

import { runExplorerQuery, fetchLatestQueryRun } from './allium';
import { QUERY_IDS } from './queries';

const isLocalhost = typeof process !== 'undefined' && process.env.VERCEL_ENV === undefined;

// Dynamic imports for local fallback (tree-shakeable in production)
async function loadLocalJSON(filename: string): Promise<unknown[]> {
  try {
    const data = await import(`../../public/data/${filename}`);
    return data.default;
  } catch (error) {
    console.error(`Failed to load local ${filename}:`, error);
    throw error;
  }
}

export interface DataFetcher<T> {
  fetch: () => Promise<T>;
  fetchFast: () => Promise<T>; // With compute profile
  fetchLatest: () => Promise<T>; // Fetch latest completed run
  fallback: (() => Promise<T>) | null;
}

export const fetchers = {
  graph_nodes: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.GRAPH_NODES),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.GRAPH_NODES, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.GRAPH_NODES),
    fallback: isLocalhost ? () => loadLocalJSON('nodes.json') : null,
  } as DataFetcher<unknown[]>,

  graph_edges: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.GRAPH_EDGES),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.GRAPH_EDGES, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.GRAPH_EDGES),
    fallback: isLocalhost ? () => loadLocalJSON('edges.json') : null,
  } as DataFetcher<unknown[]>,

  agents: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.AGENT_DIRECTORY),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.AGENT_DIRECTORY, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.AGENT_DIRECTORY),
    fallback: isLocalhost ? () => loadLocalJSON('agents.json') : null,
  } as DataFetcher<unknown[]>,

  participants: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.PARTICIPANTS),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.PARTICIPANTS, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.PARTICIPANTS),
    fallback: isLocalhost ? () => loadLocalJSON('participants.json') : null,
  } as DataFetcher<unknown[]>,

  flows: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.VALUE_FLOWS_DAILY),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.VALUE_FLOWS_DAILY, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.VALUE_FLOWS_DAILY),
    fallback: isLocalhost ? () => loadLocalJSON('flows.json') : null,
  } as DataFetcher<unknown[]>,

  facilitators: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.FACILITATOR_SUMMARY),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.FACILITATOR_SUMMARY, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.FACILITATOR_SUMMARY),
    fallback: isLocalhost ? () => loadLocalJSON('facilitators.json') : null,
  } as DataFetcher<unknown[]>,

  erc8004_agents: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.ERC8004_AGENTS),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.ERC8004_AGENTS, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.ERC8004_AGENTS),
    fallback: isLocalhost ? () => loadLocalJSON('erc8004_agents.json') : null,
  } as DataFetcher<unknown[]>,

  erc8004_feedback: {
    fetch: () => runExplorerQuery<unknown>(QUERY_IDS.ERC8004_FEEDBACK),
    fetchFast: () => runExplorerQuery<unknown>(QUERY_IDS.ERC8004_FEEDBACK, 'speedy_ultra'),
    fetchLatest: () => fetchLatestQueryRun<unknown>(QUERY_IDS.ERC8004_FEEDBACK),
    fallback: isLocalhost ? () => loadLocalJSON('erc8004_feedback.json') : null,
  } as DataFetcher<unknown[]>,
} as const;

export type DatasetKey = keyof typeof fetchers;
