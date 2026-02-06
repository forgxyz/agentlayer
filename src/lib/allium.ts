const ALLIUM_API_BASE = 'https://api.allium.so/api/v1/explorer';

interface QueryResult<T> {
  data: T[];
  meta: {
    columns: { name: string; data_type: string }[];
    row_count: number | null;
    run_id: string | null;
  };
}

export async function runExplorerQuery<T>(
  queryId: string,
  computeProfile?: string
): Promise<T[]> {
  const apiKey = process.env.ALLIUM_API_KEY;
  if (!apiKey) throw new Error('ALLIUM_API_KEY not set');

  // Start query run
  const body = computeProfile ? { compute_profile: computeProfile } : {};
  const runRes = await fetch(`${ALLIUM_API_BASE}/queries/${queryId}/run`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!runRes.ok) {
    throw new Error(`Failed to start query: ${runRes.status} ${await runRes.text()}`);
  }

  const { run_id } = await runRes.json();

  // Poll for results
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusRes = await fetch(
      `${ALLIUM_API_BASE}/query-runs/${run_id}/status`,
      { headers: { 'X-API-Key': apiKey } }
    );

    if (!statusRes.ok) continue;
    const status = await statusRes.json();

    if (status.status === 'success') {
      const resultsRes = await fetch(
        `${ALLIUM_API_BASE}/query-runs/${run_id}/results?f=json`,
        { headers: { 'X-API-Key': apiKey } }
      );
      if (!resultsRes.ok) throw new Error('Failed to fetch results');
      const result: QueryResult<T> = await resultsRes.json();
      return result.data;
    }

    if (status.status === 'failed') {
      throw new Error(`Query failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('Query timed out');
}

/**
 * Fetch the latest completed query run results (doesn't start a new run)
 */
export async function fetchLatestQueryRun<T>(queryId: string): Promise<T[]> {
  const apiKey = process.env.ALLIUM_API_KEY;
  if (!apiKey) throw new Error('ALLIUM_API_KEY not set');

  const resultsRes = await fetch(
    `${ALLIUM_API_BASE}/queries/${queryId}/latest-run/results?f=json`,
    { headers: { 'X-API-Key': apiKey } }
  );

  if (!resultsRes.ok) {
    throw new Error(`Failed to fetch latest run: ${resultsRes.status} ${await resultsRes.text()}`);
  }

  const result: QueryResult<T> = await resultsRes.json();
  return result.data;
}
